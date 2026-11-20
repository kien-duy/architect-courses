---
title: 3.1 · CLAUDE.md phân cấp và import
description: Bốn phạm vi của CLAUDE.md, thứ tự nạp, cú pháp import và cách chia nhỏ bằng thư mục rules.
lesson:
  day: 6
  minutes: 14
quiz:
  - q: "A senior engineer on a payments team has Claude Code follow the team's migration checklist perfectly. A new hire clones the same repository and Claude never mentions the checklist. Both run the same Claude Code version. What is the most likely cause?"
    options:
      - text: "The new hire has not run `/init` yet, so the repository's instructions were never indexed"
        why: "`/init` chỉ sinh ra một CLAUDE.md khởi đầu. Claude Code không cần bước lập chỉ mục nào để đọc CLAUDE.md đã có trong repo."
      - text: "The checklist lives in the senior engineer's `~/.claude/CLAUDE.md`, which is never shared through version control"
        why: "Đúng. File trong thư mục home chỉ áp dụng cho một người trên một máy. Chỉ dẫn cả đội cần phải nằm ở CLAUDE.md của dự án và được commit."
      - text: "Project CLAUDE.md files are only loaded for users listed as repository maintainers"
        why: "Không có cơ chế phân quyền nào như vậy. Ai mở Claude Code trong repo cũng được nạp CLAUDE.md của dự án."
      - text: "The new hire's session ran out of context before reaching the checklist"
        why: "CLAUDE.md được nạp ngay từ đầu phiên. Một phiên mới chưa thể hết context."
    answer: 1
    keyword: "chỉ dẫn của **cả đội** → CLAUDE.md dự án, commit vào repo; `~/.claude/` là của riêng một người"
    relearn: "#bốn-phạm-vi-và-nơi-đặt-file"
    relearnLabel: "Bốn phạm vi và nơi đặt file"
  - q: "A monorepo's root `CLAUDE.md` has grown to 900 lines. The team moves most of it into `docs/claude/*.md` and replaces the content with `@docs/claude/...` imports. Adherence does not improve and context usage is unchanged. Why?"
    options:
      - text: "Imports are resolved relative to the working directory, so the files were not found"
        why: "Đường dẫn tương đối được tính từ file chứa lệnh import, không phải từ thư mục làm việc. Và nếu file không được tìm thấy thì mức dùng context phải giảm chứ không giữ nguyên."
      - text: "Imports only work in `~/.claude/CLAUDE.md`"
        why: "Import dùng được trong mọi CLAUDE.md. Với file dự án, import trỏ ra ngoài thư mục làm việc chỉ cần thêm một lần phê duyệt."
      - text: "The import depth limit of four hops was exceeded"
        why: "Đề bài chỉ có một tầng import. Giới hạn bốn tầng không liên quan."
      - text: "Imported files are expanded into context together with the file that imports them, so splitting this way organizes the text but does not shrink it"
        why: "Đúng. Import giúp dễ bảo trì, không giúp tiết kiệm context. Muốn giảm thật thì chuyển phần chỉ liên quan tới một vùng code sang rule có `paths`, hoặc chuyển quy trình sang skill."
    answer: 3
    keyword: "`@import` = tổ chức lại, **không** giảm context"
    relearn: "#import-bằng-path"
    relearnLabel: "Import bằng @path"
  - q: "A developer starts Claude Code in `shop/` and asks a question about the architecture. `shop/CLAUDE.md` is applied, but the instructions in `shop/services/billing/CLAUDE.md` are not. No file under `billing/` has been touched yet. What explains this?"
    options:
      - text: "CLAUDE.md files in subdirectories below the working directory load on demand, when Claude reads or edits a file in that subdirectory"
        why: "Đúng. File ở thư mục làm việc và các thư mục cha được nạp lúc khởi động. File ở thư mục con chỉ được nạp khi Claude làm việc với một file trong thư mục đó."
      - text: "Only one CLAUDE.md can be active per session, and the root one wins"
        why: "Các file không ghi đè nhau. Mọi file được tìm thấy đều được nối vào context."
      - text: "Nested CLAUDE.md files must be imported explicitly from the root file"
        why: "Không cần import. Claude Code tự phát hiện CLAUDE.md trong thư mục con, chỉ là nạp trễ."
      - text: "The billing file is treated as a user-level file and needs approval"
        why: "File nằm trong repo là file dự án. Hộp thoại phê duyệt chỉ dành cho import trỏ ra ngoài thư mục làm việc."
    answer: 0
    keyword: "thư mục **cha** nạp lúc khởi động; thư mục **con** nạp khi chạm tới"
    relearn: "#thứ-tự-nạp"
    relearnLabel: "Thứ tự nạp"
---

