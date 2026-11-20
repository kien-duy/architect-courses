---
title: 2.2 · Lỗi có cấu trúc và isError
description: Cách tool MCP báo lỗi bằng isError, bốn nhóm lỗi, và nội dung lỗi cần có để model tự quyết định thử lại, sửa input hay dừng.
lesson:
  day: 4
  minutes: 15
quiz:
  - q: "An MCP tool `book_room` wraps a hotel API. Whatever goes wrong, it returns `isError: true` with the text 'Booking failed'. Logs show the agent retrying the same call up to six times when the room is simply sold out. Which change best fixes this?"
    options:
      - text: "Cap the agent at two retries per tool in the system prompt"
        why: "Giới hạn số lần thử giảm lãng phí nhưng agent vẫn không biết vì sao thất bại. Nó vẫn thử lại vô ích hai lần, và với lỗi tạm thời thật sự thì lại bỏ cuộc quá sớm."
      - text: "Return `isError: false` with an empty booking so the agent stops retrying"
        why: "Báo thành công cho một thao tác thất bại là che lỗi. Agent sẽ nói với khách rằng đã đặt phòng."
      - text: "Return a structured error: a category (business), `isRetryable: false`, and a message saying the room is sold out for those dates and what the agent can offer instead"
        why: "Đúng. Lỗi chung chung không cho model cơ sở để quyết định. Phân loại lỗi, cờ thử lại và thông điệp cụ thể cho phép nó dừng thử lại và đề xuất ngày khác."
      - text: "Throw a JSON-RPC protocol error instead of a tool result"
        why: "Lỗi giao thức dành cho request sai cấu trúc hoặc tool không tồn tại. Model khó tự sửa từ loại lỗi này, và nội dung vẫn không nói phòng đã hết."
    answer: 2
    keyword: "lỗi chung chung → model **không biết** nên thử lại hay dừng"
    relearn: "#cấu-trúc-một-lỗi-tốt"
    relearnLabel: "Cấu trúc một lỗi tốt"
  - q: "A `search_contracts` MCP tool queries a document store. When the store is unreachable, the tool catches the exception and returns an empty list with `isError: false`. A compliance agent then reports 'no contracts mention this supplier'. What is wrong with the design?"
    options:
      - text: "It makes an access failure indistinguishable from a valid empty result, so the agent draws a false conclusion"
        why: "Đúng. 'Không tìm thấy gì' và 'không tìm được' là hai kết quả khác nhau. Trả danh sách rỗng khi kho tài liệu sập khiến agent kết luận sai với vẻ chắc chắn."
      - text: "Empty lists should always be returned with `isError: true`"
        why: "Ngược lại: không có kết quả khớp là một câu trả lời hợp lệ và phải là `isError: false`. Chỉ lần truy cập thất bại mới là lỗi."
      - text: "The tool should retry forever until the store responds"
        why: "Thử lại vô hạn làm treo agent. Sau vài lần thử cục bộ, tool phải báo lỗi tạm thời để bên gọi quyết định."
      - text: "The agent should have been told in the system prompt to distrust empty results"
        why: "Nếu vậy agent sẽ nghi ngờ cả những kết quả rỗng hợp lệ. Thông tin phân biệt hai trường hợp phải đến từ tool."
    answer: 0
    keyword: "truy cập **thất bại** ≠ kết quả **rỗng** hợp lệ"
    relearn: "#lỗi-truy-cập-khác-kết-quả-rỗng"
    relearnLabel: "Lỗi truy cập khác kết quả rỗng"
  - q: "A pricing subagent calls an exchange-rate MCP tool that occasionally times out. Today every timeout is passed straight up to the coordinator, which restarts the whole pricing task. Which design is better?"
    options:
      - text: "Have the subagent hide the failure and use an exchange rate of 1.0"
        why: "Thay một giá trị bịa vào chỗ dữ liệu thiếu tạo ra kết quả sai mà không ai biết."
      - text: "Have the coordinator retry the full task up to ten times"
        why: "Chạy lại cả tác vụ vì một lỗi tạm thời ở một lời gọi là lãng phí, và làm mất kết quả các bước đã xong."
      - text: "Remove the exchange-rate tool and let the model estimate the rate"
        why: "Model không có tỉ giá hiện tại. Bỏ nguồn dữ liệu thật để tránh lỗi là đổi một lỗi rõ ràng lấy một lỗi âm thầm."
      - text: "Let the subagent retry the transient error locally once or twice, and propagate to the coordinator only if it still fails, with what was attempted and any partial results"
        why: "Đúng. Lỗi tạm thời nên được xử lý ở nơi gần nhất. Chỉ lỗi không tự giải quyết được mới đi lên coordinator, kèm đủ ngữ cảnh để coordinator quyết định."
    answer: 3
    keyword: "lỗi tạm thời: xử lý **tại chỗ**, chỉ chuyển lên lỗi không tự giải quyết được"
    relearn: "#xử-lý-lỗi-trong-hệ-nhiều-agent"
    relearnLabel: "Xử lý lỗi trong hệ nhiều agent"
