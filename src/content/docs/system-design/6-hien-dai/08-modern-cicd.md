---
title: "CI/CD và chiến lược deploy"
description: "CI tích hợp và test liên tục; continuous delivery giữ code luôn deploy được; continuous deployment tự đưa mọi thay đổi đạt kiểm tra lên production."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 8
quiz:
  - q: "Đội dùng rolling update và muốn đổi tên một cột database. Vì sao không nên đổi tên cột trong cùng lần deploy với code mới?"
    options: ["Rolling update không hỗ trợ migration", "Trong lúc rollout, bản cũ vẫn chạy và sẽ lỗi khi cột cũ biến mất; rollback cũng bị phá", "Database không cho phép đổi tên cột", "Đổi tên cột luôn làm mất dữ liệu"]
    answer: 1
    why: "Rolling update để hai phiên bản cùng phục vụ trên một database. Thay đổi phá vỡ schema cần tách thành expand/contract để cả hai bản và rollback đều an toàn."
  - q: "Cần rollback gần như tức thời cho một hệ thống thanh toán và chấp nhận tốn thêm tài nguyên trong lúc chuyển. Chiến lược phù hợp nhất?"
    options: ["Recreate", "Shadow traffic", "Rolling update", "Blue-green"]
    answer: 3
    why: "Blue-green giữ nguyên môi trường cũ; rollback chỉ là chuyển traffic lại. Đổi lại cần gấp đôi tài nguyên khi chuyển và dữ liệu dùng chung vẫn phải tương thích."
  - q: "Điểm khác biệt chính giữa feature flag và canary là gì?"
    options: ["Feature flag tách release khỏi deploy, bật tính năng theo người dùng mà không deploy lại; canary chia traffic giữa hai phiên bản code đang chạy", "Feature flag luôn cần gấp đôi server", "Canary không cho phép rollback", "Hai cách giống hệt nhau, chỉ khác tên gọi"]
    answer: 0
    why: "Canary thử phiên bản binary mới trên một phần traffic; feature flag dùng cùng code và bật tắt hành vi bằng cấu hình, nên tắt được trong vài giây."
cards:
  - q: "Continuous delivery khác continuous deployment ở điểm nào?"
    a: "Continuous delivery giữ mọi bản build luôn sẵn sàng deploy nhưng con người quyết định lên production. Continuous deployment tự đưa lên production mọi thay đổi qua hết kiểm tra."
  - q: "Nguyên tắc 'build một lần, deploy nhiều nơi' nghĩa là gì?"
    a: "Cùng một artifact bất biến đi qua staging rồi production, chỉ khác cấu hình môi trường. Không build lại cho từng môi trường để tránh sai khác."
  - q: "Nhược điểm chính của chiến lược recreate?"
    a: "Có downtime vì tắt hết bản cũ trước khi bật bản mới, và rollback phải deploy lại."
  - q: "Rolling update đòi hỏi điều gì từ ứng dụng?"
    a: "Bản cũ và bản mới phải tương thích với nhau (API, schema, định dạng message) vì chúng cùng phục vụ trong lúc rollout. Cần health check để biết bản mới đã sẵn sàng."
  - q: "Canary cần hạ tầng gì?"
    a: "Khả năng chia traffic theo tỉ lệ (load balancer, Ingress hoặc service mesh) và metric so sánh được giữa nhóm bản mới và bản cũ để quyết định tiến hay lùi."
  - q: "Shadow traffic cần cẩn thận điều gì?"
    a: "Bản shadow nhận bản sao request thật nên không được tạo tác dụng phụ thật như gửi email, trừ tiền hay ghi trùng dữ liệu."
  - q: "Rủi ro dài hạn của feature flag?"
    a: "Code nhiều nhánh rẽ, số tổ hợp cần test tăng, và nợ kỹ thuật nếu không dọn cờ cũ. Hệ thống quản lý cờ thành một phụ thuộc quan trọng."
  - q: "Expand/contract là gì?"
    a: "Tách thay đổi schema phá vỡ thành các bước tương thích: thêm cấu trúc mới, ghi cả hai, backfill, chuyển đọc sang mới, rồi mới xoá cấu trúc cũ."
  - q: "Vì sao rollback code không phải lúc nào cũng an toàn?"
    a: "Nếu bản mới đã đổi schema hoặc ghi dữ liệu theo dạng mới, bản cũ quay lại có thể không đọc được dữ liệu đó."
