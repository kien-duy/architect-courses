---
title: 3.5 · Tinh chỉnh lặp
description: Dùng ví dụ đầu vào và đầu ra cụ thể, test viết trước, mẫu phỏng vấn và cách gom phản hồi để đưa Claude tới kết quả đúng qua từng vòng.
lesson:
  day: 7
  minutes: 12
quiz:
  - q: "A developer asks Claude to 'normalize the phone numbers in the import script'. Two attempts produce plausible but different formats, neither matching what the CRM expects. The developer keeps rephrasing the description in prose. What is the most effective next step?"
    options:
      - text: "Write a longer description that uses the word 'exactly' and lists the formatting rules in a paragraph"
        why: "Mô tả bằng lời vẫn để lại khoảng trống cho nhiều cách hiểu. Hai lần thử trước đã cho thấy vấn đề nằm ở sự mơ hồ, không phải ở độ dài."
      - text: "Provide two or three concrete input and output pairs, including an awkward case such as a number with an extension"
        why: "Đúng. Cặp đầu vào và đầu ra cụ thể xác định phép biến đổi rõ hơn mọi mô tả, và một ví dụ khó cho thấy luôn cách xử lý trường hợp biên."
      - text: "Raise the effort level so Claude thinks harder about the description"
        why: "Suy nghĩ lâu hơn không tạo ra thông tin mà prompt không có. Claude vẫn phải đoán định dạng mà CRM cần."
      - text: "Switch to plan mode and ask for a plan before the third attempt"
        why: "Kế hoạch giúp chọn hướng cho thay đổi lớn. Ở đây hướng làm đã rõ, thứ thiếu là định nghĩa chính xác của output."
    answer: 1
    keyword: "mô tả bằng lời bị hiểu khác nhau → đưa **2–3 cặp input/output** cụ thể"
    relearn: "#ví-dụ-đầu-vào-và-đầu-ra-cụ-thể"
    relearnLabel: "Ví dụ đầu vào và đầu ra cụ thể"
  - q: "After Claude implements a pricing module, the reviewer finds three problems: the rounding helper returns floats, the discount function calls that helper, and the invoice total is wrong because it sums the discounted values. How should the developer send this feedback?"
    options:
      - text: "One message per problem, waiting for each fix, starting with the invoice total"
        why: "Ba vấn đề này dính nhau. Sửa tổng hóa đơn trước khi sửa hàm làm tròn sẽ phải sửa lại lần nữa khi kiểu trả về thay đổi."
      - text: "Start a new session and re-describe the whole module from scratch"
        why: "Bắt đầu lại hợp lý sau nhiều lần sửa hỏng. Ở đây mới là vòng phản hồi đầu tiên và các vấn đề đã được xác định rõ."
      - text: "Send only the invoice total problem, since fixing the symptom will lead Claude to the cause"
        why: "Sửa triệu chứng mà không nêu nguyên nhân dễ dẫn tới một bản vá tại chỗ, để nguyên hàm làm tròn sai."
      - text: "All three in a single message, explaining how they relate, so Claude can design one consistent fix"
        why: "Đúng. Các vấn đề phụ thuộc lẫn nhau nên đưa cùng lúc: Claude thấy được chuỗi nguyên nhân và sửa từ gốc. Vấn đề độc lập thì gửi lần lượt mới hợp."
    answer: 3
    keyword: "vấn đề **phụ thuộc nhau** → gửi chung một message; **độc lập** → lần lượt"
    relearn: "#gửi-một-lần-hay-gửi-từng-vấn-đề"
    relearnLabel: "Gửi một lần hay gửi từng vấn đề"
---

Ít khi một prompt cho ra đúng thứ bạn cần ngay lần đầu. Kỹ năng được kiểm tra ở mục này là chọn đúng kỹ thuật cho vòng tiếp theo: thêm ví dụ, thêm test, để Claude hỏi lại, hay bắt đầu lại.

## Claude không thấy điều bạn không nói

Claude đọc code rất giỏi. Nó tự tìm được cấu trúc thư mục, framework test, cách các component hiện có được viết. Thứ nó không thể tìm là thông tin chưa từng nằm trong repo: định dạng mà hệ thống đối tác yêu cầu, quyết định của đội trong một buổi họp, hay việc bạn thích hướng nào trong hai hướng đều hợp lý.

