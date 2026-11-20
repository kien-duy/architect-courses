---
title: 1.7 · Lab — Nhóm phân tích sự cố
description: Chạy vòng lặp agent, subagent song song, hook chặn ghi file và resume session bằng Claude Code.
sidebar:
  badge:
    text: Lab
    variant: tip
lesson:
  day: 3
  kind: lab
  minutes: 30
quiz:
  - q: "In step 1 the command passed `--allowedTools \"Read,Glob,Grep\"`, yet the trace shows the agent calling `Bash`. Why was that possible?"
    options:
      - text: "The hook in `.claude/settings.json` approved the `Bash` call"
        why: "Hook của lab chỉ khớp `Write|Edit` và chỉ có thể chặn. Nó không liên quan tới lời gọi `Bash`."
      - text: "`--allowedTools` only applies to subagents, not to the main session"
        why: "Ngược lại: `--allowedTools` áp dụng cho phiên chính. Bộ tool của subagent do trường `tools` trong file định nghĩa quyết định."
      - text: "`--allowedTools` auto-approves the listed tools; it does not remove other tools, and a call that needs no approval still runs"
        why: "Đúng. Đây là danh sách tự duyệt, không phải danh sách giới hạn. Tool khác vẫn tồn tại, và lời gọi không cần duyệt (như một lệnh chỉ đọc) vẫn chạy."
      - text: "The model ignored the configuration"
        why: "Model không thể bỏ qua cơ chế permission. Lời gọi được chạy vì nó hợp lệ theo luật permission."
    answer: 2
    keyword: "`allowedTools` = tự duyệt, **không** phải giới hạn"
    relearn: "#bước-1-quan-sát-vòng-lặp"
    relearnLabel: "Bước 1: quan sát vòng lặp"
  - q: "In step 3 the edit to `data/incident-2026-01.md` was blocked, but the final `result` line still showed `subtype=success`. What does that tell you?"
    options:
      - text: "`success` means the loop ended normally, not that the requested change was made; you must inspect the outcome separately"
        why: "Đúng. `success` chỉ nói rằng model kết thúc lượt một cách bình thường. Ở đây nó kết thúc bằng lời giải thích rằng không sửa được file."
      - text: "The hook failed silently and the file was actually edited"
        why: "File không đổi: bước kiểm tra cuối cho thấy dòng mới không có trong file, và trace ghi rõ lời gọi `Edit` bị chặn."
      - text: "Blocked tool calls are not counted as turns"
        why: "Lời gọi bị chặn vẫn nằm trong một turn. Số turn không liên quan tới ý nghĩa của `success`."
      - text: "The result subtype is only meaningful when `--max-turns` is set"
        why: "`subtype` luôn có ý nghĩa. `--max-turns` chỉ thêm khả năng kết thúc bằng `error_max_turns`."
    answer: 0
    keyword: "`success` = vòng lặp kết thúc bình thường, **không** = đạt mục tiêu"
    relearn: "#bước-3-hook-chặn-ghi-file"
    relearnLabel: "Bước 3: hook chặn ghi file"
---

Trong lab này bạn điều khiển một "nhóm phân tích sự cố": phiên Claude Code chính làm coordinator, giao việc cho subagent `incident-analyst`, và một hook bảo vệ dữ liệu gốc. Mọi thứ chạy bằng Claude Code với tài khoản bạn đang đăng nhập, **không cần API key**. Nếu chưa chuẩn bị, xem [Chuẩn bị chạy lab](../../bat-dau/chuan-bi-lab/).

Mọi output mẫu bên dưới là output thật, chạy ngày 2026-11-19 với Claude Code 2.1.206 và `--model haiku`. Câu chữ của model sẽ khác mỗi lần chạy; cấu trúc các bước thì giống.

## Thư mục lab

```text
labs/domain-1/
├── CLAUDE.md                        quy ước của dự án
├── trace.jq                         bộ lọc rút gọn output stream-json
├── data/                            3 báo cáo sự cố (chỉ đọc)
├── out/                             nơi được phép ghi
└── .claude/
    ├── agents/incident-analyst.md   subagent chỉ đọc
    ├── hooks/protect-data.py        hook chặn ghi vào data/
    └── settings.json                đăng ký hook
```

Vào thư mục lab trước khi chạy bất kỳ lệnh nào:

```bash
cd labs/domain-1
```

Các lệnh dùng `jq` để rút gọn output. Mỗi lệnh kết thúc bằng `< /dev/null` để Claude Code không chờ dữ liệu từ stdin.

## Bước 1: quan sát vòng lặp

Chạy một tác vụ đọc đơn giản và in ra từng bước của vòng lặp:

```bash
claude -p "Liệt kê các file trong data/ và cho biết mỗi file nói về sự cố gì, mỗi file một dòng." --model haiku --allowedTools "Read,Glob,Grep" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

Output mẫu:

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Bash
user       ← tool_result
assistant  → tool_use: Read
user       ← tool_result
assistant  → tool_use: Read
user       ← tool_result
assistant  → tool_use: Read
user       ← tool_result
assistant  → text (416 ký tự)
result        subtype=success turns=5 stop_reason=end_turn
```

