---
title: 3.3 · Rule theo đường dẫn
description: Dùng frontmatter paths trong .claude/rules để chỉ nạp quy ước khi Claude làm việc với file khớp mẫu glob.
lesson:
  day: 6
  minutes: 11
quiz:
  - q: "A frontend monorepo keeps test files next to the code they test, spread across more than 60 directories (`Button.test.tsx`, `useCart.test.ts`, and so on). The team wants Claude to follow their testing conventions whenever it works on any test file, without loading those conventions in sessions that never touch tests. What is the best setup?"
    options:
      - text: "Add a `CLAUDE.md` with the testing conventions to each of the 60 directories"
        why: "Cách này chạy được nhưng phải duy trì 60 bản sao, và CLAUDE.md trong thư mục con áp dụng cho mọi file trong thư mục đó chứ không riêng file test."
      - text: "Put the conventions in the root `CLAUDE.md` under a 'Testing' heading"
        why: "CLAUDE.md gốc được nạp vào mọi phiên, kể cả phiên không đụng tới test. Yêu cầu là không nạp khi không cần."
      - text: "Create a `/testing-conventions` skill that developers invoke before writing tests"
        why: "Cách này phụ thuộc vào việc ai đó nhớ gõ lệnh. Yêu cầu là quy ước tự áp dụng khi Claude làm việc với file test."
      - text: "Create `.claude/rules/testing.md` with `paths: [\"**/*.test.ts\", \"**/*.test.tsx\"]`"
        why: "Đúng. Mẫu glob khớp theo loại file ở bất kỳ thư mục nào, một file duy nhất để bảo trì, và rule chỉ vào context khi Claude đọc hoặc sửa file khớp."
    answer: 3
    keyword: "quy ước theo **loại file** rải khắp repo → một rule có `paths` glob"
    relearn: "#rule-theo-đường-dẫn-hay-claudemd-thư-mục-con"
    relearnLabel: "Rule theo đường dẫn hay CLAUDE.md thư mục con"
  - q: "A team adds `.claude/rules/terraform.md` intended only for `infra/**/*.tf`. They notice its content is present in every session, including pure frontend work. The file begins with `---`, then `path: infra/**/*.tf`, then `---`. What is wrong?"
    code: |
      ---
      path: infra/**/*.tf
      ---
      # Terraform rules
      - Every resource has an `owner` tag
    options:
      - text: "Path-scoped rules must live in `infra/.claude/rules/`, next to the files they govern"
        why: "Rule ở `.claude/rules/` của gốc dự án vẫn giới hạn được theo đường dẫn. Mẫu được tính từ thư mục chứa `.claude`."
      - text: "The field is named `paths`; an unrecognized field is ignored without an error, so the rule loads unconditionally"
        why: "Đúng. `paths` là trường duy nhất Claude Code đọc trong frontmatter của rule. `path` bị bỏ qua, và rule không có `paths` được nạp lúc khởi động như mọi rule thường."
      - text: "Glob patterns cannot contain `**`"
        why: "`**` là cú pháp hợp lệ và rất thường dùng, ví dụ `src/**/*.ts`."
      - text: "Rules only become conditional after the session is compacted"
        why: "Compaction không liên quan tới việc rule có điều kiện hay không. Điều đó do frontmatter quyết định."
    answer: 1
    keyword: "trường đúng là `paths`; trường lạ bị bỏ qua **im lặng** → rule nạp vô điều kiện"
    relearn: "#gỡ-lỗi-rule-không-đúng-phạm-vi"
    relearnLabel: "Gỡ lỗi rule không đúng phạm vi"
---

Quy ước cho Terraform không giúp gì khi Claude đang sửa một component React, nhưng vẫn chiếm chỗ trong context nếu nằm ở CLAUDE.md. Rule theo đường dẫn giải quyết việc này: quy ước chỉ xuất hiện khi Claude làm việc với đúng loại file.

## Rule có paths hoạt động thế nào

Một file trong `.claude/rules/` có thể mở đầu bằng frontmatter YAML chứa trường `paths`:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# Quy ước API

- Mọi endpoint kiểm tra đầu vào trước khi xử lý.
- Lỗi trả về theo định dạng chuẩn của dự án.
```

Hai trường hợp:

| Rule | Khi nào vào context |
|---|---|
| Không có `paths` | Lúc khởi động, mọi phiên, ngang hàng với `.claude/CLAUDE.md` |
| Có `paths` | Khi Claude dùng tool Read, Write hoặc Edit trên một file khớp mẫu |

Một phiên chỉ làm việc với frontend sẽ không bao giờ thấy rule về API ở trên. Đó là hai lợi ích cùng lúc: **tiết kiệm context** và **giảm nhiễu**, vì model không phải cân nhắc những chỉ dẫn không liên quan.

`paths` là trường **duy nhất** Claude Code đọc trong frontmatter của rule. Nó nhận một danh sách YAML hoặc một chuỗi các mẫu cách nhau bằng dấu phẩy.

## Cú pháp glob

Mẫu được tính từ **thư mục chứa `.claude`** của rule. Với rule cá nhân trong `~/.claude/rules/`, mẫu được tính từ thư mục làm việc của phiên.

| Mẫu | Khớp |
|---|---|
| `**/*.ts` | Mọi file `.ts` ở bất kỳ độ sâu nào |
| `src/**/*` | Mọi file dưới `src/` |
| `terraform/**/*` | Mọi file dưới `terraform/` |
| `**/*.test.tsx` | File test React ở bất kỳ đâu |
| `src/components/*.tsx` | File `.tsx` nằm trực tiếp trong `src/components/`, không tính thư mục con |
| `src/**/*.{ts,tsx}` | Cả `.ts` lẫn `.tsx` dưới `src/` |

Một rule có thể có nhiều mẫu. Rule được nạp khi file khớp **bất kỳ** mẫu nào:

```markdown
---
paths:
  - "src/**/*.{ts,tsx}"
  - "lib/**/*.ts"
  - "tests/**/*.test.ts"