---

:::tip[Ý chính]
- CI tích hợp và test liên tục; continuous delivery giữ code luôn deploy được; continuous deployment tự đưa mọi thay đổi đạt kiểm tra lên production.
- Recreate, rolling, blue-green, canary, feature flag và shadow đánh đổi giữa downtime, tài nguyên, tốc độ rollback và phạm vi ảnh hưởng khi lỗi.
- Rollback an toàn đòi hỏi thay đổi database tương thích ngược, thường theo mô hình expand/contract qua nhiều lần deploy.
:::

Phần lớn sự cố production không đến từ phần cứng hỏng mà đến từ chính thay đổi do con người đưa vào: một bản code mới, một cấu hình sai, một migration database. Deploy làm tay, vài tuần một lần thì mỗi lần gom rất nhiều thay đổi, rủi ro cao và khó tìm ra cái gì gây lỗi.

CI/CD biến việc đưa code lên production thành quy trình tự động, lặp lại được và nhỏ giọt. Chiến lược deploy quyết định bản mới thay bản cũ ra sao để khi lỗi thì ít người bị ảnh hưởng và lùi lại nhanh. Bài này đi qua cả hai, cùng vấn đề khó nhất: thay đổi database mà không phá hệ thống.

## CI, continuous delivery và continuous deployment

Ba khái niệm hay bị dùng lẫn:

- **Continuous Integration (CI)**: tích hợp code vào nhánh chính thường xuyên (hằng ngày hoặc nhiều lần mỗi ngày); mỗi lần push, hệ thống tự build và chạy test để phát hiện lỗi sớm khi thay đổi còn nhỏ.
- **Continuous Delivery**: mở rộng CI sao cho nhánh chính **luôn ở trạng thái deploy được**. Mỗi bản build đi qua pipeline tới mức sẵn sàng production, nhưng việc bấm nút deploy production vẫn do con người quyết định.
- **Continuous Deployment**: bỏ luôn bước bấm nút. Mọi thay đổi qua hết các kiểm tra tự động sẽ tự lên production.

Continuous deployment đòi hỏi test đáng tin, giám sát tốt và rollback tự động; thiếu chúng thì chỉ là đưa lỗi lên nhanh hơn. Nhiều tổ chức dừng ở continuous delivery, nhất là khi cần phê duyệt hoặc tuân thủ.

## Pipeline điển hình

Sơ đồ dưới đây minh hoạ vị trí của CI/CD trong vòng đời phát triển phần mềm:



<figure class="ccf-figure"><a href="../../guides/cicd-pipeline-explained-in-simple-terms/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0140-ci-cd-pipeline.png" alt="CI/CD Pipeline Explained in Simple Terms" loading="lazy" /><figcaption><strong>CI/CD Pipeline Explained in Simple Terms</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



Một pipeline thường gồm các giai đoạn sau, giai đoạn nào lỗi thì dừng:

1. **Build**: biên dịch, cài dependency, chạy lint và kiểm tra tĩnh.
2. **Test**: unit test (nhanh, nhiều), integration test (với database, service phụ thuộc), đôi khi end-to-end test (chậm, ít), quét bảo mật.
3. **Artifact**: đóng gói thành thứ bất biến, ví dụ container image gắn tag theo commit (xem [Container và Kubernetes](../../6-hien-dai/07-modern-containers/)), đẩy lên registry. Nguyên tắc: **build một lần, deploy nhiều nơi**; cùng artifact đi qua staging rồi production, chỉ khác cấu hình.
4. **Deploy**: lên staging, chạy smoke test, rồi lên production theo một chiến lược bên dưới.
5. **Verify**: theo dõi metric sau deploy (tỉ lệ lỗi, latency); nếu xấu đi thì dừng hoặc rollback. Bước này cần [observability](../../6-hien-dai/09-modern-observability/) tốt.

