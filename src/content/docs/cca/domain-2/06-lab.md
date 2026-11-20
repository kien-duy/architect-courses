---
title: 2.6 · Lab — MCP server tra cứu đơn hàng
description: Tự nói chuyện JSON-RPC với một MCP server stdio, nối nó vào Claude Code bằng .mcp.json, rồi quan sát mô tả tool, lỗi có cấu trúc và giới hạn tool.
sidebar:
  badge:
    text: Lab
    variant: tip
lesson:
  day: 5
  kind: lab
  minutes: 35
quiz:
  - q: "In step 5, the first command auto-approved only `find_orders` and `get_order`, and the second added `--disallowedTools \"mcp__shop__refund_order\"`. In both runs no refund happened. What was different about how the model was stopped?"
    options:
      - text: "Nothing: both flags remove the tool from the model's context"
        why: "Dòng `system/init` của hai lần chạy khác nhau: lần đầu vẫn có `refund_order`, lần sau thì không."
      - text: "In the first run the server rejected the call; in the second run Claude Code rejected it"
        why: "Server không từ chối gì cả. Trong cả hai lần chạy, `refund_order` không tới server: lần đầu lời gọi bị chặn ở lớp permission của Claude Code, lần sau không có lời gọi nào. Bật `SHOP_LOG` để tự kiểm tra."
      - text: "In the first run the tool still existed, so the model called it and the call was denied for lack of permission; in the second run the tool was not in the model's context, so it never tried"
        why: "Đúng. `--allowedTools` chỉ quyết định lời gọi nào được tự duyệt. Tool không được duyệt vẫn tồn tại và model vẫn thử gọi. `--disallowedTools` với tên tool trần gỡ hẳn tool khỏi context."
      - text: "In the second run the model called `refund_order` but received a structured business error"
        why: "Trace của lần chạy thứ hai không có lời gọi `refund_order` nào. Lỗi nghiệp vụ là chuyện của bước 4."
    answer: 2
    keyword: "`allowedTools` = tự duyệt; gỡ tool = `disallowedTools` hoặc `tools`"
    relearn: "#bước-5-giới-hạn-tool"
    relearnLabel: "Bước 5: giới hạn tool"
  - q: "In step 4, the same refund of order DH-1002 was run twice with minimal tool descriptions: once with structured errors and once with `SHOP_ERRORS=generic`. How did the two runs differ?"
    options:
      - text: "With the generic error the refund succeeded on a retry"
        why: "Đơn DH-1002 đang giao nên không bao giờ hoàn tiền được. Cả hai lần chạy đều không hoàn tiền."
      - text: "With the structured error the model stopped after one call and explained the exact rule; with 'Operation failed' it had to make an extra call to investigate and could only guess at the reason"
        why: "Đúng. Lỗi có `errorCategory`, `isRetryable` và thông điệp cụ thể cho model đủ thông tin để dừng và giải thích. Với lỗi chung chung, model gọi thêm `get_order` để tự tìm hiểu và trả lời bằng 'có thể là vì'."
      - text: "With the structured error the model retried three times because `isRetryable` was present"
        why: "`isRetryable` là `false` trong lỗi nghiệp vụ, và trace cho thấy model không gọi lại."
      - text: "There was no difference, because `isError: true` alone tells the model everything it needs"
        why: "`isError` chỉ nói rằng lời gọi thất bại. Hai trace khác nhau rõ rệt về số lời gọi và độ chắc chắn của câu trả lời."
    answer: 1
    keyword: "lỗi cụ thể → dừng đúng lúc, giải thích đúng; lỗi chung chung → **đoán**"
    relearn: "#bước-4-lỗi-có-cấu-trúc"
    relearnLabel: "Bước 4: lỗi có cấu trúc"
---

Trong lab này bạn làm việc với một MCP server nhỏ tên `shop`, có ba tool để tra cứu và hoàn tiền đơn hàng trên dữ liệu giả. Server viết bằng Python thuần, không cài gói nào, tự xử lý JSON-RPC qua stdio. Bạn sẽ nói chuyện trực tiếp với nó, rồi nối nó vào Claude Code và quan sát ba điều đã học: model chọn tool nhờ mô tả, lỗi có cấu trúc giúp model tự sửa, và cách giới hạn tool.