Vì vậy một prompt tốt cung cấp đúng phần thiếu đó:

| Thay vì | Hãy viết |
|---|---|
| "sửa lỗi đăng nhập" | "người dùng báo đăng nhập hỏng sau khi phiên hết hạn. Xem phần làm mới token trong `src/auth/`, viết một test tái hiện lỗi, rồi sửa" |
| "thêm trang cài đặt" | "làm theo mẫu của `ProfilePage.tsx`, thêm trang cài đặt có ba mục A, B, C. Không thêm thư viện mới" |

Khi kết quả vẫn lệch, mỗi kỹ thuật dưới đây bổ sung một loại thông tin khác nhau.

## Ví dụ đầu vào và đầu ra cụ thể

Mô tả bằng lời luôn có nhiều cách hiểu. "Chuẩn hóa số điện thoại" có thể ra `0901234567`, `+84901234567` hay `090 123 4567`. Hai tới ba cặp đầu vào và đầu ra xóa sự mơ hồ đó nhanh hơn một đoạn văn dài:

```text
Chuẩn hóa số điện thoại trong cột `phone`. Ví dụ:

  "0901 234 567"        → "+84901234567"
  "(+84) 90-123-4567"   → "+84901234567"
  "0901234567 ext 12"   → "+84901234567;ext=12"
  "không có"            → null
```

Cách chọn ví dụ:

- **Hai tới ba ví dụ là đủ** cho một phép biến đổi. Nhiều hơn thường không thêm thông tin.
- **Có ít nhất một trường hợp khó**: giá trị rỗng, định dạng lạ, dữ liệu sai. Đó là nơi các cách hiểu rẽ nhánh.
- **Dùng dữ liệu giống thật**, lấy từ chính hệ thống của bạn.

Dấu hiệu nên chuyển sang ví dụ: bạn đã diễn đạt lại yêu cầu hai lần và kết quả vẫn "gần đúng" theo những kiểu khác nhau.

## Viết test trước rồi lặp theo lỗi

Claude dừng khi công việc **trông có vẻ** xong. Nếu không có gì để chạy và nhận về "đạt" hay "hỏng", bạn trở thành bộ test, và mỗi lỗi nằm đó cho tới khi bạn tình cờ thấy.

Đưa cho Claude một phép kiểm tra chạy được thì nó tự khép vòng: sửa, chạy, đọc lỗi, sửa tiếp.

1. **Viết test trước**, từ yêu cầu chứ không phải từ code. Bộ test nên phủ hành vi mong đợi, trường hợp biên, và yêu cầu hiệu năng nếu có.
2. **Chạy và xác nhận test đang hỏng.** Một test chưa từng hỏng thì chưa chứng minh được gì.
3. **Yêu cầu Claude viết code cho tới khi test qua**, và dặn không sửa test.
4. **Lặp theo lỗi.** Khi phát hiện một trường hợp mới, thêm nó thành test rồi mới yêu cầu sửa.

```text
Viết test cho `apply_voucher(total_vnd, code)` trong tests/test_voucher.py:
- mã hợp lệ giảm 10%, làm tròn xuống
- mã hết hạn trả lỗi VOUCHER_EXPIRED
- tổng tiền sau giảm không bao giờ âm
- 10.000 lần gọi chạy dưới 1 giây
Chạy và xác nhận test hỏng. Sau đó viết hàm cho tới khi mọi test qua. Không sửa test.
```

Phép kiểm tra không nhất thiết là unit test. Mã thoát của lệnh build, một linter, hay script so output với file mẫu đều dùng được, miễn Claude đọc được kết quả. Nếu repo đã có sẵn lệnh như vậy, đó là dòng đáng giá nhất trong CLAUDE.md.

Luôn yêu cầu **bằng chứng**: lệnh đã chạy và output của nó. Câu "mọi test đều qua" tự thân nó nói rất ít.

Khi sinh test trong một dự án đã có test, đưa file test hiện có vào context và ghi chuẩn test cùng các fixture có sẵn vào CLAUDE.md. Claude sẽ theo đúng phong cách và không viết trùng.

## Để Claude phỏng vấn bạn

Có những lúc bạn chưa biết đủ để viết yêu cầu. Thay vì cố nghĩ hết mọi thứ, hãy đảo vai: để Claude hỏi.

