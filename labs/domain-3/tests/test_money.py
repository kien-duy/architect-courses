import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from utils.money import apply_discount, format_vnd


class MoneyTest(unittest.TestCase):
    def test_format_vnd(self):
        self.assertEqual(format_vnd(1250000), "1.250.000 đ")

    def test_apply_discount_rounds_down(self):
        self.assertEqual(apply_discount(99999, 10), 89999)


if __name__ == "__main__":
    unittest.main()
