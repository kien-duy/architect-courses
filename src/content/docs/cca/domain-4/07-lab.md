---
title: 4.7 · Lab — Trích xuất hóa đơn có schema
description: Ép output theo JSON schema bằng Claude Code, so sánh prompt mơ hồ với prompt có tiêu chí và few-shot, rồi validate và retry kèm lỗi cụ thể.
sidebar:
  badge:
    text: Lab
    variant: tip
lesson:
  day: 9
  kind: lab
  minutes: 30
quiz:
  - q: "In step 2, the message in `data/hoa-don-02.txt` has no tax code, invoice number, or due date. With `schema/invoice-v1.json` the output contained values such as `\"N/A\"`, an empty string, or a due date that appears nowhere in the message. What caused this?"
    options:
      - text: "The `haiku` model is too small to read informal Vietnamese text"
        why: "Model đọc đúng nội dung: tên người bán, ngày và số tiền đều chính xác. Ở bước 3, cũng model đó trả về `null` cho các trường này."
      - text: "The schema declares those fields as required strings, so the model has to put some string there even when the document has none"
        why: "Đúng. Schema v1 không cho phép `null`. Model buộc phải điền một chuỗi, và mỗi lượt chọn một cách khác nhau: 'N/A', chuỗi rỗng, hoặc một giá trị suy đoán."
      - text: "`--json-schema` was ignored because the prompt did not mention JSON"
        why: "Schema được áp dụng: output có đúng các trường và kiểu của v1. Vấn đề là schema đòi thứ văn bản không có."
      - text: "The command was missing `--allowedTools`"
        why: "Lượt trích xuất không cần tool nào ngoài tool nộp kết quả do Claude Code tự thêm."
    answer: 1
    keyword: "trường bắt buộc không nullable + nguồn thiếu thông tin = **bịa**"
    relearn: "#bước-2-trường-bị-thiếu"
    relearnLabel: "Bước 2: trường bị thiếu"
  - q: "In step 5, the retry for `hoa-don-03` fixed `calculated_total`, but `validate.py` still reported that the line items do not add up to `stated_subtotal`. What is the right next action for the pipeline?"
    options:
      - text: "Retry again with the same errors until the validator prints OK"
        why: "Lỗi còn lại nằm trong chính hóa đơn. Retry thêm chỉ có thể 'hết lỗi' nếu model sửa số liệu cho khớp, tức là làm sai dữ liệu."
      - text: "Remove the subtotal rule from `validate.py`"
        why: "Luật đó vừa phát hiện đúng một hóa đơn in sai. Bỏ luật là bỏ luôn khả năng phát hiện."
      - text: "Change `stated_subtotal` to 4,150,000 in code so the record is consistent"
        why: "Trường `stated_*` phải giữ đúng con số văn bản ghi. Tự sửa làm mất bằng chứng về sai lệch."
      - text: "Stop retrying and route the invoice to a human, keeping both the stated and the calculated figures"
        why: "Đúng. Retry đã sửa phần model làm sai. Phần còn lại là mâu thuẫn trong văn bản nguồn, retry không giải quyết được, nên chuyển cho người duyệt kèm cả hai con số."
    answer: 3
    keyword: "lỗi còn nguyên sau retry có phản hồi cụ thể → lỗi ở **nguồn** → người duyệt"
    relearn: "#bước-5-retry-kèm-lỗi-cụ-thể"
    relearnLabel: "Bước 5: retry kèm lỗi cụ thể"
---

Trong lab này bạn trích xuất dữ liệu từ bốn văn bản thanh toán bằng `claude -p --output-format json --json-schema`, so sánh hai prompt, rồi tự viết lớp kiểm tra ngữ nghĩa và vòng retry. Mọi thứ chạy bằng Claude Code với tài khoản bạn đang đăng nhập, **không cần API key**. Nếu chưa chuẩn bị, xem [Chuẩn bị chạy lab](../../bat-dau/chuan-bi-lab/).

