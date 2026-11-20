---
title: 3.4 · Plan mode hay thực thi trực tiếp
description: Khi nào để Claude nghiên cứu và lập kế hoạch trước, khi nào cho sửa ngay, và cách dùng subagent Explore để giữ context gọn.
lesson:
  day: 7
  minutes: 12
quiz:
  - q: "A team must split a monolith's order module into a separate service. The change will touch roughly 50 files, there are at least three plausible ways to draw the service boundary, and the choice affects other teams. How should the lead developer start the Claude Code session?"
    options:
      - text: "Start in plan mode so Claude explores the codebase and proposes an approach for review before any file is edited"
        why: "Đúng. Thay đổi lớn, nhiều hướng khả thi và có hệ quả kiến trúc là đúng ba dấu hiệu của plan mode. Claude đọc code, đề xuất kế hoạch, và không sửa file nào cho tới khi kế hoạch được duyệt."
      - text: "Use direct execution and review the diff afterward, since the diff shows everything"
        why: "Với 50 file và ba hướng tiếp cận, phát hiện chọn sai hướng sau khi đã sửa xong là rất tốn công. Diff cho thấy cái đã làm, không cho thấy các lựa chọn đã bị bỏ qua."
      - text: "Run the task with `claude -p` in CI so it cannot be interrupted"
        why: "Chạy không tương tác bỏ mất bước con người duyệt hướng đi, là thứ cần nhất ở một thay đổi kiến trúc."
      - text: "Ask Claude to edit one file at a time and approve each edit manually"
        why: "Duyệt từng lần sửa kiểm soát được chi tiết nhưng không trả lời câu hỏi lớn: ranh giới service nên nằm ở đâu."
    answer: 0
    keyword: "thay đổi lớn + nhiều hướng + quyết định kiến trúc → **plan mode**"
    relearn: "#khi-nào-nên-lập-kế-hoạch"
    relearnLabel: "Khi nào nên lập kế hoạch"
  - q: "During a multi-phase refactor, a developer has Claude read through 80 files in the main conversation to map how a legacy config loader is used. By the time implementation starts, the session is slow and Claude has lost track of earlier decisions. What should the developer do differently next time?"
    options:
      - text: "Switch to a model with a larger context window"
        why: "Cửa sổ lớn hơn chỉ dời thời điểm gặp vấn đề. Nội dung 80 file vẫn nằm trong hội thoại và đi theo mọi lượt sau."
      - text: "Skip the discovery phase and start editing immediately"
        why: "Bỏ khảo sát ở một refactor nhiều pha dẫn tới sửa thiếu chỗ. Vấn đề là nơi khảo sát diễn ra, không phải việc khảo sát."
      - text: "Delegate the discovery to the Explore subagent so the file reads stay in its context and only the findings return"
        why: "Đúng. Explore là subagent chỉ đọc. Nó đọc file trong context riêng và trả về bản tóm tắt, nên phiên chính còn chỗ cho phần thực thi."
      - text: "Paste all 80 files into `CLAUDE.md` so they are always available"
        why: "CLAUDE.md nạp vào mọi phiên. Làm vậy khiến mọi phiên đều tốn context cho 80 file."
    answer: 2
    keyword: "khảo sát dài dòng → giao cho subagent **Explore**, chỉ nhận kết luận"
    relearn: "#giữ-context-gọn-bằng-subagent-explore"
    relearnLabel: "Giữ context gọn bằng subagent Explore"
---

Cho Claude sửa ngay thì nhanh, nhưng nếu nó chọn sai hướng ở một thay đổi lớn, bạn phải gỡ lại hàng chục file. Plan mode đổi một ít thời gian lúc đầu lấy cơ hội duyệt hướng đi trước khi có gì bị sửa.

## Plan mode làm gì

Plan mode là một trong các **permission mode** của Claude Code. Trong mode này Claude nghiên cứu và đề xuất, không thực hiện:

