---
title: 1.4 · Phân rã nhiệm vụ
description: Chọn giữa pipeline cố định và phân rã động, và tránh lỗi phân rã quá hẹp.
lesson:
  day: 2
  minutes: 12
quiz:
  - q: "A multi-agent system is asked to report on 'the impact of AI on creative industries'. The coordinator creates subtasks for digital art, graphic design, and photography. Every subagent completes successfully, yet the final report says nothing about music, writing, or film. What is the root cause?"
    options:
      - text: "The search subagent returned incomplete results"
        why: "Các subagent đều hoàn thành đúng việc được giao. Chúng không được giao tìm về âm nhạc, văn học hay điện ảnh."
      - text: "The synthesis subagent dropped sections while merging"
        why: "Subagent tổng hợp chỉ gộp những gì nó nhận. Dữ liệu về các lĩnh vực còn thiếu chưa bao giờ được thu thập."
      - text: "The coordinator's task decomposition was too narrow and did not cover the full topic"
        why: "Đúng. Coordinator đã hiểu 'ngành sáng tạo' thành chỉ nghệ thuật thị giác. Lỗi nằm ở bước phân rã, trước khi bất kỳ subagent nào chạy."
      - text: "The subagents ran in parallel and could not share findings"
        why: "Chạy song song không gây thiếu chủ đề. Các việc con vốn độc lập, và chủ đề thiếu không nằm trong việc con nào."
    answer: 2
    keyword: "mọi subagent đều thành công nhưng thiếu chủ đề → lỗi phân rã của coordinator"
    relearn: "#lỗi-phân-rã-quá-hẹp"
    relearnLabel: "Lỗi phân rã quá hẹp"
  - q: "A team needs an automated code review that always runs the same three checks on every pull request: style, security, then test coverage. Which decomposition strategy fits best?"
    options:
      - text: "A fixed pipeline (prompt chaining) with one step per check"
        why: "Đúng. Các bước đã biết trước và giống nhau cho mọi đầu vào, nên pipeline cố định cho kết quả dễ dự đoán, dễ kiểm thử và dễ gỡ lỗi."
      - text: "Dynamic decomposition where the coordinator decides the steps for each pull request"
        why: "Phân rã động hữu ích khi chưa biết trước các bước. Ở đây nó chỉ thêm biến động và chi phí cho một quy trình vốn cố định."
      - text: "A single prompt that asks for all three checks at once"
        why: "Gộp nhiều việc vào một prompt làm giảm độ chú ý cho từng việc, và khó biết bước nào sai."
      - text: "Three subagents that each decide which check they want to run"
        why: "Để subagent tự chọn việc làm mất tính xác định: một bước kiểm tra có thể bị bỏ sót hoặc làm trùng."
    answer: 0
    keyword: "các bước **biết trước và lặp lại** → pipeline cố định"
    relearn: "#hai-chiến-lược-phân-rã"
    relearnLabel: "Hai chiến lược phân rã"
---

Chia việc đúng quan trọng hơn chạy việc nhanh. Một hệ nhiều agent mà mọi subagent đều "thành công" vẫn cho ra kết quả sai nếu coordinator chia việc sai ngay từ đầu.

## Hai chiến lược phân rã

| | Pipeline cố định (prompt chaining) | Phân rã động |
|---|---|---|
| **Ai quyết định các bước** | Bạn, lúc thiết kế | Model, lúc chạy, dựa trên những gì nó tìm thấy |
| **Hợp với** | Việc lặp lại, các bước biết trước: review theo checklist, trích xuất rồi kiểm tra rồi định dạng | Việc mở, chưa biết phạm vi: điều tra lỗi, nghiên cứu một chủ đề, khảo sát codebase lạ |
| **Ưu điểm** | Dễ dự đoán, dễ kiểm thử từng bước, dễ tìm bước sai | Thích nghi với điều phát hiện giữa chừng |
| **Nhược điểm** | Cứng nhắc khi đầu vào nằm ngoài dự kiến | Khó dự đoán hơn, tốn hơn, cần giới hạn turn và chi phí |

**Pipeline cố định** chia một việc lớn thành chuỗi bước, output của bước trước là input của bước sau. Mỗi bước là một prompt tập trung vào một việc, nên model chú ý trọn vẹn vào việc đó.

**Phân rã động** để model lập kế hoạch, làm một phần, xem kết quả, rồi điều chỉnh kế hoạch. Ví dụ "thêm test cho module thanh toán": agent đọc cấu trúc module trước, phát hiện những hàm chưa có test, xếp ưu tiên, và nếu giữa chừng thấy một phụ thuộc cần mock thì bổ sung bước đó.