Đối chiếu với [bài 1.1](../01-agentic-loop/):

- Mỗi cặp `assistant → tool_use` / `user ← tool_result` là một vòng: model yêu cầu tool, kết quả quay về trong message `user`.
- Vòng lặp kết thúc ở phản hồi **chỉ có text**, với `stop_reason=end_turn`.
- Không ai viết sẵn thứ tự "liệt kê rồi đọc ba file". Model tự quyết định từng bước.

Để ý dòng `tool_use: Bash` dù lệnh chỉ liệt kê `Read,Glob,Grep`. `--allowedTools` là danh sách **tự duyệt**, không phải danh sách giới hạn: tool khác vẫn có trong phiên, và lời gọi không cần duyệt vẫn chạy. Model của bạn có thể chọn `Glob` thay cho `Bash`; cả hai đều hợp lệ.

## Bước 2: giao việc cho subagent

Mở file định nghĩa subagent:

```bash
cat .claude/agents/incident-analyst.md
```

Frontmatter khai báo `tools: Read, Grep, Glob` (chỉ đọc) và một `description` nói rõ khi nào dùng. Phần thân là system prompt của subagent.

Giờ yêu cầu coordinator giao ba file cho ba subagent trong cùng một lượt:

```bash
claude -p "Dùng subagent incident-analyst để phân tích từng file trong data/, mỗi file một subagent, gọi cả ba trong cùng một lượt và chờ kết quả. Sau đó nêu điểm chung giữa ba sự cố trong đúng 2 câu." --model haiku --allowedTools "Read,Glob,Grep,Agent" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

Output mẫu (đã lược các dòng trạng thái lặp lại):

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Glob
user       ← tool_result
assistant  → tool_use: Agent (subagent: incident-analyst)
user       ← tool_result
assistant  → tool_use: Agent (subagent: incident-analyst)
user       ← tool_result
assistant  → tool_use: Agent (subagent: incident-analyst)
user       ← tool_result
  [subagent] assistant  → tool_use: Read
  [subagent] user       ← tool_result
  [subagent] assistant  → tool_use: Read
  [subagent] user       ← tool_result
  [subagent] assistant  → tool_use: Read
  [subagent] user       ← tool_result
  [subagent] assistant  → text (286 ký tự)
  [subagent] assistant  → text (325 ký tự)
  [subagent] assistant  → text (504 ký tự)
assistant  → text (305 ký tự)
result        subtype=success turns=1 stop_reason=end_turn
```

Đối chiếu với [bài 1.3](../03-coordinator-subagent/):

- Ba lời gọi `Agent` nằm liền nhau trong **một** phản hồi của coordinator, nên ba subagent chạy song song. Ba lần `Read` của chúng xen kẽ nhau.
- Dòng có nhãn `[subagent]` là message sinh ra bên trong context của subagent (chúng mang `parent_tool_use_id`). Coordinator không nhận các bước đó, chỉ nhận báo cáo cuối.
- `tool_result` của lời gọi `Agent` về ngay lập tức vì subagent chạy nền; báo cáo tới ở lượt sau. Do đó bạn sẽ thấy vài dòng `result` trung gian trước dòng cuối.

Xem coordinator đã viết prompt giao việc thế nào:

```bash
claude -p "Dùng subagent incident-analyst để phân tích data/incident-2026-01.md và chờ kết quả." --model haiku --allowedTools "Read,Agent" --output-format stream-json --verbose < /dev/null | jq -c 'select(.type=="assistant") | .message.content[] | select(.type=="tool_use" and .name=="Agent") | .input | {subagent_type, prompt}'
```

```json
{"subagent_type":"incident-analyst","prompt":"Phân tích file data/incident-2026-01.md. Trích xuất:\n1. Nguyên nhân gốc rễ của sự cố\n2. Các hành động cần làm để khắc phục/phòng ngừa\nTrả lời bằng tiếng Việt, ngắn gọn."}
```

Chuỗi `prompt` đó là **toàn bộ** những gì subagent biết về yêu cầu. Nó không thấy câu lệnh gốc của bạn. Đường dẫn file phải nằm trong prompt thì subagent mới biết đọc file nào.

## Bước 3: hook chặn ghi file

Xem hook và nơi đăng ký:

```bash
cat .claude/settings.json .claude/hooks/protect-data.py
```

Hook khớp `Write|Edit`. Script đọc JSON từ stdin, và nếu `file_path` nằm trong `data/` thì in lý do ra stderr rồi **thoát với mã 2**.

Thử yêu cầu sửa một báo cáo gốc. Lệnh tự duyệt cả `Edit` và `Write`, nên thứ duy nhất có thể ngăn nó là hook:

```bash
claude -p "Thêm dòng '- Trạng thái: đã xem xét' vào cuối file data/incident-2026-01.md." --model haiku --allowedTools "Read,Edit,Write" --output-format stream-json --verbose < /dev/null | jq -rf trace.jq
```

