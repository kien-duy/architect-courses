---
title: 5.8 · Quiz Domain 5
description: 10 câu tình huống tổng hợp về quản lý context và độ tin cậy.
sidebar:
  badge:
    text: Quiz
    variant: note
lesson:
  day: 11
  kind: quiz
  minutes: 20
quiz:
  - q: "A developer builds a chatbot directly on the Messages API. To save tokens, each request contains only the system prompt and the latest user message. Users complain that the bot asks for their order number again on every turn. What is the correct fix?"
    options:
      - text: "Add 'remember everything the user tells you' to the system prompt"
        why: "Model không có bộ nhớ giữa các request. Chỉ dẫn này không tạo ra thông tin mà request không gửi."
      - text: "Send the conversation history in every request, since the API keeps no state between calls"
        why: "Messages API không có trạng thái. Model chỉ biết những gì nằm trong request hiện tại, nên lịch sử phải được gửi lại."
      - text: "Lower the temperature so answers are more consistent between turns"
        why: "Temperature ảnh hưởng độ ngẫu nhiên của output, không ảnh hưởng tới việc model có thấy turn trước hay không."
      - text: "Enable prompt caching so earlier turns are stored on the server"
        why: "Prompt caching giảm chi phí cho phần đầu lặp lại của một request. Nó không thay bạn gửi lịch sử, và không phải bộ nhớ hội thoại."
    answer: 1
    keyword: "API **không có trạng thái** → gửi lại lịch sử"
    relearn: "cca/domain-5/01-giu-thong-tin-hoi-thoai-dai#context-window-chứa-những-gì"
    relearnLabel: "5.1 · Context window chứa những gì"
  - q: "A coordinator concatenates the outputs of 14 file-review subagents into one long input and asks a synthesis step for the top risks. The resulting report regularly omits serious findings from reviews 5 through 10. What is the most effective change?"
    options:
      - text: "Ask the synthesis step to 'read every review carefully'"
        why: "Lời dặn chung không thay đổi việc phần giữa của một input dài được xử lý kém tin cậy hơn."
      - text: "Shuffle the order of the reviews on every run"
        why: "Xáo thứ tự chỉ đổi phát hiện nào rơi vào giữa. Vẫn có phát hiện bị bỏ sót, và kết quả không ổn định giữa các lần chạy."
      - text: "Send the reviews as 14 separate messages instead of one"
        why: "Tách message không đổi tổng lượng nội dung và vị trí tương đối của nó trong context."
      - text: "Put a short list of each review's key findings at the top, give every section an explicit heading, and place the question at the end"
        why: "Phần đầu và phần cuối được xử lý đáng tin nhất. Đưa phát hiện chính lên đầu và dùng tiêu đề làm mốc giúp nội dung ở giữa không bị bỏ sót."
    answer: 3
    keyword: "phát hiện chính **ở đầu**, tiêu đề rõ, câu hỏi **ở cuối**"
    relearn: "cca/domain-5/01-giu-thong-tin-hoi-thoai-dai#sắp-xếp-input-theo-vị-trí"
    relearnLabel: "5.1 · Sắp xếp input theo vị trí"
  - q: "A customer asks a support agent to start the warranty from the day they received the product as a gift rather than the purchase date. The warranty policy defines the start as the purchase date and says nothing about gifts. What should the agent do?"
    options:
      - text: "Escalate to a human, stating that the policy does not cover this situation"
        why: "Policy im lặng về trường hợp này. Agent không có căn cứ để tự quyết định, nên chuyển cho người có thẩm quyền kèm mô tả chỗ policy thiếu."
      - text: "Grant the request, since it is reasonable and keeps the customer happy"
        why: "Agent đang tự tạo ra một ngoại lệ mà policy không cho phép. Lần sau nó có thể quyết định khác đi với một khách khác."
      - text: "Refuse, because the policy says purchase date"
        why: "Policy không nói gì về quà tặng. Từ chối cũng là tự diễn giải một chỗ trống, chỉ theo hướng ngược lại."
      - text: "Ask the customer to rate how important this is to them and decide based on the rating"
        why: "Mức độ quan trọng với khách không lấp được chỗ trống của policy."
    answer: 0
    keyword: "policy **không phủ** → escalate, không tự suy diễn"
    relearn: "cca/domain-5/02-escalation-va-yeu-cau-mo-ho#ba-tín-hiệu-escalation-đáng-tin"
    relearnLabel: "5.2 · Ba tín hiệu escalation đáng tin"
  - q: "A support system routes every message with negative sentiment to human agents. The human queue is overloaded with late-delivery complaints that the AI agent could resolve by checking tracking and offering a reshipment. How should the escalation logic change?"
    options:
      - text: "Raise the sentiment threshold so only very angry customers are escalated"
        why: "Vẫn dùng cảm xúc làm tiêu chí. Khách rất giận về một việc dễ vẫn bị chuyển, còn ca khó mà khách điềm tĩnh vẫn bị bỏ sót."
      - text: "Stop escalating altogether and let the agent handle everything"
        why: "Khách yêu cầu gặp người và các ca policy không phủ vẫn cần con người."
      - text: "Have the agent acknowledge the frustration and resolve what is within its scope, escalating when the customer asks for a human or the case falls outside policy"
        why: "Bực bội không phải là yêu cầu gặp người. Việc trong tầm thì agent giải quyết; tín hiệu chuyển là yêu cầu rõ ràng của khách hoặc chỗ trống của policy."
      - text: "Add a second model that double-checks the sentiment score"
        why: "Điểm cảm xúc chính xác hơn vẫn không tương quan với độ khó của ca."
    answer: 2
    keyword: "cảm xúc ≠ độ khó; việc trong tầm → **giải quyết**"
    relearn: "cca/domain-5/02-escalation-va-yeu-cau-mo-ho#escalate-ngay-hay-thử-giải-quyết-trước"
    relearnLabel: "5.2 · Escalate ngay hay thử giải quyết trước"
  - q: "A data-fetching subagent calls an API that occasionally returns HTTP 503. Currently it reports every 503 to the coordinator, which then re-delegates the whole subtask. Runs are slow and the coordinator's context fills with error reports. What is the better design?"
    options:
      - text: "Have the subagent retry forever until the API responds"
        why: "Thử lại không giới hạn có thể treo cả hệ khi API ngừng hẳn, và coordinator không bao giờ được biết để chọn cách khác."
      - text: "Have the subagent return an empty result on 503 so the coordinator can move on"
        why: "Đây là che lỗi: coordinator sẽ hiểu là không có dữ liệu."
      - text: "Have the coordinator call the API directly instead of delegating"
        why: "Dữ liệu thô và mọi lần thử lại sẽ đổ vào context của coordinator, tệ hơn hiện trạng."
      - text: "Have the subagent retry transient errors a small number of times itself, and report to the coordinator only if that fails, with partial results"
        why: "Lỗi tạm thời nên được phục hồi tại chỗ với số lần thử có giới hạn. Coordinator chỉ cần biết những lỗi subagent không tự xử lý được."
    answer: 3
    keyword: "lỗi tạm thời → **phục hồi tại chỗ** có giới hạn, rồi mới báo lên"
    relearn: "cca/domain-5/03-lan-truyen-loi#phục-hồi-tại-chỗ-trước-rồi-mới-báo-lên"
    relearnLabel: "5.3 · Phục hồi tại chỗ trước rồi mới báo lên"
  - q: "A tool returns the error 'invalid date format: expected YYYY-MM-DD'. The agent's error handler waits with exponential backoff and repeats the identical call three times, then gives up. What is wrong with this handling?"
    options:
      - text: "The backoff intervals are too short"
        why: "Chờ lâu hơn không đổi kết quả: cùng một input sai sẽ luôn bị từ chối."
      - text: "This is a validation error, not a transient one; the input must be corrected before calling again"
        why: "Thử lại nguyên trạng chỉ có ý nghĩa với lỗi tạm thời. Lỗi dữ liệu vào cần sửa input (ở đây là định dạng ngày) rồi mới gọi lại."
      - text: "The agent should escalate to a human after the first failure"
        why: "Agent tự sửa được định dạng ngày. Escalate cho một lỗi nằm trong tầm xử lý là lãng phí."
      - text: "Three attempts are too few; it should try ten times"
        why: "Số lần thử không liên quan khi lần nào cũng gửi cùng một input sai."
    answer: 1
    keyword: "lỗi **validation** → sửa input, không thử lại nguyên trạng"
    relearn: "cca/domain-5/03-lan-truyen-loi#bốn-loại-lỗi-và-cách-xử-lý"
    relearnLabel: "5.3 · Bốn loại lỗi và cách xử lý"
  - q: "A developer spends a day having Claude Code map how a legacy billing system works. The next morning they want to continue with implementation, but the old session is huge and full of exploratory tool output. Which practice lets them continue efficiently?"
    options:
      - text: "Having had the agent record key findings in a scratchpad file during the investigation, then starting a fresh session that reads it"
        why: "Scratchpad nằm trên đĩa nên sống qua ranh giới phiên. Phiên mới bắt đầu với context sạch và vẫn có đủ phát hiện chính."
      - text: "Resuming the old session and asking the agent to recall everything from the start"
        why: "Phiên cũ mang theo toàn bộ output khảo sát. Context đầy làm câu trả lời kém chính xác, và các kết quả tool cũ có thể đã lỗi thời."
      - text: "Starting a fresh session and repeating the investigation"
        why: "Cách này cho context sạch nhưng tốn lại cả một ngày khảo sát, và lần hai có thể cho kết luận khác."
      - text: "Pasting the entire old transcript into the first prompt of a new session"
        why: "Việc này đưa lại đúng lượng nội dung thừa mà bạn đang muốn tránh."
    answer: 0
    keyword: "**scratchpad** giữ phát hiện qua ranh giới context"
    relearn: "cca/domain-5/04-khao-sat-codebase-lon#scratchpad-file"
    relearnLabel: "5.4 · Scratchpad file"
  - q: "In phase 1, three subagents map the modules of a monolith. In phase 2, the coordinator spawns subagents to draft a migration plan for each module. The plans ignore dependencies that phase 1 clearly identified. What is the cause and the fix?"
    options:
      - text: "Phase 2 subagents used a smaller model; switch them to a larger one"
        why: "Model lớn hơn cũng không biết được phát hiện mà nó chưa từng nhận."
      - text: "Phase 2 subagents should be given tools to message the phase 1 subagents"
        why: "Subagent pha 1 đã kết thúc. Và trao đổi trực tiếp giữa subagent bỏ qua coordinator, nơi lẽ ra nắm toàn cảnh."
      - text: "Phase 2 subagents start with fresh context; the coordinator must summarize the key phase 1 findings into each delegation prompt"
        why: "Subagent không thấy kết quả của pha trước. Agent chính phải tóm tắt phát hiện chính và đưa vào prompt giao việc trước khi tạo subagent pha sau."
      - text: "Phase 1 results were compacted away; disable compaction"
        why: "Đề bài không nói coordinator mất kết quả. Vấn đề là kết quả không được chuyển sang subagent pha 2."
    answer: 2
    keyword: "**tóm tắt phát hiện** trước khi tạo subagent pha sau"
    relearn: "cca/domain-5/04-khao-sat-codebase-lon#giao-việc-khảo-sát-cho-subagent"
    relearnLabel: "5.4 · Giao việc khảo sát cho subagent"
  - q: "An invoice shows a total of 4,200 in the header and 4,620 in the footer. The extraction model returns `total: 4620` with confidence 0.97, and the pipeline auto-approves anything above 0.95. What should the pipeline design do with this document?"
    options:
      - text: "Auto-approve it, since the confidence is above the calibrated threshold"
        why: "Model có thể rất tự tin khi chọn một trong hai con số. Điểm cao không giải quyết được việc nguồn tự mâu thuẫn."
      - text: "Route it to human review because the source itself is ambiguous, regardless of the confidence score"
        why: "Nguồn mơ hồ hoặc tự mâu thuẫn là lý do chuyển cho người, độc lập với điểm tin cậy. Pipeline cần phát hiện và gắn cờ trường hợp này."
      - text: "Take the larger value, because totals usually include tax"
        why: "Đây là đoán theo heuristic về một con số tài chính."
      - text: "Lower the confidence of every invoice from this vendor"
        why: "Vấn đề nằm ở một tài liệu có hai giá trị, không phải ở mức tin cậy chung của nhà cung cấp."
    answer: 1
    keyword: "nguồn **mơ hồ** → người duyệt, dù điểm cao"
    relearn: "cca/domain-5/05-giam-sat-va-do-tin-cay#định-tuyến-sang-người-duyệt"
    relearnLabel: "5.5 · Định tuyến sang người duyệt"
  - q: "A research system produces an executive report in uniform, confident prose. Some statements rest on several consistent sources; others rest on a single source or on figures that sources dispute. Executives treat all of it as settled. How should the report be restructured?"
    options:
      - text: "Add a disclaimer at the top saying some statements may be uncertain"
        why: "Cảnh báo chung không cho biết câu nào chắc và câu nào chưa. Người đọc vẫn không phân biệt được."
      - text: "Remove every statement that is not supported by at least three sources"
        why: "Bỏ đi làm mất thông tin có giá trị, kể cả việc các nguồn đang bất đồng."
      - text: "Append the full list of sources at the end"
        why: "Danh sách nguồn không cho biết mức độ căn cứ của từng nhận định."
      - text: "Separate well-established findings from contested ones, keeping the conflicting values and their sources visible in the contested section"
        why: "Cấu trúc báo cáo cần phản ánh mức độ căn cứ: phần đã vững, phần còn tranh cãi kèm các giá trị và nguồn, và phần chưa có dữ liệu."
    answer: 3
    keyword: "tách **có căn cứ vững** khỏi **còn tranh cãi**"
    relearn: "cca/domain-5/06-nguon-goc-du-lieu#tách-phần-chắc-chắn-khỏi-phần-còn-tranh-cãi"
    relearnLabel: "5.6 · Tách phần chắc chắn khỏi phần còn tranh cãi"
---

Mười câu hỏi dưới đây trộn kiến thức của cả sáu bài trong Domain 5. Mỗi câu đặt bạn vào một tình huống và hỏi quyết định đúng, giống cách đề thật ra đề.

Bạn nên hoàn thành các bài 5.1 đến 5.6 và [lab](../07-lab/) trước. Cần đúng từ **7/10** để tích hoàn thành. Sau khi nộp, lời giải cho từng phương án hiện ra, kèm nút **← Học lại** mở đúng đoạn bài học trong ngăn trượt.