---

Tool nào rồi cũng có lúc thất bại. Điều quyết định agent có phục hồi được hay không là **nội dung** của thông báo lỗi: nó đủ để model biết nên thử lại, sửa tham số, đổi hướng hay chuyển cho người.

## Hai loại lỗi trong MCP

Đặc tả MCP tách lỗi của tool thành hai loại và báo chúng bằng hai cơ chế khác nhau.

| | Lỗi giao thức | Lỗi thực thi tool |
|---|---|---|
| Ví dụ | Tool không tồn tại, request sai cấu trúc | API bên ngoài hỏng, input sai định dạng, vi phạm quy tắc nghiệp vụ |
| Cách báo | Trường `error` của JSON-RPC | Một `result` bình thường có `isError: true` |
| Model tự sửa được không | Ít khả năng | Có, nếu nội dung đủ rõ |

Lỗi giao thức:

```json
{ "jsonrpc": "2.0", "id": 3,
  "error": { "code": -32602, "message": "Unknown tool: delete_order" } }
```

Lỗi thực thi tool:

```json
{ "jsonrpc": "2.0", "id": 4,
  "result": {
    "content": [{ "type": "text", "text": "Ngày đi phải ở tương lai. Hôm nay là 2026-11-19." }],
    "isError": true
  } }
```

Đặc tả yêu cầu client nên chuyển lỗi thực thi tool cho model để nó tự sửa. Vì vậy quy tắc thiết kế là: **mọi thất bại mà model có thể phản ứng được đều trả về dưới dạng kết quả tool với `isError: true`**, không phải lỗi giao thức và không phải exception làm sập server.

## isError và is_error

Cùng một ý tưởng xuất hiện dưới ba cái tên tùy tầng bạn đang làm việc.

| Tầng | Tên trường | Nằm ở đâu |
|---|---|---|
| Giao thức MCP | `isError` | Trong `result` của `tools/call` |
| Messages API | `is_error` | Trong khối `tool_result` bạn gửi lại cho model |
| Agent SDK (tool tự viết) | `isError` (TypeScript), `is_error` (Python) | Trong giá trị handler trả về |

Khi tự viết vòng lặp với Messages API, bạn là người chạy tool, nên bạn tự đặt `is_error`:

```json
{ "type": "tool_result", "tool_use_id": "toolu_01...",
  "content": "Rate limit exceeded. Retry after 60 seconds.", "is_error": true }
```

Khi dùng Claude Code hoặc Agent SDK với MCP server, chúng lo phần chuyển đổi: `isError: true` từ server trở thành `tool_result` có `is_error` mà model đọc.

Trong Agent SDK, một handler ném exception không bắt cũng không làm dừng vòng lặp. SDK bắt exception và chuyển thông điệp thô của nó cho model. Tự bắt lỗi và trả `is_error` cho phép bạn viết thông điệp có ích hơn thông điệp thô.

## Bốn nhóm lỗi

Đề thi phân lỗi thành bốn nhóm. Mỗi nhóm dẫn tới một hành động khác nhau.

| Nhóm | Ví dụ | Thử lại có ích không | Hành động đúng của agent |
|---|---|:-:|---|
| **Transient** (tạm thời) | Timeout, dịch vụ quá tải, mất mạng | Có | Thử lại, có giới hạn số lần |
| **Validation** (input sai) | Sai định dạng mã, thiếu tham số, giá trị ngoài khoảng | Không, nếu giữ nguyên input | Sửa input rồi gọi lại |
| **Business** (quy tắc nghiệp vụ) | Vượt hạn mức hoàn tiền, đơn chưa giao | Không | Giải thích cho người dùng, đề xuất hướng khác hoặc chuyển cho người |
| **Permission** (quyền truy cập) | Không có quyền đọc tài nguyên, token hết hạn | Không | Báo rõ, chuyển cho người có quyền |

Điểm dễ nhầm: lỗi validation "không thử lại được" theo nghĩa **gọi lại y nguyên** thì vô ích. Gọi lại với input đã sửa là hành động đúng.

## Cấu trúc một lỗi tốt

So sánh hai cách báo cùng một sự cố:

```json
{ "content": [{ "type": "text", "text": "Operation failed" }], "isError": true }
```

```json
{
  "content": [{
    "type": "text",
    "text": "{\"errorCategory\": \"business\", \"isRetryable\": false, \"message\": \"Đơn DH-1002 đang ở trạng thái shipping. Chỉ hoàn tiền được đơn đã giao.\", \"hint\": \"Không gọi lại. Đề nghị khách hủy đơn hoặc chờ giao xong.\"}"
  }],
  "isError": true
}
```

