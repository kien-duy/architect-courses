---
title: 5.7 · Lab — Agent nghiên cứu có nguồn gốc dữ liệu
description: Chạy một agent nghiên cứu trên các nguồn mâu thuẫn, cũ và thiếu; xem lỗi có cấu trúc, chú thích độ phủ, scratchpad và compaction bằng Claude Code.
sidebar:
  badge:
    text: Lab
    variant: tip
lesson:
  day: 11
  kind: lab
  minutes: 30
quiz:
  - q: "In step 2, both subagent responses contained zero claims. The one for `chi-phi-cong-cu-2026.md` had `\"status\": \"error\"` with `\"failure_type\": \"not_found\"`; the one for `khao-sat-devviet-2023.md` had `\"status\": \"ok\"` with `\"claims\": []`. How should a coordinator treat them?"
    options:
      - text: "Identically: neither source contributes anything, so both can be dropped from the report"
        why: "Hai kết quả nói hai điều khác nhau. Bỏ cả hai sẽ xóa một lỗ hổng độ phủ mà người đọc cần biết."
      - text: "The first is a coverage gap (the answer is unknown); the second is a finding (the source was read and says nothing on the question)"
        why: "Đúng. Không đọc được file nghĩa là chưa biết. Đọc được mà không có gì liên quan là một kết quả hợp lệ. Chỉ cái đầu cần được ghi vào mục lỗ hổng."
      - text: "Both are errors and both should be retried"
        why: "Kết quả thứ hai không phải lỗi: file đã được đọc thành công. Thử lại không thay đổi nội dung của nó."
      - text: "The second is more serious, because an existing file returned nothing"
        why: "File tồn tại và được đọc đúng. Nó chỉ không đề cập tới câu hỏi. Lỗ hổng thật nằm ở file không đọc được."
    answer: 1
    keyword: "`error` = **chưa biết**; `ok` + rỗng = **không có**"
    relearn: "#bước-2-lỗi-có-cấu-trúc-và-kết-quả-rỗng"
    relearnLabel: "Bước 2: lỗi có cấu trúc và kết quả rỗng"
  - q: "In step 5, after `/compact` ran with a focus on numbers, sources and dates, the resumed session still knew the survey's sample size but could not reproduce the verbatim quote from the GitNhanh report. What does this show?"
    options:
      - text: "Compaction failed and should be run again"
        why: "Compaction đã chạy đúng: sự kiện `compact_boundary` cho thấy context giảm từ hơn 42 nghìn xuống khoảng 3,5 nghìn token."
      - text: "The focus instruction was ignored"
        why: "Ngược lại: con số, thứ được yêu cầu giữ, vẫn còn. Câu trích không nằm trong trọng tâm nên không được giữ."
      - text: "Resumed sessions cannot access anything from before the compaction"
        why: "Phiên vẫn trả lời đúng cỡ mẫu 420 nhóm, tức là bản tóm tắt có mang theo một phần nội dung cũ."
      - text: "A compacted session keeps only what the summary kept; details you will need later must be written to a file before compacting"
        why: "Đúng. Trọng tâm quyết định thứ được giữ, phần còn lại chỉ còn ở dạng tóm tắt. Thứ gì phải chính xác thì ghi ra scratchpad trước khi compact."
    answer: 3
    keyword: "ghi **scratchpad trước**, compact sau"
    relearn: "#bước-5-compact-và-thứ-còn-lại"
    relearnLabel: "Bước 5: compact và thứ còn lại"
---

Trong lab này bạn chạy một agent nghiên cứu nhỏ trên bốn nguồn: hai nguồn cho số liệu khác nhau, một nguồn cũ, và một nguồn không đọc được. Bạn sẽ thấy agent trả lời sai kiểu gì khi không có ràng buộc, rồi lần lượt thêm lỗi có cấu trúc, scratchpad và chú thích độ phủ. Mọi thứ chạy bằng Claude Code với tài khoản bạn đang đăng nhập, **không cần API key**. Nếu chưa chuẩn bị, xem [Chuẩn bị chạy lab](../../bat-dau/chuan-bi-lab/).

Mọi output mẫu bên dưới là output thật, chạy ngày 2026-11-19 với Claude Code 2.1.206 và `--model haiku`. Câu chữ của model sẽ khác mỗi lần chạy; cấu trúc các bước thì giống. Đường dẫn tuyệt đối trong output được rút gọn thành `…/labs/domain-5/`.