- Claude đọc file, tìm kiếm, chạy lệnh shell để khảo sát.
- Claude viết ra một kế hoạch: sẽ sửa file nào, theo thứ tự nào, vì sao.
- Claude **không sửa mã nguồn** cho tới khi bạn duyệt kế hoạch.

So với các mode khác:

| Mode | Chạy không cần hỏi | Hợp với |
|---|---|---|
| `default` (Manual) | Chỉ đọc | Việc nhạy cảm, muốn duyệt từng hành động |
| `acceptEdits` | Đọc, sửa file, lệnh file thông dụng | Lặp nhanh trên code bạn đang theo dõi |
| `plan` | Đọc và khảo sát | Tìm hiểu codebase trước khi thay đổi |
| `auto` | Mọi thứ, có bộ phân loại kiểm tra nền | Việc dài, giảm số lần bị hỏi |
| `dontAsk` | Chỉ tool đã được duyệt sẵn, còn lại bị từ chối | CI và script cần khóa chặt |
| `bypassPermissions` | Mọi thứ | Chỉ trong container hoặc VM cô lập |

Trong đề thi, "direct execution" nghĩa là để Claude làm ngay trong một mode cho phép sửa file, không qua bước lập kế hoạch.

## Vào và ra khỏi plan mode

| Cách | Lệnh |
|---|---|
| Trong phiên đang chạy | Nhấn `Shift+Tab` để xoay vòng các mode cho tới khi thanh trạng thái hiện `plan mode on` |
| Cho một prompt | Bắt đầu prompt bằng `/plan` |
| Từ lúc khởi động | `claude --permission-mode plan` |
| Mặc định cho dự án | `permissions.defaultMode` là `plan` trong `.claude/settings.json` |

```json
{
  "permissions": {
    "defaultMode": "plan"
  }
}
```

Khi kế hoạch sẵn sàng, Claude trình bày và hỏi bạn muốn làm gì:

- **Duyệt và để Claude tự chạy.** Phiên rời plan mode và chuyển sang mode cho phép sửa.
- **Duyệt và tự tay duyệt từng lần sửa.**
- **Chưa duyệt, lập kế hoạch tiếp.** Bạn nói điều cần đổi và Claude sửa kế hoạch.

Bạn cũng có thể nhấn `Ctrl+G` để mở kế hoạch trong trình soạn thảo và sửa trực tiếp trước khi Claude tiến hành. Duyệt kế hoạch đồng nghĩa với rời plan mode. Muốn lập kế hoạch lại thì quay về bằng `Shift+Tab` hoặc `/plan`.

## Khi nào nên lập kế hoạch

Câu hỏi thi dạng này luôn mô tả một nhiệm vụ rồi hỏi cách bắt đầu. Hãy tìm các dấu hiệu trong đề:

| Dấu hiệu trong tình huống | Chọn |
|---|---|
| Thay đổi chạm nhiều file hoặc nhiều module | Plan mode |
| Có nhiều cách làm hợp lý và phải chọn một | Plan mode |
| Quyết định kiến trúc: tách service, đổi schema, đổi thư viện nền | Plan mode |
| Codebase lạ, chưa rõ thay đổi sẽ lan tới đâu | Plan mode |
| Sai thì khó quay lại: migration dữ liệu, API công khai | Plan mode |
| Sửa một lỗi có stack trace rõ, nằm trong một file | Thực thi trực tiếp |
| Thêm một kiểm tra đầu vào, đổi tên một biến, sửa lỗi chính tả | Thực thi trực tiếp |
| Bạn đã biết chính xác diff mong muốn | Thực thi trực tiếp |

Hai ví dụ ở hai đầu:

- *"Chuyển 45 file từ thư viện logging cũ sang thư viện mới, đồng thời quyết định định dạng log chung."* Phạm vi rộng, có quyết định thiết kế. Lập kế hoạch trước.
- *"Hàm `parse_date` ném `ValueError` với chuỗi rỗng, stack trace chỉ vào dòng 42 của `utils/dates.py`."* Phạm vi một file, nguyên nhân rõ. Lập kế hoạch ở đây chỉ làm chậm.

