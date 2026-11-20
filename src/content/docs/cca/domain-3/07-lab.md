---
title: 3.7 · Lab — Cấu hình dự án và review tự động
description: Dựng CLAUDE.md, rule theo đường dẫn, một skill và một bước review kiểu CI trả JSON theo schema, tất cả chạy bằng Claude Code.
sidebar:
  badge:
    text: Lab
    variant: tip
lesson:
  day: 7
  kind: lab
  minutes: 35
quiz:
  - q: "In step 2, `out/instructions.log` contained a `path_glob_match` line for `.claude/rules/api.md` after the second command but not after the first. Both commands used the same prompt wording. What made the difference?"
    options:
      - text: "The first command ran before the rule file had been indexed"
        why: "Không có bước lập chỉ mục nào. Claude Code đọc frontmatter của rule khi phiên bắt đầu và so mẫu mỗi khi một file được đọc."
      - text: "The second command passed `--allowedTools \"Read\"`, which enables rules"
        why: "Cả hai lệnh đều truyền `--allowedTools \"Read\"`. Cờ này tự duyệt tool, không bật hay tắt rule."
      - text: "Rules load only on the second session in a directory"
        why: "Thứ tự chạy không quan trọng. Chạy lệnh thứ hai trước thì rule vẫn được nạp ở lệnh đó."
      - text: "Only the second command made Claude read a file matching the rule's `paths` glob `src/api/**/*.py`"
        why: "Đúng. Lệnh đầu đọc `src/utils/money.py`, không khớp mẫu. Lệnh sau đọc `src/api/orders.py`, khớp mẫu, nên rule được nạp và log ghi rõ file đã kích hoạt."
    answer: 3
    keyword: "rule có `paths` chỉ nạp khi Claude **đọc hoặc sửa** file khớp glob"
    relearn: "#bước-2-rule-chỉ-nạp-cho-đúng-đường-dẫn"
    relearnLabel: "Bước 2: rule chỉ nạp cho đúng đường dẫn"
  - q: "In step 5, running `./ci-review.sh src/api/orders.py 1` printed `REVIEW KHÔNG HOÀN TẤT: subtype=error_max_turns` and exited with code 2 instead of printing findings. Which design lesson does this show?"
    options:
      - text: "`--json-schema` cannot be combined with `--max-turns`"
        why: "Hai cờ dùng chung được. Hai lần chạy trước trong cùng bước dùng cả hai và cho ra kết quả đúng schema."
      - text: "A CI script must check the run's `subtype` and the presence of `structured_output` before using the data, because a run that ends early has no structured result"
        why: "Đúng. Khi lượt chạy kết thúc do chạm giới hạn turn, object JSON không có `structured_output`. Script đọc thẳng trường đó sẽ nhận `null` và có thể coi một lượt review hỏng là 'không có vấn đề'."
      - text: "Haiku is too small a model to produce structured output"
        why: "Cùng model đó đã trả về JSON đúng schema ở các lần chạy khác. Nguyên nhân là giới hạn 1 turn."
      - text: "The schema file was invalid"
        why: "Schema không hợp lệ làm `claude` thoát ngay với lỗi về schema, trước khi chạy. Ở đây lượt chạy đã bắt đầu và kết thúc bằng `error_max_turns`."
    answer: 1
    keyword: "kiểm tra `subtype` và `structured_output` **trước khi** tin kết quả"
    relearn: "#bước-5-bước-review-kiểu-ci"
    relearnLabel: "Bước 5: bước review kiểu CI"
---

Trong lab này bạn làm việc với `shopkit`, một dự án Python nhỏ đã có sẵn bốn lớp cấu hình: CLAUDE.md của dự án, một rule theo đường dẫn, một skill, và một script review kiểu CI. Bạn sẽ chạy từng lệnh và quan sát lớp nào có tác dụng ở đâu. Mọi thứ chạy bằng Claude Code với tài khoản bạn đang đăng nhập, **không cần API key**. Nếu chưa chuẩn bị, xem [Chuẩn bị chạy lab](../../bat-dau/chuan-bi-lab/).