Output mẫu:

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Read
user       ← tool_result
assistant  → tool_use: Edit
user       ← tool_result (LỖI/BỊ CHẶN)
assistant  → text (254 ký tự)
result        subtype=success turns=3 stop_reason=end_turn
```

Nội dung `tool_result` mà model nhận thay cho kết quả của `Edit`:

```text
PreToolUse:Edit hook error: [python3 "$CLAUDE_PROJECT_DIR"/.claude/hooks/protect-data.py]: Thư mục data/ chứa báo cáo sự cố gốc và chỉ được đọc. Hãy ghi kết quả vào thư mục out/ thay vì sửa file gốc.
```

Và câu trả lời cuối của model:

```text
Không thể sửa file trong thư mục `data/` — đó là báo cáo sự cố gốc và chỉ được đọc. Theo hướng dẫn
trong CLAUDE.md, kết quả phân tích phải ghi vào thư mục `out/` thay vì sửa file gốc.
```

Kiểm tra file không đổi:

```bash
tail -1 data/incident-2026-01.md
```

Đối chiếu với [bài 1.5](../05-hooks/):

- `CLAUDE.md` cũng ghi "data/ chỉ đọc", nhưng model **vẫn thử** gọi `Edit`. Chỉ dẫn là xác suất. Hook mới là thứ chặn lời gọi.
- Lý do trong stderr tới được model và nói rõ bước đúng (ghi vào `out/`), nên model chuyển hướng thay vì thử lại.
- `subtype=success` dù việc được yêu cầu **không** được thực hiện. `success` nghĩa là vòng lặp kết thúc bình thường, không phải mục tiêu đã đạt.

Thử thêm: yêu cầu ghi vào `out/ghi-chu.md` và xác nhận hook cho qua.

## Bước 4: session và resume

Chạy một lượt, lấy `session_id` từ output JSON:

```bash
SID=$(claude -p "Đọc data/incident-2026-02.md và nhớ con số email bị gửi trễ. Chỉ trả lời: Đã đọc." --model haiku --allowedTools "Read" --output-format json < /dev/null | jq -r '.session_id'); echo $SID
```

Hỏi tiếp trong **cùng phiên** bằng `--resume`, cấm đọc lại file:

```bash
claude -p "Không đọc lại file. Có bao nhiêu email bị gửi trễ?" --model haiku --resume "$SID" --output-format json < /dev/null | jq '{result, num_turns}'
```

```json
{
  "result": "42.000 email xác nhận đơn hàng bị gửi trễ.",
  "num_turns": 1
}
```

Hỏi đúng câu đó trong một **phiên mới**:

```bash
claude -p "Không đọc file nào. Có bao nhiêu email bị gửi trễ trong sự cố tháng 2?" --model haiku --output-format json < /dev/null | jq -r '.result'
```

```text
Tôi không có thông tin về sự cố tháng 2 hoặc số lượng email bị gửi trễ từ bộ nhớ hay cuộc hội thoại
trước đó. Để trả lời câu hỏi này, tôi cần đọc file báo cáo trong `data/`…
```

Đối chiếu với [bài 1.6](../06-session/): phiên được resume còn giữ kết quả `Read` trong lịch sử nên trả lời ngay trong một turn. Phiên mới không biết gì. Đây cũng là lý do kết quả cũ trong một phiên resume có thể lỗi thời: nếu file đã đổi sau lần đọc, phiên resume vẫn trả lời `42.000`.

## Bước 5: chạm giới hạn turn

```bash
claude -p "Đọc cả ba file trong data/ rồi tóm tắt." --model haiku --allowedTools "Read,Glob" --max-turns 1 --output-format json < /dev/null | jq '{subtype, is_error, num_turns, result}'
```

```json
{
  "subtype": "error_max_turns",
  "is_error": true,
  "num_turns": 2,
  "result": null
}
```

Đối chiếu với [bài 1.2](../02-kiem-soat-vong-lap/): việc này cần ít nhất một turn gọi tool và một turn trả lời, nên giới hạn 1 turn làm lượt chạy kết thúc bằng `error_max_turns` và `result` là `null`. Code đọc thẳng `.result` mà không kiểm tra `subtype` sẽ hỏng ở đây.

## Tự làm thêm

1. Sửa `tools` của `incident-analyst` thành `Read, Grep, Glob, Write`, rồi yêu cầu nó ghi tóm tắt vào `data/`. Hook của phiên chính có chặn lời gọi `Write` của subagent không?
2. Viết thêm subagent `action-planner` chỉ nhận ba bản phân tích và đề xuất ba việc ưu tiên. Coordinator phải truyền gì trong prompt để nó làm được việc?
3. Đổi `description` của `incident-analyst` thành một câu mơ hồ như "Trợ lý chung" và chạy lại bước 2 mà không nhắc tên subagent. Coordinator còn giao việc cho nó không?

## Dọn dẹp

Lab không tạo gì ngoài file bạn tự yêu cầu ghi trong `out/`, ví dụ `out/ghi-chu.md` ở bước 3. Xóa nó nếu muốn:

```bash
rm -f out/ghi-chu.md
```