Claude Code bắt đầu mỗi phiên với context trống. Thứ duy nhất nó biết về quy ước của dự án là những gì bạn viết sẵn trong các file CLAUDE.md. Đặt chỉ dẫn sai chỗ thì cả đội không nhận được, hoặc mỗi phiên phải trả token cho những dòng không liên quan.

## CLAUDE.md là gì

CLAUDE.md là file Markdown thường chứa chỉ dẫn bền vững: lệnh build và test, quy ước đặt tên, cấu trúc thư mục, những quy tắc kiểu "luôn làm X". Claude Code đọc các file này khi phiên bắt đầu và đưa nội dung vào context.

Một ví dụ ngắn:

```markdown
# shopkit

## Lệnh
- Chạy test: `python3 -m unittest discover -s tests`

## Quy ước
- Tiền là số nguyên, đơn vị đồng. Không dùng `float` cho tiền.
- Mọi hàm public có type hint và docstring một dòng.
```

Nên ghi vào CLAUDE.md khi Claude lặp lại một lỗi lần thứ hai, khi bạn gõ lại cùng một lời nhắc ở nhiều phiên, hoặc khi một người mới vào đội cũng cần biết điều đó. Lệnh `/init` tạo một CLAUDE.md khởi đầu bằng cách đọc codebase.

## Bốn phạm vi và nơi đặt file

| Phạm vi | Vị trí | Ai nhận được | Dùng cho |
|---|---|---|---|
| **Managed policy** | Thư mục hệ thống do IT quản lý, ví dụ `/etc/claude-code/CLAUDE.md` trên Linux | Mọi người trong tổ chức | Chính sách bảo mật, chuẩn chung của công ty |
| **User** | `~/.claude/CLAUDE.md` | Chỉ bạn, ở mọi dự án | Sở thích cá nhân |
| **Project** | `./CLAUDE.md` hoặc `./.claude/CLAUDE.md` | Cả đội, qua version control | Kiến trúc, chuẩn code, quy trình của dự án |
| **Local** | `./CLAUDE.local.md` (thêm vào `.gitignore`) | Chỉ bạn, ở dự án này | URL sandbox riêng, dữ liệu test riêng |

Câu hỏi thi thường xoay quanh một tình huống: một người làm việc trơn tru, người khác trong đội thì không. Nguyên nhân gần như luôn là chỉ dẫn nằm ở phạm vi **user** (`~/.claude/CLAUDE.md`), vốn không bao giờ được commit. Cách sửa là chuyển nó sang CLAUDE.md của dự án.

Chiều ngược lại cũng đúng: sở thích cá nhân không nên nằm trong file dự án. Đặt chúng ở `~/.claude/CLAUDE.md` hoặc `CLAUDE.local.md`.

:::note[AGENTS.md]
Một số repo dùng `AGENTS.md` cho nhiều công cụ AI. Bản Claude Code mới đọc được file này khi dự án không có CLAUDE.md. Đề thi tập trung vào CLAUDE.md, nên bài này không đi sâu hơn.
:::

## Thứ tự nạp

Claude Code tìm CLAUDE.md theo cây thư mục, tính từ nơi bạn chạy lệnh `claude`.

```text
shop/                        ← có CLAUDE.md
└── services/
    └── billing/             ← bạn chạy `claude` ở đây, có CLAUDE.md
        └── invoices/        ← có CLAUDE.md
```

- **Thư mục làm việc và mọi thư mục cha** được nạp ngay khi khởi động: `shop/CLAUDE.md` và `shop/services/billing/CLAUDE.md`.
- **Thư mục con** được nạp trễ: `invoices/CLAUDE.md` chỉ vào context khi Claude đọc, ghi hoặc sửa một file trong `invoices/`.

Hai điều hay bị hiểu sai:

- **Các file được nối lại, không ghi đè nhau.** Thứ tự trong context đi từ rộng tới hẹp: managed, user, rồi các file dự án từ gốc xuống thư mục làm việc. Trong cùng một thư mục, `CLAUDE.local.md` đứng sau `CLAUDE.md`.
- **Không có luật "file gần hơn thắng".** Nếu hai file mâu thuẫn, Claude có thể chọn bất kỳ bên nào. Việc của bạn là giữ các file nhất quán, không phải trông vào thứ tự ưu tiên.

Trong monorepo, nếu CLAUDE.md của đội khác bị nạp theo, dùng setting `claudeMdExcludes` để loại chúng.

Kiểm tra file nào đã được nạp bằng lệnh `/context all` (mục Memory files) hoặc `/memory`. File ở thư mục con không có trong danh sách đó cho tới khi được nạp.

## Import bằng @path

Một CLAUDE.md có thể kéo file khác vào bằng cú pháp `@đường/dẫn`:

```markdown
Tổng quan dự án: @README.md
Lệnh npm có sẵn: @package.json

## Quy trình
- Git: @docs/git-instructions.md
- Sở thích cá nhân: @~/.claude/shopkit-prefs.md
```

| Đặc điểm | Chi tiết |
|---|---|
| Đường dẫn tương đối | Tính từ **file chứa lệnh import**, không phải từ thư mục làm việc |
| Import lồng nhau | Được, tối đa bốn tầng |
| Trong backtick hoặc khối code | Không được coi là import, nên `` `@README` `` chỉ là chữ |
| Import trỏ ra ngoài thư mục làm việc | Lần đầu Claude Code hỏi phê duyệt, vì file do người khác commit có thể kéo nội dung lạ vào |

Dùng import để mỗi package trong monorepo chỉ kéo đúng chuẩn nó cần. Ví dụ `packages/api/CLAUDE.md` import `@../../standards/api-conventions.md`, còn `packages/web/CLAUDE.md` import chuẩn về component.

Điểm cần nhớ: **file được import nạp cùng lúc với file import nó**. Tách một CLAUDE.md 900 dòng thành mười file rồi import đủ mười thì context vẫn chứa 900 dòng. Import là công cụ tổ chức, không phải công cụ tiết kiệm.

## Chia nhỏ bằng thư mục rules

Cách thứ hai để tránh một file khổng lồ là thư mục `.claude/rules/`. Mỗi file Markdown trong đó nói về một chủ đề:

```text
.claude/
├── CLAUDE.md
└── rules/
    ├── testing.md
    ├── api-conventions.md
    └── deployment.md
```

- Claude Code tìm mọi file `.md` trong `.claude/rules/`, kể cả thư mục con.
- Rule **không có** frontmatter `paths` được nạp lúc khởi động, ngang hàng với `.claude/CLAUDE.md`.
- Rule **có** `paths` chỉ được nạp khi Claude làm việc với file khớp mẫu. Đây là cách duy nhất trong ba cách thật sự giảm context, và là nội dung của [bài 3.3](../03-rule-theo-duong-dan/).
- Rule cá nhân đặt ở `~/.claude/rules/` và áp dụng cho mọi dự án trên máy bạn.

| Cách tổ chức | Dễ bảo trì hơn | Giảm context mỗi phiên |
|---|:-:|:-:|
| Một CLAUDE.md lớn | Không | Không |
| CLAUDE.md + `@import` | Có | Không |
| `.claude/rules/` không có `paths` | Có | Không |
| `.claude/rules/` có `paths` | Có | **Có** |

## Viết chỉ dẫn hiệu quả

CLAUDE.md là **context, không phải cấu hình bị ép buộc**. Nội dung của nó tới model dưới dạng một message, và model cố làm theo nhưng không có gì đảm bảo tuyệt đối. Ba nguyên tắc giúp tỉ lệ tuân thủ cao hơn:

- **Cụ thể tới mức kiểm tra được.** "Thụt lề 2 dấu cách" tốt hơn "format code cho đẹp". "Chạy `npm test` trước khi commit" tốt hơn "nhớ test".
- **Ngắn.** Nên giữ mỗi file dưới khoảng 200 dòng. File dài tốn context và làm giảm mức tuân thủ. Chỉ ghi những gì Claude không tự tìm ra khi đọc code.
- **Không mâu thuẫn.** Rà định kỳ CLAUDE.md, CLAUDE.md lồng trong thư mục con và các rule để bỏ chỉ dẫn cũ.

Với quy tắc **không được phép có ngoại lệ**, chỉ dẫn là chưa đủ. Hãy dùng hook, như đã học ở [bài 1.5](../../domain-1/05-hooks/): hook chạy như lệnh shell ở một thời điểm cố định, không phụ thuộc vào việc model có nhớ hay không.

Tài liệu gốc: [How Claude remembers your project](https://code.claude.com/docs/en/memory), [Best practices](https://code.claude.com/docs/en/best-practices).

## Tóm tắt

- Bốn phạm vi: managed, user (`~/.claude/CLAUDE.md`), project (`./CLAUDE.md` hoặc `./.claude/CLAUDE.md`), local (`CLAUDE.local.md`). Chỉ file project được chia sẻ qua version control.
- Thư mục cha nạp lúc khởi động, thư mục con nạp khi Claude chạm vào file trong đó. Các file được nối lại, không ghi đè.
- `@path` tính từ file chứa nó, lồng tối đa bốn tầng, và **không** giảm context.
- `.claude/rules/` chia chỉ dẫn theo chủ đề. Chỉ rule có `paths` mới nạp có điều kiện.
- CLAUDE.md là chỉ dẫn mang tính xác suất. Quy tắc bắt buộc thì dùng hook.