Mọi thứ chạy bằng Claude Code với tài khoản bạn đang đăng nhập, **không cần API key**. Cần có `python3` và `jq`. Nếu chưa chuẩn bị, xem [Chuẩn bị chạy lab](../../bat-dau/chuan-bi-lab/).

Mọi output mẫu bên dưới là output thật, chạy ngày 2026-11-19 với Claude Code 2.1.206 và `--model haiku`. Câu chữ của model sẽ khác mỗi lần chạy; thứ tự lời gọi tool thường giống.

## Thư mục lab

```text
labs/domain-2/
├── server.py            MCP server "shop": 3 tool, dữ liệu giả, chỉ dùng thư viện chuẩn
├── .mcp.json            khai báo server ở phạm vi project
├── mcp-deferred.json    bản cấu hình không có alwaysLoad (phần tự làm thêm)
├── requests.jsonl       6 message JSON-RPC để gửi bằng tay ở bước 1
├── trace.jq             bộ lọc rút gọn output stream-json
└── out/                 nơi ghi log của server
```

Vào thư mục lab trước khi chạy bất kỳ lệnh nào:

```bash
cd labs/domain-2
```

Mỗi lệnh `claude -p` kết thúc bằng `< /dev/null` để Claude Code không chờ dữ liệu từ stdin.

Dữ liệu trong server gồm bốn đơn hàng:

| Mã đơn | Khách | Trạng thái | Tổng tiền |
|---|---|---|---|
| DH-1001 | an@example.com | delivered | 450.000 |
| DH-1002 | an@example.com | shipping | 1.200.000 |
| DH-1003 | binh@example.com | delivered | 2.500.000 |
| DH-1004 | chi@example.com | cancelled | 300.000 |

## Bước 1: nói chuyện với server bằng tay

Một MCP server stdio chỉ là một chương trình đọc JSON-RPC từ stdin và ghi trả lời ra stdout, mỗi message một dòng. Xem sáu message sẽ gửi:

```bash
cat requests.jsonl
```

Đó là: `initialize`, thông báo `notifications/initialized`, `tools/list`, rồi ba lần `tools/call`. Gửi chúng cho server (lệnh `jq` chỉ rút gọn danh sách tool thành tên):

```bash
python3 server.py < requests.jsonl | jq -c 'if .result.tools then .result.tools |= map(.name) else . end'
```

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25","capabilities":{"tools":{}},"serverInfo":{"name":"shop","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"result":{"tools":["find_orders","get_order","refund_order"]}}
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"{\"count\": 0, \"orders\": []}"}],"isError":false}}
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"{\"errorCategory\": \"validation\", \"isRetryable\": false, \"message\": \"Mã đơn '1002' sai định dạng. Mã đơn phải có dạng DH-NNNN, ví dụ DH-1002.\", \"hint\": \"Sửa lại order_id cho đúng định dạng rồi gọi lại.\"}"}],"isError":true}}
{"jsonrpc":"2.0","id":5,"error":{"code":-32602,"message":"Unknown tool: delete_order"}}
```

Sáu message vào, năm dòng ra: thông báo `notifications/initialized` không có `id` nên không có trả lời. Đối chiếu với [bài 2.2](../02-loi-co-cau-truc/):

- **id 3** là kết quả **rỗng hợp lệ**: khách không có đơn nào, `isError: false`, `count` bằng 0.
- **id 4** là **lỗi thực thi tool**: vẫn là một `result`, có `isError: true`, và nội dung nói rõ sai gì, sửa thế nào.
- **id 5** là **lỗi giao thức**: tool không tồn tại, trả qua trường `error` của JSON-RPC.

Xem mô tả mà server công bố cho một tool:

```bash
python3 server.py < requests.jsonl | jq -r '.result.tools[]? | select(.name=="get_order") | .description'
```

```text
Lấy chi tiết MỘT đơn hàng khi đã biết mã đơn: sản phẩm, trạng thái, tổng tiền, email khách. Mã đơn có dạng DH- theo sau là 4 chữ số, ví dụ DH-1002. Nếu người dùng chỉ đưa số (1002), hãy thêm tiền tố DH-. Không dùng tool này để tìm đơn theo khách hàng; việc đó là của find_orders.
```

Mô tả này trả lời đủ bốn câu hỏi của [bài 2.1](../01-mo-ta-tool/#mô-tả-tốt-gồm-những-gì): làm gì, trả về gì, định dạng tham số, và ranh giới với `find_orders`.

## Bước 2: nối server vào Claude Code

Server được khai báo ở phạm vi project:

```bash
cat .mcp.json
```

```json
{
  "mcpServers": {
    "shop": {
      "command": "python3",
      "args": [
        "${CLAUDE_PROJECT_DIR:-.}/server.py"
      ],
      "env": {
        "SHOP_DESCRIPTIONS": "${SHOP_DESCRIPTIONS:-full}",
        "SHOP_ERRORS": "${SHOP_ERRORS:-structured}",
        "SHOP_LOG": "${SHOP_LOG:-}"
      },
      "alwaysLoad": true
    }
  }
}
```

Ba biến trong `env` dùng cú pháp `${VAR:-default}` của [bài 2.4](../04-cau-hinh-mcp/#file-mcpjson-và-biến-môi-trường). Nhờ đó các bước sau đổi hành vi của server bằng cách đặt biến môi trường trước lệnh `claude`, không phải sửa file. `alwaysLoad` làm Claude Code chờ server kết nối và nạp sẵn định nghĩa tool vào context.

Hỏi Claude Code xem nó thấy server thế nào:

```bash
claude mcp get shop
```

```text
shop:
  Scope: Project config (shared via .mcp.json)
  Status: ⏸ Pending approval (run `claude` to approve)