## Thư mục lab

```text
labs/domain-5/
├── CLAUDE.md                              quy ước của dự án
├── trace.jq                               bộ lọc rút gọn output stream-json
├── sources/
│   ├── index.md                           danh sách 4 nguồn cần đọc
│   ├── khao-sat-devviet-2026.md           khảo sát, công bố 2026-03-10
│   ├── telemetry-gitnhanh-2026.md         số đo tự động, công bố 2026-06-02
│   └── khao-sat-devviet-2023.md           khảo sát cũ, công bố 2023-04-18
├── notes/                                 nơi ghi scratchpad và file trace
└── .claude/agents/source-reader.md        subagent đọc một nguồn
```

`sources/index.md` liệt kê bốn file, nhưng `sources/chi-phi-cong-cu-2026.md` **cố ý không tồn tại**. Mọi tổ chức và số liệu trong `sources/` là giả định.

Vào thư mục lab trước khi chạy bất kỳ lệnh nào:

```bash
cd labs/domain-5
```

Các lệnh dùng `jq`. Mỗi lệnh `claude` kết thúc bằng `< /dev/null` để Claude Code không chờ dữ liệu từ stdin. Lệnh nào có `tee notes/buoc-N.jsonl` thì lưu toàn bộ output để bạn xem lại ở lệnh sau.

## Bước 1: câu trả lời mất nguồn

Hỏi thẳng một con số, không ràng buộc gì:

```bash
claude -p "Dựa vào tài liệu trong sources/, bao nhiêu phần trăm nhóm phát triển đang dùng AI review code? Trả lời đúng một câu, chỉ một con số." --model haiku --allowedTools "Read,Glob,Grep" --output-format stream-json --verbose < /dev/null | tee notes/buoc-1.jsonl | jq -rf trace.jq
```

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Read
user       ← tool_result
assistant  → tool_use: Read
user       ← tool_result
assistant  → text (83 ký tự)
result        subtype=success turns=3 stop_reason=end_turn
```

Xem câu trả lời và những file agent đã đọc:

```bash
jq -r 'select(.type=="result") | .result' notes/buoc-1.jsonl
```

```text
38% nhóm phát triển đang dùng trợ lý AI để review code, theo khảo sát DevViet 2026.
```

```bash
jq -r 'select(.type=="assistant") | .message.content[] | select(.type=="tool_use") | .input | (.file_path // .pattern // .command)' notes/buoc-1.jsonl
```

```text
…/labs/domain-5/sources/index.md
…/labs/domain-5/sources/khao-sat-devviet-2026.md
```

Agent đọc danh sách nguồn, đọc **một** trong bốn file, rồi dừng. Câu trả lời trông ổn và lượt chạy kết thúc với `subtype=success`. Nhưng:

- Con số 61% của nguồn thứ hai và 12% của nguồn năm 2023 không được nhắc tới.
- Không có ngày công bố, không có phương pháp.
- Không ai biết ba nguồn còn lại chưa được đọc, và một trong số đó không tồn tại.

Đây là điểm xuất phát. Ở một lần chạy khác trong lúc soạn lab, câu trả lời chỉ là `38%`, không kèm cả tên nguồn. Yêu cầu "chỉ một con số" đã buộc agent tự chọn, đúng thứ [bài 5.6](../06-nguon-goc-du-lieu/) nói không được làm.

## Bước 2: lỗi có cấu trúc và kết quả rỗng

Mở định nghĩa subagent:

```bash
cat .claude/agents/source-reader.md
```

System prompt của nó quy định hai dạng output: `"status": "ok"` kèm danh sách `claims` (được phép rỗng), và `"status": "error"` kèm `failure_type`, `attempted`, `partial_results`, `alternatives`, `coverage_impact`. Nó cũng cấm trả `ok` với `claims` rỗng khi lý do thật là không đọc được file.

Giao cho nó file không tồn tại:

```bash
claude -p "Dùng subagent source-reader đọc sources/chi-phi-cong-cu-2026.md để tìm chi phí công cụ AI review trên mỗi lập trình viên, và chờ kết quả. Sau đó in lại nguyên văn khối JSON mà subagent trả về, không thêm gì." --model haiku --allowedTools "Read,Glob,Grep,Agent" --output-format stream-json --verbose < /dev/null | tee notes/buoc-2a.jsonl | jq -rf trace.jq
```

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Agent (subagent: source-reader)
user       ← tool_result
assistant  → text (26 ký tự)
  [subagent] assistant  → tool_use: Read
  [subagent] user       ← tool_result (LỖI/BỊ CHẶN)
  [subagent] assistant  → tool_use: Glob
  [subagent] user       ← tool_result
  [subagent] assistant  → tool_use: Read
  [subagent] user       ← tool_result
  [subagent] assistant  → text (460 ký tự)
system/init   model=claude-haiku-4-5-20251001
assistant  → text (460 ký tự)
result        subtype=success turns=2 stop_reason=end_turn
result        subtype=success turns=1 stop_reason=end_turn
```

