---
title: 2.5 · Chọn tool có sẵn
description: Read, Write, Edit, Bash, Grep, Glob làm gì, khi nào dùng tool nào, và cách khảo sát một codebase lớn từng bước.
lesson:
  day: 5
  minutes: 12
quiz:
  - q: "An agent must find every place in a large repository where the function `calculateShippingFee` is called. Which built-in tool is the right first step?"
    options:
      - text: "`Grep` with the function name as the pattern"
        why: "Đúng. Tên hàm nằm **trong nội dung** file. Grep tìm theo nội dung và trả về file cùng dòng khớp, nên đây là điểm bắt đầu đúng."
      - text: "`Glob` with the pattern `**/*calculateShippingFee*`"
        why: "Glob khớp theo **tên và đường dẫn** file. Nó chỉ tìm ra file có chuỗi này trong tên, không tìm được nơi hàm được gọi."
      - text: "`Read` on every file under `src/`"
        why: "Đọc toàn bộ file tốn rất nhiều context cho một việc mà một lần tìm theo nội dung làm được."
      - text: "`Edit` with the function name as `old_string`"
        why: "Edit dùng để thay chuỗi trong một file đã biết. Nó không phải tool tìm kiếm."
    answer: 0
    keyword: "tìm **trong nội dung** → Grep; tìm theo **tên file** → Glob"
    relearn: "#grep-và-glob"
    relearnLabel: "Grep và Glob"
  - q: "An agent calls `Edit` to change `timeout = 30` to `timeout = 60` in a config file. The call fails because `timeout = 30` appears four times in the file, and only the occurrence in the `[upload]` section should change. What should the agent do next?"
    options:
      - text: "Retry the same `Edit` call until it succeeds"
        why: "Lời gọi y nguyên sẽ thất bại y nguyên: chuỗi vẫn xuất hiện bốn lần."
      - text: "Set `replace_all: true`"
        why: "`replace_all` thay cả bốn chỗ, trong khi chỉ được sửa một chỗ."
      - text: "Use `Bash` to delete the file and recreate it from memory"
        why: "Xóa rồi viết lại từ trí nhớ dễ làm mất nội dung khác trong file, và không cần thiết."
      - text: "Retry `Edit` with a longer `old_string` that includes enough surrounding text, such as the `[upload]` header line, to match exactly one place"
        why: "Đúng. Edit yêu cầu `old_string` khớp đúng một chỗ. Thêm ngữ cảnh xung quanh làm chuỗi trở nên duy nhất, và chỉ chỗ cần sửa bị thay."
    answer: 3
    keyword: "Edit khớp không duy nhất → **thêm ngữ cảnh** vào `old_string`"
    relearn: "#khi-edit-thất-bại"
    relearnLabel: "Khi Edit thất bại"
  - q: "A developer asks an agent how refunds flow through an unfamiliar 2,000-file codebase. Which investigation strategy uses context most effectively?"
    options:
      - text: "Read every file in the repository first, then answer"
        why: "Đọc hết 2.000 file làm đầy context bằng nội dung không liên quan trước khi bắt đầu trả lời được."
      - text: "Grep for the entry point (for example the refund handler), Read the files found, then Grep for the functions they call and follow the chain"
        why: "Đúng. Tìm điểm vào bằng Grep, đọc đúng file đó, rồi lần theo từng lời gọi. Context chỉ chứa những file nằm trên đường đi của luồng xử lý."
      - text: "Glob for `**/*.ts` and Read the 100 most recently modified files"
        why: "File sửa gần đây không liên quan gì tới luồng hoàn tiền. Đây là chọn file theo một tiêu chí không dính tới câu hỏi."
      - text: "Ask the model to answer from the file names alone"
        why: "Tên file gợi ý được vị trí nhưng không cho biết luồng xử lý. Câu trả lời sẽ là phỏng đoán."
    answer: 1
    keyword: "khảo sát tăng dần: **Grep** điểm vào → **Read** → Grep tiếp"
    relearn: "#khảo-sát-codebase-từng-bước"
    relearnLabel: "Khảo sát codebase từng bước"
---

Claude Code đi kèm một bộ tool có sẵn để đọc, tìm, sửa file và chạy lệnh. Sáu tool trong bài này là thứ đề thi hỏi: mỗi tool làm gì, và với một việc cụ thể thì chọn tool nào.

## Sáu tool cốt lõi

| Tool | Làm gì | Cần xin quyền |
|---|---|:-:|
| `Read` | Đọc nội dung một file | Không |
| `Write` | Tạo file mới hoặc **ghi đè toàn bộ** file | Có |
| `Edit` | Thay một đoạn chuỗi cụ thể trong file | Có |
| `Glob` | Tìm file theo mẫu **tên và đường dẫn** | Không |
| `Grep` | Tìm theo mẫu trong **nội dung** file | Không |
| `Bash` | Chạy lệnh shell | Có |