Mọi output mẫu bên dưới là output thật, chạy ngày 2026-11-19 với Claude Code 2.1.206 và `--model haiku` (lượt chạy này dùng `claude-haiku-4-5-20251001`). Output của model thay đổi giữa các lượt chạy, và chính sự thay đổi đó là một phần của bài học. Thư mục `samples/` chứa các file kết quả của lần chạy mẫu để bạn đối chiếu.

## Thư mục lab

```text
labs/domain-4/
├── data/                  4 văn bản mẫu
│   ├── hoa-don-01.txt     hóa đơn dạng bảng, đủ trường
│   ├── hoa-don-02.txt     tin nhắn đòi tiền, thiếu mã số thuế, số hóa đơn, hạn trả
│   ├── hoa-don-03.txt     hóa đơn in sai dòng "Cộng tiền hàng"
│   └── hoa-don-04.txt     phiếu thanh toán có chiết khấu, ngày viết bằng chữ
├── schema/
│   ├── invoice-v1.json    mọi trường bắt buộc, không nullable
│   └── invoice-v2.json    trường nullable, enum có "other", stated_total và calculated_total
├── prompts/
│   ├── vague.txt          một câu mơ hồ
│   └── explicit.txt       7 tiêu chí và 2 ví dụ few-shot
├── extract.sh             một lượt trích xuất
├── retry.sh               trích xuất lại kèm kết quả cũ và lỗi
├── validate.py            kiểm tra ngữ nghĩa (Python stdlib)
├── samples/               output của lần chạy mẫu
└── out/                   nơi ghi kết quả của bạn
```

Vào thư mục lab trước khi chạy bất kỳ lệnh nào:

```bash
cd labs/domain-4
```

Các lệnh dùng `jq` để đọc output. Lab không cấp quyền dùng tool nào: văn bản được dán thẳng vào prompt.

## Bước 1: có schema và không có schema

Trước hết, xin JSON bằng lời, không có schema:

```bash
claude -p "$(cat prompts/vague.txt) Trả về JSON.

$(cat data/hoa-don-01.txt)" --model haiku --output-format json < /dev/null | jq -r '.result'
```

Output mẫu (đã lược phần giữa của khối JSON):

````text
Thông tin hóa đơn đã được trích xuất và lưu dưới dạng JSON:

```json
{
  "company": {
    "name": "CÔNG TY TNHH VĂN PHÒNG PHẨM SAO MAI",
    "tax_id": "0312345678"
  },
  "invoice": {
    "number": "HD-2026-0117",
    "date_issued": "2026-11-03",
    "payment_deadline": "2026-11-18",
    "customer": "Công ty CP Phần mềm Bình Minh"
  },
  "items": [ … ],
  "totals": { "subtotal": 3900000, "vat_rate": "8%", "vat_amount": 312000, "total": 4212000, "currency": "VND" }
}
```

**Tóm tắt:**
- **Hóa đơn số:** HD-2026-0117
- **Ngày lập:** 03/11/2026
…
````

Nội dung đúng, nhưng một chương trình không dùng được ngay: có lời dẫn, có khối Markdown, có phần tóm tắt, và tên trường (`company.tax_id`, `payment_deadline`) do model tự đặt. Lượt sau có thể là tên khác.

Giờ thêm `--json-schema`:

```bash
claude -p "$(cat prompts/vague.txt)

$(cat data/hoa-don-01.txt)" --model haiku --output-format json --json-schema "$(cat schema/invoice-v1.json)" < /dev/null | jq '{subtype, is_error, num_turns, structured_output}'
```

Output mẫu:

```json
{
  "subtype": "success",
  "is_error": false,
  "num_turns": 2,
  "structured_output": {
    "vendor_name": "CÔNG TY TNHH VĂN PHÒNG PHẨM SAO MAI",
    "vendor_tax_code": "0312345678",
    "invoice_number": "HD-2026-0117",
    "issue_date": "03/11/2026",
    "due_date": "18/11/2026",
    "line_items": [
      { "description": "Giấy A4 Double A (ram) - 20 ram", "amount": 1700000 },
      { "description": "Bút bi Thiên Long (hộp) - 5 hộp", "amount": 300000 },
      { "description": "Mực in HP 107A - 2 cái", "amount": 1900000 }
    ],
    "subtotal": 3900000,
    "vat_amount": 312000,
    "total": 4212000
  }
}
```

