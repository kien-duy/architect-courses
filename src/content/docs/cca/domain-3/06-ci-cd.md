---
title: 3.6 · Claude Code trong CI/CD
description: Chạy Claude Code không tương tác bằng -p, lấy output JSON theo schema, giới hạn quyền trong pipeline và tổ chức bước review độc lập.
lesson:
  day: 7
  minutes: 15
quiz:
  - q: "A team adds a step `claude \"Review the changes in this pull request\"` to their CI job. The job never finishes and is killed by the runner's 60-minute timeout. What is the correct fix?"
    options:
      - text: "Increase the runner timeout so Claude has time to finish"
        why: "Thời gian không phải vấn đề. Lệnh đang mở một phiên tương tác và chờ một người gõ phím, trong khi runner không có ai."
      - text: "Add `--output-format json` so the command returns machine-readable output"
        why: "`--output-format` chỉ có tác dụng ở chế độ print. Không có `-p`, lệnh vẫn là phiên tương tác."
      - text: "Run it with `-p` (`--print`) so Claude Code processes the prompt non-interactively and exits"
        why: "Đúng. `-p` chạy prompt một lượt rồi thoát với mã thoát phản ánh kết quả. Đây là cách chạy Claude Code trong pipeline."
      - text: "Set `permissions.defaultMode` to `plan` in the project settings"
        why: "Plan mode đổi việc Claude được phép làm, không đổi việc phiên có chờ người dùng hay không."
    answer: 2
    keyword: "pipeline treo vì chờ nhập → `-p` / `--print`"
    relearn: "#chạy-không-tương-tác"
    relearnLabel: "Chạy không tương tác"
  - q: "A CI job must post Claude's review findings as inline pull request comments. A script currently greps Claude's prose for lines that look like `file:line`, and breaks whenever the wording changes. Which approach is most reliable?"
    options:
      - text: "Add 'Always answer in the exact same format' to the prompt"
        why: "Chỉ dẫn trong prompt làm định dạng ổn định hơn nhưng không đảm bảo. Script vẫn phải phân tích văn xuôi."
      - text: "Use `--output-format json` with `--json-schema` describing the findings, and read the `structured_output` field"
        why: "Đúng. Schema xác định chính xác các trường (file, dòng, mức độ, nội dung). Kết quả đã kiểm tra theo schema nằm trong `structured_output`, script đọc thẳng mà không cần đoán."
      - text: "Use `--output-format stream-json` and parse the last assistant text message"
        why: "`stream-json` cho bạn từng sự kiện của vòng lặp, nhưng nội dung câu trả lời vẫn là văn bản tự do."
      - text: "Use `--output-format json` alone and parse the `result` field with a regular expression"
        why: "Không có schema thì `result` vẫn là văn bản tự do bọc trong JSON. Vấn đề phân tích câu chữ còn nguyên."
    answer: 1
    keyword: "máy đọc kết quả → `--output-format json` + `--json-schema` → `structured_output`"
    relearn: "#output-có-cấu-trúc"
    relearnLabel: "Output có cấu trúc"
  - q: "A pipeline has Claude Code implement a small change and then, in the same session via `--resume`, asks it to review that change. The review almost never finds problems that human reviewers later catch. What is the best improvement?"
    options:
      - text: "Ask the same session to review twice and compare the two answers"
        why: "Hai lượt review trong cùng phiên chia sẻ cùng một context và cùng những giả định đã dẫn tới đoạn code."
      - text: "Add 'Be extremely critical' to the review prompt"
        why: "Giọng điệu gay gắt hơn không gỡ được việc phiên đó đã mang sẵn lý lẽ của chính nó về đoạn code."
      - text: "Give the review step a higher `--max-turns` value"
        why: "Thêm turn cho phép làm lâu hơn, không thay đổi góc nhìn của người review."
      - text: "Run the review as a separate Claude Code invocation that sees only the diff and the project conventions"
        why: "Đúng. Một phiên độc lập không mang theo lập luận đã sinh ra đoạn code, nên đánh giá đoạn code như một người chưa từng thấy nó."
    answer: 3
    keyword: "phiên viết code review chính nó kém → dùng **phiên độc lập**"
    relearn: "#reviewer-độc-lập-và-chạy-lại-sau-commit-mới"
    relearnLabel: "Reviewer độc lập và chạy lại sau commit mới"
