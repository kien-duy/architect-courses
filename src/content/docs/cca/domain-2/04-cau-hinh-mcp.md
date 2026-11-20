---
title: 2.4 · Cấu hình MCP server
description: Ba phạm vi cấu hình MCP trong Claude Code, file .mcp.json và biến môi trường, cách tool được phát hiện và đặt tên, resource và prompt.
lesson:
  day: 5
  minutes: 15
quiz:
  - q: "A team of eight wants everyone who clones the repository to get the same issue-tracker MCP server in Claude Code. Each developer has a personal API token, and no token may be committed. Which setup meets both requirements?"
    options:
      - text: "Each developer runs `claude mcp add` with the default scope and pastes their own token"
        why: "Phạm vi mặc định là local: cấu hình nằm trong `~/.claude.json` của từng người và không được chia sẻ. Người mới clone repo sẽ không có server."
      - text: "Commit `.mcp.json` with one shared token hard-coded in `env`"
        why: "Cách này chia sẻ được cấu hình nhưng đưa bí mật vào version control, vi phạm yêu cầu thứ hai."
      - text: "Put the server in every developer's user scope and document the steps in the README"
        why: "Phạm vi user là cấu hình cá nhân cho mọi dự án của một người. Nó không đi theo repo, nên tám người phải tự cấu hình và dễ lệch nhau."
      - text: "Commit a project-scope `.mcp.json` whose `env` references `${TRACKER_TOKEN}`, and have each developer set that variable locally"
        why: "Đúng. `.mcp.json` ở gốc dự án được commit nên cả nhóm có cùng cấu hình. Claude Code thay `${TRACKER_TOKEN}` bằng giá trị từ môi trường của từng người, nên token không nằm trong repo."
    answer: 3
    keyword: "chia sẻ cho nhóm → `.mcp.json` + `${VAR}` cho bí mật"
    relearn: "#file-mcpjson-và-biến-môi-trường"
    relearnLabel: "File .mcp.json và biến môi trường"
  - q: "A developer is trying out an experimental MCP server for personal note-taking. It is unrelated to the team's project and should be available in all of their own projects, but must not appear for teammates. Where should it be configured?"
    options:
      - text: "In the project's `.mcp.json`"
        why: "`.mcp.json` được commit và áp dụng cho mọi người clone repo. Server thử nghiệm cá nhân không nên nằm ở đây."
      - text: "In user scope, stored in `~/.claude.json`"
        why: "Đúng. Phạm vi user dùng được ở mọi dự án của chính người đó, nằm trong thư mục home và không chia sẻ qua version control."
      - text: "In the project's `CLAUDE.md`"
        why: "`CLAUDE.md` chứa chỉ dẫn cho model, không phải nơi khai báo MCP server."
      - text: "In `.claude/settings.json` under the project"
        why: "File settings của dự án cũng được commit, và nó không phải nơi định nghĩa MCP server. Server được định nghĩa trong `.mcp.json` hoặc `~/.claude.json`."
    answer: 1
    keyword: "cá nhân, mọi dự án, không chia sẻ → **user** scope (`~/.claude.json`)"
    relearn: "#ba-phạm-vi-cấu-hình"
    relearnLabel: "Ba phạm vi cấu hình"
  - q: "An analytics agent answers questions about a warehouse with 180 tables. Before every query it makes six to ten exploratory tool calls (`list_tables`, `describe_table` on several tables) just to find where the data lives. Which MCP feature most directly reduces these calls?"
    options:
      - text: "A prompt that the user triggers as a slash command"
        why: "Prompt của MCP là mẫu chỉ dẫn do người dùng chủ động gọi. Nó không tự cung cấp bản đồ dữ liệu cho mỗi câu hỏi."
      - text: "A second `describe_table` tool with a longer description"
        why: "Thêm tool không bớt lời gọi khảo sát. Agent vẫn phải gọi từng lần để biết cấu trúc."
      - text: "A resource that exposes the schema catalog, so the agent can read the map of tables and columns once"
        why: "Đúng. Resource là dữ liệu chỉ đọc để làm ngữ cảnh. Một danh mục schema cho agent biết ngay dữ liệu nằm ở đâu, thay cho chuỗi lời gọi dò đường."
      - text: "Setting `tool_choice` to `any`"
        why: "`any` chỉ buộc model gọi một tool. Nó không cho model biết cấu trúc của kho dữ liệu."
    answer: 2
    keyword: "resource = **danh mục nội dung** → bớt lời gọi dò đường"
    relearn: "#resource-và-prompt"
    relearnLabel: "Resource và prompt"