Dữ liệu nằm trong trường `structured_output`, đúng tên trường và kiểu của schema. Đối chiếu với [bài 4.3](../03-structured-output/):

- `num_turns` là 2 vì Claude Code thêm vào phiên một tool tên `StructuredOutput`, và model gọi tool đó để nộp kết quả. Đây là mẫu "trích xuất bằng `tool_use`". Bạn có thể tự thấy lời gọi đó:

  ```bash
  claude -p "$(cat prompts/vague.txt)

  $(cat data/hoa-don-01.txt)" --model haiku --output-format stream-json --verbose --json-schema "$(cat schema/invoice-v1.json)" < /dev/null | jq -c 'select(.type=="assistant" or .type=="user") | .message.content[] | select(.type=="tool_use" or .type=="tool_result") | if .type=="tool_use" then {tool_use: .name} else {tool_result: (.content|tostring|.[0:60])} end'
  ```

  ```json
  {"tool_use":"StructuredOutput"}
  {"tool_result":"Structured output provided successfully"}
  ```

- Schema bảo đảm **hình dạng**, không bảo đảm **cách viết giá trị**. Trong lượt chạy trên, ngày là `03/11/2026`. Ở một lượt khác với đúng lệnh đó, ngày là `2026-11-03`. Cả hai đều là chuỗi hợp lệ với schema v1. Prompt mơ hồ không nói dạng nào là đúng.
- `description` của từng dòng bị nhồi thêm số lượng ("- 20 ram"), vì schema v1 không có chỗ nào khác để ghi số lượng.

Một schema sai cú pháp bị từ chối ngay, trước khi gọi model:

```bash
claude -p "x" --model haiku --output-format json --json-schema '{"type":"objekt"}' < /dev/null
```

```text
Error: --json-schema is not a valid JSON Schema: data/type must be equal to one of the allowed values, data/type must be array, data/type must match a schema in anyOf
```

## Bước 2: trường bị thiếu

`data/hoa-don-02.txt` là một tin nhắn: không có mã số thuế, không có số hóa đơn, không có hạn trả. Schema v1 lại khai báo cả ba là chuỗi bắt buộc. Script `extract.sh` gói lệnh ở bước 1 lại (xem bằng `cat extract.sh`). Chạy hai lần:

```bash
./extract.sh prompts/vague.txt schema/invoice-v1.json data/hoa-don-02.txt | jq -c '{vendor_tax_code, invoice_number, due_date, vat_amount}'
./extract.sh prompts/vague.txt schema/invoice-v1.json data/hoa-don-02.txt | jq -c '{vendor_tax_code, invoice_number, due_date, vat_amount}'
```

Output mẫu của hai lượt liên tiếp:

```json
{"vendor_tax_code":"N/A","invoice_number":"N/A","due_date":"N/A","vat_amount":0}
{"vendor_tax_code":"N/A - Hộ kinh doanh không xuất hóa đơn VAT","invoice_number":"Không có","due_date":"Không xác định (khi nào tiện)","vat_amount":0}
```

Ở một lượt chạy khác trong ngày, cũng lệnh này cho ra:

```json
{"vendor_tax_code":"","invoice_number":"","due_date":"2026-11-07","vat_amount":0}
```

Đối chiếu với [bài 4.3](../03-structured-output/):

- Cả ba output đều **đúng schema**. Schema đòi một chuỗi, và model đã đưa một chuỗi.
- Không output nào dùng được: code phía sau phải đoán xem "N/A", "Không có", chuỗi rỗng hay một câu giải thích đều nghĩa là "thiếu".
- Output thứ ba tệ nhất: `due_date` là `2026-11-07`, một ngày hợp lệ nhưng **không có trong tin nhắn** (đó là ngày bảo trì). Đây là dữ liệu bịa, và nó trông hoàn toàn bình thường.
- `vat_amount: 0` cũng là một lựa chọn bị ép: tin nhắn nói không xuất VAT, khác với "VAT bằng 0 đồng".

