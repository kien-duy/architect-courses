---
title: 2.1 · Viết mô tả tool
description: Mô tả tool là thứ model dựa vào để chọn tool. Cách viết mô tả rõ ràng, tách tool chồng lấn và tránh liên tưởng sai từ system prompt.
lesson:
  day: 4
  minutes: 15
quiz:
  - q: "A travel assistant has two tools: `search_flights` ('Searches flights') and `get_flight_status` ('Gets flight information'). When a user asks 'Is my 6 pm flight to Da Nang delayed?', the agent often calls `search_flights` and replies with ticket prices. What is the most effective first fix?"
    options:
      - text: "Add a system prompt rule: 'For delay questions always call `get_flight_status`'"
        why: "Quy tắc trong system prompt vá được một kiểu câu hỏi, nhưng mô tả của hai tool vẫn mơ hồ. Các kiểu câu hỏi khác tiếp tục bị chọn sai, và prompt phình dần theo từng trường hợp."
      - text: "Rewrite both descriptions to state what each tool returns, which inputs it accepts, and when to use it instead of the other"
        why: "Đúng. Model chọn tool chủ yếu dựa vào mô tả. Hai mô tả một dòng gần giống nhau không cho nó cơ sở để phân biệt. Nêu rõ dữ liệu trả về, định dạng input và ranh giới giữa hai tool là cách sửa trực tiếp vào nguyên nhân."
      - text: "Merge the two tools into a single `flights` tool"
        why: "Một tool chung chung làm ranh giới còn mờ hơn: model phải đoán tham số nào dẫn tới dữ liệu nào, và kết quả trả về lẫn lộn giá vé với tình trạng chuyến bay."
      - text: "Switch the agent to a larger model"
        why: "Model lớn hơn vẫn chỉ có hai câu mô tả gần giống nhau để dựa vào. Thiếu thông tin thì model nào cũng phải đoán."
    answer: 1
    keyword: "chọn sai tool → sửa **mô tả** trước tiên"
    relearn: "#mô-tả-tốt-gồm-những-gì"
    relearnLabel: "Mô tả tốt gồm những gì"
  - q: "A document-processing agent exposes `process_document` and `process_file`. Both descriptions say 'Processes the input and returns the extracted data'. One is meant for scanned invoices, the other for contract PDFs. The agent picks between them almost at random. Which change addresses the root cause?"
    options:
      - text: "Lower the temperature so tool selection becomes deterministic"
        why: "Nhiệt độ thấp chỉ làm lựa chọn ổn định hơn, không làm nó đúng hơn. Model sẽ chọn sai một cách nhất quán."
      - text: "Add few-shot examples of correct selection to the system prompt"
        why: "Ví dụ giúp được phần nào, nhưng tên và mô tả trùng nhau vẫn là nguồn gây nhầm. Đây là cách vá triệu chứng và tốn token ở mọi request."
      - text: "Set `tool_choice` to force `process_document`"
        why: "Ép một tool cố định làm mọi hợp đồng cũng đi vào tool dành cho hóa đơn. Vấn đề là phân biệt hai tool, không phải có gọi tool hay không."
      - text: "Rename the tools by what they operate on, for example `extract_invoice_fields` and `extract_contract_clauses`, and give each a description with its own input and output"
        why: "Đúng. Hai tool chồng lấn cả tên lẫn mô tả. Đặt tên theo đối tượng xử lý và viết mô tả riêng cho từng tool loại bỏ sự chồng lấn ngay tại nguồn."
    answer: 3
    keyword: "tên và mô tả **chồng lấn** → đổi tên, tách ranh giới"
    relearn: "#tool-chồng-lấn-và-cách-tách"
    relearnLabel: "Tool chồng lấn và cách tách"
  - q: "A legal-research assistant has `search_case_law` and `calculate_filing_deadline`. Its system prompt says: 'Search the case-law database for every request.' When a user only asks to compute a deadline from a given date, the agent still runs a case-law search first and pads the answer with unrelated cases. What explains this?"
    options:
      - text: "The system prompt wording creates an unintended association: 'for every request' pulls all requests toward `search_case_law`"
        why: "Đúng. Câu chữ trong system prompt cũng là tín hiệu chọn tool. Một chỉ dẫn tuyệt đối trùng với tên tool khiến model gọi tool đó cả khi không cần. Cần viết lại chỉ dẫn kèm điều kiện áp dụng."
      - text: "The description of `calculate_filing_deadline` is too long, so the model skips it"
        why: "Đề bài không nói mô tả dài, và mô tả dài rõ ràng thường giúp chọn đúng hơn chứ không làm tool bị bỏ qua. Hơn nữa agent vẫn gọi tool này, chỉ là sau một lần tìm kiếm thừa."
      - text: "Tools are tried in the order they are listed in the request"
        why: "Model không thử tool theo thứ tự khai báo. Nó chọn theo ngữ cảnh, mô tả và chỉ dẫn."
      - text: "`tool_choice` defaults to forcing the first tool"
        why: "Mặc định khi có `tools` là `auto`: model tự quyết định có gọi tool hay không và gọi tool nào."
    answer: 0
    keyword: "system prompt cũng **kéo** model về một tool"
    relearn: "#system-prompt-cũng-ảnh-hưởng-tới-việc-chọn-tool"
    relearnLabel: "System prompt cũng ảnh hưởng tới việc chọn tool"
