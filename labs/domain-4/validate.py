#!/usr/bin/env python3
"""Kiểm tra lỗi ngữ nghĩa mà JSON schema không bắt được.

Cách dùng: python3 validate.py out/hoa-don-03.json
In mỗi lỗi trên một dòng. Mã thoát 0 nếu hợp lệ, 1 nếu có lỗi.
"""
import json
import re
import sys
from datetime import date


def vnd(n):
    return f"{n:,}".replace(",", ".")


def check(inv):
    errors = []

    for field in ("issue_date", "due_date"):
        value = inv.get(field)
        if value is None:
            continue
        try:
            date.fromisoformat(value)
        except ValueError:
            errors.append(f"{field} = '{value}' không phải ngày dạng YYYY-MM-DD.")

    tax = inv.get("vendor_tax_code")
    if tax is not None and not re.fullmatch(r"\d{10}(-?\d{3})?", tax):
        errors.append(f"vendor_tax_code = '{tax}' không phải mã số thuế 10 hoặc 13 chữ số. Nếu văn bản không ghi thì để null.")

    for i, item in enumerate(inv["line_items"], start=1):
        qty, price = item.get("quantity"), item.get("unit_price")
        if qty is not None and price is not None and round(qty * price) != item["amount"]:
            errors.append(f"line_items[{i}]: quantity {qty} x unit_price {vnd(price)} = {vnd(round(qty * price))}, khác amount {vnd(item['amount'])}.")

    lines_sum = sum(item["amount"] for item in inv["line_items"])
    vat = inv.get("vat_amount") or 0
    subtotal = inv.get("stated_subtotal")

    if subtotal is not None and lines_sum != subtotal:
        errors.append(f"Tổng amount của line_items = {vnd(lines_sum)}, khác stated_subtotal = {vnd(subtotal)} (lệch {vnd(subtotal - lines_sum)}).")
    if inv["calculated_total"] != lines_sum + vat:
        errors.append(f"calculated_total = {vnd(inv['calculated_total'])}, nhưng tổng line_items + vat_amount = {vnd(lines_sum + vat)}.")
    if inv["stated_total"] != lines_sum + vat:
        errors.append(f"stated_total = {vnd(inv['stated_total'])}, khác tổng line_items + vat_amount = {vnd(lines_sum + vat)} (lệch {vnd(inv['stated_total'] - lines_sum - vat)}).")
    return errors


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as f:
        invoice = json.load(f)
    problems = check(invoice)
    if not problems:
        print("OK")
        sys.exit(0)
    for p in problems:
        print("LỖI: " + p)
    sys.exit(1)
