---
title: 3.2 · Skill và slash command tùy chỉnh
description: Đóng gói quy trình lặp lại thành skill, chọn nơi đặt, cấu hình frontmatter và chạy skill trong context cô lập.
lesson:
  day: 6
  minutes: 15
quiz:
  - q: "A platform team wrote a `/release-notes` command that every developer on the `checkout` repository should get automatically after `git pull`, with no per-machine setup. Where should it live?"
    options:
      - text: "In each developer's `~/.claude/skills/release-notes/SKILL.md`"
        why: "Thư mục home là phạm vi cá nhân. Mỗi người phải tự chép file, và bản của họ sẽ lệch nhau theo thời gian."
      - text: "In the root `CLAUDE.md`, as a section titled 'Release notes procedure'"
        why: "CLAUDE.md được nạp vào mọi phiên, kể cả khi không ai viết release notes. Quy trình nhiều bước, chỉ dùng thỉnh thoảng thì hợp với skill hơn, và CLAUDE.md không tạo ra lệnh `/release-notes`."
      - text: "In the repository at `.claude/skills/release-notes/SKILL.md` (or `.claude/commands/release-notes.md`), committed to version control"
        why: "Đúng. Skill và command ở phạm vi dự án đi theo repo, nên ai clone hoặc pull cũng có ngay."
      - text: "In `.claude/settings.local.json` under a `commands` key"
        why: "File settings local không được commit và không phải nơi định nghĩa skill."
    answer: 2
    keyword: "chia sẻ cho cả đội → `.claude/skills/` hoặc `.claude/commands/` **trong repo**"
    relearn: "#nơi-đặt-skill"
    relearnLabel: "Nơi đặt skill"
  - q: "A `/audit-deps` skill reads every lockfile in a large monorepo and prints thousands of lines while it works. After running it, developers find the main conversation sluggish and full of dependency listings. Which change addresses this?"
    options:
      - text: "Add `context: fork` so the skill runs in a subagent and only its summary returns to the main conversation"
        why: "Đúng. Với `context: fork`, nội dung skill trở thành prompt của một subagent có context riêng. Kết quả trung gian ở lại trong đó, phiên chính chỉ nhận bản tóm tắt."
      - text: "Add `disable-model-invocation: true` so the output is hidden"
        why: "Trường này chỉ quyết định ai được kích hoạt skill. Nó không ảnh hưởng tới việc output đi vào context nào."
      - text: "Add `allowed-tools: Read` so the skill produces less output"
        why: "`allowed-tools` tự duyệt các tool được liệt kê. Nó không thu nhỏ output và cũng không cô lập context."
      - text: "Move the skill to `~/.claude/skills/` so it runs outside the project"
        why: "Nơi đặt file quyết định ai có skill, không quyết định skill chạy trong context nào."
    answer: 0
    keyword: "output dài làm bẩn phiên chính → `context: fork`"
    relearn: "#chạy-skill-trong-subagent"
    relearnLabel: "Chạy skill trong subagent"
  - q: "A team's `/deploy` skill pushes to production. Twice, Claude ran it on its own after deciding the code 'looked ready'. The team wants developers to keep typing `/deploy staging` themselves, but Claude must never start it. Which frontmatter achieves this?"
    options:
      - text: "`user-invocable: false`"
        why: "Ngược với yêu cầu: trường này ẩn skill khỏi menu `/` và chỉ còn Claude gọi được."
      - text: "`argument-hint: \"[environment]\"`"
        why: "Đây chỉ là gợi ý hiển thị khi gõ lệnh. Nó không ngăn Claude tự gọi skill."
      - text: "`context: fork`"
        why: "Skill vẫn có thể được Claude tự kích hoạt, chỉ là chạy trong subagent."
      - text: "`disable-model-invocation: true`"
        why: "Đúng. Claude không thể tự nạp skill này nữa, còn người dùng vẫn gọi được bằng `/deploy`. Đây là lựa chọn chuẩn cho quy trình có tác dụng phụ."
    answer: 3
    keyword: "quy trình có tác dụng phụ → `disable-model-invocation: true`"
    relearn: "#ai-được-gọi-skill"
    relearnLabel: "Ai được gọi skill"