Cách chọn: **nếu bạn viết được danh sách bước trước khi chạy, và danh sách đó đúng cho mọi đầu vào, hãy dùng pipeline cố định.** Chỉ dùng phân rã động khi các bước thật sự phụ thuộc vào thứ sẽ phát hiện trong lúc làm.

## Lỗi phân rã quá hẹp

Tình huống kinh điển: người dùng yêu cầu báo cáo về "tác động của AI tới các ngành sáng tạo". Coordinator chia thành ba việc con: nghệ thuật số, thiết kế đồ họa, nhiếp ảnh. Ba subagent đều làm tốt. Báo cáo cuối không nhắc gì tới âm nhạc, văn học hay điện ảnh.

Không subagent nào sai. Subagent tìm kiếm tìm đúng thứ được giao. Subagent tổng hợp gộp đúng thứ nó nhận. **Lỗi nằm ở coordinator**, ở bước phân rã: nó thu hẹp "ngành sáng tạo" thành nghệ thuật thị giác.

Dấu hiệu nhận ra dạng câu hỏi này: mọi subagent đều hoàn thành, không có lỗi kỹ thuật, nhưng kết quả cuối **thiếu phạm vi**. Đáp án gần như luôn là "phân rã của coordinator quá hẹp", không phải subagent ở hạ nguồn.

Cách giảm lỗi này:

- **Bắt coordinator liệt kê phạm vi trước khi giao việc**, rồi đối chiếu danh sách việc con với yêu cầu gốc.
- **Cho coordinator đánh giá kết quả tổng hợp** và giao thêm việc nếu thấy thiếu, thay vì chỉ chạy một lượt.
- **Giao mục tiêu, không giao danh sách từ khóa.** "Tìm tác động của AI tới các ngành sáng tạo, gồm cả nghe nhìn và xuất bản" tốt hơn một danh sách ba chủ đề cứng.

## Coordinator nên quyết định những gì

Một coordinator tốt không tự động chạy mọi subagent cho mọi yêu cầu.

- **Chọn subagent theo yêu cầu.** Câu hỏi đơn giản có thể không cần subagent nào. Chạy cả dây chuyền cho một câu hỏi tra cứu là lãng phí.
- **Chia phạm vi không chồng lấn.** Hai subagent cùng nghiên cứu một chủ đề con tạo ra trùng lặp và mâu thuẫn.
- **Lặp có kiểm soát.** Sau khi tổng hợp, coordinator kiểm tra độ phủ và chất lượng; nếu thiếu thì giao lại với yêu cầu cụ thể hơn, cho tới khi đạt hoặc chạm giới hạn.

## Tách việc lớn theo lượt

Với một việc quá lớn cho một lượt chú ý, hãy tách theo lượt thay vì nhồi vào một prompt.

Ví dụ review một pull request sửa 14 file. Một lượt review duy nhất thường cho nhận xét sâu ở vài file đầu và hời hợt ở phần còn lại, thậm chí nhận xét mâu thuẫn nhau. Cách tốt hơn:

1. **Lượt theo từng file**: mỗi file được phân tích riêng, tìm lỗi cục bộ.
2. **Lượt tích hợp**: một lượt riêng xem luồng dữ liệu giữa các file, chỉ nhận kết quả tóm tắt của lượt một.

Mỗi lượt có một mục tiêu rõ, nên chất lượng đều hơn. Kỹ thuật này quay lại ở Domain 4.

## Khi nào không nên dùng nhiều agent

Nhiều agent không miễn phí. Mỗi subagent là thêm lời gọi model, thêm chi phí, và thêm một chỗ có thể mất thông tin khi tóm tắt.

Dùng một agent khi việc nhỏ, các bước phụ thuộc chặt vào nhau, hoặc cần giữ toàn bộ chi tiết trong một context. Dùng subagent khi có việc con độc lập chạy song song được, khi một việc con sinh ra rất nhiều output trung gian không cần giữ, hoặc khi cần bộ tool và chỉ dẫn khác hẳn.

Tài liệu gốc: [Choose between subagents and main conversation](https://code.claude.com/docs/en/sub-agents#choose-between-subagents-and-main-conversation).

## Tóm tắt

- Biết trước các bước → pipeline cố định. Phải khám phá mới biết → phân rã động.
- Mọi subagent thành công nhưng thiếu chủ đề → lỗi phân rã của coordinator.
- Coordinator chọn subagent theo yêu cầu, chia phạm vi không chồng lấn, và kiểm tra độ phủ trước khi kết thúc.
- Việc lớn: tách thành lượt cục bộ rồi lượt tích hợp.