---

Trong pipeline không có ai ngồi trước bàn phím. Claude Code phải chạy một lượt rồi thoát, trả kết quả ở dạng máy đọc được, và chỉ được làm những việc bạn đã cho phép trước.

## Chạy không tương tác

Cờ `-p` (viết đầy đủ là `--print`) chạy một prompt rồi thoát:

```bash
claude -p "Tóm tắt các thay đổi trong diff này" < changes.diff
```

| Đặc điểm | Ý nghĩa cho pipeline |
|---|---|
| Không mở giao diện tương tác | Job không treo chờ người dùng |
| Đọc stdin | Pipe diff, log, file vào: `git diff main \| claude -p "..."` |
| In kết quả ra stdout | Chuyển hướng vào file hoặc bước sau |
| Mã thoát 0 khi thành công, khác 0 khi lượt chạy hỏng | Script rẽ nhánh theo mã thoát |

Thiếu `-p`, lệnh `claude "..."` mở một phiên tương tác và chờ. Trên runner, điều đó có nghĩa là job treo cho tới khi hết giờ. Đây là lỗi kinh điển trong câu hỏi thi.

Vài cờ thường đi cùng `-p`:

| Cờ | Tác dụng |
|---|---|
| `--output-format` | `text` (mặc định), `json` hoặc `stream-json` |
| `--json-schema` | Ép kết quả theo một JSON Schema |
| `--allowedTools` | Tự duyệt các tool được liệt kê |
| `--permission-mode` | Mode nền cho cả lượt chạy, ví dụ `dontAsk` |
| `--max-turns` | Giới hạn số turn của vòng lặp |
| `--max-budget-usd` | Dừng khi chi phí ước tính chạm ngưỡng |
| `--append-system-prompt` | Thêm chỉ dẫn vào cuối system prompt mặc định |
| `--continue`, `--resume` | Tiếp tục một phiên trước |

Skill do người dùng gọi vẫn chạy trong chế độ này: đặt `/tên-skill` vào chuỗi prompt.

## Output có cấu trúc

Với `--output-format json`, Claude Code in **một object JSON** thay cho văn bản:

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "num_turns": 3,
  "result": "…câu trả lời dạng văn bản…",
  "session_id": "…",
  "total_cost_usd": 0.13
}
```

Trường `result` vẫn là văn bản tự do. Để có **dữ liệu** theo đúng cấu trúc, thêm `--json-schema`:

```bash
claude -p "Review src/api/orders.py theo quy ước dự án" \
  --output-format json \
  --json-schema '{
    "type": "object",
    "properties": {
      "verdict":  { "type": "string", "enum": ["pass", "fail"] },
      "findings": { "type": "array", "items": {
        "type": "object",
        "properties": {
          "file": { "type": "string" },
          "line": { "type": "integer" },
          "message": { "type": "string" }
        },
        "required": ["file", "line", "message"]
      } }
    },
    "required": ["verdict", "findings"]
  }' | jq '.structured_output'