```text
Tôi muốn thêm cache cho API tra cứu sản phẩm nhưng chưa nghĩ kỹ.
Hãy phỏng vấn tôi cho tới khi bạn đủ thông tin để viết đặc tả, rồi ghi vào SPEC.md.
```

Claude sẽ hỏi về những phần bạn chưa chốt: cache theo người dùng hay toàn cục, khi nào dữ liệu bị coi là cũ, làm gì khi kho cache không truy cập được, phần nào nằm ngoài phạm vi. Mẫu phỏng vấn có giá trị vì nó **làm lộ ra các câu hỏi thiết kế bạn chưa nghĩ tới**, điển hình là cách vô hiệu hóa cache và các kiểu hỏng hóc.

Dùng mẫu này khi:

- Việc có nhiều quyết định thiết kế ẩn và bạn không chắc đã thấy hết.
- Bạn làm trong một lĩnh vực chưa quen.
- Sai ở yêu cầu sẽ đắt hơn nhiều so với vài phút trả lời câu hỏi.

Không cần phỏng vấn cho việc nhỏ đã rõ. Khi `SPEC.md` đã có, nên mở phiên mới để thực thi từ file đó, như ở [bài 3.4](../04-plan-mode/#kết-hợp-hai-cách).

## Gửi một lần hay gửi từng vấn đề

Sau khi xem kết quả, bạn thường có vài điều cần sửa. Gửi thế nào phụ thuộc vào quan hệ giữa chúng.

| Các vấn đề | Cách gửi | Lý do |
|---|---|---|
| **Phụ thuộc nhau**: cùng nguyên nhân, hoặc sửa cái này thay đổi cách sửa cái kia | Tất cả trong **một message**, nói rõ quan hệ | Claude thiết kế một cách sửa nhất quán. Gửi lẻ dẫn tới sửa đi sửa lại |
| **Độc lập**: không chạm vào nhau | **Lần lượt**, kiểm tra sau mỗi lần | Mỗi lần sửa nhỏ, dễ xác minh, lỗi mới không lẫn vào nhau |

Ví dụ phụ thuộc: hàm làm tròn trả sai kiểu, hàm giảm giá dùng hàm làm tròn, tổng hóa đơn cộng các giá trị đã giảm. Ba triệu chứng, một chuỗi nguyên nhân. Gửi chung.

Ví dụ độc lập: một lỗi chính tả trong thông báo, một import thừa, một test chạy chậm ở module khác. Gửi từng cái, hoặc gộp thành danh sách nếu chúng quá nhỏ.

## Khi nào nên bắt đầu lại

Lặp không có nghĩa là sửa mãi trong một hội thoại. Mỗi lần sửa hỏng ở lại trong context và Claude đọc lại chúng ở mọi lượt sau.

| Tình huống | Hành động |
|---|---|
| Claude vừa đi lệch hướng | Nhấn `Esc` để dừng ngay và chỉnh hướng, giữ nguyên phần đã làm |
| Muốn quay code hoặc hội thoại về một điểm trước đó | `/rewind` |
| Đã sửa cùng một điều hai lần mà vẫn sai | `/clear`, rồi viết một prompt mới gom những gì bạn đã học được |
| Chuyển sang việc không liên quan | `/clear` để việc mới không phải mang theo lịch sử cũ |

Quy tắc hai lần sửa hỏng đáng nhớ: lần sửa thứ ba chủ yếu là thêm chữ vào một hội thoại đã chứa hai lần thất bại. Một prompt mới, cụ thể hơn, gần như luôn cho kết quả tốt hơn.

Tài liệu gốc: [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices), [Common workflows](https://code.claude.com/docs/en/common-workflows).

## Tóm tắt

- Cung cấp điều Claude không tự tìm được trong repo. Đó là phần thiếu của hầu hết prompt.
- Yêu cầu biến đổi bị hiểu sai: đưa 2–3 cặp đầu vào và đầu ra, có trường hợp khó.
- Viết test trước, xác nhận test hỏng, rồi để Claude lặp theo lỗi cho tới khi qua. Yêu cầu bằng chứng.
- Chưa rõ yêu cầu: để Claude phỏng vấn bạn rồi ghi thành đặc tả.
- Vấn đề phụ thuộc nhau gửi chung một message. Vấn đề độc lập gửi lần lượt.
- Sau hai lần sửa hỏng cho cùng một điều, `/clear` và viết prompt tốt hơn.
