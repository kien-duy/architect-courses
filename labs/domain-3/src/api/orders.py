ORDERS = {
    "A100": {"items": [{"sku": "TEA-01", "price": 45000.0, "qty": 2}]},
    "A101": {"items": [{"sku": "CUP-07", "price": 120000.0, "qty": 1}]},
}


def get_order_total(order_id):
    try:
        order = ORDERS[order_id]
        total = 0.0
        for item in order["items"]:
            total += item["price"] * item["qty"]
        return {"ok": True, "total": total}
    except Exception as exc:
        return {"ok": False, "message": str(exc)}


def cancel_order(order_id: str) -> dict:
    """Hủy một đơn hàng theo mã đơn."""
    if not isinstance(order_id, str) or not order_id:
        return {"ok": False, "data": None, "error": "INVALID_ORDER_ID"}
    if order_id not in ORDERS:
        return {"ok": False, "data": None, "error": "ORDER_NOT_FOUND"}
    del ORDERS[order_id]
    return {"ok": True, "data": {"order_id": order_id}, "error": None}