To remove this server, run: claude mcp remove shop -s project
```

Server phạm vi project phải được bạn duyệt trong một phiên tương tác. Lượt chạy `claude -p` không hiện được hộp thoại nên nạp thẳng server, và lab dựa vào điều đó.

Chạy câu hỏi đầu tiên, bật log của server:

```bash
SHOP_LOG=out/server.log claude -p "Khách an@example.com có những đơn hàng nào? Trả lời ngắn gọn." --model haiku --allowedTools "mcp__shop__find_orders,mcp__shop__get_order" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

```text
system/init   tool của server shop: find_orders, get_order, refund_order
assistant  → tool_use: shop/find_orders {"customer_email":"an@example.com"}
user       ← tool_result: {"count": 2, "orders": [{"order_id": "DH-1001", "status": "delivered", "total": 450000}, {"order_id": "DH-1002", "status": "shipping", "total": 1200000}]}
assistant  → text (109 ký tự)
result        subtype=success turns=2
---
Khách an@example.com có 2 đơn hàng:
- **DH-1001**: Đã giao (450.000 đ)
- **DH-1002**: Đang giao (1.200.000 đ)
```

`trace.jq` viết gọn tên tool: `shop/find_orders` trong trace là `mcp__shop__find_orders`, đúng mẫu `mcp__<server>__<tool>`.

Xem server đã nhận những gì:

```bash
cat out/server.log
```

```text
initialize
notifications/initialized
tools/list
tools/call name=find_orders args={"customer_email": "an@example.com"}
```

Đây chính là chuỗi message bạn gửi bằng tay ở bước 1. Claude Code tự bắt tay, tự hỏi danh sách tool, và chỉ gọi `tools/call` khi model phát ra `tool_use`. Bạn không khai báo tên tool nào ở phía Claude Code: chúng được phát hiện lúc kết nối.

:::note[Phiên bản giao thức]
Claude Code 2.1.206 mở đầu bằng `initialize` với `protocolVersion` là `2025-11-25`, và server của lab trả lời theo phiên bản đó. Đặc tả MCP mới nhất tại thời điểm soạn lab (`2026-07-28`) bỏ bước bắt tay `initialize`: mỗi request tự mang phiên bản giao thức. Server trong lab chỉ hỗ trợ kiểu có bắt tay. Phần đề thi hỏi (tool, resource, `isError`, cấu hình) không phụ thuộc vào khác biệt này.
:::

