---
title: 4.3 · Structured output với tool_use và JSON schema
description: Ép output đúng schema bằng tool_use, tool_choice, strict và structured outputs; thiết kế schema để model không phải bịa.
lesson:
  day: 8
  minutes: 15
quiz:
  - q: "An extraction service defines three tools: `extract_invoice`, `extract_contract`, and `extract_receipt`. The document type is unknown in advance. With the default settings the model sometimes replies in prose asking what the user wants. Which `tool_choice` guarantees a structured result while letting the model pick the matching schema?"
    options:
      - text: "`{\"type\": \"auto\"}`"
        why: "`auto` là mặc định và cho phép model trả lời bằng text. Đó chính là hành vi đang gây lỗi."
      - text: "`{\"type\": \"tool\", \"name\": \"extract_invoice\"}`"
        why: "Ép một tool cụ thể sẽ dùng schema hóa đơn cho cả hợp đồng và biên nhận."
      - text: "`{\"type\": \"none\"}`"
        why: "`none` cấm gọi tool, nên chắc chắn chỉ nhận được text."
      - text: "`{\"type\": \"any\"}`"
        why: "Đúng. `any` buộc model gọi một trong các tool đã khai báo nhưng để nó chọn tool nào, nên luôn có output có cấu trúc với schema phù hợp."
    answer: 3
    keyword: "nhiều schema, phải có cấu trúc → `tool_choice: any`"
    relearn: "#tool_choice"
    relearnLabel: "tool_choice"
  - q: "An invoice schema marks `due_date` as a required string. Many source documents have no due date, and the pipeline's output contains plausible but invented dates. What is the best schema change?"
    options:
      - text: "Make `due_date` nullable and describe that null means the document does not state it"
        why: "Đúng. Trường bắt buộc kiểu string buộc model phải điền một chuỗi. Cho phép null mở ra một đáp án trung thực khi văn bản không có thông tin."
      - text: "Add `\"format\": \"date\"` to the field"
        why: "Định dạng ngày chỉ ràng buộc hình dạng của chuỗi. Một ngày bịa vẫn đúng định dạng."
      - text: "Keep it required and add 'do not guess' to the system prompt"
        why: "Schema vẫn đòi một chuỗi. Model sẽ điền thứ gì đó như 'N/A' hoặc chuỗi rỗng, và code phía sau phải xử lý từng kiểu."
      - text: "Remove `due_date` from the schema entirely"
        why: "Cách này bỏ luôn dữ liệu của những văn bản có ghi hạn thanh toán."
    answer: 0
    keyword: "nguồn có thể thiếu thông tin → trường **nullable**, không ép bắt buộc có giá trị"
    relearn: "#thiết-kế-schema-để-model-không-phải-bịa"
    relearnLabel: "Thiết kế schema để model không phải bịa"
  - q: "A team enables strict schema enforcement for their extraction tool. Every response now parses, yet an audit finds invoices where the line items sum to 4,150,000 while `total` is 4,510,000. Why did the schema not catch this?"
    options:
      - text: "Strict mode was not actually enabled"
        why: "Mọi phản hồi đều parse được và đúng kiểu, đúng như strict mode đảm bảo."
      - text: "The model ignored the `required` list"
        why: "Các trường bắt buộc đều có mặt. Lỗi nằm ở giá trị, không phải cấu trúc."
      - text: "A schema guarantees structure and types, not that values are correct or consistent with each other"
        why: "Đúng. Schema loại bỏ lỗi cú pháp và sai kiểu. Tổng không khớp là lỗi ngữ nghĩa, phải kiểm tra bằng code sau khi nhận output."
      - text: "The `total` field should have been declared as a number instead of an integer"
        why: "Kiểu số nào cũng không biểu diễn được quan hệ 'bằng tổng các dòng'."
    answer: 2
    keyword: "schema chặn lỗi **cú pháp**, không chặn lỗi **ngữ nghĩa**"
    relearn: "#lỗi-cú-pháp-và-lỗi-ngữ-nghĩa"
    relearnLabel: "Lỗi cú pháp và lỗi ngữ nghĩa"
---