```bash
jq -r 'select(.type=="result") | .result' notes/buoc-2a.jsonl
```

Output (đã lược dòng trạng thái trung gian "Chờ subagent hoàn thành..."):

````text
```json
{
  "status": "error",
  "failure_type": "not_found",
  "attempted": "…/labs/domain-5/sources/chi-phi-cong-cu-2026.md",
  "partial_results": [],
  "alternatives": [
    "Kiểm tra xem file có tên khác trong sources/",
    "Tạo file chi-phi-cong-cu-2026.md trong thư mục sources/"
  ],
  "coverage_impact": "Không thể trả lời về chi phí công cụ AI review trên mỗi lập trình viên"
}
```
````

Trong trace, lần `Read` đầu của subagent thất bại. Nó dùng `Glob` tìm file có tên gần giống, đọc `sources/index.md` để kiểm tra, rồi báo lỗi thay vì đọc một file khác thế vào. Đây là phục hồi tại chỗ có giới hạn, rồi mới báo lên ([bài 5.3](../03-lan-truyen-loi/)).

Subagent ở lần chạy này chạy nền, nên có hai dòng `result`: dòng đầu là lượt coordinator báo đang chờ, dòng sau là lượt nó nhận được báo cáo. Ở lần chạy của bạn, subagent có thể chạy ngay trong lượt và chỉ có một dòng `result`.

Giờ giao một file **đọc được** nhưng không chứa câu trả lời:

```bash
claude -p "Dùng subagent source-reader đọc sources/khao-sat-devviet-2023.md để tìm số liệu về số lỗi lọt ra production, và chờ kết quả. Sau đó in lại nguyên văn khối JSON mà subagent trả về, không thêm gì." --model haiku --allowedTools "Read,Glob,Grep,Agent" --output-format stream-json --verbose < /dev/null | tee notes/buoc-2b.jsonl | jq -rf trace.jq
```

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Agent (subagent: source-reader)
  [subagent] assistant  → tool_use: Read
  [subagent] user       ← tool_result
