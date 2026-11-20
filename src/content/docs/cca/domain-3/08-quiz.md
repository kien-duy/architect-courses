---
title: 3.8 · Quiz Domain 3
description: 10 câu tình huống tổng hợp về cấu hình và quy trình làm việc với Claude Code.
sidebar:
  badge:
    text: Quiz
    variant: note
lesson:
  day: 7
  kind: quiz
  minutes: 20
quiz:
  - q: "A developer on the `inventory` repository wants Claude to always use her personal staging URL and her own seed data when working in this project. Her teammates must not receive these instructions, and they should not apply to her other projects. Where should she put them?"
    options:
      - text: "In the repository's root `CLAUDE.md`"
        why: "File này được commit và áp dụng cho cả đội. URL staging riêng của một người không thuộc về đây."
      - text: "In `~/.claude/CLAUDE.md`"
        why: "File này chỉ của cô ấy, nhưng áp dụng cho **mọi** dự án trên máy. Yêu cầu là chỉ áp dụng cho dự án này."
      - text: "In `CLAUDE.local.md` at the project root, added to `.gitignore`"
        why: "`CLAUDE.local.md` là phạm vi local: nạp cùng CLAUDE.md của dự án, chỉ có trên máy của một người, và không được commit."
      - text: "In `.claude/rules/staging.md` with a `paths` field"
        why: "Rule dự án vẫn được commit cho cả đội. `paths` giới hạn theo file, không giới hạn theo người."
    answer: 2
    keyword: "riêng mình + riêng dự án này → `CLAUDE.local.md` (gitignore)"
    relearn: "cca/domain-3/01-claude-md#bốn-phạm-vi-và-nơi-đặt-file"
    relearnLabel: "3.1 · Bốn phạm vi và nơi đặt file"
  - q: "A monorepo's root `CLAUDE.md` says 'Use tabs for indentation'. `packages/mobile/CLAUDE.md` says 'Use 2 spaces'. A developer working in `packages/mobile/` assumes the nearer file overrides the root one, but Claude's output is inconsistent between sessions. What is the correct explanation and fix?"
    options:
      - text: "All discovered CLAUDE.md files are concatenated into context rather than overriding each other, so Claude sees both instructions; remove the contradiction"
        why: "Các file được nối lại, không có luật 'file gần hơn thắng'. Khi hai chỉ dẫn mâu thuẫn, Claude có thể theo bên nào cũng được. Cách sửa là làm cho các file nhất quán, ví dụ để file gốc ghi rõ ngoại lệ cho `packages/mobile/`."
      - text: "The nearer file does override the root file, but only after `/compact`"
        why: "Compaction không tạo ra quan hệ ghi đè. Sau khi nén, các file chỉ được nạp lại."
      - text: "Subdirectory CLAUDE.md files are ignored when a root file exists"
        why: "File trong thư mục làm việc và các thư mục cha đều được nạp. Không file nào bị bỏ qua."
      - text: "The root file must import the package file with `@packages/mobile/CLAUDE.md` for the override to work"
        why: "Import chỉ kéo thêm nội dung vào context. Nó không biến một chỉ dẫn thành chỉ dẫn ưu tiên hơn."
    answer: 0
    keyword: "CLAUDE.md được **nối**, không ghi đè → tự giữ nhất quán"
    relearn: "cca/domain-3/01-claude-md#thứ-tự-nạp"
    relearnLabel: "3.1 · Thứ tự nạp"
  - q: "The `storefront` repository ships a team skill at `.claude/skills/deploy/SKILL.md`. One developer wants a variant that skips the smoke tests, so he creates `~/.claude/skills/deploy/SKILL.md`. Afterwards, `/deploy` on his machine never runs the team's version. What should he do?"
    options:
      - text: "Nothing; project skills always take precedence, so the team version is still the one running"
        why: "Ngược lại: khi trùng tên, skill cá nhân thắng skill dự án. Bản của đội đang bị che."
      - text: "Add `disable-model-invocation: true` to his personal skill"
        why: "Trường này chỉ ngăn Claude tự gọi skill. Khi anh ấy gõ `/deploy`, bản cá nhân vẫn chạy."
      - text: "Move his variant into the repository's `.claude/commands/deploy.md`"
        why: "Làm vậy đưa biến thể riêng vào repo của cả đội, và file command trùng tên với skill thì skill thắng."
      - text: "Give the personal variant a different name, such as `deploy-fast`, so both commands exist"
        why: "Skill cá nhân trùng tên che skill dự án. Đặt tên khác thì `/deploy` chạy bản của đội và `/deploy-fast` chạy biến thể riêng."
    answer: 3
    keyword: "trùng tên: cá nhân **che** dự án → biến thể riêng cần **tên khác**"
    relearn: "cca/domain-3/02-skill-va-slash-command#nơi-đặt-skill"
    relearnLabel: "3.2 · Nơi đặt skill"
  - q: "A team writes a skill named `api-style` whose body is a list of REST naming conventions. To 'keep the main session clean' they add `context: fork`. When the skill runs, the subagent returns almost immediately with nothing useful. Why?"
    code: |
      ---
      name: api-style
      description: REST naming conventions for this service
      context: fork
      ---
      - Use plural nouns for collections
      - Use kebab-case in paths
    options:
      - text: "`context: fork` requires the `agent` field, and it is missing"
        why: "`agent` không bắt buộc. Bỏ trống thì subagent loại `general-purpose` được dùng."
      - text: "A forked skill's content becomes the subagent's task; guidelines with no task give it nothing to do"
        why: "Với `context: fork`, nội dung skill là prompt của subagent. Một danh sách quy ước không có việc cụ thể thì subagent không có gì để làm. Quy ước nên nằm trong CLAUDE.md, một rule, hoặc một skill không fork."
      - text: "Forked skills cannot read the project's files"
        why: "Subagent vẫn có tool đọc file theo loại agent của nó."
      - text: "The `description` is too short for Claude to match"
        why: "Skill đã được chạy. Vấn đề nằm ở nội dung được giao cho subagent, không phải ở việc chọn skill."
    answer: 1
    keyword: "`context: fork` cần **một việc cụ thể**, không hợp với skill chỉ chứa quy ước"
    relearn: "cca/domain-3/02-skill-va-slash-command#chạy-skill-trong-subagent"
    relearnLabel: "3.2 · Chạy skill trong subagent"
  - q: "A data team has `.claude/rules/migrations.md` scoped with `paths: [\"db/migrations/**/*.sql\"]`. A developer opens a new session and asks, 'What naming scheme do we use for migrations?' Claude answers from general knowledge and gets it wrong. The rule file is valid. Why was it not applied?"
    options:
      - text: "A path-scoped rule loads when Claude reads or edits a matching file; a question that opens no such file does not trigger it"
        why: "Điều kiện kích hoạt là Claude làm việc với file khớp mẫu, không phải chủ đề được nhắc tới. Ở lượt đó Claude chưa mở file nào trong `db/migrations/`."
      - text: "Rules are only applied in plan mode"
        why: "Rule không phụ thuộc permission mode."
      - text: "Rules in `.claude/rules/` are loaded only for the user who created them"
        why: "Rule dự án được chia sẻ qua version control cho cả đội."
      - text: "The glob must be written relative to the user's home directory"
        why: "Mẫu của rule dự án tính từ thư mục chứa `.claude`. Mẫu trong đề là hợp lệ."
    answer: 0
    keyword: "rule có `paths` nạp khi **chạm file**, không phải khi nhắc tới chủ đề"
    relearn: "cca/domain-3/03-rule-theo-duong-dan#khi-nào-rule-được-nạp"
    relearnLabel: "3.3 · Khi nào rule được nạp"
  - q: "A design-system team scopes a rule with `paths: [\"src/components/*.tsx\"]`. The conventions apply when Claude edits `src/components/Button.tsx` but not `src/components/forms/Input.tsx`. What is the fix?"
    options:
      - text: "Add a second rule file, because each rule may contain only one pattern"
        why: "Một rule nhận nhiều mẫu. Vấn đề ở đây là mẫu duy nhất chưa đủ rộng."
      - text: "Move the rule into `src/components/.claude/rules/`"
        why: "Dời file không sửa được mẫu. `*` vẫn chỉ khớp file nằm trực tiếp trong thư mục."
      - text: "Change the pattern to `src/components/**/*.tsx` so it matches files in subdirectories"
        why: "`*` chỉ khớp trong một tầng thư mục. `**` khớp qua mọi tầng, nên mẫu mới bao gồm cả `forms/Input.tsx`."
      - text: "Rename `Input.tsx` so it sits directly under `src/components/`"
        why: "Đổi cấu trúc code để vừa một mẫu glob là làm ngược. Sửa mẫu mới là cách đúng."
    answer: 2
    keyword: "`*` = một tầng; `**` = mọi tầng"
    relearn: "cca/domain-3/03-rule-theo-duong-dan#cú-pháp-glob"
    relearnLabel: "3.3 · Cú pháp glob"
  - q: "A production alert shows `TypeError: Cannot read properties of undefined (reading 'email')` with a stack trace pointing to line 88 of `src/notifications/sendReceipt.ts`. The developer can see that a null check on `order.customer` is missing. How should they proceed with Claude Code?"
    options:
      - text: "Enter plan mode and request a full architectural review of the notifications module first"
        why: "Lỗi nằm ở một dòng, nguyên nhân đã rõ. Một lượt lập kế hoạch và rà kiến trúc chỉ làm chậm việc sửa."
      - text: "Use direct execution: ask Claude to add the check at that location and a test that reproduces the failure"
        why: "Phạm vi một file, stack trace rõ, cách sửa đã biết. Đây là dấu hiệu điển hình của thực thi trực tiếp."
      - text: "Delegate the fix to the Explore subagent"
        why: "Explore chỉ đọc. Nó không sửa được file."
      - text: "Run the interview pattern so Claude can ask about the notification system's design"
        why: "Phỏng vấn hợp khi yêu cầu chưa rõ. Ở đây yêu cầu rõ tới từng dòng."
    answer: 1
    keyword: "stack trace rõ + một file → **thực thi trực tiếp**"
    relearn: "cca/domain-3/04-plan-mode#khi-nào-nên-lập-kế-hoạch"
    relearnLabel: "3.4 · Khi nào nên lập kế hoạch"
  - q: "A team must migrate about 45 files from a deprecated HTTP client to a new one. Call patterns vary across modules and nobody knows them all. Which workflow fits best?"
    options:
      - text: "Direct execution across all 45 files in one prompt, then fix whatever the tests reveal"
        why: "Chưa ai biết hết các kiểu gọi. Sửa hàng loạt khi chưa khảo sát dễ dẫn tới một cách chuyển đổi không hợp với một nửa số file."
      - text: "Plan mode for the whole task, never leaving it, so nothing is edited by mistake"
        why: "Plan mode không sửa mã nguồn. Ở mãi trong đó thì việc chuyển đổi không bao giờ được thực hiện."
      - text: "Have Claude read all 45 files into the main conversation first, then migrate them from memory"
        why: "Đọc hết vào hội thoại chính làm đầy context trước khi bắt đầu phần thực thi."
      - text: "Use plan mode (with exploration delegated to a subagent) to map the call patterns and agree on an approach, then switch to direct execution to apply the approved plan"
        why: "Kết hợp hai cách: khảo sát và chốt hướng trong plan mode, phần đọc rộng nằm trong subagent, rồi thực thi theo kế hoạch đã duyệt."
    answer: 3
    keyword: "việc lớn: **plan** để khảo sát → **thực thi** theo kế hoạch đã duyệt"
    relearn: "cca/domain-3/04-plan-mode#kết-hợp-hai-cách"
    relearnLabel: "3.4 · Kết hợp hai cách"
  - q: "A backend developer is asked to add a caching layer in front of a pricing service. She has never built one and suspects there are design questions she has not thought of. She wants to surface them before any code is written. Which technique fits?"
    options:
      - text: "Provide three input and output examples of cached responses"
        why: "Ví dụ đầu vào và đầu ra làm rõ một phép biến đổi đã biết. Chúng không làm lộ ra các quyết định thiết kế cô ấy chưa nghĩ tới."
      - text: "Ask Claude to implement the simplest version and iterate on bug reports from production"
        why: "Cách này để người dùng thật phát hiện các câu hỏi thiết kế, là cách đắt nhất."
      - text: "Ask Claude to interview her about the requirements until it can write a spec, covering topics such as invalidation and failure modes"
        why: "Mẫu phỏng vấn đảo vai: Claude đặt câu hỏi về những phần chưa chốt, nhờ đó các vấn đề như vô hiệu hóa cache hay xử lý khi cache hỏng lộ ra trước khi viết code."
      - text: "Raise the effort level and ask for the best possible implementation"
        why: "Suy nghĩ lâu hơn không thay được thông tin chỉ cô ấy và đội của cô ấy có, ví dụ dữ liệu được phép cũ bao lâu."
    answer: 2
    keyword: "chưa biết mình chưa biết gì → để Claude **phỏng vấn**"
    relearn: "cca/domain-3/05-tinh-chinh-lap#để-claude-phỏng-vấn-bạn"
    relearnLabel: "3.5 · Để Claude phỏng vấn bạn"
  - q: "A review job runs `claude -p` on every push to a pull request and posts each finding as a comment. After the fourth push, the pull request has four copies of the same comments, including ones for issues already fixed. What is the best change?"
    options:
      - text: "Pass the previous run's findings into the prompt and instruct Claude to report only new issues or ones that remain unfixed"
        why: "Mỗi lượt `-p` là một phiên mới, không nhớ lượt trước. Đưa kết quả lần trước vào prompt cho phép nó phân biệt vấn đề mới, vấn đề còn tồn tại và vấn đề đã sửa."
      - text: "Run the review only on the first push"
        why: "Cách này hết trùng lặp nhưng bỏ sót mọi vấn đề phát sinh ở các commit sau."
      - text: "Lower `--max-turns` so the review produces fewer comments"
        why: "Giới hạn turn có thể cắt ngang lượt review, nhưng không giúp nó biết comment nào đã được đăng."
      - text: "Remove `--json-schema` so the comments are worded differently each time"
        why: "Câu chữ khác nhau vẫn là comment trùng nội dung, và bỏ schema làm mất khả năng đọc kết quả bằng máy."
    answer: 0
    keyword: "chạy lại sau commit mới → đưa **kết quả lần trước** vào, chỉ báo vấn đề mới hoặc chưa sửa"
    relearn: "cca/domain-3/06-ci-cd#reviewer-độc-lập-và-chạy-lại-sau-commit-mới"
    relearnLabel: "3.6 · Reviewer độc lập và chạy lại sau commit mới"
---

Mười câu hỏi dưới đây trộn kiến thức của cả sáu bài trong Domain 3. Mỗi câu đặt bạn vào một tình huống và hỏi quyết định đúng, giống cách đề thật ra đề.

Bạn nên hoàn thành các bài 3.1 đến 3.6 và [lab](../07-lab/) trước. Cần đúng từ **7/10** để tích hoàn thành. Sau khi nộp, lời giải cho từng phương án hiện ra, kèm nút **← Học lại** mở đúng đoạn bài học trong ngăn trượt.

Mẹo khi đọc đề: tìm dấu hiệu trong tình huống trước khi đọc phương án. Ai cần nhận chỉ dẫn, quy ước đi theo thư mục hay theo loại file, việc lớn hay nhỏ, và có ai ngồi trước bàn phím hay không.