Bẫy thường gặp là coi plan mode như lựa chọn "an toàn hơn nên lúc nào cũng đúng". Với việc nhỏ và rõ, đáp án đúng là thực thi trực tiếp. Chi phí của plan mode là thời gian và một lượt khảo sát mà bạn không cần.

## Giữ context gọn bằng subagent Explore

Khảo sát một codebase lớn nghĩa là đọc rất nhiều file. Nếu việc đọc diễn ra trong hội thoại chính, toàn bộ nội dung file nằm lại đó và đi theo mọi lượt sau. Tới lúc thực thi, phiên đã nặng và những quyết định ban đầu dễ bị trôi.

Claude Code có sẵn subagent **Explore** cho việc này:

| Đặc điểm | Explore |
|---|---|
| Tool | Chỉ đọc. Không ghi, không sửa file |
| Context | Riêng. File nó đọc không vào hội thoại chính |
| Trả về | Một bản tóm tắt phát hiện |
| Khởi động | Không nạp CLAUDE.md của bạn, để nhẹ và nhanh |

Claude tự giao việc cho Explore khi cần tìm hiểu code mà không sửa. Bạn cũng có thể yêu cầu rõ:

```text
Dùng subagent để tìm mọi nơi gọi tới ConfigLoader cũ và phân loại theo cách dùng.
Chỉ báo lại danh sách file và ba kiểu dùng phổ biến nhất.
```

Trong plan mode, Claude dùng một subagent tương tự tên là **Plan** để gom thông tin trước khi trình kế hoạch. Nguyên lý giống hệt [bài 1.3](../../domain-1/03-coordinator-subagent/): kết quả trung gian ở lại trong subagent, phiên chính chỉ nhận kết luận.

Vì Explore bắt đầu mà không có CLAUDE.md, prompt giao việc phải tự đủ. Nếu việc khảo sát cần một quy ước của dự án, hãy ghi quy ước đó vào lời giao việc.

## Kết hợp hai cách

Hai cách không loại trừ nhau. Với việc lớn, quy trình thường gặp là:

1. **Khảo sát** trong plan mode, giao phần đọc rộng cho Explore.
2. **Duyệt kế hoạch.** Sửa những chỗ chưa ổn ngay trên kế hoạch, lúc này còn rẻ.
3. **Thực thi trực tiếp** theo kế hoạch đã duyệt, từng phần một, mỗi phần có cách kiểm tra.
4. **Quay lại plan mode** nếu giữa chừng phát hiện kế hoạch sai giả định.

Với việc nhiều pha, nên để kế hoạch thành một file (ví dụ `PLAN.md` hoặc `SPEC.md`) rồi mở phiên mới để thực thi từ file đó. Phiên thực thi bắt đầu với context sạch và một định nghĩa "xong" đã viết ra.

Tài liệu gốc: [Choose a permission mode](https://code.claude.com/docs/en/permission-modes#analyze-before-you-edit-with-plan-mode), [Create custom subagents](https://code.claude.com/docs/en/sub-agents), [Common workflows](https://code.claude.com/docs/en/common-workflows).

## Tóm tắt

- Plan mode: Claude đọc, khảo sát, viết kế hoạch, không sửa mã nguồn cho tới khi được duyệt.
- Vào bằng `Shift+Tab`, `/plan`, `claude --permission-mode plan` hoặc `defaultMode: "plan"`.
- Lập kế hoạch khi thay đổi lớn, nhiều hướng, có quyết định kiến trúc hoặc khó quay lại. Thực thi trực tiếp khi việc nhỏ, rõ, trong một file.
- Subagent Explore đọc file trong context riêng và chỉ trả về kết luận, giúp phiên chính không bị đầy.
- Việc lớn: lập kế hoạch để khảo sát, rồi thực thi theo kế hoạch đã duyệt.