user       ← tool_result
assistant  → text (381 ký tự)
result        subtype=success turns=2 stop_reason=end_turn
```

```bash
jq -r 'select(.type=="result") | .result' notes/buoc-2b.jsonl
```

````text
```json
{
  "status": "ok",
  "source_file": "…/labs/domain-5/sources/khao-sat-devviet-2023.md",
  "source_name": "Khảo sát DevViet 2023: công cụ hỗ trợ review code",
  "published": "2023-04-18",
  "collected": "tháng 2 năm 2023",
  "method": "bảng hỏi tự khai, 310 nhóm phát triển trả lời",
  "claims": []
}
```
````

So sánh hai kết quả. Cả hai đều không có nhận định nào, nhưng:

- `status: error` + `not_found` nghĩa là **chưa biết**. Coordinator phải quyết định: tìm nguồn khác, hay ghi nhận lỗ hổng.
- `status: ok` + `claims: []` nghĩa là **nguồn này không nói gì** về câu hỏi. Đó là một phát hiện, kèm đủ metadata của nguồn.

Nếu subagent trả `[]` cho cả hai, coordinator không thể phân biệt.

## Bước 3: thu thập song song và ghi scratchpad

Yêu cầu coordinator giao mỗi nguồn cho một subagent, rồi ghi phát hiện vào `notes/scratchpad.md` theo bốn mục cố định:

```bash
claude -p "Đọc sources/index.md. Với MỖI file trong danh sách, dùng một subagent source-reader để trích số liệu về: tỉ lệ dùng AI review, thay đổi thời gian merge pull request, chi phí công cụ. Gọi tất cả subagent trong cùng một lượt và chờ đủ kết quả. Sau đó ghi file notes/scratchpad.md gồm đúng 4 mục: '## Nhận định' (bảng: nhận định giữ nguyên con số, file nguồn, ngày công bố, phương pháp), '## Mâu thuẫn' (các giá trị khác nhau cho cùng một chỉ số; giữ mọi giá trị kèm nguồn, không chọn giá trị nào), '## Lỗ hổng' (nguồn nào không đọc được, loại lỗi, phần nào của câu hỏi bị ảnh hưởng), '## Việc còn lại'. Cuối cùng chỉ trả lời: Đã ghi scratchpad." --model haiku --allowedTools "Read,Glob,Grep,Agent,Write" --output-format stream-json --verbose < /dev/null | tee notes/buoc-3.jsonl | jq -rf trace.jq
```

Output mẫu (đã lược các dòng `[subagent]` và dòng trạng thái lặp lại ở giữa):

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Read
user       ← tool_result
assistant  → tool_use: Agent (subagent: source-reader)
user       ← tool_result
assistant  → tool_use: Agent (subagent: source-reader)
user       ← tool_result
assistant  → tool_use: Agent (subagent: source-reader)
user       ← tool_result
assistant  → tool_use: Agent (subagent: source-reader)
user       ← tool_result
  [subagent] assistant  → tool_use: Read
  [subagent] user       ← tool_result
  [subagent] assistant  → tool_use: Read
  [subagent] user       ← tool_result
  [subagent] assistant  → tool_use: Read
  [subagent] user       ← tool_result (LỖI/BỊ CHẶN)
  ...
  [subagent] assistant  → text (897 ký tự)
  [subagent] assistant  → text (711 ký tự)
  [subagent] assistant  → text (913 ký tự)
  [subagent] assistant  → text (822 ký tự)
  ...
assistant  → tool_use: Write
user       ← tool_result
assistant  → text (18 ký tự)
result        subtype=success turns=2 stop_reason=end_turn
```

Bốn lời gọi `Agent` nằm trong một phản hồi, nên bốn subagent chạy song song. Một trong số đó gặp lỗi đọc file; ba cái còn lại vẫn hoàn thành. Coordinator **không dừng** vì một lỗi.

Xem scratchpad:

```bash
cat notes/scratchpad.md
```

```markdown
# Scratchpad: AI review code — số liệu từ 4 nguồn

## Nhận định

| Nhận định | Con số | File nguồn | Ngày công bố | Phương pháp |
|---|---|---|---|---|
| Tỉ lệ dùng AI review | 38% | khảo-sat-devviet-2026.md | 2026-03-10 | Bảng hỏi tự khai, 420 nhóm phát triển |
| Thời gian merge giảm | 22% | khảo-sat-devviet-2026.md | 2026-03-10 | Ước lượng từ chính các nhóm |
| Tỉ lệ dùng AI review | 12% | khảo-sat-devviet-2023.md | 2023-04-18 | Bảng hỏi tự khai, 310 nhóm phát triển |
| Tỉ lệ bật AI review | 61% | telemetry-gitnhanh-2026.md | 2026-06-02 | Số liệu đo tự động, 1.150 repository |
| Thời gian merge giảm | 9% | telemetry-gitnhanh-2026.md | 2026-06-02 | Số liệu đo tự động trên repository có bật |

## Mâu thuẫn

- **Tỉ lệ dùng AI review (3 giá trị khác nhau)**
  - 12% (khảo-sat-devviet-2023.md, 2023-04-18)
  - 38% (khảo-sat-devviet-2026.md, 2026-03-10)
  - 61% (telemetry-gitnhanh-2026.md, 2026-06-02) — **lưu ý: đo theo repository, không phải nhóm**

- **Thay đổi thời gian merge pull request (2 giá trị khác nhau)**
  - 22% giảm (khảo-sat-devviet-2026.md, từ ước lượng của nhóm)
  - 9% giảm (telemetry-gitnhanh-2026.md, từ số liệu đo tự động)

## Lỗ hổng

- **File chi-phi-cong-cu-2026.md không tồn tại** — Lỗi: file không tìm thấy trong thư mục sources/
  - Phần ảnh hưởng: Mất toàn bộ dữ liệu chi phí công cụ AI review

- **Khảo sát DevViet 2023 không đo thời gian merge** — Phần ảnh hưởng: Không có dữ liệu so sánh 2023 cho chỉ tiêu thay đổi thời gian merge

(đã lược một dòng và mục "Việc còn lại")
```