---

Model Context Protocol (MCP) là giao thức mở để nối agent với hệ thống bên ngoài: issue tracker, cơ sở dữ liệu, công cụ nội bộ. Bạn viết hoặc cài một **MCP server**, khai báo nó cho Claude Code, và các tool của server xuất hiện bên cạnh tool có sẵn. Bài này nói về việc khai báo ở đâu, chia sẻ thế nào và server cung cấp được những gì.

## MCP gồm những gì

Một ứng dụng như Claude Code đóng vai **client**. Mỗi **server** là một chương trình cung cấp ba loại khả năng:

| Loại | Là gì | Ai quyết định dùng | Ví dụ |
|---|---|---|---|
| **Tool** | Hàm model có thể gọi để hành động hoặc truy vấn | Model | Tạo issue, chạy truy vấn |
| **Resource** | Dữ liệu chỉ đọc để làm ngữ cảnh, định danh bằng URI | Ứng dụng hoặc người dùng | Schema cơ sở dữ liệu, danh mục tài liệu |
| **Prompt** | Mẫu chỉ dẫn soạn sẵn | Người dùng chủ động gọi | Mẫu "review pull request" |

Client và server trao đổi bằng JSON-RPC qua một trong các kiểu kết nối:

| Kiểu | Dùng khi | Khai báo |
|---|---|---|
| **stdio** | Server là một tiến trình chạy trên máy bạn. Client khởi chạy nó và nói chuyện qua stdin, stdout | `command`, `args`, `env` |
| **HTTP** | Server ở xa, có URL. Đây là lựa chọn được khuyên dùng cho server từ xa | `type: "http"`, `url`, `headers` |
| **SSE** | Kiểu cũ cho server từ xa, đã bị đánh dấu ngừng khuyến nghị | `type: "sse"`, `url` |

Quy tắc chọn nhanh: tài liệu của server đưa cho bạn một **lệnh để chạy** thì dùng stdio; đưa một **URL** thì dùng HTTP.

## Ba phạm vi cấu hình

Claude Code lưu cấu hình MCP server ở ba phạm vi. Phạm vi quyết định server có mặt ở dự án nào và có được chia sẻ hay không.

| Phạm vi | Có mặt ở | Chia sẻ với nhóm | Lưu trong |
|---|---|:-:|---|
| **Local** (mặc định) | Chỉ dự án hiện tại | Không | `~/.claude.json`, dưới đường dẫn của dự án |
| **Project** | Chỉ dự án hiện tại | Có, qua version control | `.mcp.json` ở gốc dự án |
| **User** | Mọi dự án của bạn | Không | `~/.claude.json` |

```bash
claude mcp add --transport http tracker --scope project https://tracker.example.com/mcp
claude mcp add --transport stdio notes --scope user -- python3 ~/tools/notes_server.py
claude mcp list
```

Cách chọn:

- **Cả nhóm cần cùng một server** cho dự án: project. File `.mcp.json` được commit, ai clone repo cũng có.
- **Server cá nhân dùng ở mọi nơi**, hoặc đang thử nghiệm: user.
- **Server riêng cho một dự án**, có thông tin không muốn commit: local.

Khi cùng một tên server được khai báo ở nhiều nơi, Claude Code dùng **nguyên** định nghĩa ở nơi ưu tiên cao nhất, không trộn các trường: local, rồi project, rồi user.

Vì `.mcp.json` có thể đến từ một repo bạn vừa clone, Claude Code **hỏi xác nhận** trước khi dùng server phạm vi project trong phiên tương tác. Cho tới lúc đó `claude mcp list` hiện trạng thái chờ duyệt. Lượt chạy không tương tác (`claude -p`) không hiện được hộp thoại nên nạp thẳng các server này.