```

Ba điều script của bạn phải biết:

- Dữ liệu theo schema nằm ở trường **`structured_output`**, không phải `result`.
- Nếu lượt chạy kết thúc mà không có output hợp lệ (ví dụ chạm `--max-turns`), object **không có** trường `structured_output`. Hãy kiểm tra `subtype` và sự có mặt của trường này trước khi dùng.
- Schema không hợp lệ làm `claude` thoát ngay với lỗi, trước khi chạy.

Với `findings` có `file` và `line`, bước sau của pipeline đăng từng mục thành comment tại đúng dòng của pull request mà không phải phân tích câu chữ.

`stream-json` (đi kèm `--verbose`) in từng sự kiện của vòng lặp thành từng dòng JSON. Nó hợp cho việc theo dõi tiến trình, như bạn đã dùng ở [lab Domain 1](../../domain-1/07-lab/).

## Quyền và giới hạn trong pipeline

Trong một lượt `-p` không có ai để hỏi. Lời gọi tool nào cần phê duyệt mà không được duyệt sẵn sẽ **bị từ chối**, và Claude tiếp tục mà không có nó. Bạn quyết định trước Claude được làm gì:

| Mục tiêu | Cách làm |
|---|---|
| Tự duyệt một số tool | `--allowedTools "Read,Grep,Glob"` hoặc mẫu hẹp như `"Bash(npm test)"` |
| Gỡ hẳn tool khỏi phiên | `--tools "Read,Grep,Glob"` hoặc `--disallowedTools "Edit"` |
| Từ chối mọi thứ chưa duyệt sẵn | `--permission-mode dontAsk` |
| Cho sửa file mà không hỏi | `--permission-mode acceptEdits` |
| Chặn vòng lặp chạy quá dài | `--max-turns 10` |
| Chặn chi phí | `--max-budget-usd 2` |

Nhắc lại từ Domain 1: `--allowedTools` là danh sách **tự duyệt**, không phải danh sách giới hạn. Một bước review chỉ nên đọc thì dùng `--tools` hoặc `--disallowedTools` để bỏ tool ghi.

Nguyên tắc cho job không người trông: cấp ít quyền nhất đủ làm việc, luôn có giới hạn turn hoặc chi phí, và để một người duyệt kết quả cuối (merge, deploy).

Khóa API và token đặt trong secret của hệ thống CI, không bao giờ commit vào repo.

## CLAUDE.md trong CI

Một lượt `claude -p` bình thường nạp cấu hình giống phiên tương tác: CLAUDE.md, rule, skill, hook của dự án. Nhờ vậy CLAUDE.md là nơi tự nhiên để đặt **context cho Claude chạy trong CI**:

- Tiêu chí review: điều gì là lỗi chặn merge, điều gì chỉ là gợi ý.
- Chuẩn viết test, lệnh chạy test, các fixture có sẵn.
- Quy ước mà reviewer nào cũng phải biết.

Viết những thứ này một lần trong CLAUDE.md thì cả lập trình viên trên máy lẫn job CI dùng chung một nguồn. Khi yêu cầu Claude sinh test trong CI, đưa thêm file test hiện có vào context để nó theo đúng phong cách và không viết trùng test đã có.

:::note[Chế độ `--bare`]
Tài liệu hiện hành giới thiệu thêm cờ `--bare` cho script: nó **bỏ qua** việc tự tìm hook, skill, plugin, MCP server và cả CLAUDE.md, để lượt chạy cho kết quả như nhau trên mọi máy. Bare mode cũng không dùng đăng nhập claude.ai mà cần `ANTHROPIC_API_KEY`. Khi dùng `--bare`, bạn tự truyền context cần thiết bằng `--append-system-prompt`, `--settings`, `--mcp-config`. Tài liệu luyện thi viết "CLAUDE.md cung cấp context cho Claude Code chạy trong CI"; điều đó đúng với `-p` không có `--bare` và với Claude Code GitHub Actions.
:::

## Reviewer độc lập và chạy lại sau commit mới

**Phiên viết code không nên là phiên review code đó.** Phiên đã viết mang sẵn các giả định và lập luận dẫn tới đoạn code, nên nó có xu hướng xác nhận chính mình. Một phiên mới chỉ thấy diff và quy ước dự án sẽ đánh giá như một người chưa từng thấy đoạn code.

Trong pipeline, điều này có nghĩa là bước review là một lần gọi `claude -p` **riêng**, không `--resume` phiên đã sinh code:

```bash
# Bước 1: sinh thay đổi
claude -p "Thêm kiểm tra đầu vào cho get_order_total" --permission-mode acceptEdits