So với bước 1, mọi con số giờ có nguồn, ngày và phương pháp; cả ba giá trị của tỉ lệ sử dụng đều có mặt; và file thiếu được ghi thành lỗ hổng. Nhưng scratchpad này có hai khuyết điểm thật, đáng để ý hơn cả phần làm đúng:

- **Tên file nguồn bị viết sai.** File thật là `khao-sat-devviet-2026.md`; coordinator ghi `khảo-sat-devviet-2026.md` (thêm dấu vào chữ "khao"). Các subagent trả đúng đường dẫn; lỗi phát sinh khi coordinator **gõ lại** thay vì sao chép. Một định danh nguồn sai một ký tự là một nguồn không truy ngược được. Trong hệ thật, định danh nguồn nên đi qua các tầng bằng code, và được kiểm tra là tồn tại.
- **12% bị xếp chung vào mục "Mâu thuẫn".** Nó thuộc năm 2023, hai giá trị kia thuộc năm 2026. Nhờ cột ngày, người đọc (hoặc bước sau) vẫn tách được thay đổi theo thời gian khỏi mâu thuẫn thật. Nếu scratchpad không ghi ngày, thông tin đó đã mất.

## Bước 4: phiên mới viết báo cáo từ scratchpad

Mở một **phiên mới**, cấm đọc `sources/`, chỉ cho đọc scratchpad:

```bash
claude -p "Không đọc thư mục sources/. Chỉ đọc notes/scratchpad.md rồi viết báo cáo cho câu hỏi: trợ lý AI review code được dùng rộng tới đâu, ảnh hưởng thế nào tới thời gian merge pull request, và chi phí bao nhiêu? Yêu cầu: (1) mỗi con số kèm nguồn và ngày công bố trong ngoặc; (2) số liệu khác năm là thay đổi theo thời gian, không gọi là mâu thuẫn; (3) với số liệu cùng năm mà khác nhau, nêu cả hai kèm phương pháp, không tự chọn một con số; (4) mỗi mục có nhãn độ phủ ĐỦ, MỘT PHẦN hoặc THIẾU kèm lý do. Tối đa 220 từ." --model haiku --allowedTools "Read" --output-format stream-json --verbose < /dev/null | tee notes/buoc-4.jsonl | jq -rf trace.jq
```

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Read
user       ← tool_result
assistant  → text (787 ký tự)
result        subtype=success turns=2 stop_reason=end_turn
```

```bash
jq -r 'select(.type=="result") | .result' notes/buoc-4.jsonl
```

```markdown
## Báo cáo: AI review code — Phạm vi, ảnh hưởng, chi phí

**Phạm vi sử dụng**
**MỘT PHẦN** — Khác biệt phương pháp đo:
- Khảo sát tự khai: 38% nhóm phát triển dùng (khảo-sat-devviet-2026, 2026-03-10)
- Telemetry tự động: 61% repository bật (telemetry-gitnhanh-2026, 2026-06-02)
- Mức tăng từ 12% năm 2023 (khảo-sat-devviet-2023, 2023-04-18) cho thấy thay đổi theo thời gian

**Ảnh hưởng thời gian merge**
**MỘT PHẦN** — Phương pháp khác cho kết quả khác:
- Ước lượng từ nhóm: 22% giảm (khảo-sat-devviet-2026, 2026-03-10)
- Đo tự động: 9% giảm (telemetry-gitnhanh-2026, 2026-06-02)
- Chênh lệch do phương pháp đo và dân số mẫu khác