Khi output của model được một chương trình khác đọc, "gần đúng JSON" là không đủ: một dấu phẩy thừa làm hỏng cả pipeline. Bài này dạy cách ép output theo JSON schema, cách đề thi hỏi về nó, và giới hạn của schema.

## Vì sao không chỉ dặn trả về JSON

Bạn có thể viết "Trả về JSON" trong prompt. Model thường làm theo, nhưng không có gì bảo đảm:

- Output có thể kèm lời dẫn hoặc bọc trong khối Markdown.
- Tên trường thay đổi giữa các lượt (`total`, `total_amount`, `tong_tien`).
- Thiếu trường, sai kiểu (`"2"` thay cho `2`).

[Lab 4.7](../07-lab/) cho thấy đúng điều này: cùng một hóa đơn, không có schema thì model trả về một khối JSON tự đặt tên trường, kèm phần tóm tắt bằng lời.

Giải pháp là để model điền vào một cấu trúc do bạn định nghĩa bằng **JSON schema**. Có hai con đường, cùng dựa trên schema:

| Cách | Schema đặt ở đâu | Kết quả nằm ở đâu |
|---|---|---|
| **`tool_use`** (cách đề thi hỏi) | `input_schema` của một tool "trích xuất" | Trường `input` của khối `tool_use` |
| **Structured outputs** (tính năng riêng) | `output_config.format` của request | Khối text của phản hồi, là JSON hợp lệ |

## Trích xuất bằng tool_use

Ý tưởng: định nghĩa một tool mà "tham số" chính là dữ liệu bạn muốn. Bạn không cần chạy tool đó. Bạn chỉ đọc tham số model đã điền.

```python
import anthropic

client = anthropic.Anthropic()

extract_tool = {
    "name": "record_invoice",
    "description": "Ghi lại dữ liệu đã trích xuất từ một hóa đơn.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "vendor_name": {"type": "string"},
            "due_date": {
                "type": ["string", "null"],
                "description": "YYYY-MM-DD. null nếu văn bản không ghi hạn thanh toán.",
            },
            "total": {"type": "integer", "description": "Tổng phải trả, số nguyên VND."},
        },
        "required": ["vendor_name", "due_date", "total"],
        "additionalProperties": False,
    },
}

response = client.messages.create(
    model="claude-haiku-5-5",
    max_tokens=1024,
    tools=[extract_tool],
    tool_choice={"type": "tool", "name": "record_invoice"},
    messages=[{"role": "user", "content": "Trích xuất hóa đơn sau:\n" + document}],
)

block = next(b for b in response.content if b.type == "tool_use")
invoice = block.input          # dict đã đúng schema
```

Chưa chạy kiểm chứng trong khóa học này (cần `ANTHROPIC_API_KEY`).

Ba điểm trong đoạn code:

- `block.input` đã là một đối tượng, không phải chuỗi cần `json.loads`.
- `tool_choice` ép model gọi đúng tool này, nên phản hồi không thể là một câu văn.
- `"strict": True` bật ràng buộc ngữ pháp: model chỉ sinh được token hợp lệ theo schema. Phần sau nói kỹ hơn.

## tool_choice

`tool_choice` quyết định model có được chọn giữa trả lời bằng text và gọi tool hay không.

| Giá trị | Hành vi | Dùng khi |
|---|---|---|
| `{"type": "auto"}` | Model tự quyết: gọi tool hoặc trả lời bằng text. Mặc định khi có `tools` | Agent thông thường |
| `{"type": "any"}` | **Phải** gọi một tool nào đó, model chọn tool | Có nhiều schema trích xuất, cần chắc chắn có output có cấu trúc |
| `{"type": "tool", "name": "..."}` | **Phải** gọi đúng tool có tên này | Chỉ có một schema, hoặc cần ép bước đầu tiên (ví dụ `extract_metadata` trước các bước khác) |
| `{"type": "none"}` | Không được gọi tool. Mặc định khi không có `tools` | Tạm cấm tool trong một lượt |