:::note[Đề thi nói hai phạm vi]
Hướng dẫn thi mô tả hai lựa chọn: project (`.mcp.json`, cho nhóm) và user (`~/.claude.json`, cho cá nhân và thử nghiệm). Tài liệu hiện hành có thêm phạm vi **local**, cũng lưu trong `~/.claude.json` và là mặc định của `claude mcp add`. Với câu hỏi thi, cặp đối lập cần nhớ vẫn là: chia sẻ cho nhóm thì `.mcp.json`, cá nhân thì `~/.claude.json`.
:::

## File .mcp.json và biến môi trường

```json
{
  "mcpServers": {
    "tracker": {
      "type": "http",
      "url": "${TRACKER_URL:-https://tracker.example.com}/mcp",
      "headers": { "Authorization": "Bearer ${TRACKER_TOKEN}" }
    },
    "shop": {
      "command": "python3",
      "args": ["${CLAUDE_PROJECT_DIR:-.}/server.py"],
      "env": { "SHOP_LOG": "${SHOP_LOG:-}" }
    }
  }
}
```

Mỗi khóa trong `mcpServers` là tên server. Một mục không có `type` được hiểu là server stdio.

Vì file này được commit, **không bao giờ ghi bí mật vào nó**. Claude Code thay biến môi trường trong các trường `command`, `args`, `env`, `url` và `headers`:

| Cú pháp | Kết quả |
|---|---|
| `${VAR}` | Giá trị của biến `VAR` |
| `${VAR:-default}` | Giá trị của `VAR` nếu đã đặt, ngược lại là `default` |

Mỗi lập trình viên đặt `TRACKER_TOKEN` trong môi trường của mình. Repo chỉ chứa tên biến.

Hai chi tiết đáng biết:

- Biến **chưa đặt và không có giá trị mặc định** không làm hỏng việc nạp file. Claude Code cảnh báo trong `claude mcp list` và dùng nguyên chuỗi `${VAR}`. Server thường sẽ lỗi xác thực sau đó.
- Biến đặt thành chuỗi rỗng vẫn tính là đã đặt, nên `${VAR:-default}` cho ra chuỗi rỗng.

Trong Agent SDK, bạn khai báo server ngay trong code qua tùy chọn `mcp_servers` (Python) hoặc `mcpServers` (TypeScript), hoặc để SDK nạp `.mcp.json` của dự án. Tool tự viết bằng SDK chạy trong cùng tiến trình cũng được đóng gói thành một MCP server.

## Tool được phát hiện và đặt tên thế nào

Khi kết nối, Claude Code hỏi server danh sách tool (`tools/list`). Bạn không khai báo từng tool ở phía client. Tool của **mọi** server đang kết nối đều dùng được cùng lúc trong một phiên, bên cạnh tool có sẵn.

Tên đầy đủ của tool MCP theo mẫu:

```text
mcp__<tên-server>__<tên-tool>        ví dụ: mcp__shop__get_order
```

Tên này dùng ở mọi nơi nhận tên tool: `allowedTools`, `disallowedTools`, trường `tools` của subagent, matcher của hook.

| Luật | Khớp |
|---|---|
| `mcp__shop__get_order` | Đúng một tool |
| `mcp__shop__*` hoặc `mcp__shop` | Mọi tool của server `shop` |

Tool MCP **cần được cấp quyền** mới chạy. Chế độ `acceptEdits` không tự duyệt tool MCP. Cách gọn nhất là liệt kê chúng trong `allowedTools`, đúng phạm vi cần dùng.

Vì nhiều server cùng lúc có thể mang tới hàng trăm tool, Claude Code bật **tool search** theo mặc định: lúc bắt đầu phiên chỉ có **tên** tool và hướng dẫn của server nằm trong context; định nghĩa đầy đủ được nạp khi model tìm tới bằng tool `ToolSearch`. Đặt `"alwaysLoad": true` cho một server để tool của nó luôn nằm sẵn trong context; chỉ nên làm vậy với vài tool cần ở mọi lượt.