Cột "cần xin quyền" áp dụng cho đường dẫn bên trong thư mục làm việc. Tool chỉ đọc không cần hỏi; tool thay đổi file hoặc chạy lệnh thì cần, trừ khi đã được tự duyệt (xem [bài 2.3](../03-chia-tool-va-tool-choice/#hai-lớp-kiểm-soát-tồn-tại-và-được-duyệt)). `Bash` có một nhóm lệnh chỉ đọc được chạy không cần hỏi.

Tên tool trong bảng là chuỗi chính xác dùng trong luật permission, trường `tools` của subagent và matcher của hook.

## Grep và Glob

Hai tool tìm kiếm trả lời hai câu hỏi khác nhau. Nhầm chúng là lỗi phổ biến nhất.

| | `Glob` | `Grep` |
|---|---|---|
| Tìm theo | Tên và đường dẫn file | Nội dung bên trong file |
| Câu hỏi mẫu | "Có những file test nào?" | "Hàm này được gọi ở đâu?" |
| Mẫu | `**/*.test.tsx`, `src/**/*.ts`, `*.{json,yaml}` | Biểu thức chính quy: tên hàm, thông báo lỗi, câu `import` |
| Trả về | Danh sách đường dẫn | File khớp, dòng khớp, hoặc số lần khớp |

Chi tiết hữu ích về `Grep`:

- Mặc định chỉ trả **đường dẫn** các file có khớp. Có thêm chế độ trả dòng khớp kèm số dòng, và chế độ đếm.
- Dùng cú pháp regex của ripgrep. Ký tự đặc biệt phải được escape: tìm `interface{}` trong code Go cần mẫu `interface\{\}`.
- Thu hẹp phạm vi được bằng mẫu file (`**/*.tsx`) hoặc loại ngôn ngữ.
- Bỏ qua file bị `.gitignore` loại trừ.

Chi tiết hữu ích về `Glob`:

- `**` khớp thư mục ở mọi độ sâu.
- Kết quả xếp theo thời gian sửa và giới hạn 100 file. Chạm giới hạn thì thu hẹp mẫu.
- Mặc định **không** tôn trọng `.gitignore`, khác với `Grep`.

:::note[Trên macOS và Linux, Grep và Glob có thể vắng mặt]
Theo tài liệu hiện hành, trên macOS, Linux và WSL bộ tool mặc định của Claude Code **không có** `Glob` và `Grep`. Model tìm kiếm bằng lệnh `find` và `grep` qua tool `Bash`. Hai tool xuất hiện trở lại khi bạn nêu tên chúng trong `--tools` hoặc `--allowedTools`, khi `Bash` bị gỡ khỏi phiên, hoặc khi một subagent liệt kê chúng trong `tools` mà không có `Bash`. Đề thi được viết khi cả hai luôn có mặt, và hỏi về **phân biệt chức năng**: Grep tìm trong nội dung, Glob tìm theo tên. Phân biệt đó đúng với cả `grep` và `find`.
:::

## Read Write Edit

**`Read`** nhận đường dẫn và trả nội dung kèm số dòng. File lớn được đọc từng phần bằng `offset` và `limit`. Read cũng đọc được ảnh, PDF và Jupyter notebook. Nó chỉ đọc file, không liệt kê thư mục.

**`Write`** ghi **toàn bộ** nội dung bạn đưa vào file: tạo mới nếu chưa có, ghi đè nếu đã có. Nó không nối thêm và không trộn. Dùng Write cho file mới hoặc khi viết lại cả file.

**`Edit`** thay chính xác một chuỗi bằng chuỗi khác. Nó nhận `old_string` và `new_string`, không dùng regex, không khớp gần đúng. Ba điều kiện phải thỏa:

| Điều kiện | Ý nghĩa |
|---|---|
| Đã đọc file | File phải được đọc trong hội thoại hiện tại trước khi sửa. Model đời mới được nới điều kiện này trong một số trường hợp |
| Khớp chính xác | `old_string` phải xuất hiện trong file đúng từng ký tự, kể cả khoảng trắng và thụt lề |
| Khớp duy nhất | `old_string` phải xuất hiện đúng **một** lần, trừ khi đặt `replace_all: true` |

Chọn giữa Write và Edit:

| Việc | Tool |
|---|---|
| Tạo file mới | `Write` |
| Sửa vài dòng trong file hiện có | `Edit` |
| Đổi tên một biến ở mọi chỗ trong một file | `Edit` với `replace_all: true` |
| Viết lại gần như toàn bộ file | `Read` rồi `Write` |

Edit an toàn hơn Write cho thay đổi nhỏ vì nó chỉ chạm vào đoạn được chỉ định. Write cho một thay đổi nhỏ buộc model sinh lại cả file và có thể vô tình làm rơi nội dung.

## Khi Edit thất bại

Hai nguyên nhân thường gặp và cách xử lý:

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| Không tìm thấy `old_string` | Sai khoảng trắng, thụt lề, hoặc file đã đổi từ lần đọc trước | `Read` lại file, lấy đúng chuỗi hiện tại |
| `old_string` khớp nhiều chỗ | Chuỗi quá ngắn hoặc lặp lại | Thêm ngữ cảnh xung quanh cho tới khi chỉ khớp một chỗ; hoặc `replace_all: true` nếu thật sự muốn thay hết |

Khi không tạo được một chuỗi khớp duy nhất, ví dụ file có nhiều khối giống hệt nhau, phương án dự phòng là **`Read` toàn bộ file rồi `Write`** lại bản đã sửa.

:::note[Đáp án trong đề thi]
Hướng dẫn thi nêu phương án dự phòng "Read rồi Write" cho trường hợp Edit thất bại vì khớp không duy nhất. Tài liệu hiện hành mô tả thêm hai cách nhẹ hơn nên thử trước: kéo dài `old_string` và `replace_all`. Nếu câu hỏi chỉ đưa ra "Read + Write" làm lựa chọn hợp lý, đó là đáp án. Nếu có lựa chọn "thêm ngữ cảnh để khớp duy nhất" và yêu cầu chỉ sửa một chỗ, lựa chọn đó chính xác hơn.
:::

## Bash

`Bash` chạy lệnh shell: `git`, trình quản lý gói, chạy test, build, script của dự án. Mỗi lệnh chạy trong một tiến trình riêng:

- Thư mục làm việc sau `cd` được giữ cho lệnh sau, miễn là còn nằm trong thư mục dự án.
- Biến môi trường **không** được giữ. `export` ở lệnh này không có hiệu lực ở lệnh sau.

Nguyên tắc chọn: **có tool chuyên dụng thì dùng tool chuyên dụng**. Đọc file bằng `Read` thay vì `cat`, sửa bằng `Edit` thay vì `sed`. Tool chuyên dụng cho kết quả có cấu trúc, đi qua đúng luật permission của từng loại thao tác, và dễ kiểm soát bằng hook hơn một chuỗi lệnh tùy ý. Dùng `Bash` cho những việc không tool nào khác làm được: chạy test, xem lịch sử git, cài phụ thuộc.

Vì `Bash` làm được gần như mọi thứ, đây là tool cần cân nhắc nhất khi chia tool cho subagent. Một subagent "chỉ đọc" mà vẫn có `Bash` thì không còn là chỉ đọc.

## Khảo sát codebase từng bước

Với một codebase lớn, đọc hết rồi mới trả lời là cách nhanh nhất để làm đầy context bằng nội dung vô ích. Cách đúng là xây hiểu biết tăng dần:

1. **`Grep` tìm điểm vào:** định nghĩa hàm, tên route, thông báo lỗi người dùng nhìn thấy.
2. **`Read` file tìm được**, chỉ những file đó.
3. **`Grep` tiếp** các tên vừa gặp: hàm được gọi, module được import, nơi sử dụng.
4. **`Read` các file tiêu thụ**, rồi lặp lại cho tới khi đủ để trả lời.

`Glob` bổ trợ khi câu hỏi là về cấu trúc: có những file cấu hình nào, test nằm ở đâu.

Một tình huống hay gặp là **module bọc** (wrapper). Hàm `sendEmail` được định nghĩa trong `mailer/core.ts`, được xuất lại qua `mailer/index.ts`, và phần còn lại của code chỉ import từ `mailer`. Grep theo tên file gốc sẽ bỏ sót gần hết nơi sử dụng. Cách lần đúng:

```text
Grep "sendEmail"            → thấy định nghĩa trong core.ts và dòng export trong index.ts
Grep "from './mailer'"      → thấy các file import qua module bọc
Read các file đó            → xác nhận nơi thực sự gọi sendEmail
```

Nếu module bọc đổi tên khi xuất lại (`export { sendEmail as notify }`), phải Grep thêm tên mới. Luôn lần theo cả tên gốc lẫn tên được xuất lại.

Khi phạm vi khảo sát lớn, giao nó cho một subagent chỉ đọc để các bước trung gian không chiếm context của phiên chính. Chủ đề này được bàn kỹ ở Domain 5.

Tài liệu gốc: [Tools reference](https://code.claude.com/docs/en/tools-reference), [Configure permissions](https://code.claude.com/docs/en/permissions).

## Tóm tắt

- `Grep` tìm trong nội dung file. `Glob` tìm theo tên và đường dẫn file.
- `Read` đọc, `Write` ghi đè toàn bộ, `Edit` thay một chuỗi khớp chính xác và duy nhất.
- Edit khớp nhiều chỗ: thêm ngữ cảnh vào `old_string`, hoặc `replace_all`, hoặc dự phòng bằng Read rồi Write.
- `Bash` dành cho việc không có tool chuyên dụng. Biến môi trường không giữ giữa các lệnh.
- Khảo sát tăng dần: Grep điểm vào, Read, Grep tiếp, lần qua cả module bọc.