Mọi output mẫu bên dưới là output thật, chạy ngày 2026-11-19 với Claude Code 2.1.206 và `--model haiku`. Câu chữ của model sẽ khác mỗi lần chạy; cấu trúc thì giống.

## Thư mục lab

```text
labs/domain-3/
├── CLAUDE.md                          quy ước của dự án shopkit
├── review-schema.json                 JSON Schema cho kết quả review
├── ci-review.sh                       bước review kiểu CI
├── trace.jq                           bộ lọc rút gọn output stream-json
├── src/api/orders.py                  handler có sẵn vài vi phạm
├── src/utils/money.py                 hàm tiện ích, đúng quy ước
├── tests/test_money.py
├── out/                               nơi ghi log và kết quả
└── .claude/
    ├── rules/api.md                   rule chỉ áp dụng cho src/api/**/*.py
    ├── skills/review-file/SKILL.md    skill /review-file
    ├── hooks/log-instructions.py      ghi lại file chỉ dẫn nào được nạp
    └── settings.json                  đăng ký hook InstructionsLoaded
```

Vào thư mục lab trước khi chạy bất kỳ lệnh nào:

```bash
cd labs/domain-3
```

Các lệnh dùng `jq` để rút gọn output. Mỗi lệnh kết thúc bằng `< /dev/null` để Claude Code không chờ dữ liệu từ stdin.

Lab có một công cụ quan sát: hook `InstructionsLoaded` trong `.claude/settings.json`. Mỗi khi Claude Code nạp một CLAUDE.md hoặc một rule, hook thêm một dòng vào `out/instructions.log`, gồm lý do nạp, phạm vi và tên file. Hook này chỉ ghi log, nó không chặn hay sửa gì.

## Bước 1: CLAUDE.md được áp dụng

Xem quy ước của dự án:

```bash
cat CLAUDE.md
```

Có hai quy ước dễ kiểm tra bằng mắt: tiền là số nguyên với tên kết thúc bằng `_vnd`, và mọi hàm public có type hint cùng docstring một dòng bằng tiếng Việt.

Yêu cầu một hàm mà không nhắc gì tới các quy ước đó:

```bash
claude -p "Viết hàm Python tính tổng tiền một giỏ hàng gồm các món có đơn giá và số lượng. Chỉ in code trong một khối, không ghi file, không giải thích." --model haiku --output-format json < /dev/null | jq -r '.result'
```

Output mẫu:

````text
```python
from typing import TypedDict

class MonHang(TypedDict):
    don_gia_vnd: int
    so_luong: int

def tinh_tong_gio_hang(gio_hang: list[MonHang]) -> int:
    """Tính tổng tiền một giỏ hàng."""
    return sum(mon['don_gia_vnd'] * mon['so_luong'] for mon in gio_hang)
```
````

Prompt không nói gì về `int`, `_vnd` hay docstring tiếng Việt. Chúng tới từ CLAUDE.md. Xem log của hook:

```bash
cat out/instructions.log
```

```text
session_start    User     ~/.claude/CLAUDE.md
session_start    Project  CLAUDE.md
```

Hai file được nạp lúc phiên bắt đầu: file phạm vi **user** trong thư mục home và file phạm vi **project** của lab. Nếu bạn không có `~/.claude/CLAUDE.md`, log chỉ có dòng thứ hai.

Giờ chạy lại đúng prompt đó, nhưng bảo Claude Code chỉ nạp cấu hình phạm vi user, bỏ qua phạm vi project:

```bash
claude -p "Viết hàm Python tính tổng tiền một giỏ hàng gồm các món có đơn giá và số lượng. Chỉ in code trong một khối, không ghi file, không giải thích." --model haiku --setting-sources user --output-format json < /dev/null | jq -r '.result'
```

Output mẫu (đã lược phần ví dụ sử dụng ở cuối):

````text
```python
def calculate_cart_total(items):
    """
    items: list of tuples (unit_price, quantity) or list of dicts with 'price' and 'quantity'
    """
    total = 0
    for item in items:
        if isinstance(item, tuple):
            total += item[0] * item[1]
        elif isinstance(item, dict):
            total += item['price'] * item['quantity']
    return total
```
````