---

Nếu bạn dán cùng một checklist vào chat lần thứ ba, đó là dấu hiệu nên đóng gói nó lại. Skill biến một quy trình thành lệnh `/tên` mà cả đội dùng chung, và chỉ tốn context khi được gọi.

## Skill là gì

Một skill là một thư mục chứa file `SKILL.md`. File có hai phần: frontmatter YAML cho Claude Code biết khi nào dùng skill, và phần thân Markdown là chỉ dẫn Claude làm theo khi skill chạy.

```markdown
---
name: review-file
description: Review một file Python theo quy ước dự án. Dùng khi người dùng yêu cầu review hoặc soát một file cụ thể.
argument-hint: "[đường-dẫn-file]"
allowed-tools: Read Grep Glob
---

Review file `$ARGUMENTS` theo quy ước của dự án.

1. Đọc file. Không sửa file.
2. Liệt kê vi phạm, mỗi dòng gồm mức độ, số dòng và cách sửa.
```

Có hai cách kích hoạt:

- **Bạn gọi trực tiếp** bằng `/review-file src/api/orders.py`.
- **Claude tự nạp** khi yêu cầu của bạn khớp với `description`.

Khác biệt cốt lõi so với CLAUDE.md: lúc bình thường chỉ có `description` nằm trong context. **Phần thân chỉ được nạp khi skill được gọi.** Tài liệu tham khảo dài gần như không tốn gì cho tới lúc cần.

:::note[Slash command và skill]
Trước đây "custom slash command" là file Markdown trong `.claude/commands/`, còn skill là một khái niệm riêng. Tài liệu hiện hành đã **gộp custom command vào skill**. File trong `.claude/commands/` vẫn chạy và nhận cùng frontmatter (trừ `name` và `paths`), nhưng định dạng nên dùng cho việc mới là `.claude/skills/<tên>/SKILL.md`, vì nó cho phép kèm file phụ như script hay tài liệu tham khảo. Tài liệu luyện thi cũ vẫn viết "project commands in `.claude/commands/`". Khi gặp, hãy hiểu đó cùng là cơ chế tạo lệnh `/tên`.
:::

## Nơi đặt skill

Nơi lưu quyết định ai có skill đó.

| Phạm vi | Đường dẫn | Ai có |
|---|---|---|
| Enterprise | Thư mục managed settings của tổ chức | Mọi máy mà tổ chức triển khai |
| Cá nhân | `~/.claude/skills/<tên>/SKILL.md` | Chỉ bạn, ở mọi dự án |
| Dự án | `.claude/skills/<tên>/SKILL.md` | Cả đội, khi commit vào repo |
| Plugin | `<plugin>/skills/<tên>/SKILL.md` | Nơi plugin được bật, gọi bằng `/tên-plugin:tên-skill` |

Định dạng cũ có hai nơi tương ứng: `.claude/commands/<tên>.md` cho dự án và `~/.claude/commands/<tên>.md` cho cá nhân.

Quy tắc chọn giống hệt CLAUDE.md: thứ cả đội cần thì đặt trong repo, thứ riêng của bạn thì đặt ở thư mục home.

Khi hai skill **trùng tên**:

| Trùng tên giữa | Bản nào chạy |
|---|---|
| Enterprise, cá nhân, dự án | Enterprise thắng cá nhân, cá nhân thắng dự án |
| Một skill và một file trong `.claude/commands/` | Skill |
| Skill của plugin và skill ở nơi khác | Cả hai, vì skill của plugin có tiền tố tên plugin |

Hệ quả thực tế: nếu bạn tạo `~/.claude/skills/deploy/` trong khi dự án cũng có skill `deploy`, lệnh `/deploy` trên máy bạn sẽ chạy **bản cá nhân** và âm thầm che bản của đội. Muốn có biến thể riêng, hãy đặt **tên khác**, ví dụ `deploy-dry-run`.