Pipeline phải nhanh: nếu mất hàng giờ, người ta sẽ gom thay đổi lại và mất lợi ích của CI.

## Các chiến lược deploy

Sơ đồ dưới đây minh hoạ một số chiến lược deploy trên Kubernetes:



<figure class="ccf-figure"><a href="../../guides/kubernetes-deployment-strategies/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0247-kubernates-deployment-strategy.jpeg" alt="Kubernetes Deployment Strategies" loading="lazy" /><figcaption><strong>Kubernetes Deployment Strategies</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



### Recreate
Tắt toàn bộ bản cũ rồi bật bản mới. Đơn giản, không có hai phiên bản cùng chạy, nhưng có **downtime**. Hợp với môi trường nội bộ hoặc khi hai phiên bản không thể cùng tồn tại.

### Rolling update
Thay dần từng nhóm instance: bật vài bản mới, khi chúng qua health check thì tắt vài bản cũ, lặp lại. Không downtime, không cần gấp đôi tài nguyên, và là mặc định của Deployment trong Kubernetes. Nhược điểm: trong lúc rollout có **hai phiên bản cùng phục vụ**, nên chúng phải tương thích với nhau (API, schema, định dạng message); rollback cũng là một lần rolling khác, không tức thời.

### Blue-green
Duy trì hai môi trường giống hệt: blue đang phục vụ, green chạy bản mới. Kiểm tra green xong thì chuyển toàn bộ traffic sang (đổi cấu hình [load balancer](../../2-khoi-xay-dung/01-load-balancer/) hoặc DNS). Rollback gần như tức thời: chuyển lại về blue. Đổi lại cần **gấp đôi tài nguyên** trong lúc chuyển, và phần dữ liệu dùng chung (database) vẫn là bài toán riêng. Nếu chuyển bằng [DNS](../../1-nen-tang/06-dns/), TTL và cache phía client làm việc chuyển không tức thời.

### Canary
Đưa bản mới cho một phần nhỏ traffic (ví dụ vài phần trăm), so sánh metric với bản cũ, rồi tăng dần nếu ổn. Lỗi chỉ ảnh hưởng một nhóm nhỏ người dùng, và bạn kiểm chứng bằng traffic thật. Đổi lại cần hạ tầng chia traffic theo tỉ lệ (load balancer, Ingress hoặc service mesh), metric so sánh được giữa hai nhóm, và rollout kéo dài hơn. Phân tích metric và quyết định tiến lùi có thể được tự động hoá.

### Feature flag
Tách **deploy** (đưa code lên) khỏi **release** (bật tính năng). Code mới đã nằm trên production nhưng bị cờ cấu hình tắt; bật dần cho nội bộ, một phần trăm người dùng, rồi tất cả. Tắt cờ là "rollback" tính năng trong vài giây, không cần deploy lại. Cái giá: code có thêm nhánh rẽ, số tổ hợp cờ cần test tăng, và **nợ kỹ thuật** nếu không dọn cờ cũ. Hệ thống quản lý cờ cũng trở thành một phụ thuộc quan trọng.

### Dark launch và shadow traffic
Bản mới nhận **bản sao** traffic thật (mirroring) nhưng kết quả bị bỏ đi; người dùng chỉ nhận phản hồi từ bản cũ. Dùng để kiểm tra hiệu năng và độ đúng dưới tải thật. Cẩn thận tác dụng phụ: bản shadow không được gửi email, trừ tiền hay ghi vào dữ liệu thật hai lần (xem [Idempotency](../../6-hien-dai/06-modern-idempotency/)). Chi phí: gấp đôi tải cho phần được nhân bản.

### So sánh