Nguyên nhân nằm ở schema, không ở model. Bước sau sửa cả schema lẫn prompt.

## Bước 3: tiêu chí rõ và few-shot

Mở hai file mới:

```bash
cat schema/invoice-v2.json prompts/explicit.txt
```

- `invoice-v2.json`: các trường có thể vắng mặt mang kiểu `["string", "null"]`; `document_type` là enum có `other` kèm `document_type_detail`; số lượng và đơn giá có trường riêng; tổng được tách thành `stated_total` và `calculated_total`.
- `explicit.txt`: 7 tiêu chí (dạng ngày, số tiền, cách ghi chiết khấu, khi nào dùng từng `document_type`) và 2 ví dụ trong thẻ `<example>`: một hóa đơn có giảm giá, một tin nhắn thiếu trường. Hai ví dụ **không** trùng với văn bản nào trong `data/`.

Chạy cả hai prompt trên cả bốn văn bản, cùng schema v2:

```bash
for i in 01 02 03 04; do
  ./extract.sh prompts/vague.txt    schema/invoice-v2.json data/hoa-don-$i.txt > out/vague-$i.json
  ./extract.sh prompts/explicit.txt schema/invoice-v2.json data/hoa-don-$i.txt > out/explicit-$i.json
done
```

So sánh vài trường:

```bash
jq -c '{document_type, document_type_detail, vendor_name}' out/vague-0?.json
jq -c '{document_type, document_type_detail, vendor_name}' out/explicit-0?.json
```

Output mẫu với prompt mơ hồ:

```json
{"document_type":"invoice","document_type_detail":null,"vendor_name":"CÔNG TY TNHH VĂN PHÒNG PHẨM SAO MAI"}
{"document_type":"informal_request","document_type_detail":"Yêu cầu thanh toán chi phí dịch vụ từ hộ kinh doanh (không phải hóa đơn chính thức)","vendor_name":"Điện lạnh Phú Quý"}
{"document_type":"invoice","document_type_detail":null,"vendor_name":"CÔNG TY CỔ PHẦN THIẾT BỊ MẠNG ĐÔNG Á"}
{"document_type":"informal_request","document_type_detail":"phiếu thanh toán","vendor_name":"NHÀ SÁCH HẢI ÂU"}
```

Output mẫu với prompt có tiêu chí và few-shot:

```json
{"document_type":"invoice","document_type_detail":null,"vendor_name":"Công ty TNHH Văn phòng phẩm Sao Mai"}
{"document_type":"informal_request","document_type_detail":null,"vendor_name":"Điện lạnh Phú Quý"}
{"document_type":"invoice","document_type_detail":null,"vendor_name":"Công ty Cổ phần Thiết bị Mạng Đông Á"}
{"document_type":"invoice","document_type_detail":null,"vendor_name":"Nhà sách Hải Âu"}
```

Đối chiếu với [bài 4.1](../01-tieu-chi-ro-rang/) và [bài 4.2](../02-few-shot/):

- **Phân loại.** Prompt mơ hồ xếp phiếu thanh toán PT-889 của nhà sách vào `informal_request`, dù nó có số chứng từ và mã số thuế. Khi chạy lại lần hai, cũng prompt đó xếp văn bản 02 và 04 vào `other`. Prompt có tiêu chí 7 ("phiếu thanh toán có số chứng từ là `invoice`") cho cùng kết quả ở cả hai lần chạy.
- **Trường mô tả.** Schema ghi `document_type_detail` chỉ dùng khi loại là `other`. Prompt mơ hồ vẫn điền nó cho `informal_request`. Prompt có ví dụ cho thấy `null` ở đúng chỗ đó, và model làm theo.
- **Cách viết tên.** Prompt mơ hồ chép nguyên chữ in hoa. Hai ví dụ few-shot viết tên theo kiểu thông thường ("Cửa hàng Gạo Ngon"), và model áp dụng kiểu đó dù không có tiêu chí nào nói về chữ hoa. Ví dụ dạy cả những điều bạn không viết thành luật, nên phải chọn ví dụ cẩn thận.