Trong monorepo, skill ở `.claude/skills/` của thư mục bạn khởi động và các thư mục cha được nạp ngay. Skill trong thư mục con được nạp khi Claude làm việc với file ở đó.

## Frontmatter của SKILL.md

Mọi trường đều không bắt buộc. Chỉ `description` là nên có. Tên trường sai chính tả bị bỏ qua mà không báo lỗi.

| Trường | Tác dụng |
|---|---|
| `name` | Tên lệnh. Mặc định là tên thư mục |
| `description` | Skill làm gì và dùng khi nào. Claude dựa vào đây để tự nạp skill |
| `argument-hint` | Gợi ý hiện khi gõ lệnh, ví dụ `[issue-number]` |
| `arguments` | Đặt tên cho tham số theo vị trí, để dùng `$tên` trong phần thân |
| `allowed-tools` | Tool được **tự duyệt** trong lượt gọi skill |
| `disallowed-tools` | Tool bị **gỡ khỏi** bộ tool trong lúc skill chạy |
| `disable-model-invocation` | `true`: Claude không tự gọi được, chỉ người dùng gõ `/tên` |
| `user-invocable` | `false`: ẩn khỏi menu `/`, chỉ Claude gọi |
| `context` | `fork`: chạy skill trong một subagent |
| `agent` | Loại subagent dùng khi có `context: fork` |
| `model` | Model dùng trong lượt skill chạy |
| `paths` | Mẫu glob. Claude chỉ tự nạp skill khi làm việc với file khớp |

:::caution[`allowed-tools` không phải danh sách giới hạn]
Nhiều tài liệu luyện thi mô tả `allowed-tools` là "giới hạn tool mà skill được dùng". Theo tài liệu hiện hành, trường này **tự duyệt** các tool được liệt kê trong lượt gọi skill, để Claude không hỏi quyền. Tool khác vẫn tồn tại và vẫn theo luật permission thông thường. Điều này giống `--allowedTools` ở [lab Domain 1](../../domain-1/07-lab/). Muốn thật sự bỏ tool, dùng `disallowed-tools`, hoặc chạy skill bằng `context: fork` với một subagent chỉ có tool đọc. Trong đề thi, nếu `allowed-tools` xuất hiện như cách "thu hẹp quyền của skill", hãy chọn nó khi các phương án còn lại rõ ràng sai.
:::

Vì skill dự án có thể tự cấp quyền cho mình qua `allowed-tools`, hãy đọc trường này trước khi chạy Claude Code trong một repo lạ.

## Tham số và ARGUMENTS

Phần đứng sau tên skill là tham số.

| Ký hiệu | Ý nghĩa |
|---|---|
| `$ARGUMENTS` | Toàn bộ chuỗi tham số |
| `$0`, `$1` hoặc `$ARGUMENTS[0]` | Tham số theo vị trí, đếm từ 0 |
| `$tên` | Tham số đã đặt tên trong trường `arguments` |
| `${CLAUDE_SKILL_DIR}` | Thư mục chứa `SKILL.md`, dùng để gọi script đi kèm |

```markdown
---
name: migrate-component
description: Chuyển một component sang framework khác
argument-hint: "[component] [từ] [sang]"
---

Chuyển component $0 từ $1 sang $2. Giữ nguyên hành vi và test hiện có.
```

Gõ `/migrate-component SearchBar React Vue` thì `$0` là `SearchBar`. Nếu phần thân không có chỗ nào nhận tham số, Claude Code tự nối `ARGUMENTS: <giá trị>` vào cuối để Claude vẫn thấy.

`argument-hint` không kiểm tra hay ép buộc gì. Nó chỉ hiển thị gợi ý để người gọi biết skill cần gì.

Skill cũng có thể chèn dữ liệu động: dòng `` !`git diff HEAD` `` trong phần thân được Claude Code chạy trước, và output thay vào đúng chỗ đó trước khi Claude đọc.