Với bản đầu, model chỉ biết "có gì đó hỏng". Nó có thể thử lại vô ích, gọi tool khác để tự điều tra, hoặc trả lời người dùng bằng một phỏng đoán. Với bản sau, nó biết ngay ba điều:

| Thành phần | Trả lời câu hỏi |
|---|---|
| `errorCategory` | Lỗi thuộc nhóm nào? |
| `isRetryable` | Gọi lại y nguyên có ích không? |
| `message` | Chuyện gì đã xảy ra, đủ cụ thể để giải thích cho người dùng |
| `hint` hoặc tương đương | Bước tiếp theo nên là gì? |

Với lỗi nghiệp vụ, `isRetryable: false` kèm một lời giải thích mà agent có thể nói lại với khách là kết hợp đề thi nhắc tới nhiều nhất.

:::note[Tên trường là quy ước, `content` là mảng]
`errorCategory`, `isRetryable` và `hint` **không** thuộc đặc tả MCP. Đặc tả chỉ định nghĩa `isError` và `content`. Các trường còn lại là quy ước bạn tự đặt, miễn là model đọc hiểu. Một số tài liệu luyện thi vẽ `content` như một object chứa thẳng các trường này. Theo đặc tả hiện hành, `content` là **mảng các khối nội dung** (`text`, `image`…), nên phần có cấu trúc được đặt dưới dạng chuỗi JSON trong một khối `text`, như ví dụ trên, hoặc trong trường `structuredContent`.
:::

Thông điệp lỗi nên ngắn. Trong Claude Code, nội dung lỗi dài hơn khoảng 11.000 ký tự bị cắt bỏ phần giữa trước khi tới model.

## Lỗi truy cập khác kết quả rỗng

Hai tình huống sau phải cho ra hai kết quả khác nhau:

| Tình huống | Kết quả đúng |
|---|---|
| Tìm đơn của một khách chưa từng mua | `isError: false`, `{"count": 0, "orders": []}` |
| Cơ sở dữ liệu đơn hàng không kết nối được | `isError: true`, nhóm transient |

Nếu tool bắt exception rồi trả danh sách rỗng "cho an toàn", agent sẽ kết luận "khách không có đơn nào" trong khi sự thật là "không tra được". Đây là kiểu lỗi nguy hiểm nhất vì nó không để lại dấu vết.

Chiều ngược lại cũng sai: báo lỗi khi không có kết quả khớp khiến agent thử lại một truy vấn vốn đã chạy đúng. Hãy ghi ngay trong mô tả tool rằng kết quả rỗng là hợp lệ.

## Xử lý lỗi trong hệ nhiều agent

Khi tool được gọi bởi subagent, câu hỏi là lỗi nào xử lý tại chỗ và lỗi nào đưa lên coordinator.

- **Lỗi tạm thời: xử lý tại chỗ.** Subagent thử lại một hai lần. Coordinator không cần biết về một lần timeout đã tự hết.
- **Lỗi không tự giải quyết được: chuyển lên.** Kèm theo những gì đã thử, kết quả đã có được một phần, và hướng thay thế nếu có. Coordinator có toàn cảnh để chọn: đổi nguồn, làm tiếp với dữ liệu thiếu, hay hỏi người dùng.
- **Luôn giới hạn số lần thử.** Sau mỗi `tool_result` có `is_error`, model có thể gọi lại tool. Vòng lặp của bạn cần một trần cho số lần thử lại.

Hai cách làm sai phổ biến: nuốt lỗi rồi trả về kết quả như thể thành công, và dừng cả quy trình vì một lời gọi thất bại. Cách xử lý lỗi ở tầng điều phối được bàn tiếp ở Domain 5.

Tài liệu gốc: [MCP: Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls), [Give Claude custom tools](https://code.claude.com/docs/en/agent-sdk/custom-tools).

## Tóm tắt

- Lỗi giao thức đi qua `error` của JSON-RPC. Lỗi khi chạy tool là một kết quả có `isError: true`, và model đọc được nó.
- `isError` (MCP) và `is_error` (Messages API) là cùng một tín hiệu ở hai tầng.
- Bốn nhóm: transient thì thử lại, validation thì sửa input, business thì giải thích và đổi hướng, permission thì chuyển cho người có quyền.
- Lỗi tốt nêu nhóm lỗi, có thử lại được không, chuyện gì xảy ra và nên làm gì tiếp.
- Truy cập thất bại không được trả về như kết quả rỗng.
- Subagent tự xử lý lỗi tạm thời, chỉ chuyển lên lỗi nó không giải quyết được.