# Bước 2: review bằng một phiên độc lập, chỉ đọc
git diff | claude -p "Review diff này theo quy ước dự án. Bỏ qua góp ý về phong cách." \
  --tools "Read,Grep,Glob" --output-format json --json-schema "$(cat review-schema.json)"
```

Ở chế độ tương tác, ý tưởng tương tự là skill `/code-review` (review diff trong một subagent mới) hoặc mở phiên thứ hai.

**Chạy lại sau commit mới.** Mỗi lượt `-p` là một phiên mới và không nhớ lượt trước. Nếu bước review chạy lại trên mỗi commit, nó sẽ báo lại toàn bộ vấn đề cũ và đăng comment trùng. Cách xử lý là đưa kết quả review lần trước vào prompt:

```bash
claude -p "Đây là kết quả review lần trước: $(cat previous-review.json)
Review lại diff hiện tại. Chỉ báo vấn đề mới, hoặc vấn đề cũ chưa được sửa." \
  --output-format json --json-schema "$(cat review-schema.json)"
```

Dặn reviewer bỏ qua góp ý về phong cách cũng quan trọng. Một reviewer được yêu cầu tìm vấn đề thì luôn tìm ra thứ gì đó, và sửa hết mọi góp ý sẽ sinh ra code thừa.

## GitHub Actions và GitLab CI

Bạn không phải tự viết mọi thứ quanh `claude -p`. Có sẵn tích hợp chính thức.

**GitHub Actions** dùng action `anthropics/claude-code-action`. Lệnh `/install-github-app` trong Claude Code cài app và tạo sẵn workflow.

```yaml
name: Claude review
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "Review pull request này theo tiêu chí trong CLAUDE.md"
          claude_args: "--max-turns 8"
```

| Input | Ý nghĩa |
|---|---|
| `prompt` | Có thì chạy **tự động** trên sự kiện đã cấu hình. Không có thì Claude chờ ai đó nhắc `@claude` trong issue hoặc pull request |
| `claude_args` | Truyền cờ CLI: `--max-turns`, `--model`, `--allowedTools`… |
| `anthropic_api_key` | Lấy từ secret của repo |

**GitLab CI/CD** không có action riêng. Job cài Claude Code rồi gọi thẳng `claude -p` trong `script`, kèm `--permission-mode` và `--allowedTools`, với `ANTHROPIC_API_KEY` là biến CI được che.

Ở cả hai nơi, CLAUDE.md ở gốc repo là chỗ ghi chuẩn code và tiêu chí review. Giữ nó ngắn, vì nó được đọc ở mỗi lượt chạy và mỗi lượt đều tốn token.

Tài liệu gốc: [Run Claude Code programmatically](https://code.claude.com/docs/en/headless), [CLI reference](https://code.claude.com/docs/en/cli-reference), [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions), [Claude Code GitLab CI/CD](https://code.claude.com/docs/en/gitlab-ci-cd).

## Tóm tắt

- `-p` / `--print` chạy không tương tác. Thiếu nó, job CI treo chờ nhập.
- `--output-format json` cho một object có `result`, `subtype`, `session_id`, chi phí. Thêm `--json-schema` để có dữ liệu đúng schema trong `structured_output`. Kiểm tra trường này tồn tại trước khi dùng.
- Trong `-p`, lời gọi cần phê duyệt mà chưa duyệt sẵn bị từ chối. Cấp quyền trước bằng `--allowedTools`, gỡ tool bằng `--tools`, chặn bằng `--max-turns` và `--max-budget-usd`.
- CLAUDE.md mang tiêu chí review và chuẩn test tới Claude chạy trong CI. `--bare` bỏ qua CLAUDE.md.
- Review bằng một phiên độc lập với phiên viết code. Khi chạy lại, đưa kết quả lần trước vào và chỉ báo vấn đề mới hoặc chưa sửa.