Đối chiếu với [bài 3.1](../01-claude-md/):

- Cùng prompt, cùng model. Khác biệt duy nhất là CLAUDE.md của dự án có được nạp hay không. Lần này không có type hint, không có `_vnd`, docstring bằng tiếng Anh.
- `out/instructions.log` không có thêm dòng nào sau lần chạy thứ hai. Hook nằm trong `.claude/settings.json` của dự án, nên khi bỏ phạm vi project thì hook cũng không chạy.
- Đây chính là tình huống "đồng nghiệp mới không nhận được chỉ dẫn": phiên của họ không có file mà phiên của bạn có.

## Bước 2: rule chỉ nạp cho đúng đường dẫn

Xem rule:

```bash
cat .claude/rules/api.md
```

Frontmatter có `paths: ["src/api/**/*.py"]`. Phần thân là ba quy ước dành riêng cho API handler.

Xóa log cũ, rồi yêu cầu Claude đọc một file **nằm ngoài** `src/api/`:

```bash
rm -f out/instructions.log
claude -p "Đọc src/utils/money.py rồi liệt kê mọi quy ước dự án áp dụng cho file này, mỗi quy ước một dòng. Không nêu gì khác." --model haiku --allowedTools "Read" --output-format json < /dev/null | jq -r '.result'
cat out/instructions.log
```

Output mẫu:

```text
- Tiền luôn là số nguyên, đơn vị đồng. Không dùng `float` cho tiền. Tên biến và tham số chứa tiền kết thúc bằng `_vnd`.
- Mọi hàm public có type hint và docstring một dòng bằng tiếng Việt.
```

```text
session_start    User     ~/.claude/CLAUDE.md
session_start    Project  CLAUDE.md
```

Làm lại với một file **nằm trong** `src/api/`:

```bash
rm -f out/instructions.log
claude -p "Đọc src/api/orders.py rồi liệt kê mọi quy ước dự án áp dụng cho file này, mỗi quy ước một dòng. Không nêu gì khác." --model haiku --allowedTools "Read" --output-format json < /dev/null | jq -r '.result'
cat out/instructions.log
```

Output mẫu:

```text
Tiền luôn là số nguyên, đơn vị đồng. Không dùng `float` cho tiền. Tên biến và tham số chứa tiền kết thúc bằng `_vnd`.
Mọi hàm public có type hint và docstring một dòng bằng tiếng Việt.
Handler trả về dict có đúng ba khóa: `ok`, `data`, `error`.
`error` là mã lỗi viết hoa dạng `SNAKE_CASE`. Không trả nguyên văn exception cho client.
Handler kiểm tra đầu vào trước khi gọi tầng dữ liệu.
```

```text
session_start    User     ~/.claude/CLAUDE.md
session_start    Project  CLAUDE.md
path_glob_match  Project  .claude/rules/api.md   (do đọc src/api/orders.py)
```

Đối chiếu với [bài 3.3](../03-rule-theo-duong-dan/):

- Ở lần đầu, model chỉ biết hai quy ước chung. Ba quy ước API không có trong context của nó, nên nó không thể liệt kê.
- Ở lần sau, log có thêm dòng `path_glob_match`: rule được nạp **giữa phiên**, đúng lúc Claude đọc một file khớp mẫu. Log ghi cả file đã kích hoạt.
- CLAUDE.md có lý do nạp là `session_start`. Rule có `paths` thì không: nó chờ tới khi cần.

## Bước 3: gọi skill

Xem skill:

```bash
cat .claude/skills/review-file/SKILL.md
```

Frontmatter có `argument-hint`, `allowed-tools: Read Grep Glob` và một `description` nói rõ khi nào dùng. Phần thân dùng `$ARGUMENTS` và quy định định dạng output.

Gọi skill trực tiếp bằng tên. Trong chế độ `-p`, đặt `/tên-skill` ở đầu prompt:

```bash
claude -p "/review-file src/api/orders.py" --model haiku --output-format stream-json --verbose < /dev/null > out/skill-run.jsonl
jq -rf trace.jq out/skill-run.jsonl
jq -r 'select(.type=="result") | .result' out/skill-run.jsonl
```

Output mẫu:

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Read (api/orders.py)
user       ← tool_result
assistant  → text (771 ký tự)
result        subtype=success turns=2 stop_reason=end_turn
```

```text
REVIEW src/api/orders.py
- [cao] dòng 2: "price": 45000.0 sử dụng float cho tiền → thay thế bằng số nguyên 45000
- [cao] dòng 3: "price": 120000.0 sử dụng float cho tiền → thay thế bằng số nguyên 120000
- [cao] dòng 7: hàm get_order_total() không có type hint và docstring → thêm type hint (order_id: str) -> dict và docstring một dòng tiếng Việt
- [cao] dòng 10: total = 0.0 sử dụng float → thay thế bằng 0 (số nguyên)
- [cao] dòng 13: trả về cấu trúc không tuân theo quy ước API (thiếu "data" và "error", có "total" thay vì "total_vnd") → trả về {"ok": True, "data": {"total_vnd": <tổng>}, "error": None}
- [cao] dòng 14-15: trả về "message" thay vì "error" với mã lỗi → thay thế bằng {"ok": False, "data": None, "error": "INTERNAL_ERROR"}
KẾT LUẬN: CẦN SỬA
```

Đối chiếu với [bài 3.2](../02-skill-va-slash-command/):

- Prompt chỉ có tên skill và một đường dẫn. Định dạng `REVIEW … KẾT LUẬN` tới từ phần thân của `SKILL.md`, với `$ARGUMENTS` đã được thay bằng `src/api/orders.py`.
- Trace không có lời gọi tool `Skill` nào. Khi bạn gõ `/tên-skill`, Claude Code tự chèn nội dung skill vào prompt trước khi model chạy, nên model chỉ việc làm theo.
- Ba lớp cấu hình cùng có mặt trong một câu trả lời: skill quyết định quy trình và định dạng, CLAUDE.md cho quy ước về tiền và docstring, còn rule `api.md` (được nạp khi skill đọc file) cho quy ước về ba khóa `ok`, `data`, `error`.

Giờ thử để **Claude tự chọn** skill. Prompt không nhắc tên skill, chỉ mô tả việc cần làm:

```bash
claude -p "Soát giúp tôi file src/utils/money.py xem có đúng quy ước dự án không." --model haiku --output-format stream-json --verbose < /dev/null > out/skill-auto.jsonl
jq -rf trace.jq out/skill-auto.jsonl
jq -c 'select(.type=="result") | .permission_denials | map({tool_name, skill: .tool_input.skill})' out/skill-auto.jsonl
```

Output mẫu:

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Skill (skill: review-file, args: src/utils/money.py)
user       ← tool_result (LỖI/BỊ CHẶN)
assistant  → tool_use: Read (utils/money.py)
user       ← tool_result
assistant  → text (308 ký tự)
result        subtype=success turns=3 stop_reason=end_turn
```

```json
[{"tool_name":"Skill","skill":"review-file"}]
```

Model đã khớp yêu cầu với `description` và gọi đúng skill qua tool `Skill`, kèm tham số. Nhưng lời gọi bị từ chối: trong lượt `-p` này nó cần phê duyệt, và không có ai để duyệt. Model vẫn tự đọc file và trả lời, chỉ là không theo định dạng của skill. Dòng `result` vẫn ghi `success`.

Duyệt sẵn skill đó rồi chạy lại:

```bash
claude -p "Soát giúp tôi file src/utils/money.py xem có đúng quy ước dự án không." --model haiku --allowedTools "Skill(review-file)" --output-format stream-json --verbose < /dev/null > out/skill-auto.jsonl
jq -rf trace.jq out/skill-auto.jsonl
jq -r 'select(.type=="result") | .result' out/skill-auto.jsonl
```

Output mẫu:

```text
system/init   model=claude-haiku-4-5-20251001
assistant  → tool_use: Skill (skill: review-file, args: src/utils/money.py)
user       ← tool_result
assistant  → tool_use: Read (utils/money.py)
user       ← tool_result
assistant  → text (51 ký tự)
result        subtype=success turns=4 stop_reason=end_turn
```

```text
REVIEW src/utils/money.py
KẾT LUẬN: ĐẠT
```

Hai điều rút ra:

- **`description` quyết định việc Claude tự chọn skill.** Thử đổi nó thành một câu mơ hồ rồi chạy lại để thấy khác biệt.
- **Trong pipeline, mọi thứ cần phê duyệt phải được duyệt trước.** Nếu không, lượt chạy vẫn "thành công" nhưng đi một đường khác với đường bạn định. Luôn xem `permission_denials` trong kết quả.

## Bước 4: review có cấu trúc

Kết quả ở bước 3 dễ đọc với người, nhưng một script muốn đăng comment vào từng dòng thì phải phân tích câu chữ. Xem schema đã chuẩn bị:

```bash
cat review-schema.json
```

Schema mô tả một object có `verdict` (`pass` hoặc `fail`) và mảng `findings`, mỗi phần tử có `file`, `line`, `severity`, `rule`, `message`.

Chạy review với schema đó:

```bash
claude -p "Review file src/api/orders.py theo quy ước của dự án. Chỉ báo vi phạm quy ước và lỗi ảnh hưởng tới tính đúng. verdict là fail nếu có ít nhất một finding mức high." --model haiku --allowedTools "Read,Grep,Glob" --max-turns 8 --output-format json --json-schema "$(cat review-schema.json)" < /dev/null > out/review-raw.json
jq '{subtype, is_error, num_turns, total_cost_usd}' out/review-raw.json
jq '.structured_output' out/review-raw.json
```

Output mẫu (đã lược 5 trong 7 finding):

```json
{
  "subtype": "success",
  "is_error": false,
  "num_turns": 3,
  "total_cost_usd": 0.129335
}
```

```json
{
  "verdict": "fail",
  "findings": [
    {
      "file": "src/api/orders.py",
      "line": 7,
      "severity": "high",
      "rule": "public-function-signature",
      "message": "Hàm public thiếu type hint cho tham số và kiểu trả về, thiếu docstring tiếng Việt"
    },
    {
      "file": "src/api/orders.py",
      "line": 13,
      "severity": "high",
      "rule": "api-handler-response-format",
      "message": "Response dict thiếu khóa `data` và `error`. Handler phải trả về đúng ba khóa: `ok`, `data`, `error`"
    }
  ]
}
```

Đối chiếu với [bài 3.6](../06-ci-cd/):

- Object ngoài cùng là thông tin về **lượt chạy**: `subtype`, số turn, chi phí ước tính. Dữ liệu theo schema nằm riêng trong `structured_output`.
- Mỗi finding có đủ `file` và `line` dạng số nguyên. Một bước sau có thể dùng thẳng để đăng comment tại đúng dòng.
- Giá trị `severity` luôn là một trong ba giá trị của `enum`. Bạn không phải xử lý "cao", "High" hay "nghiêm trọng".
- Trường `result` cũng có mặt, và ở đây chứa cùng dữ liệu dưới dạng một chuỗi. Script nên đọc `structured_output`, là object đã được kiểm tra theo schema.

## Bước 5: bước review kiểu CI

Xem script:

```bash
cat ci-review.sh
```

Script gọi đúng lệnh ở bước 4, kiểm tra lượt chạy, in mỗi finding thành một dòng `file:dòng [mức] nội dung`, ghi `out/review.json`, và trả mã thoát cho pipeline: 0 khi đạt, 1 khi có vi phạm mức high, 2 khi lượt chạy không cho ra kết quả hợp lệ.

Chạy trên file có vi phạm:

```bash
./ci-review.sh src/api/orders.py; echo "exit=$?"
```

Output mẫu:

```text
src/api/orders.py:2 [high] Price dùng float (45000.0) thay vì số nguyên. Tiền phải là số nguyên theo quy ước.
src/api/orders.py:3 [high] Price dùng float (120000.0) thay vì số nguyên. Tiền phải là số nguyên theo quy ước.
src/api/orders.py:7 [high] Hàm public get_order_total không có type hint và docstring. Mọi hàm public phải có type hint và docstring một dòng bằng tiếng Việt.
src/api/orders.py:10 [high] total = 0.0 dùng float. Tiền phải là số nguyên, nên là total = 0.
src/api/orders.py:13 [high] Return {"ok": True, "total": total} không tuân theo quy ước API. Handler phải trả về dict có đúng ba khóa: ok, data, error.
src/api/orders.py:15 [high] Return {"ok": False, "message": str(exc)} vi phạm quy ước: (1) không có đúng ba khóa ok/data/error; (2) trả str(exc) - trả nguyên văn exception cho client; (3) message không phải mã lỗi dạng SNAKE_CASE.
verdict=fail findings=6
exit=1
```

Chạy trên file đúng quy ước:

```bash
./ci-review.sh src/utils/money.py; echo "exit=$?"
```

```text
verdict=pass findings=0
exit=0
```

Cuối cùng, ép lượt chạy kết thúc sớm bằng cách giới hạn 1 turn (tham số thứ hai của script):

```bash
./ci-review.sh src/api/orders.py 1; echo "exit=$?"
```

```text
REVIEW KHÔNG HOÀN TẤT: subtype=error_max_turns
exit=2
```

Đối chiếu với [bài 3.6](../06-ci-cd/):

- Mã thoát 1 làm job CI đỏ khi có vi phạm nghiêm trọng. Mã thoát 0 cho qua. Pipeline không cần đọc câu chữ nào của model.
- Ở lần chạy thứ ba, lượt chạy chạm giới hạn turn trước khi có kết quả. Object JSON khi đó không có `structured_output`, và bản thân `claude` cũng thoát với mã khác 0. Script kiểm tra `subtype` và sự có mặt của trường này **trước khi** đọc dữ liệu. Nếu bỏ bước kiểm tra, `jq '.structured_output.findings | length'` trả về 0 và một lượt review hỏng sẽ trông giống "không có vấn đề".
- Bước review chỉ được tự duyệt tool đọc (`Read,Grep,Glob`). Nó là một lần gọi `claude -p` riêng, không tiếp tục phiên nào khác, nên đóng vai một reviewer độc lập.
- Các finding dẫn lại đúng câu chữ trong `CLAUDE.md` và `.claude/rules/api.md`. Script không chứa tiêu chí review nào. Tiêu chí nằm trong cấu hình dự án, dùng chung cho người và cho CI.

## Tự làm thêm

1. Sửa `src/api/orders.py` cho hết vi phạm rồi chạy lại `./ci-review.sh src/api/orders.py`. Sau đó sửa prompt trong script để nhận thêm nội dung `out/review.json` của lần trước và chỉ báo vấn đề mới hoặc chưa được sửa.
2. Đổi `paths` trong `.claude/rules/api.md` thành `path` (sai tên trường), xóa `out/instructions.log` rồi chạy lại lệnh đầu của bước 2. Rule được nạp với lý do gì?
3. Thêm `context: fork` và `agent: Explore` vào skill `review-file` rồi chạy lại bước 3. Bản review còn nhắc tới quy ước trong CLAUDE.md không? Đối chiếu với phần nói về Explore ở [bài 3.4](../04-plan-mode/#giữ-context-gọn-bằng-subagent-explore).
4. Tạo `src/api/CLAUDE.md` chứa một quy ước mới và lặp lại bước 2. Dòng log mới có lý do nạp là gì, và khác `path_glob_match` ở điểm nào?

## Dọn dẹp

Lab chỉ ghi file trong `out/`, và thư mục đó đã có `.gitignore` để log không bị commit nhầm. Xóa chúng nếu muốn:

```bash
rm -f out/instructions.log out/review.json out/review-raw.json out/skill-run.jsonl out/skill-auto.jsonl
```