:::note[Khác với tài liệu luyện thi cũ]
Tài liệu luyện thi viết rằng tool của mọi server được phát hiện khi kết nối và có sẵn đồng thời. Điều đó vẫn đúng về mặt **khả dụng**. Điểm mới là định nghĩa tool không còn được nạp hết vào context ngay từ đầu. Hệ quả thực tế: mô tả tool và hướng dẫn của server càng quan trọng, vì model dựa vào chúng để **tìm** tool chứ không chỉ để chọn.
:::

## Resource và prompt

**Resource** là dữ liệu chỉ đọc mà server công bố để làm ngữ cảnh: schema cơ sở dữ liệu, danh sách tài liệu, tóm tắt các issue đang mở. Mỗi resource có một URI.

Giá trị lớn nhất của resource là làm **danh mục nội dung**. Thiếu nó, agent phải dò đường bằng tool: liệt kê bảng, mô tả từng bảng, rồi mới viết truy vấn. Có một resource chứa danh mục schema, agent đọc "bản đồ" một lần và đi thẳng tới truy vấn đúng. Ít lời gọi khảo sát hơn nghĩa là nhanh hơn, rẻ hơn và ít chỗ sai hơn.

Trong Claude Code:

- Gõ `@` để thấy resource của các server đang kết nối, và tham chiếu bằng `@server:protocol://đường/dẫn`, ví dụ `@warehouse:schema://orders`. Nội dung được đính kèm vào prompt.
- Model cũng tự liệt kê và đọc resource được qua hai tool có sẵn `ListMcpResourcesTool` và `ReadMcpResourceTool`.

**Prompt** của MCP là mẫu chỉ dẫn do server cung cấp và do **người dùng** chủ động gọi. Trong Claude Code chúng xuất hiện như lệnh, dạng `/mcp__<server>__<prompt>`, có thể kèm tham số.

Phân biệt ba loại bằng câu hỏi "ai kích hoạt": model gọi tool, ứng dụng hoặc người dùng đưa resource vào ngữ cảnh, người dùng gọi prompt.

## Server có sẵn hay tự viết

Với tích hợp phổ biến (GitHub, Jira, Slack, cơ sở dữ liệu thông dụng), hãy **dùng server có sẵn** do nhà cung cấp hoặc cộng đồng duy trì. Chúng đã xử lý xác thực, phân trang và các trường hợp biên mà bạn sẽ mất nhiều công để làm lại.

Tự viết server khi quy trình là của riêng nhóm bạn: hệ thống nội bộ, quy tắc nghiệp vụ riêng, hoặc khi cần gói vài thao tác thành một tool hẹp cho đúng một vai trò.

Dù chọn cách nào, một MCP server là code chạy với quyền của bạn và kết quả của nó đi thẳng vào context của model. Chỉ kết nối server bạn tin, và cẩn trọng với server đọc nội dung từ bên ngoài vì nội dung đó có thể chứa chỉ dẫn cài cắm (prompt injection).

Tài liệu gốc: [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp), [MCP in the Agent SDK](https://code.claude.com/docs/en/agent-sdk/mcp), [Understanding MCP servers](https://modelcontextprotocol.io/docs/learn/server-concepts), [MCP: Resources](https://modelcontextprotocol.io/specification/2025-11-25/server/resources).

## Tóm tắt

- Server MCP cung cấp tool (model gọi), resource (dữ liệu ngữ cảnh) và prompt (người dùng gọi).
- Ba phạm vi: local và user nằm trong `~/.claude.json` và là của riêng bạn; project nằm trong `.mcp.json` và được commit cho cả nhóm.
- Bí mật không nằm trong `.mcp.json`. Dùng `${VAR}` hoặc `${VAR:-default}`.
- Tool được phát hiện khi kết nối, mang tên `mcp__<server>__<tool>`, và cần được cấp quyền.
- Resource làm danh mục nội dung giúp agent bớt lời gọi dò đường.
- Tích hợp phổ biến thì dùng server có sẵn; chỉ tự viết cho quy trình riêng.