## Bước 3: mô tả quyết định lời gọi

Hỏi về một đơn mà người dùng chỉ đưa số:

```bash
claude -p "Đơn 1002 gồm sản phẩm gì và đang ở trạng thái nào?" --model haiku --allowedTools "mcp__shop__find_orders,mcp__shop__get_order" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

```text
system/init   tool của server shop: find_orders, get_order, refund_order
assistant  → tool_use: shop/get_order {"order_id":"DH-1002"}
user       ← tool_result: {"order_id": "DH-1002", "customer_email": "an@example.com", "status": "shipping", "total": 1200000, "item": "Màn hình 24 inch", "refunded": false}
assistant  → text (150 ký tự)
result        subtype=success turns=2
(câu trả lời của model: đã lược)
```

Model chọn `get_order` chứ không phải `find_orders`, và tự thêm tiền tố `DH-`. Cả hai quyết định đều đến từ mô tả tool bạn đọc ở bước 1.

Giờ chạy lại đúng câu hỏi đó với mô tả sơ sài. `SHOP_DESCRIPTIONS=minimal` đổi ba mô tả thành "Tìm đơn hàng.", "Lấy đơn hàng.", "Hoàn tiền." và mô tả tham số thành "Mã đơn":

```bash
SHOP_DESCRIPTIONS=minimal claude -p "Đơn 1002 gồm sản phẩm gì và đang ở trạng thái nào?" --model haiku --allowedTools "mcp__shop__find_orders,mcp__shop__get_order" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

```text
system/init   tool của server shop: find_orders, get_order, refund_order
assistant  → tool_use: shop/get_order {"order_id":"1002"}
user       ← tool_result [is_error]: {"errorCategory": "validation", "isRetryable": false, "message": "Mã đơn '1002' sai định dạng. Mã đơn phải có dạng DH-NNNN, ví dụ DH-1002.", "hint": "Sửa lại order_id cho đúng định dạng rồi gọi lại."}
assistant  → tool_use: shop/get_order {"order_id":"DH-1002"}
user       ← tool_result: {"order_id": "DH-1002", "customer_email": "an@example.com", "status": "shipping", "total": 1200000, "item": "Màn hình 24 inch", "refunded": false}
assistant  → text (191 ký tự)
result        subtype=success turns=3
(câu trả lời của model: đã lược)
```

Hai điều đáng chú ý:

- Không có mô tả định dạng, model truyền `1002`. Thông tin về định dạng không có ở đâu khác để nó biết.
- Lỗi validation nêu rõ định dạng đúng kèm ví dụ, nên model **tự sửa** và gọi lại thành công. Cái giá là thêm một turn. Mô tả tốt tránh được lỗi; lỗi tốt cứu được lời gọi khi mô tả chưa tốt.

## Bước 4: lỗi có cấu trúc

**Lỗi tạm thời.** Server giả lập cổng thanh toán timeout ở lần gọi `refund_order` đầu tiên của mỗi đơn:

```bash
claude -p "Hoàn tiền đơn DH-1001, lý do: khách nhận hàng bị lỗi phím." --model haiku --allowedTools "mcp__shop__*" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

```text
system/init   tool của server shop: find_orders, get_order, refund_order
assistant  → tool_use: shop/get_order {"order_id":"DH-1001"}
user       ← tool_result: {"order_id": "DH-1001", "customer_email": "an@example.com", "status": "delivered", "total": 450000, "item": "Bàn phím cơ", "refunded": false}
assistant  → tool_use: shop/refund_order {"order_id":"DH-1001","reason":"khách nhận hàng bị lỗi phím"}
user       ← tool_result [is_error]: {"errorCategory": "transient", "isRetryable": true, "message": "Cổng thanh toán không phản hồi trong 5 giây (timeout). Chưa có khoản tiền nào được chuyển.", "hint": "Gọi lại refund_order với đúng tham số cũ."}
assistant  → tool_use: shop/refund_order {"order_id":"DH-1001","reason":"khách nhận hàng bị lỗi phím"}
user       ← tool_result: {"order_id": "DH-1001", "refunded_amount": 450000, "status": "refunded"}
assistant  → text (251 ký tự)
result        subtype=success turns=4
(câu trả lời của model: đã lược)
```

Model gọi `get_order` trước vì mô tả của `refund_order` yêu cầu vậy. Khi gặp lỗi `transient` với `isRetryable: true` và lời khẳng định "chưa có khoản tiền nào được chuyển", nó gọi lại đúng một lần và thành công.

**Lỗi nghiệp vụ.** Đơn DH-1002 đang giao nên không hoàn tiền được. Với mô tả đầy đủ, model đọc được quy tắc này trong mô tả và thường không gọi `refund_order` nữa. Để nhìn thấy lỗi, dùng mô tả sơ sài:

```bash
SHOP_DESCRIPTIONS=minimal claude -p "Hoàn tiền đơn DH-1002, lý do: khách đổi ý." --model haiku --allowedTools "mcp__shop__*" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