| Chiến lược | Downtime | Tài nguyên thêm | Tốc độ rollback | Hai phiên bản cùng chạy | Ảnh hưởng khi có lỗi | Độ phức tạp |
|---|---|---|---|---|---|---|
| Recreate | Có | Không | Chậm (deploy lại) | Không | Tất cả người dùng | Thấp |
| Rolling | Không | Ít | Trung bình | Có | Tăng dần theo rollout | Thấp |
| Blue-green | Không | Gấp đôi khi chuyển | Rất nhanh | Ngắn | Tất cả, nhưng lùi ngay | Trung bình |
| Canary | Không | Ít | Nhanh | Có, kéo dài | Nhóm nhỏ | Cao |
| Feature flag | Không | Không | Rất nhanh (tắt cờ) | Cùng code, hai hành vi | Nhóm được bật cờ | Trung bình, tăng theo số cờ |
| Shadow | Không | Gấp đôi phần nhân bản | Không cần (chưa phục vụ thật) | Có | Không ảnh hưởng người dùng | Cao |

Các chiến lược này kết hợp được: rolling hoặc canary để deploy, feature flag để release, shadow trước khi chuyển hệ thống lớn.

## Rollback và database

Rollback code thường dễ: chạy lại artifact cũ. Cái khó là **dữ liệu**: nếu bản mới đổi schema rồi ghi dữ liệu theo dạng mới, bản cũ quay lại có thể không đọc được. Trong rolling hay canary, hai bản còn cùng đọc ghi một database, nên schema phải phục vụ được cả hai.

Giải pháp phổ biến là **expand/contract** (còn gọi là parallel change), tách một thay đổi phá vỡ thành nhiều bước tương thích ngược. Ví dụ đổi tên cột `name` thành `full_name`:

1. **Expand**: thêm cột `full_name` (cho phép null). Code cũ không bị ảnh hưởng.
2. Deploy code ghi **cả hai cột**, đọc từ cột cũ.
3. **Backfill**: chép dữ liệu cũ sang cột mới theo từng lô, tránh khoá bảng lâu.
4. Deploy code đọc từ `full_name` (vẫn ghi cả hai để còn đường lùi).
5. Deploy code chỉ dùng `full_name`.
6. **Contract**: khi chắc không còn cần lùi, xoá cột `name`.

Ở mọi thời điểm, bản đang chạy và bản ngay trước nó đều làm việc được với schema hiện tại, nên rollback một bước luôn an toàn. Đổi lại là nhiều lần deploy và kỷ luật dọn dẹp. Nguyên tắc tương tự áp dụng cho API và định dạng message: thêm trường mới thì dễ, xoá hay đổi nghĩa trường cũ thì phải qua nhiều bước (xem [Thiết kế API](../../6-hien-dai/01-modern-api/)). Migration trên bảng lớn có thể khoá bảng; cách xử lý tuỳ hệ quản trị (xem [SQL](../../2-khoi-xay-dung/04-sql/)).

## Khi nào dùng gì

- Hệ thống nhỏ, chấp nhận gián đoạn ngắn: recreate hoặc rolling.
- Service stateless trên Kubernetes: rolling mặc định, thêm canary cho service quan trọng.
- Cần rollback tức thời và có ngân sách tài nguyên: blue-green.
- Tính năng rủi ro về sản phẩm, muốn bật dần hoặc tắt nhanh: feature flag.
- Viết lại hệ thống: shadow trước, rồi canary.

## Trong phỏng vấn

- Thêm một câu về vận hành: "deploy bằng canary, tự rollback theo tỉ lệ lỗi; đổi schema theo expand/contract". Nó cho thấy bạn nghĩ tới [availability](../../3-he-phan-tan/03-availability/) cả khi thay đổi, không chỉ khi phần cứng hỏng.
- Câu hỏi hay gặp: continuous delivery khác continuous deployment; blue-green khác canary; đổi tên cột không downtime; nhược điểm của feature flag; vì sao rollback không luôn an toàn.

## Đọc thêm

- [Continuous Delivery (Martin Fowler)](https://martinfowler.com/bliki/ContinuousDelivery.html)
- [Feature Toggles (martinfowler.com)](https://martinfowler.com/articles/feature-toggles.html)
- [Parallel Change (Martin Fowler)](https://martinfowler.com/bliki/ParallelChange.html)
- [Canarying Releases (Google SRE Workbook)](https://sre.google/workbook/canarying-releases/)