## Ai được gọi skill

Mặc định cả bạn và Claude đều gọi được. Hai trường thay đổi điều đó:

| Frontmatter | Bạn gọi | Claude tự gọi | Dùng cho |
|---|:-:|:-:|---|
| (mặc định) | Có | Có | Phần lớn skill |
| `disable-model-invocation: true` | Có | Không | Việc có tác dụng phụ: `/deploy`, `/commit`, gửi tin nhắn |
| `user-invocable: false` | Không | Có | Kiến thức nền mà gõ thành lệnh thì vô nghĩa |

Với `disable-model-invocation: true`, cả `description` cũng không nằm trong context nữa, nên skill không tốn token nào cho tới khi bạn gọi.

Nội dung skill sau khi được gọi sẽ **ở lại trong hội thoại** cho các lượt sau. Quyền từ `allowed-tools` thì không: nó hết hiệu lực khi bạn gửi message tiếp theo.

## Chạy skill trong subagent

Thêm `context: fork` để skill chạy cô lập. Claude Code tạo một subagent thuộc loại ghi trong `agent` và đưa nội dung skill làm prompt cho nó.

```markdown
---
name: deep-research
description: Tìm hiểu kỹ một chủ đề trong codebase
context: fork
agent: Explore
---

Tìm hiểu $ARGUMENTS:
1. Tìm file liên quan bằng Glob và Grep.
2. Đọc và phân tích.
3. Tóm tắt, kèm đường dẫn file cụ thể.
```

Những gì bạn đã học về subagent ở [bài 1.3](../../domain-1/03-coordinator-subagent/) áp dụng nguyên vẹn:

- Subagent **không thấy lịch sử hội thoại** của bạn. Chỉ dẫn trong skill phải tự đủ.
- Mọi lần đọc file và output trung gian ở lại trong subagent. Phiên chính chỉ nhận bản tóm tắt cuối.
- `agent` nhận `Explore`, `Plan`, `general-purpose` hoặc một subagent tự định nghĩa trong `.claude/agents/`. Bỏ trống thì dùng `general-purpose`.

Dùng `context: fork` khi skill sinh nhiều output (quét cả codebase, chạy toàn bộ test) hoặc khi bạn muốn một lượt làm việc không bị ảnh hưởng bởi những gì đã bàn. **Không** dùng cho skill chỉ chứa quy ước kiểu "hãy theo chuẩn API này": subagent nhận quy ước mà không có việc cụ thể, và trả về mà không làm gì.

## Skill hay CLAUDE.md hay rule

| Nội dung | Đặt ở | Lý do |
|---|---|---|
| Sự thật luôn cần: lệnh build, quy ước chung | CLAUDE.md | Nạp mọi phiên |
| Quy ước chỉ cho một vùng code | Rule có `paths` | Nạp khi chạm file khớp |
| Quy trình nhiều bước, dùng theo yêu cầu | Skill | Thân chỉ nạp khi được gọi |
| Quy tắc phải được ép buộc | Hook | Xác định, không phụ thuộc model |

Tài liệu gốc: [Extend Claude with skills](https://code.claude.com/docs/en/skills), [Commands reference](https://code.claude.com/docs/en/commands).

## Tóm tắt

- Skill là thư mục có `SKILL.md`. Chỉ `description` nằm sẵn trong context, phần thân nạp khi được gọi.
- Custom slash command đã gộp vào skill. `.claude/commands/` vẫn chạy.
- Trong repo (`.claude/skills/`) là của cả đội. Trong `~/.claude/skills/` là của riêng bạn. Trùng tên thì bản cá nhân che bản dự án, nên biến thể riêng cần tên khác.
- `context: fork` cô lập output dài. `disable-model-invocation: true` chặn Claude tự chạy việc có tác dụng phụ. `argument-hint` gợi ý tham số.
- `allowed-tools` tự duyệt tool, không gỡ tool. Gỡ tool dùng `disallowed-tools`.