Với `any` và `tool`, phản hồi bắt đầu thẳng bằng lời gọi tool: model không viết lời giải thích trước đó, và cũng bỏ qua bước thinking. Nếu bạn muốn model suy nghĩ hoặc giải thích rồi mới gọi tool, dùng `auto` và yêu cầu gọi tool trong prompt.

:::note[Ép tool trên các model mới]
Đề thi coi `any` và ép tool cụ thể là cách bảo đảm có output có cấu trúc. Tài liệu hiện hành thêm một giới hạn: một số model mới nhất (như Claude Fable 5.2, Claude Opus 5.5, Claude Sonnet 5.5) trả lỗi 400 khi nhận `any` hoặc `tool`, và chế độ extended thinking bật thủ công cũng không dùng được hai giá trị này. Trên các model đó, dùng `auto` kết hợp `strict: true`, hoặc dùng structured outputs khi cần phản hồi theo một dạng JSON cố định. Claude Haiku 5.5 và Claude Opus 5 vẫn nhận ép tool. Khi làm bài thi, trả lời theo ba giá trị trong bảng.
:::

## Structured outputs và strict

Tài liệu hiện hành gọi chung hai tính năng là **structured outputs**. Cả hai dùng cùng một cơ chế: schema được biên dịch thành ngữ pháp, và model chỉ được sinh token hợp lệ theo ngữ pháp đó.

| Tính năng | Bật bằng | Bảo đảm |
|---|---|---|
| **JSON outputs** | `output_config.format` với `type: "json_schema"` | Phản hồi cuối là JSON đúng schema |
| **Strict tool use** | `"strict": true` trên định nghĩa tool | `input` của lời gọi tool đúng `input_schema`, tên tool luôn hợp lệ |

```python
response = client.messages.create(
    model="claude-haiku-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Trích xuất hóa đơn sau:\n" + document}],
    output_config={
        "format": {"type": "json_schema", "schema": invoice_schema}
    },
)
invoice = json.loads(response.content[0].text)
```

Chưa chạy kiểm chứng trong khóa học này (cần `ANTHROPIC_API_KEY`).

:::note[Đề thi và tài liệu hiện hành]
Hướng dẫn ôn thi viết: `tool_use` với JSON schema là cách đáng tin nhất để có output đúng schema. Tài liệu hiện hành nói chính xác hơn: không có `strict: true`, model vẫn có thể điền sai kiểu hoặc bỏ sót trường bắt buộc; bảo đảm tuyệt đối đến từ `strict: true` hoặc `output_config.format`. Ý cần nhớ cho đề thi không đổi: muốn output có cấu trúc đáng tin, dùng schema qua `tool_use`, không dựa vào lời dặn "trả về JSON".
:::

Những giới hạn cần biết khi dùng strict hoặc JSON outputs:

- Mọi object phải có `"additionalProperties": false`.
- Không hỗ trợ ràng buộc số (`minimum`, `maximum`), độ dài chuỗi, schema đệ quy. Những ràng buộc đó phải kiểm tra bằng code.
- Phản hồi vẫn có thể không khớp schema trong hai trường hợp: model từ chối (`stop_reason: "refusal"`) hoặc bị cắt vì hết token (`stop_reason: "max_tokens"`). Luôn kiểm tra `stop_reason` trước khi dùng dữ liệu.
- JSON outputs không dùng cùng citations và không dùng cùng prefill.

Trong **Claude Code**, cùng ý tưởng này xuất hiện dưới dạng cờ `--json-schema` của `claude -p` và tùy chọn `output_format` của Agent SDK. Kết quả nằm trong trường `structured_output` của message kết quả. Bên dưới, Claude Code thêm một tool tên `StructuredOutput` vào phiên, agent gọi tool đó để nộp kết quả, và nếu kết quả không khớp schema thì agent được yêu cầu gọi lại. Hết số lần thử, lượt chạy kết thúc với `error_max_structured_output_retries`. Đây chính là mẫu "trích xuất bằng tool_use" được đóng gói sẵn.

## Thiết kế schema để model không phải bịa

Schema là một phần của prompt. Model đọc tên trường, `description`, `enum`, và điền theo. Một schema đòi thứ mà văn bản không có sẽ nhận về dữ liệu bịa.

