#!/usr/bin/env python3
"""MCP server "shop": tra cứu và hoàn tiền đơn hàng (dữ liệu giả).

Chạy qua stdio, chỉ dùng thư viện chuẩn của Python. Mỗi dòng trên stdin là một
message JSON-RPC 2.0; mỗi dòng in ra stdout là một message trả lời. Không được
in gì khác ra stdout. Nhật ký ghi vào file khi đặt SHOP_LOG.

Biến môi trường:
  SHOP_DESCRIPTIONS=minimal   dùng mô tả tool sơ sài (để so sánh ở bước 3)
  SHOP_ERRORS=generic         mọi lỗi trả về "Operation failed" (bước 4)
  SHOP_LOG=<đường dẫn>        ghi tên từng method nhận được vào file này
"""
import json
import os
import re
import sys

SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]
MINIMAL = os.environ.get("SHOP_DESCRIPTIONS") == "minimal"
GENERIC = os.environ.get("SHOP_ERRORS") == "generic"
LOG_PATH = os.environ.get("SHOP_LOG") or ""

REFUND_LIMIT = 1_000_000  # đồng; trên mức này cần nhân viên duyệt

ORDERS = {
    "DH-1001": {"customer_email": "an@example.com", "status": "delivered", "total": 450_000, "item": "Bàn phím cơ"},
    "DH-1002": {"customer_email": "an@example.com", "status": "shipping", "total": 1_200_000, "item": "Màn hình 24 inch"},
    "DH-1003": {"customer_email": "binh@example.com", "status": "delivered", "total": 2_500_000, "item": "Ghế công thái học"},
    "DH-1004": {"customer_email": "chi@example.com", "status": "cancelled", "total": 300_000, "item": "Chuột không dây"},
}
STATUSES = ["shipping", "delivered", "cancelled"]

# Trạng thái trong bộ nhớ của tiến trình: cổng thanh toán "timeout" ở lần gọi đầu.
gateway_calls = {}
refunded = set()

TOOLS = [
    {
        "name": "find_orders",
        "description": (
            "Tìm đơn hàng."
            if MINIMAL
            else "Tìm danh sách đơn hàng theo email khách hàng và/hoặc trạng thái. Dùng khi CHƯA biết mã đơn, "
            "ví dụ 'khách an@example.com có những đơn nào' hoặc 'các đơn đang giao'. Trả về mã đơn, trạng thái "
            "và tổng tiền của từng đơn, KHÔNG trả chi tiết sản phẩm; muốn xem chi tiết một đơn thì gọi get_order "
            "với mã đơn. Không tìm thấy đơn nào là kết quả hợp lệ: count bằng 0, không phải lỗi."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "customer_email": {
                    "type": "string",
                    "description": "Email đầy đủ của khách, ví dụ an@example.com. Bỏ trống để không lọc theo khách.",
                },
                "status": {
                    "type": "string",
                    "enum": STATUSES,
                    "description": "Lọc theo trạng thái: shipping (đang giao), delivered (đã giao), cancelled (đã hủy).",
                },
            },
        },
        "annotations": {"readOnlyHint": True},
    },
    {
        "name": "get_order",
        "description": (
            "Lấy đơn hàng."
            if MINIMAL
            else "Lấy chi tiết MỘT đơn hàng khi đã biết mã đơn: sản phẩm, trạng thái, tổng tiền, email khách. "
            "Mã đơn có dạng DH- theo sau là 4 chữ số, ví dụ DH-1002. Nếu người dùng chỉ đưa số (1002), hãy thêm "
            "tiền tố DH-. Không dùng tool này để tìm đơn theo khách hàng; việc đó là của find_orders."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "order_id": {
                    "type": "string",
                    "description": "Mã đơn" if MINIMAL else "Mã đơn dạng DH-NNNN, ví dụ DH-1002.",
                }
            },
            "required": ["order_id"],
        },
        "annotations": {"readOnlyHint": True},
    },
    {
        "name": "refund_order",
        "description": (
            "Hoàn tiền."
            if MINIMAL
            else "Hoàn toàn bộ tiền của một đơn hàng về phương thức thanh toán gốc. Thao tác này chuyển tiền thật "
            "và không hoàn tác được. Chỉ hoàn được đơn ở trạng thái delivered và có tổng tiền không quá "
            "1.000.000 đồng; đơn lớn hơn phải chuyển cho nhân viên. Luôn gọi get_order trước để kiểm tra trạng "
            "thái và tổng tiền."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string", "description": "Mã đơn" if MINIMAL else "Mã đơn dạng DH-NNNN."},
                "reason": {"type": "string", "description": "Lý do" if MINIMAL else "Lý do hoàn tiền, một câu ngắn."},
            },
            "required": ["order_id", "reason"],
        },
        "annotations": {"readOnlyHint": False, "destructiveHint": True},
    },
]


def log(line):
    if LOG_PATH:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def ok(payload):
    """Kết quả thành công: một khối text chứa JSON."""
    return {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=False)}], "isError": False}