```text
system/init   tool của server shop: find_orders, get_order, refund_order
assistant  → tool_use: shop/refund_order {"order_id":"DH-1002","reason":"khách đổi ý"}
user       ← tool_result [is_error]: {"errorCategory": "business", "isRetryable": false, "message": "Đơn DH-1002 đang ở trạng thái 'shipping'. Chỉ hoàn tiền được đơn đã giao (delivered).", "hint": "Không gọi lại. Giải thích cho khách và đề nghị hủy đơn hoặc chờ giao …
assistant  → text (432 ký tự)
result        subtype=success turns=2
---
Không thể hoàn tiền đơn DH-1002 vì đơn hàng hiện đang ở trạng thái **đang giao (shipping)**. Hệ thống chỉ cho phép hoàn tiền đối với các đơn hàng đã giao hàng (delivered).
(phần còn lại: đã lược)
```

Một lời gọi, không thử lại, và câu trả lời nêu đúng quy tắc.

**Cùng lỗi đó, báo chung chung.** `SHOP_ERRORS=generic` làm mọi lỗi trở thành `Operation failed`:

```bash
SHOP_DESCRIPTIONS=minimal SHOP_ERRORS=generic claude -p "Hoàn tiền đơn DH-1002, lý do: khách đổi ý." --model haiku --allowedTools "mcp__shop__*" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

```text
system/init   tool của server shop: find_orders, get_order, refund_order
assistant  → tool_use: shop/refund_order {"order_id":"DH-1002","reason":"khách đổi ý"}
user       ← tool_result [is_error]: Operation failed
assistant  → tool_use: shop/get_order {"order_id":"DH-1002"}
user       ← tool_result: {"order_id": "DH-1002", "customer_email": "an@example.com", "status": "shipping", "total": 1200000, "item": "Màn hình 24 inch", "refunded": false}
assistant  → text (558 ký tự)
result        subtype=success turns=3
---
(phần đầu: đã lược)
Lý do hoàn tiền thất bại có thể là vì đơn hàng đang trong quá trình vận chuyển. Hệ thống có thể yêu cầu:
(danh sách: đã lược)
Bạn có muốn tôi thử lại hoặc kiểm tra thêm thông tin gì không?
```

So với lần chạy trước: model phải gọi thêm một tool để tự điều tra, câu trả lời dùng "có thể là vì", và nó đề nghị **thử lại** một thao tác không bao giờ thành công. Lần này model đoán đúng nguyên nhân vì dữ liệu đơn hàng gợi ý được. Với lỗi vượt hạn mức hay lỗi quyền truy cập, không có gì để đoán.

## Bước 5: giới hạn tool

Yêu cầu hoàn tiền, nhưng chỉ tự duyệt hai tool đọc:

```bash
claude -p "Hoàn tiền đơn DH-1001, lý do: khách nhận hàng bị lỗi phím." --model haiku --allowedTools "mcp__shop__find_orders,mcp__shop__get_order" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

