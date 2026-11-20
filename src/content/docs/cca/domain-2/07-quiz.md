---
title: 2.7 · Quiz Domain 2
description: 10 câu tình huống tổng hợp về thiết kế tool và tích hợp MCP.
sidebar:
  badge:
    text: Quiz
    variant: note
lesson:
  day: 5
  kind: quiz
  minutes: 20
quiz:
  - q: "A platform team connects a `codegraph` MCP server to Claude Code. Its `find_references` tool resolves symbol references across all 40 company repositories. Logs show Claude almost always uses plain text search in the current repository instead, and misses callers in other repositories. The tool's description is 'Finds references.' What should the team change first?"
    options:
      - text: "Remove the built-in search tools from every session"
        why: "Gỡ tool tìm kiếm văn bản làm hỏng mọi tác vụ khác cần nó. Vấn đề là model không biết khi nào tool MCP tốt hơn."
      - text: "Rename the server from `codegraph` to `search`"
        why: "Tên server không cho model biết tool làm được gì khác so với tìm kiếm văn bản."
      - text: "Expand the description to say what the tool provides that text search cannot: symbol-aware references across all repositories, and when to prefer it"
        why: "Model có xu hướng dùng tool có sẵn quen thuộc. Mô tả phải nêu giá trị riêng của tool MCP (dữ liệu nào chỉ nó có, khi nào nên dùng) thì model mới có lý do chọn nó."
      - text: "Set `alwaysLoad` to `false` for the server"
        why: "Trì hoãn nạp định nghĩa tool chỉ làm tool khó được tìm thấy hơn. Nó không cải thiện mô tả."
    answer: 2
    keyword: "tool MCP bị bỏ qua → mô tả phải nêu **giá trị riêng** so với tool có sẵn"
    relearn: "cca/domain-2/01-mo-ta-tool#system-prompt-cũng-ảnh-hưởng-tới-việc-chọn-tool"
    relearnLabel: "2.1 · System prompt cũng ảnh hưởng tới việc chọn tool"
  - q: "A scheduling assistant has one tool, `manage_calendar`, with a `mode` parameter and nine optional parameters. Depending on `mode` it creates an event, finds free slots, or exports a monthly report. The model frequently sends parameter combinations that are invalid for the chosen mode. Which redesign addresses the cause?"
    options:
      - text: "Split it into `create_event`, `find_free_slots` and `export_calendar_report`, each with only its own required parameters and a clear output"
        why: "Ba việc này không liên quan và có input, output khác hẳn nhau. Tách thành tool chuyên biệt cho mỗi tool một hợp đồng rõ ràng, nên không còn tổ hợp tham số vô nghĩa."
      - text: "Make all nine parameters required"
        why: "Bắt buộc mọi tham số buộc model bịa giá trị cho những tham số không liên quan tới việc đang làm."
      - text: "Add 'Be careful with parameters' to the description"
        why: "Lời nhắc chung chung không cho model biết tổ hợp nào hợp lệ với `mode` nào."
      - text: "Force the tool with `tool_choice`"
        why: "Ép gọi tool đảm bảo tool được gọi, không đảm bảo tham số hợp lệ."
    answer: 0
    keyword: "tool đa năng, input và output khác nhau → **tách** thành tool chuyên biệt"
    relearn: "cca/domain-2/01-mo-ta-tool#tool-chồng-lấn-và-cách-tách"
    relearnLabel: "2.1 · Tool chồng lấn và cách tách"
  - q: "An MCP tool `check_stock` calls a warehouse API, which answers with HTTP 503 during a brief overload. What should the tool return?"
    options:
      - text: "A JSON-RPC protocol error with code -32602"
        why: "Lỗi giao thức dành cho request sai hoặc tool không tồn tại. Request ở đây hợp lệ; thứ hỏng là dịch vụ phía sau."
      - text: "`isError: false` with a stock level of 0"
        why: "Báo tồn kho bằng 0 là bịa dữ liệu. Agent sẽ nói với khách rằng hết hàng."
      - text: "`isError: true` with category business and `isRetryable: false`"
        why: "Quá tải tạm thời không phải vi phạm quy tắc nghiệp vụ. Đánh dấu không thử lại được khiến agent bỏ cuộc trước một lỗi sẽ tự hết."
      - text: "`isError: true` with category transient, `isRetryable: true`, and a message saying the warehouse API was temporarily unavailable"
        why: "503 do quá tải là lỗi tạm thời. Kết quả tool có `isError: true`, phân loại transient và cờ thử lại cho agent biết gọi lại là hành động đúng."
    answer: 3
    keyword: "503, timeout → **transient**, thử lại được"
    relearn: "cca/domain-2/02-loi-co-cau-truc#bốn-nhóm-lỗi"
    relearnLabel: "2.2 · Bốn nhóm lỗi"
  - q: "A developer writes a custom tool with the Agent SDK. Inside the handler, a downstream API call sometimes raises an exception that the handler does not catch. The developer assumes this will crash the agent loop. What actually happens, and what is the better practice?"
    options:
      - text: "The loop stops with an error result; wrap the whole `query()` call in a retry"
        why: "Exception trong handler không làm dừng vòng lặp. Chạy lại cả truy vấn là không cần thiết."
      - text: "The loop continues and Claude sees the raw exception message; catching the error and returning an error result with a composed message gives Claude more to act on"
        why: "SDK bắt exception và chuyển thông điệp thô thành kết quả lỗi cho model. Tự bắt lỗi rồi trả `is_error` (Python) hoặc `isError` (TypeScript) cho phép thêm ngữ cảnh: request nào hỏng, nên thử gì tiếp."
      - text: "The exception is silently dropped and Claude receives an empty successful result"
        why: "SDK không biến lỗi thành kết quả rỗng thành công. Model nhận được thông điệp của exception."
      - text: "The tool is removed from the session for the rest of the run"
        why: "Một lần lỗi không gỡ tool khỏi phiên. Model có thể gọi lại nó."
    answer: 1
    keyword: "exception không bắt → model thấy thông điệp **thô**; tự trả `is_error` để thêm ngữ cảnh"
    relearn: "cca/domain-2/02-loi-co-cau-truc#iserror-và-is_error"
    relearnLabel: "2.2 · isError và is_error"
  - q: "A document-intake pipeline built on the Messages API must always run `classify_document` before anything else; afterwards the model may use any of five other tools as it sees fit. The model supports forced tool use. How should `tool_choice` be configured?"
    options:
      - text: "Force `classify_document` on the first request, then use `auto` on the following requests"
        why: "Ép một tool cụ thể đảm bảo bước đầu tiên. `tool_choice` chỉ áp dụng cho request mang nó, nên các request sau trở về `auto` để model tự chọn."
      - text: "Use `any` on every request"
        why: "`any` đảm bảo có lời gọi tool nhưng không đảm bảo tool nào được gọi đầu tiên, và ép gọi tool cả khi model đã xong việc."
      - text: "Use `auto` and write 'always classify first' in the system prompt"
        why: "Chỉ dẫn trong prompt là xác suất. Yêu cầu 'luôn luôn' cần cơ chế đảm bảo."
      - text: "Force `classify_document` on every request"
        why: "Ép cùng một tool ở mọi request làm model không bao giờ dùng được năm tool còn lại và không bao giờ kết thúc bằng câu trả lời."
    answer: 0
    keyword: "đảm bảo **bước đầu** → ép tool ở request đầu, sau đó `auto`"
    relearn: "cca/domain-2/03-chia-tool-va-tool-choice#bốn-giá-trị-của-tool_choice"
    relearnLabel: "2.3 · Bốn giá trị của tool_choice"
  - q: "In a research system, the synthesis agent was given `web_search` 'just in case'. It now runs its own searches mid-synthesis, and final reports contain claims that contradict the vetted findings handed over by the coordinator. What is the best fix?"
    options:
      - text: "Tell the synthesis agent in its prompt to search only when absolutely necessary"
        why: "Chỉ dẫn này vẫn để tool trong tay agent và để nó tự định nghĩa 'cần thiết'. Hành vi sẽ giảm nhưng không hết."
      - text: "Give the synthesis agent more search tools so its searches are more accurate"
        why: "Thêm tool ngoài vai trò làm vấn đề nặng hơn: agent càng có nhiều cách để bỏ qua dữ liệu được giao."
      - text: "Lower the synthesis agent's `max_turns`"
        why: "Giới hạn turn không ngăn agent dùng một trong các turn đó để tìm kiếm."
      - text: "Remove `web_search` from the synthesis agent's tools; if it needs to check a fact, give it a narrowly scoped verification tool or route the request through the coordinator"
        why: "Agent có tool ngoài chuyên môn sẽ dùng sai nó. Bộ tool nên giới hạn theo vai trò, cộng một tiện ích hẹp nếu thật sự cần."
    answer: 3
    keyword: "tool ngoài vai trò → bị dùng sai; **giới hạn theo vai trò**"
    relearn: "cca/domain-2/03-chia-tool-va-tool-choice#chia-tool-theo-vai-trò"
    relearnLabel: "2.3 · Chia tool theo vai trò"
  - q: "A developer clones a repository that contains a `.mcp.json` and runs `claude mcp list`. The server from that file is shown as pending approval instead of connected. Why?"
    options:
      - text: "`.mcp.json` is only read when it is placed in the home directory"
        why: "`.mcp.json` thuộc phạm vi project và nằm ở gốc dự án. Cấu hình trong thư mục home là `~/.claude.json`."
      - text: "Project-scoped servers come from a file anyone can commit, so Claude Code asks the user to approve them in an interactive session before using them"
        why: "File `.mcp.json` có thể đến từ một repo vừa clone và khai báo lệnh sẽ chạy trên máy bạn. Claude Code yêu cầu duyệt trước khi dùng server phạm vi project."
      - text: "The server must first be added again with `--scope user`"
        why: "Thêm lại ở phạm vi user tạo một cấu hình cá nhân khác. Server phạm vi project chỉ cần được duyệt."
      - text: "MCP servers cannot be shared through version control"
        why: "Chia sẻ qua version control chính là mục đích của phạm vi project."
    answer: 1
    keyword: "server từ `.mcp.json` cần **duyệt** trước khi dùng"
    relearn: "cca/domain-2/04-cau-hinh-mcp#ba-phạm-vi-cấu-hình"
    relearnLabel: "2.4 · Ba phạm vi cấu hình"
  - q: "A project's `.mcp.json` contains `\"Authorization\": \"Bearer ${DOCS_API_KEY}\"`. It works for the whole team except a new hire, whose server fails to authenticate; `claude mcp list` shows a missing-variable warning for that server. What is the cause?"
    options:
      - text: "`${...}` expansion is not supported inside `headers`"
        why: "Biến môi trường được thay trong `command`, `args`, `env`, `url` và `headers`. Cả nhóm đang dùng được chính là bằng chứng."
      - text: "The new hire must copy the real key into `.mcp.json` and commit it"
        why: "Ghi bí mật vào file được commit là điều cơ chế biến môi trường sinh ra để tránh."
      - text: "`DOCS_API_KEY` is not set in the new hire's environment, so the reference stays unexpanded and the server receives an invalid token"
        why: "Biến chưa đặt và không có giá trị mặc định không làm hỏng việc nạp file: Claude Code cảnh báo và dùng nguyên chuỗi `${DOCS_API_KEY}`. Server từ chối token đó. Cách sửa là đặt biến trong môi trường của người mới."
      - text: "Project-scoped servers only work for the person who created the file"
        why: "Phạm vi project dành cho mọi người clone repo."
    answer: 2
    keyword: "`${VAR}` chưa đặt → cảnh báo, chuỗi **không được thay**"
    relearn: "cca/domain-2/04-cau-hinh-mcp#file-mcpjson-và-biến-môi-trường"
    relearnLabel: "2.4 · File .mcp.json và biến môi trường"
  - q: "Before reviewing infrastructure code, an agent needs the list of every Terraform file under `infra/`, at any depth. Which tool call fits?"
    options:
      - text: "`Grep` with the pattern `terraform`"
        why: "Grep tìm trong nội dung. Nó trả về mọi file có chữ 'terraform' bên trong, kể cả tài liệu, và bỏ sót file `.tf` không chứa chữ đó."
      - text: "`Read` on the `infra/` directory"
        why: "Read đọc file, không đọc thư mục."
      - text: "`Edit` with an empty `old_string`"
        why: "Edit thay chuỗi trong một file đã biết. Nó không liệt kê file."
      - text: "`Glob` with the pattern `infra/**/*.tf`"
        why: "Câu hỏi là về tên và vị trí file. Glob khớp theo mẫu đường dẫn, và `**` khớp thư mục ở mọi độ sâu."
    answer: 3
    keyword: "tìm file theo **tên, phần mở rộng** → Glob"
    relearn: "cca/domain-2/05-tool-co-san#grep-và-glob"
    relearnLabel: "2.5 · Grep và Glob"
  - q: "An agent must change one constant in a 900-line module. It uses `Write` with a regenerated copy of the whole file, and the new file is missing a helper function that existed before. Which tool should it have used?"
    options:
      - text: "`Write`, but with a higher `max_tokens`"
        why: "Giới hạn token không phải nguyên nhân. Viết lại cả file cho một thay đổi nhỏ luôn có rủi ro làm rơi nội dung."
      - text: "`Edit`, replacing the exact line that defines the constant"
        why: "Edit chỉ chạm vào đoạn `old_string` được chỉ định, phần còn lại của file giữ nguyên. Write ghi đè toàn bộ file bằng nội dung model sinh ra."
      - text: "`Bash` with `rm` followed by `Write`"
        why: "Xóa file trước khi ghi không thay đổi gì: nội dung mới vẫn là bản model tự sinh lại."
      - text: "`Glob` to locate the constant"
        why: "Glob tìm file theo tên. Nó không sửa file và không tìm trong nội dung."
    answer: 1
    keyword: "sửa nhỏ trong file có sẵn → **Edit**; Write ghi đè cả file"
    relearn: "cca/domain-2/05-tool-co-san#read-write-edit"
    relearnLabel: "2.5 · Read Write Edit"
---

Mười câu hỏi dưới đây trộn kiến thức của cả năm bài trong Domain 2. Mỗi câu đặt bạn vào một tình huống và hỏi quyết định đúng, giống cách đề thật ra đề.

Bạn nên hoàn thành các bài 2.1 đến 2.5 và [lab](../06-lab/) trước. Cần đúng từ **7/10** để tích hoàn thành. Sau khi nộp, lời giải cho từng phương án hiện ra, kèm nút **← Học lại** mở đúng đoạn bài học trong ngăn trượt.