Xem trường hợp thiếu trường và trường hợp chiết khấu với prompt tốt:

```bash
jq -c '{vendor_tax_code, invoice_number, due_date, stated_subtotal, vat_amount}' out/explicit-02.json
jq -c '.line_items' out/explicit-04.json
```

```json
{"vendor_tax_code":null,"invoice_number":null,"due_date":null,"stated_subtotal":null,"vat_amount":null}
[{"description":"Sổ tay bìa da","quantity":30,"unit_price":45000,"amount":1350000},{"description":"Bộ bút dạ quang","quantity":12,"unit_price":72000,"amount":864000},{"description":"Chiết khấu khách hàng thân thiết","quantity":null,"unit_price":null,"amount":-214000}]
```

Không còn `"N/A"` hay ngày bịa: schema cho phép `null` và ví dụ cho thấy khi nào dùng nó. Chiết khấu thành một dòng âm, đúng tiêu chí 5.

Một quan sát thêm: trong lần chạy mẫu, với schema v2 thì ngay cả prompt mơ hồ cũng trả `null` cho các trường thiếu của văn bản 02. Các `description` trong schema ("null nếu văn bản không ghi mã số thuế") đã là một phần của prompt. Schema tốt và prompt tốt bổ sung cho nhau.

## Bước 4: validate lỗi ngữ nghĩa

Mọi file trong `out/` đều đúng schema. Giờ kiểm tra nội dung bằng code:

```bash
cat validate.py
for f in out/vague-0?.json out/explicit-0?.json; do echo "== $f"; python3 validate.py $f; done
```

`validate.py` chỉ dùng thư viện chuẩn. Nó kiểm tra: ngày đúng dạng `YYYY-MM-DD`, mã số thuế đúng số chữ số, `quantity × unit_price` bằng `amount`, tổng các dòng bằng `stated_subtotal`, và `calculated_total` cũng như `stated_total` bằng tổng các dòng cộng VAT.

Output mẫu (đã lược các file chỉ in `OK`):

```text
== out/vague-03.json
LỖI: Tổng amount của line_items = 4.150.000, khác stated_subtotal = 4.510.000 (lệch 360.000).
LỖI: calculated_total = 4.961.000, nhưng tổng line_items + vat_amount = 4.601.000.
LỖI: stated_total = 4.961.000, khác tổng line_items + vat_amount = 4.601.000 (lệch 360.000).
== out/explicit-03.json
LỖI: Tổng amount của line_items = 4.150.000, khác stated_subtotal = 4.510.000 (lệch 360.000).
LỖI: stated_total = 4.961.000, khác tổng line_items + vat_amount = 4.601.000 (lệch 360.000).
```

Sáu file còn lại in `OK`. Đối chiếu với [bài 4.4](../04-validation-retry/):

- `hoa-don-03.txt` in "Cộng tiền hàng: 4.510.000" trong khi hai dòng hàng cộng lại là 4.150.000. Schema không thể biết điều đó. Vài dòng Python thì biết.
- Hai file cùng có lỗi về `stated_*`: đó là lỗi của **văn bản nguồn**, và model đã chép đúng con số sai.
- Riêng `vague-03.json` có thêm một lỗi của **model**: `calculated_total` là 4.961.000, tức model chép lại tổng in trên hóa đơn thay vì tự cộng. Prompt có tiêu chí 6 ("calculated_total do bạn tự cộng") cho ra 4.601.000.

Lỗi `calculated_total` không xuất hiện ở mọi lượt chạy: khi chạy lại lần hai, prompt mơ hồ cũng tính đúng. Nếu file `out/vague-03.json` của bạn không có lỗi này, chép file của lần chạy mẫu để làm tiếp bước 5:

```bash
cp samples/vague-03.json out/vague-03.json
```

## Bước 5: retry kèm lỗi cụ thể