**Chi phí công cụ**
**THIẾU** — Lỗ hổng dữ liệu: file "chi-phi-cong-cu-2026.md" không tồn tại. Không tìm được dữ liệu chi phí trong các nguồn có sẵn.
```

Đối chiếu với [bài 5.4](../04-khao-sat-codebase-lon/) và [bài 5.6](../06-nguon-goc-du-lieu/):

- Phiên này chỉ gọi `Read` **một lần**, cho scratchpad. Nó không khảo sát lại nguồn nào mà vẫn viết được báo cáo đầy đủ. Scratchpad đã mang phát hiện qua ranh giới phiên.
- Mỗi con số có nguồn và ngày. 12% được đọc là thay đổi theo thời gian. Hai cặp số cùng năm được nêu cả hai kèm phương pháp, không chọn.
- Mục chi phí mang nhãn `THIẾU` kèm lý do. Người đọc biết phần này chưa được nghiên cứu, không phải "không có chi phí".
- Tên file sai từ bước 3 đi thẳng vào báo cáo. Lỗi provenance không tự sửa ở tầng sau.

Ở một lần chạy khác, báo cáo có thêm câu "telemetry thường chính xác hơn". Câu đó không có trong nguồn nào: model tự thêm nhận xét. Khi đọc báo cáo tổng hợp, hãy tìm những câu như vậy.

## Bước 5: compact và thứ còn lại

Quay lại phiên của bước 3. Phiên đó chứa toàn bộ quá trình thu thập. Lấy session ID của nó (dòng `result` cuối cùng):

```bash
SID=$(jq -r 'select(.type=="result") | .session_id' notes/buoc-3.jsonl | tail -1); echo $SID
```

Gửi `/compact` kèm trọng tâm vào phiên đó, và in sự kiện `compact_boundary`:

```bash
claude -p "/compact giữ nguyên mọi con số kèm file nguồn và ngày công bố" --model haiku --resume "$SID" --output-format stream-json --verbose < /dev/null | jq -c 'select(.type=="system" and .subtype=="compact_boundary") | .compact_metadata | {trigger, pre_tokens, post_tokens}'
```

```json
{"trigger":"manual","pre_tokens":42236,"post_tokens":3502}
```

Context của phiên giảm từ khoảng 42 nghìn xuống 3,5 nghìn token. Giờ hỏi phiên đó hai chi tiết, cấm dùng tool:

```bash
claude -p "Không đọc file nào và không gọi tool. Trong phiên này, cỡ mẫu của khảo sát DevViet 2026 là bao nhiêu nhóm, và câu trích nguyên văn về thời gian merge trong báo cáo GitNhanh là gì? Nếu không còn nhớ chính xác thì nói rõ là không còn." --model haiku --resume "$SID" --output-format json < /dev/null | jq '{result, num_turns}'
```

```json
{
  "result": "Cỡ mẫu khảo sát DevViet 2026: **420 nhóm phát triển** (ghi trong scratchpad.md từ file khảo-sat-devviet-2026.md, 2026-03-10).\n\nCâu trích nguyên văn về thời gian merge trong báo cáo GitNhanh: **Không còn nhớ chính xác**. Chỉ nhớ con số 9% giảm từ file telemetry-gitnhanh-2026.md, nhưng không có câu trích nguyên văn trong bộ nhớ.",
  "num_turns": 1
}
```

Đối chiếu với [bài 5.1](../01-giu-thong-tin-hoi-thoai-dai/):

- Con số (420, 9%) còn, vì trọng tâm của `/compact` yêu cầu giữ con số, nguồn và ngày.
- Câu trích nguyên văn mà subagent đã trả về trước đó **không còn**. Nó không nằm trong trọng tâm và không được ghi vào scratchpad.
- Bản tóm tắt chỉ giữ thứ nó giữ. Thứ gì bạn sẽ cần chính xác về sau thì ghi ra file **trước khi** compact.

## Tự làm thêm

1. Tạo `sources/chi-phi-cong-cu-2026.md` với một con số chi phí và ngày công bố, chạy lại bước 3 và bước 4. Nhãn độ phủ của mục chi phí đổi thế nào?
2. Sửa `source-reader.md`: xóa dạng 2 và quy tắc cấm trả `ok` khi không đọc được file. Chạy lại lệnh đầu của bước 2. Subagent báo gì về file thiếu?
3. Thêm cột `quote` vào bảng "Nhận định" trong prompt của bước 3, rồi chạy lại bước 5. Sau `/compact`, câu trích có lấy lại được từ scratchpad không?
4. Viết một script kiểm tra mọi tên file trong `notes/scratchpad.md` có tồn tại trong `sources/`. Nó có bắt được lỗi tên file ở bước 3 không?

## Dọn dẹp

Xóa các file lab đã tạo trong `notes/`:

```bash
find notes -type f ! -name .gitkeep -delete
```