---
```

Nên đặt mẫu trong nháy kép. Nhiều mẫu bắt đầu bằng `*` hoặc chứa `{`, là những ký tự có nghĩa riêng trong YAML.

## Rule theo đường dẫn hay CLAUDE.md thư mục con

Cả hai đều nạp chỉ dẫn theo vị trí file. Khác nhau ở cách xác định "vị trí".

| | CLAUDE.md trong thư mục con | Rule có `paths` |
|---|---|---|
| Phạm vi | Một thư mục và mọi thứ bên dưới | Mọi file khớp glob, ở bất kỳ đâu |
| Nạp khi | Claude đọc hoặc sửa file trong thư mục đó | Claude đọc hoặc sửa file khớp mẫu |
| Số file phải bảo trì | Một file cho mỗi thư mục | Một file cho mỗi chủ đề |
| Hợp với | Quy ước gắn với **một module** | Quy ước gắn với **một loại file** nằm rải rác |

Ví dụ quyết định:

- Quy ước riêng của `services/billing/` (cách đặt tên bảng, cách gọi cổng thanh toán): một CLAUDE.md trong `services/billing/` là đủ.
- Quy ước viết test khi file test nằm cạnh code ở hàng chục thư mục: một rule với `paths: ["**/*.test.ts"]`. Dùng CLAUDE.md thì phải nhân bản ra từng thư mục, và nó còn áp dụng cho cả file không phải test.
- Quy ước Terraform cho `terraform/` và `modules/*/infra/`: một rule với hai mẫu.

Quy tắc nhớ nhanh: **quy ước đi theo thư mục thì dùng CLAUDE.md; quy ước đi theo loại file và cắt ngang cây thư mục thì dùng rule có `paths`.**

## Khi nào rule được nạp

Điều kiện kích hoạt là Claude **làm việc với file**, không phải file được nhắc tên.

- Read, Write, Edit trên file khớp thì rule được nạp. Xem file bằng lệnh shell được tính là đọc, như `cat` một file, cũng vậy.
- Bạn chỉ gõ "sửa giúp phần API" mà Claude chưa mở file nào trong `src/api/` thì rule chưa có trong context.
- Một khi đã nạp, rule ở lại trong hội thoại.
- Sau khi hội thoại bị nén (`/compact`), rule có `paths` được nạp lại khi Claude chạm vào file khớp lần nữa. CLAUDE.md ở gốc dự án thì được đọc lại ngay từ đĩa.

Hệ quả khi thiết kế: đừng đặt vào rule có `paths` những chỉ dẫn cần có **trước khi** Claude mở file, ví dụ "trước khi đụng vào `infra/` phải hỏi ý kiến người dùng". Chỉ dẫn loại đó thuộc về CLAUDE.md gốc, hoặc tốt hơn là một hook.

Rule cũng chia sẻ bản chất với CLAUDE.md: nó là context, không phải cơ chế ép buộc.

## Gỡ lỗi rule không đúng phạm vi

Hai kiểu lỗi thường gặp có triệu chứng ngược nhau.

**Rule xuất hiện ở mọi phiên dù bạn đã giới hạn.** Claude Code không báo lỗi khi frontmatter sai, nó nạp rule như một rule thường:

- Tên trường sai, ví dụ `path` hay `globs` thay cho `paths`. Trường lạ bị bỏ qua.
- YAML không parse được, ví dụ mẫu `*.md` không đặt trong nháy. Khi đó toàn bộ frontmatter bị bỏ qua. Chạy `claude --debug` để thấy lỗi parse.
- Dòng `---` mở đầu không phải dòng đầu tiên của file.

**Rule không bao giờ xuất hiện.** Kiểm tra mẫu glob: nó được tính từ thư mục chứa `.claude`, không phải từ thư mục bạn đang đứng. `components/*.tsx` không khớp `src/components/Button.tsx`, và cũng không khớp file trong thư mục con của `components/`.

Để thấy chính xác file nào được nạp, lúc nào và vì sao, đăng ký một hook cho sự kiện `InstructionsLoaded`. Hook nhận `file_path`, `load_reason` (ví dụ `session_start` hoặc `path_glob_match`) và file đã kích hoạt việc nạp. [Lab của domain này](../07-lab/) dùng đúng hook đó để chứng minh rule chỉ được nạp cho đúng đường dẫn.

Tài liệu gốc: [Path-specific rules](https://code.claude.com/docs/en/memory#path-specific-rules), [Hooks reference](https://code.claude.com/docs/en/hooks#instructionsloaded).

## Tóm tắt

- Rule trong `.claude/rules/` có frontmatter `paths` chỉ được nạp khi Claude đọc hoặc sửa file khớp glob. Không có `paths` thì nạp mọi phiên.
- Mẫu glob tính từ thư mục chứa `.claude`. `**/*.test.tsx` khớp theo loại file ở mọi nơi.
- Quy ước theo một module: CLAUDE.md trong thư mục đó. Quy ước theo loại file rải khắp repo: rule có `paths`.
- Frontmatter sai không gây lỗi mà làm rule nạp vô điều kiện. Dùng hook `InstructionsLoaded` hoặc `claude --debug` để kiểm tra.