Lưu lỗi vào file rồi gọi `retry.sh`. Script này gửi lại ba thứ: văn bản gốc, kết quả lần trước, và danh sách lỗi (xem bằng `cat retry.sh`).

```bash
python3 validate.py out/vague-03.json > out/vague-03.errors.txt
./retry.sh prompts/vague.txt schema/invoice-v2.json data/hoa-don-03.txt out/vague-03.json out/vague-03.errors.txt > out/retry-03.json
jq -c '{stated_subtotal, stated_total, calculated_total}' out/vague-03.json out/retry-03.json
```

Output mẫu (dòng đầu là lần trước, dòng sau là sau retry):

```json
{"stated_subtotal":4510000,"stated_total":4961000,"calculated_total":4961000}
{"stated_subtotal":4510000,"stated_total":4961000,"calculated_total":4601000}
```

Validate lại:

```bash
python3 validate.py out/retry-03.json
```

```text
LỖI: Tổng amount của line_items = 4.150.000, khác stated_subtotal = 4.510.000 (lệch 360.000).
LỖI: stated_total = 4.961.000, khác tổng line_items + vat_amount = 4.601.000 (lệch 360.000).
```

Đối chiếu với [bài 4.4](../04-validation-retry/):

- Retry **sửa được lỗi của model**: `calculated_total` giờ là 4.601.000. Thông báo lỗi đã nêu rõ trường nào, giá trị nào, phải bằng bao nhiêu.
- Retry **không sửa lỗi của nguồn**, và không nên sửa: `stated_subtotal` và `stated_total` vẫn là con số in trên hóa đơn. Câu cuối trong `retry.sh` ("nếu chính văn bản ghi con số không khớp nhau, giữ nguyên điều văn bản ghi") ngăn model đổi số cho validator hài lòng.
- Hai lỗi còn lại sau một lần retry có phản hồi cụ thể là tín hiệu dừng: hóa đơn này cần người xem, kèm cả `stated_total` lẫn `calculated_total`.

Giờ thử retry cho một trường hợp **thông tin không có trong nguồn**. Giả sử quy trình kế toán đòi hạn thanh toán, và tin nhắn 02 không có:

```bash
echo "LỖI: due_date là null. Quy trình kế toán bắt buộc có hạn thanh toán." > out/explicit-02.errors.txt
./retry.sh prompts/explicit.txt schema/invoice-v2.json data/hoa-don-02.txt out/explicit-02.json out/explicit-02.errors.txt | jq -c '{issue_date, due_date}'
```

```json
{"issue_date":"2026-11-07","due_date":null}
```

`due_date` vẫn là `null`, và đó là kết quả đúng: tin nhắn chỉ viết "khi nào tiện". Retry bao nhiêu lần cũng không tạo ra được ngày đó. Nếu output của bạn có một ngày ở đây, model đã bịa để đáp ứng thông báo lỗi; đó chính là rủi ro của việc retry khi nguồn không có thông tin.

## Tự làm thêm

1. Sửa `retry.sh` để chỉ gửi câu "Kết quả sai, hãy làm lại cẩn thận hơn" thay cho danh sách lỗi, rồi chạy lại bước 5 vài lần. `calculated_total` có được sửa ổn định như khi có lỗi cụ thể không?
2. Xóa ví dụ thứ hai (tin nhắn sửa cửa cuốn) khỏi `prompts/explicit.txt` và chạy lại trên `hoa-don-02.txt` với schema v1. Tiêu chí 1 một mình có đủ để chặn `"N/A"` không, khi schema không cho phép `null`?
3. Thêm vào `validate.py` luật "`due_date` không sớm hơn `issue_date`" và một văn bản mẫu vi phạm luật đó.
4. Viết một vòng lặp shell: trích xuất, validate, retry tối đa một lần, rồi ghi tên những file vẫn còn lỗi vào `out/can-nguoi-duyet.txt`.

## Dọn dẹp

Lab chỉ ghi file vào `out/`. Xóa chúng nếu muốn:

```bash
rm -f out/*.json out/*.txt
```
