def format_vnd(amount_vnd: int) -> str:
    """Định dạng số tiền thành chuỗi có dấu chấm phân cách nghìn."""
    return f"{amount_vnd:,}".replace(",", ".") + " đ"


def apply_discount(amount_vnd: int, percent: int) -> int:
    """Trả về số tiền sau khi giảm theo phần trăm, làm tròn xuống."""
    return amount_vnd * (100 - percent) // 100