**Trường có thể vắng mặt thì phải cho phép null.** Nếu `due_date` là chuỗi bắt buộc và văn bản không ghi hạn trả, model chỉ còn ba lựa chọn tệ: bịa một ngày, điền `"N/A"`, hoặc điền chuỗi rỗng. Khai báo `"type": ["string", "null"]` và ghi trong `description` rằng `null` nghĩa là văn bản không ghi.

Có hai cách diễn đạt "có thể thiếu":

| Cách | Khai báo | Nhận xét |
|---|---|---|
| Trường tùy chọn | Không liệt kê trong `required` | Model có thể bỏ hẳn trường. Code phải xử lý cả "không có khóa" |
| Trường bắt buộc nhưng nullable | Có trong `required`, kiểu `["string", "null"]` | Model phải nêu rõ quyết định: giá trị hoặc `null`. Dễ xử lý hơn ở code phía sau |

**Enum cần lối thoát.** Một `enum` đóng kín buộc model nhét mọi trường hợp vào các giá trị có sẵn.

```json
{
  "category": {
    "type": "string",
    "enum": ["billing", "shipping", "technical", "other", "unclear"]
  },
  "category_detail": {
    "type": ["string", "null"],
    "description": "Mô tả ngắn khi category là other hoặc unclear, ngược lại null"
  }
}
```

- `"other"` kèm trường mô tả giữ lại thông tin cho những loại bạn chưa nghĩ tới. Xem lại các giá trị `other` định kỳ để biết khi nào cần thêm một mục mới.
- `"unclear"` cho model một cách trung thực để nói "không đủ căn cứ". Một `unclear` có ích hơn một nhãn sai.

**Dùng `description` để chốt định dạng.** Ghi đơn vị và dạng viết ngay trong schema: `"YYYY-MM-DD"`, `"số nguyên VND, không dấu phân cách"`. Lưu ý từ khóa `format` (như `"format": "date"`) trong Claude Code chỉ là chú thích, không được kiểm tra.

## Lỗi cú pháp và lỗi ngữ nghĩa

Đây là phân biệt hay được hỏi nhất của bài.

| Loại lỗi | Ví dụ | Chặn bằng |
|---|---|---|
| **Cú pháp** | JSON thiếu ngoặc, thiếu trường bắt buộc, `"2"` thay cho `2`, giá trị ngoài `enum` | Schema qua `tool_use` (với strict) hoặc structured outputs |
| **Ngữ nghĩa** | Tổng các dòng khác tổng hóa đơn, ngày lập sau ngày đến hạn, tên người mua nằm ở trường người bán, giá trị bịa | Kiểm tra bằng code sau khi nhận output, retry kèm lỗi, người duyệt |

Schema chỉ biết hình dạng dữ liệu. Nó không biết `total` phải bằng tổng các `amount`, và không biết một mã số thuế hợp lệ về hình thức có thật sự nằm trong văn bản hay không. Một output **đúng schema 100% vẫn có thể sai hoàn toàn về nội dung**.

Vì vậy pipeline trích xuất luôn có hai lớp: schema để loại lỗi cú pháp, và một bước validation riêng cho lỗi ngữ nghĩa. Lớp thứ hai là nội dung của bài [4.4](../04-validation-retry/).

Tài liệu gốc: [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use), [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools), [Get structured output from agents](https://code.claude.com/docs/en/agent-sdk/structured-outputs).

## Tóm tắt

- Muốn output có cấu trúc đáng tin: đưa JSON schema vào `input_schema` của một tool và đọc `input` của khối `tool_use`.
- `auto` có thể trả text; `any` buộc gọi một tool nào đó; `{"type": "tool", "name": ...}` buộc gọi đúng một tool.
- `strict: true` và `output_config.format` là cơ chế hiện hành bảo đảm đúng schema. Trong Claude Code là `--json-schema` và `structured_output`.
- Trường có thể vắng mặt thì cho phép `null`. Enum nên có `other` kèm trường mô tả, và `unclear`.
- Schema loại lỗi cú pháp, không loại lỗi ngữ nghĩa. Luôn cần bước validation sau đó.