---

Model không đọc code của tool. Nó chỉ thấy tên, mô tả và schema tham số, rồi quyết định gọi tool nào dựa trên ba thứ đó. Vì vậy phần lớn lỗi "agent gọi sai tool" được sửa bằng cách viết lại mô tả, không phải bằng cách đổi model hay thêm luật vào prompt.

## Model thấy gì khi chọn tool

Một tool gửi cho Messages API gồm ba phần bắt buộc:

```json
{
  "name": "search_tickets",
  "description": "Tìm ticket hỗ trợ theo từ khóa trong tiêu đề và nội dung...",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Từ khóa, ví dụ 'lỗi thanh toán'" },
      "status": { "type": "string", "enum": ["open", "closed"] }
    },
    "required": ["query"]
  }
}
```

| Trường | Vai trò |
|---|---|
| `name` | Định danh của tool, gồm chữ, số, `_` và `-`, tối đa 128 ký tự |
| `description` | Văn bản thường: tool làm gì, dùng khi nào, hoạt động ra sao |
| `input_schema` | JSON Schema của tham số. Mỗi thuộc tính cũng có `description` riêng |
| `input_examples` | Không bắt buộc. Vài input mẫu hợp lệ, hữu ích khi tham số lồng nhau hoặc nhạy cảm về định dạng |

API ghép các định nghĩa này vào một system prompt đặc biệt trước khi model chạy. Nghĩa là mô tả tool **là một phần của prompt**. Viết mô tả tool chính là viết prompt.

Tool của MCP server có cùng cấu trúc, chỉ khác tên trường schema là `inputSchema`. Khi Claude Code nối với một MCP server, nó chuyển các định nghĩa này thành tool cho model, nên mọi nguyên tắc trong bài áp dụng cho cả hai.

## Mô tả tốt gồm những gì

Tài liệu của Anthropic gọi mô tả chi tiết là yếu tố quan trọng nhất quyết định model dùng tool tốt đến đâu, và khuyên viết ít nhất 3–4 câu cho mỗi tool. Một mô tả đủ dùng trả lời được bốn câu hỏi:

| Câu hỏi | Ví dụ nội dung |
|---|---|
| Tool làm gì và trả về gì? | "Trả về mã ticket, tiêu đề và trạng thái. Không trả nội dung hội thoại." |
| Dùng khi nào, và khi nào **không** dùng? | "Dùng khi chưa biết mã ticket. Đã có mã thì gọi `get_ticket`." |
| Mỗi tham số nghĩa là gì, định dạng ra sao? | "`customer_email`: email đầy đủ, ví dụ an@example.com" |
| Giới hạn và trường hợp biên? | "Tối đa 20 kết quả. Không tìm thấy thì trả danh sách rỗng, không phải lỗi." |

So sánh hai phiên bản của cùng một tool:

```text
Sơ sài:  "Tìm ticket."

Đầy đủ:  "Tìm ticket hỗ trợ theo từ khóa trong tiêu đề và nội dung. Dùng khi người dùng
          mô tả vấn đề nhưng chưa có mã ticket. Trả về tối đa 20 ticket, mỗi ticket gồm
          mã (dạng TK-12345), tiêu đề và trạng thái; không trả nội dung hội thoại, muốn
          đọc nội dung thì gọi get_ticket với mã ticket. Không có kết quả là hợp lệ:
          trả về danh sách rỗng."
```

Với bản sơ sài, model phải tự đoán: tìm theo gì, trả về gì, khác gì `get_ticket`. Mỗi chỗ phải đoán là một chỗ có thể đoán sai.

Mô tả của **tham số** cũng quan trọng không kém. Định dạng mã, đơn vị, múi giờ, giá trị hợp lệ nên nằm ngay trong `description` của thuộc tính hoặc được ràng buộc bằng `enum`. Lab của domain này cho thấy rõ điều đó: với mô tả "Mã đơn", model truyền `1002`; với mô tả "Mã đơn dạng DH-NNNN, ví dụ DH-1002", nó truyền đúng ngay lần đầu.

## Tool chồng lấn và cách tách

Khi hai tool có tên hoặc mô tả gần giống nhau, model không có cơ sở để phân biệt và chọn gần như ngẫu nhiên. Đề thi gọi hiện tượng này là **misrouting**. Ba cách xử lý, theo thứ tự nên thử:

1. **Viết ranh giới vào mô tả.** Mỗi tool nói rõ nó dùng cho việc gì và trỏ sang tool kia cho việc còn lại ("không dùng để tìm theo khách hàng; việc đó là của `find_orders`").
2. **Đổi tên theo đối tượng xử lý.** `process_document` và `process_file` nghe như một. `extract_invoice_fields` và `extract_contract_clauses` thì không thể nhầm.
3. **Tách tool đa năng thành các tool chuyên biệt.** Một tool `manage_data` nhận mười tham số tùy chọn cho năm việc khác nhau nên được tách thành các tool có input và output rõ ràng.

Tách không phải lúc nào cũng đúng. Tài liệu hiện hành cũng khuyên **gộp các thao tác liên quan chặt chẽ** vào một tool có tham số `action` (ví dụ tạo, duyệt và merge pull request), vì ít tool hơn thì ít mơ hồ khi chọn. Quy tắc phân biệt:

| Tình huống | Hướng xử lý |
|---|---|
| Hai tool làm hai việc khác nhau nhưng tên và mô tả giống nhau | Đổi tên, viết ranh giới |
| Một tool làm nhiều việc không liên quan, input và output khác hẳn nhau | Tách |
| Nhiều tool nhỏ là biến thể của cùng một thao tác trên cùng một đối tượng | Gộp, phân biệt bằng tham số |

Khi tool đến từ nhiều dịch vụ, nên thêm tiền tố dịch vụ vào tên (`github_list_prs`, `slack_send_message`) để tên tự nó đã phân biệt được.

## System prompt cũng ảnh hưởng tới việc chọn tool

Mô tả tool không phải tín hiệu duy nhất. Câu chữ trong system prompt có thể tạo ra **liên tưởng ngoài ý muốn** với một tool.

```text
System prompt:  "Luôn tra cứu tài khoản trước khi làm bất cứ việc gì."
Tool:           lookup_account, search_help_articles
Kết quả:        Người dùng hỏi cách đổi mật khẩu, agent vẫn gọi lookup_account
                và đòi mã tài khoản.
```

Chỉ dẫn tuyệt đối ("luôn", "trước mọi việc") cộng với từ khóa trùng tên tool kéo mọi yêu cầu về tool đó. Cách sửa là viết chỉ dẫn kèm điều kiện: "Khi yêu cầu liên quan tới một tài khoản cụ thể, tra cứu tài khoản trước."

Một trường hợp tương tự: agent có cả tool có sẵn (như `Grep`) lẫn tool MCP làm việc gần giống. Model thường chọn tool có sẵn vì nó quen thuộc. Nếu tool MCP có giá trị riêng, mô tả phải nói ra giá trị đó: dữ liệu nào chỉ nó có, ngữ cảnh nào tool có sẵn không cung cấp được.

Khi điều tra một lỗi chọn sai tool, hãy đọc cả ba nơi: mô tả của tool bị bỏ qua, mô tả của tool bị chọn nhầm, và system prompt.

## Thiết kế kết quả trả về

Giao diện của tool gồm cả những gì nó trả về. Kết quả tool đi thẳng vào context của model, nên:

- **Chỉ trả thông tin model cần cho bước tiếp theo.** Một bản ghi 40 trường trong khi model chỉ cần 5 trường làm tốn context và che mất phần quan trọng.
- **Dùng định danh ổn định, có nghĩa** (mã đơn, slug, UUID) thay vì tham chiếu nội bộ khó hiểu. Model sẽ dùng lại chính các định danh này ở lời gọi sau.
- **Nói rõ trường hợp rỗng.** Kết quả rỗng hợp lệ khác với lỗi. Phần này được bàn kỹ ở [bài 2.2](../02-loi-co-cau-truc/).

Trong Claude Code, mô tả tool và hướng dẫn của MCP server bị cắt nếu vượt quá giới hạn độ dài (vài nghìn ký tự). Model chỉ thấy phần trước chỗ cắt, nên hãy đặt ý quan trọng nhất ở đầu mô tả.

Tài liệu gốc: [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools), [Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), [MCP: Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

## Tóm tắt

- Model chọn tool dựa trên tên, mô tả và schema. Mô tả là một phần của prompt.
- Mô tả tốt nói rõ: làm gì, trả về gì, dùng khi nào và khi nào không, định dạng tham số, trường hợp biên.
- Tên và mô tả chồng lấn gây chọn sai. Sửa bằng ranh giới trong mô tả, đổi tên, hoặc tách tool.
- System prompt có thể kéo model về một tool. Tránh chỉ dẫn tuyệt đối trùng tên tool.
- Kết quả trả về cũng là giao diện: gọn, có định danh ổn định, phân biệt rỗng với lỗi.
