---
title: 1.8 · Quiz Domain 1
description: 10 câu tình huống tổng hợp về kiến trúc agent và điều phối.
sidebar:
  badge:
    text: Quiz
    variant: note
lesson:
  day: 3
  kind: quiz
  minutes: 20
quiz:
  - q: "A developer's agent loop exits whenever the response contains a text block. Users report that the agent sometimes stops after saying 'Let me look that up' without ever returning an answer. What is the correct fix?"
    options:
      - text: "Instruct the model never to write text before calling a tool"
        why: "Model được phép giải thích trước khi gọi tool, và chỉ dẫn này không đáng tin. Lỗi nằm ở điều kiện dừng của code."
      - text: "Continue the loop while `stop_reason` is `tool_use`, and stop only when it is not"
        why: "Một phản hồi có thể chứa cả text lẫn `tool_use`. `stop_reason` là tín hiệu đúng: `tool_use` nghĩa là model còn chờ kết quả tool."
      - text: "Add a retry so the same prompt is sent again when the answer looks incomplete"
        why: "Gửi lại prompt không sửa điều kiện dừng sai, và 'trông chưa xong' lại là đoán từ text."
      - text: "Increase `max_tokens` so the model can finish its answer in one response"
        why: "Model dừng để chờ kết quả tool, không phải vì hết token."
    answer: 1
    keyword: "text + `tool_use` cùng lúc → dùng `stop_reason`"
    relearn: "cca/domain-1/01-agentic-loop#ba-cách-dừng-vòng-lặp-sai"
    relearnLabel: "1.1 · Ba cách dừng vòng lặp sai"
  - q: "An agent's response has `stop_reason: \"max_tokens\"` and ends mid-sentence. How should the application treat it?"
    options:
      - text: "As a truncated response: raise the limit or let the model continue, rather than presenting it as complete"
        why: "`max_tokens` nghĩa là output bị cắt do chạm giới hạn. Coi nó là hoàn chỉnh sẽ đưa cho người dùng một câu trả lời dở dang."
      - text: "As a completed turn, identical to `end_turn`"
        why: "`end_turn` nghĩa là model tự kết thúc lượt. `max_tokens` nghĩa là nó bị cắt ngang."
      - text: "As a request to execute tools"
        why: "Chỉ `tool_use` mới báo model đang chờ kết quả tool."
      - text: "As a refusal that should be escalated to a human"
        why: "Từ chối có giá trị riêng là `refusal`."
    answer: 0
    keyword: "`max_tokens` = bị cắt, chưa xong"
    relearn: "cca/domain-1/01-agentic-loop#stop_reason-quyết-định-bước-tiếp-theo"
    relearnLabel: "1.1 · stop_reason quyết định bước tiếp theo"
  - q: "A team sets `max_turns=3` on an agent that typically needs three tool-calling turns before answering. Runs now end without a final answer. Why?"
    options:
      - text: "The SDK counts each tool call as two turns"
        why: "Mỗi turn có lời gọi tool tính là một turn, không phải hai."
      - text: "`max_turns` applies only to subagents"
        why: "`max_turns` trên options áp dụng cho vòng lặp chính."
      - text: "The agent ran out of budget before running out of turns"
        why: "Đề bài không đặt ngân sách. Kết thúc do ngân sách sẽ cho `error_max_budget_usd`."
      - text: "The final text-only response also needs a turn, so the limit is reached first and the run ends with `error_max_turns`"
        why: "Số turn gồm các turn có lời gọi tool cộng một turn cho câu trả lời cuối. Ba turn tool cần giới hạn ít nhất là 4."
    answer: 3
    keyword: "đếm turn = turn có tool + **1** turn trả lời cuối"
    relearn: "cca/domain-1/02-kiem-soat-vong-lap#giới-hạn-số-turn-và-chi-phí"
    relearnLabel: "1.2 · Giới hạn số turn và chi phí"
  - q: "In a research system, the web-search subagent and the document-analysis subagent need each other's findings. A developer proposes letting them message each other directly to save coordinator turns. What is the main drawback?"
    options:
      - text: "Subagents cannot run at the same time"
        why: "Subagent chạy song song được. Đó không phải vấn đề của đề xuất này."
      - text: "It bypasses the coordinator, which loses the single place for observing progress, handling errors, and controlling what information flows where"
        why: "Trong hub-and-spoke, mọi trao đổi đi qua coordinator để có một điểm quan sát, xử lý lỗi và kiểm soát luồng thông tin nhất quán."
      - text: "Subagents always use a smaller model than the coordinator"
        why: "Model của subagent là tùy chọn cấu hình, và không liên quan tới việc giao tiếp trực tiếp."
      - text: "The coordinator's context window would grow faster"
        why: "Ngược lại, giao tiếp trực tiếp làm coordinator thấy ít hơn. Vấn đề là mất khả năng quan sát và kiểm soát."
    answer: 1
    keyword: "hub-and-spoke: mọi thứ **qua coordinator**"
    relearn: "cca/domain-1/03-coordinator-subagent#mô-hình-hub-and-spoke"
    relearnLabel: "1.3 · Mô hình hub-and-spoke"
  - q: "A coordinator delegates synthesis to a subagent. The final report contains claims with no sources, although the search subagent had returned URLs for every finding. What is the most likely cause?"
    options:
      - text: "The synthesis subagent lacked a web search tool"
        why: "Subagent tổng hợp không cần tìm lại. Nó cần nhận các URL đã có."
      - text: "The synthesis subagent's model was too small to keep citations"
        why: "Model không thể trích dẫn nguồn mà nó chưa bao giờ nhận được."
      - text: "The coordinator passed only summarized findings in the delegation prompt, dropping the source URLs the subagent needed"
        why: "Subagent chỉ biết những gì nằm trong prompt giao việc. Nếu coordinator chỉ chuyển bản tóm tắt, thông tin nguồn mất ngay tại bước chuyển giao."
      - text: "Subagents cannot return structured output"
        why: "Subagent trả về được kết quả có cấu trúc trong báo cáo cuối."
    answer: 2
    keyword: "subagent chỉ biết **prompt giao việc** → nguồn phải đi kèm"
    relearn: "cca/domain-1/03-coordinator-subagent#subagent-nhận-được-gì"
    relearnLabel: "1.3 · Subagent nhận được gì"
  - q: "A coordinator has four subagents but frequently picks the general `research-assistant` for tasks meant for `patent-searcher`. Which change addresses the cause most directly?"
    options:
      - text: "Rewrite each subagent's `description` so it states precisely when that subagent should be used"
        why: "Coordinator chọn subagent dựa trên tác vụ và `description`. Mô tả cụ thể, phân biệt rõ là cách sửa trực tiếp nhất."
      - text: "Give `patent-searcher` more tools so it looks more capable"
        why: "Số lượng tool không phải là thứ coordinator dùng để chọn subagent."
      - text: "Lower `max_turns` on `research-assistant`"
        why: "Giới hạn turn ảnh hưởng tới thời gian chạy sau khi đã được chọn, không ảnh hưởng tới việc chọn."
      - text: "Switch the coordinator to `bypassPermissions`"
        why: "Permission mode quyết định lời gọi tool có cần duyệt hay không, không quyết định subagent nào được chọn."
    answer: 0
    keyword: "chọn sai subagent → sửa `description`"
    relearn: "cca/domain-1/03-coordinator-subagent#agentdefinition"
    relearnLabel: "1.3 · AgentDefinition"
  - q: "A developer asks an agent to 'add tests to a legacy billing module'. Nobody knows how the module is structured or which functions are untested. Which approach fits best?"
    options:
      - text: "A fixed three-step pipeline: generate tests, run tests, fix failures"
        why: "Pipeline cố định giả định biết trước các bước. Ở đây chưa biết module có gì nên chưa thể chốt bước."
      - text: "One prompt containing the whole module and the instruction 'write all tests'"
        why: "Nhồi tất cả vào một lượt cho kết quả không đều và không thích nghi được với điều phát hiện giữa chừng."
      - text: "Spawn one subagent per file immediately, before looking at the module"
        why: "Chia việc trước khi hiểu cấu trúc dễ dẫn tới phạm vi chồng lấn hoặc bỏ sót phụ thuộc giữa các file."
      - text: "Dynamic decomposition: explore the module first, identify the gaps, then plan and adjust as dependencies are discovered"
        why: "Các bước phụ thuộc vào thứ sẽ phát hiện khi khảo sát, nên cần phân rã động: khảo sát, lập kế hoạch, làm, điều chỉnh."
    answer: 3
    keyword: "chưa biết phạm vi → **khảo sát trước**, phân rã động"
    relearn: "cca/domain-1/04-phan-ra-nhiem-vu#hai-chiến-lược-phân-rã"
    relearnLabel: "1.4 · Hai chiến lược phân rã"
  - q: "Compliance requires that an agent can never issue a refund above $500 without human approval. Which implementation meets the requirement?"
    options:
      - text: "A system prompt rule stating the $500 limit, written in capital letters"
        why: "Chỉ dẫn trong prompt là xác suất. 'Không bao giờ' là yêu cầu xác định."
      - text: "Three few-shot examples of the agent escalating large refunds"
        why: "Few-shot tăng xác suất làm đúng nhưng không đảm bảo tuyệt đối."
      - text: "A `PreToolUse` hook on the refund tool that denies calls above $500 and tells the model to escalate"
        why: "Hook chạy trước khi tool thực thi và chặn một cách xác định. Lý do trả về hướng model sang bước chuyển cho nhân viên."
      - text: "A `PostToolUse` hook that logs refunds above $500 for later review"
        why: "`PostToolUse` chạy sau khi tool đã thực thi: khoản hoàn tiền đã được thực hiện rồi."
    answer: 2
    keyword: "**never** + tiền → `PreToolUse` deny"
    relearn: "cca/domain-1/05-hooks#pretooluse-chặn-và-sửa-lời-gọi"
    relearnLabel: "1.5 · PreToolUse: chặn và sửa lời gọi"
  - q: "A `PreToolUse` hook with matcher `Write|Edit` blocks changes to `.env`. A security review finds the agent still modified `.env`. What is the most likely explanation?"
    options:
      - text: "Hooks do not run in headless mode"
        why: "Hook chạy cả trong chế độ không tương tác."
      - text: "The agent wrote the file through a `Bash` command, which the matcher does not cover"
        why: "Hook chỉ chạy cho tool mà matcher khớp. Ghi file bằng lệnh shell đi qua tool `Bash`, không qua `Write` hay `Edit`."
      - text: "`deny` decisions are only advisory"
        why: "`deny` chặn lời gọi tool một cách xác định."
      - text: "The hook ran after the tool instead of before it"
        why: "`PreToolUse` luôn chạy trước khi tool thực thi."
    answer: 1
    keyword: "hook chỉ phủ tool mà **matcher** khớp"
    relearn: "cca/domain-1/05-hooks#pretooluse-chặn-và-sửa-lời-gọi"
    relearnLabel: "1.5 · PreToolUse: chặn và sửa lời gọi"
  - q: "After an agent finishes a long codebase exploration, you want to compare two different refactoring strategies, each building on that exploration, without one polluting the other. What should you do?"
    options:
      - text: "Fork the session twice and run one strategy in each fork"
        why: "Fork tạo phiên mới từ bản sao lịch sử và giữ nguyên bản gốc. Hai nhánh dùng chung phần khảo sát nhưng độc lập với nhau."
      - text: "Resume the same session twice, once per strategy"
        why: "Resume nối thêm vào cùng một phiên. Chiến lược thứ hai sẽ thấy toàn bộ công việc của chiến lược thứ nhất."
      - text: "Start two fresh sessions and repeat the exploration in each"
        why: "Cách này độc lập nhưng lãng phí: phải khảo sát lại hai lần, và hai lần khảo sát có thể cho kết luận khác nhau."
      - text: "Use `continue` so both strategies share the latest state"
        why: "`continue` cũng nối thêm vào phiên gần nhất, nên hai chiến lược trộn vào nhau."
    answer: 0
    keyword: "thử nhiều hướng từ **cùng một điểm** → fork"
    relearn: "cca/domain-1/06-session#continue-resume-và-fork"
    relearnLabel: "1.6 · Continue, resume và fork"
---

Mười câu hỏi dưới đây trộn kiến thức của cả sáu bài trong Domain 1. Mỗi câu đặt bạn vào một tình huống và hỏi quyết định đúng, giống cách đề thật ra đề.

Bạn nên hoàn thành các bài 1.1 đến 1.6 và [lab](../07-lab/) trước. Cần đúng từ **7/10** để tích hoàn thành. Sau khi nộp, lời giải cho từng phương án hiện ra, kèm nút **← Học lại** mở đúng đoạn bài học trong ngăn trượt.