```text
system/init   tool của server shop: find_orders, get_order, refund_order
assistant  → tool_use: shop/get_order {"order_id":"DH-1001"}
user       ← tool_result: {"order_id": "DH-1001", "customer_email": "an@example.com", "status": "delivered", "total": 450000, "item": "Bàn phím cơ", "refunded": false}
assistant  → tool_use: shop/refund_order {"order_id":"DH-1001","reason":"Khách nhận hàng bị lỗi phím"}
user       ← tool_result [is_error]: Claude requested permissions to use mcp__shop__refund_order, but you haven't granted it yet.
assistant  → text (280 ký tự)
result        subtype=success turns=3
---
(phần đầu: đã lược)
Đơn hàng đủ điều kiện để hoàn tiền. Tôi cần sự cho phép để thực hiện hoàn tiền với lý do "Khách nhận hàng bị lỗi phím".
```

`refund_order` vẫn nằm trong dòng `system/init`. Model **thấy** tool, **gọi** nó, và lời gọi bị từ chối ở lớp permission vì không ai duyệt. Lời gọi không tới server.

Giờ gỡ hẳn tool:

```bash
claude -p "Hoàn tiền đơn DH-1001, lý do: khách nhận hàng bị lỗi phím." --model haiku --allowedTools "mcp__shop__*" --disallowedTools "mcp__shop__refund_order" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

```text
system/init   tool của server shop: find_orders, get_order
assistant  → text (49 ký tự)
assistant  → tool_use: shop/get_order {"order_id":"DH-1001"}
user       ← tool_result: {"order_id": "DH-1001", "customer_email": "an@example.com", "status": "delivered", "total": 450000, "item": "Bàn phím cơ", "refunded": false}
assistant  → text (603 ký tự)
result        subtype=success turns=2
---
(phần đầu: đã lược)
Tuy nhiên, hệ thống hiện tại chỉ cho phép tôi **xem thông tin đơn hàng**, không có công cụ để **xử lý hoàn tiền**.
(phần còn lại: đã lược)
```

Đối chiếu với [bài 2.3](../03-chia-tool-va-tool-choice/#hai-lớp-kiểm-soát-tồn-tại-và-được-duyệt):

- Dòng `system/init` chỉ còn hai tool, dù `--allowedTools` là `mcp__shop__*`. Luật từ chối thắng luật cho phép.
- Model không thử gọi `refund_order` vì với nó tool này không tồn tại. Nó nói thẳng là không có công cụ hoàn tiền.
- Đây là cách giới hạn một agent "chỉ tra cứu" cho chắc chắn. Bỏ tool ra khỏi `allowedTools` chỉ có nghĩa là lời gọi cần được duyệt.

## Tự làm thêm

1. **Tool search.** `mcp-deferred.json` giống `.mcp.json` nhưng không có `alwaysLoad`. Chạy câu hỏi của bước 2 với `MCP_CONNECTION_NONBLOCKING=0 claude -p "..." --strict-mcp-config --mcp-config mcp-deferred.json` và các cờ còn lại như cũ. Trace sẽ có thêm một lời gọi `ToolSearch` trước khi model dùng được tool của `shop`. Khi soạn lab, hai lần chạy thử cho hai kết quả: một lần model tìm được tool rồi gọi `find_orders` trong 3 turn, một lần nó tìm xong nhưng không gọi được tool và quay sang thử `Bash`. Tool nạp theo yêu cầu tiết kiệm context nhưng thêm một bước có thể hỏng với model nhỏ.
2. **Lỗi vượt hạn mức.** Yêu cầu hoàn tiền đơn DH-1003 với `SHOP_DESCRIPTIONS=minimal`. Lỗi trả về thuộc nhóm nào, và model có đề nghị chuyển cho nhân viên không?
3. **Thêm resource.** Sửa `server.py` để khai báo capability `resources` và trả lời `resources/list`, `resources/read` cho một resource `shop://policy/refund` chứa chính sách hoàn tiền. Sau đó hỏi model về chính sách và xem nó có dùng `ReadMcpResourceTool` không.
4. **Nuốt lỗi.** Sửa `find_orders` để khi `customer_email` không chứa ký tự `@` thì trả danh sách rỗng thay vì lỗi validation. Hỏi "khách tên An có đơn nào" và xem model kết luận gì.

## Dọn dẹp

Lab chỉ tạo file log:

```bash
rm -f out/server.log
```