def fail(category, retryable, message, **extra):
    """Lỗi khi thực thi tool: vẫn là một *result* JSON-RPC, có isError: true.

    Model đọc được nội dung này, nên nó phải nói rõ: lỗi loại gì, thử lại có ích
    không, và bước tiếp theo nên là gì.
    """
    if GENERIC:
        return {"content": [{"type": "text", "text": "Operation failed"}], "isError": True}
    payload = {"errorCategory": category, "isRetryable": retryable, "message": message, **extra}
    return {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=False)}], "isError": True}


def check_order_id(order_id):
    """Trả về (order, None) hoặc (None, lỗi)."""
    if not isinstance(order_id, str) or not re.fullmatch(r"DH-\d{4}", order_id):
        return None, fail(
            "validation", False,
            f"Mã đơn '{order_id}' sai định dạng. Mã đơn phải có dạng DH-NNNN, ví dụ DH-1002.",
            hint="Sửa lại order_id cho đúng định dạng rồi gọi lại.",
        )
    order = ORDERS.get(order_id)
    if order is None:
        return None, fail(
            "not_found", False,
            f"Không có đơn nào mang mã {order_id}.",
            hint="Dùng find_orders với email của khách để tra mã đơn đúng.",
        )
    return order, None


def find_orders(args):
    email = args.get("customer_email")
    status = args.get("status")
    if email is not None and "@" not in email:
        return fail(
            "validation", False,
            f"customer_email '{email}' không phải địa chỉ email.",
            hint="Truyền email đầy đủ của khách, ví dụ an@example.com. Nếu chỉ biết tên, hãy hỏi lại người dùng.",
        )
    if status is not None and status not in STATUSES:
        return fail("validation", False, f"status '{status}' không hợp lệ.", allowed=STATUSES)
    rows = [
        {"order_id": oid, "status": o["status"], "total": o["total"]}
        for oid, o in ORDERS.items()
        if (email is None or o["customer_email"] == email) and (status is None or o["status"] == status)
    ]
    return ok({"count": len(rows), "orders": rows})


def get_order(args):
    order, err = check_order_id(args.get("order_id"))
    if err:
        return err
    return ok({"order_id": args["order_id"], **order, "refunded": args["order_id"] in refunded})


def refund_order(args):
    order_id = args.get("order_id")
    order, err = check_order_id(order_id)
    if err:
        return err
    if order_id in refunded:
        return fail("business", False, f"Đơn {order_id} đã được hoàn tiền trước đó.")
    if order["status"] != "delivered":
        return fail(
            "business", False,
            f"Đơn {order_id} đang ở trạng thái '{order['status']}'. Chỉ hoàn tiền được đơn đã giao (delivered).",
            hint="Không gọi lại. Giải thích cho khách và đề nghị hủy đơn hoặc chờ giao xong.",
        )
    if order["total"] > REFUND_LIMIT:
        return fail(
            "business", False,
            f"Đơn {order_id} có tổng tiền {order['total']} đồng, vượt hạn mức hoàn tự động {REFUND_LIMIT} đồng.",
            hint="Không gọi lại. Chuyển yêu cầu cho nhân viên duyệt.",
        )
    gateway_calls[order_id] = gateway_calls.get(order_id, 0) + 1
    if gateway_calls[order_id] == 1:
        return fail(
            "transient", True,
            "Cổng thanh toán không phản hồi trong 5 giây (timeout). Chưa có khoản tiền nào được chuyển.",
            hint="Gọi lại refund_order với đúng tham số cũ.",
        )
    refunded.add(order_id)
    return ok({"order_id": order_id, "refunded_amount": order["total"], "status": "refunded"})


HANDLERS = {"find_orders": find_orders, "get_order": get_order, "refund_order": refund_order}


def handle(msg):
    """Trả về message trả lời, hoặc None nếu msg là notification."""
    method = msg.get("method")
    msg_id = msg.get("id")
    params = msg.get("params") or {}
    log(method + (f" name={params.get('name')} args={json.dumps(params.get('arguments'), ensure_ascii=False)}"
                  if method == "tools/call" else ""))

    if msg_id is None:  # notification (ví dụ notifications/initialized): không trả lời
        return None

    def result(value):
        return {"jsonrpc": "2.0", "id": msg_id, "result": value}

    def protocol_error(code, message):
        return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": code, "message": message}}

    if method == "initialize":
        wanted = params.get("protocolVersion")
        version = wanted if wanted in SUPPORTED_VERSIONS else SUPPORTED_VERSIONS[0]
        return result({
            "protocolVersion": version,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "shop", "version": "1.0.0"},
        })
    if method == "ping":
        return result({})
    if method == "tools/list":
        return result({"tools": TOOLS})
    if method == "tools/call":
        handler = HANDLERS.get(params.get("name"))
        if handler is None:
            # Lỗi giao thức: request sai, không phải tool chạy hỏng.
            return protocol_error(-32602, f"Unknown tool: {params.get('name')}")
        return result(handler(params.get("arguments") or {}))
    return protocol_error(-32601, f"Method not found: {method}")


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue
        reply = handle(msg)
        if reply is not None:
            sys.stdout.write(json.dumps(reply, ensure_ascii=False) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
