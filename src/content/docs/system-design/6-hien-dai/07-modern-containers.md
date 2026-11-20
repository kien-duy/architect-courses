---
title: "Container, Kubernetes và vận hành microservices"
description: "Container đóng gói ứng dụng thành image bất biến, nhẹ hơn VM vì dùng chung kernel của host nhưng cách ly yếu hơn."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 8
quiz:
  - q: "Một nền tảng cho phép nhiều khách hàng không tin cậy nhau chạy code tuỳ ý. Vì sao chỉ dùng container thông thường có thể chưa đủ?"
    options: ["Container không giới hạn được CPU và bộ nhớ", "Các container dùng chung kernel của host nên ranh giới cách ly yếu hơn VM", "Container không có địa chỉ mạng riêng", "Image không thể lưu trên registry riêng"]
    answer: 1
    why: "Container cách ly bằng namespace và cgroup trên cùng một kernel; lỗ hổng kernel có thể phá vỡ cách ly. VM có kernel riêng nên ranh giới mạnh hơn."
  - q: "Một service đã bật HPA theo CPU, nhưng khi tải tăng thì latency vẫn tăng dù số Pod tăng gấp ba. Nguyên nhân khả dĩ nhất?"
    options: ["Nút thắt nằm ở database dùng chung phía sau, thêm Pod không giúp", "HPA chỉ hoạt động với service có trạng thái", "Kubernetes không cân bằng tải giữa các Pod", "Pod mới luôn dùng image cũ"]
    answer: 0
    why: "HPA chỉ thêm bản của tầng stateless. Nếu database hoặc phụ thuộc phía sau là nút thắt, thêm Pod thậm chí còn tăng áp lực lên nó."
  - q: "Đội có 4 service, 3 kỹ sư, chưa ai vận hành Kubernetes. Lựa chọn hợp lý nhất?"
    options: ["Tự dựng cluster Kubernetes kèm service mesh để sẵn sàng scale", "Chạy mỗi service trên một VM riêng không có load balancer", "Dùng PaaS hoặc dịch vụ container managed, để nền tảng lo chạy và scale", "Gộp tất cả vào một container duy nhất chạy trên laptop"]
    answer: 2
    why: "Với quy mô nhỏ, chi phí vận hành Kubernetes và mesh vượt lợi ích; nền tảng managed cho phần lớn lợi ích của container mà ít việc vận hành."
cards:
  - q: "Khác biệt cốt lõi giữa container và VM?"
    a: "VM giả lập phần cứng và chạy OS khách với kernel riêng. Container là tiến trình được cách ly bằng namespace và cgroup, dùng chung kernel host nên nhẹ và khởi động nhanh hơn."
  - q: "Image và container quan hệ thế nào?"
    a: "Image là bản đóng gói bất biến, xây theo lớp. Container là một tiến trình đang chạy từ image, giống quan hệ giữa class và object."
  - q: "Vì sao nên gắn tag image theo commit hash thay vì `latest` trên production?"
    a: "Tag bất biến cho biết chính xác phiên bản đang chạy, giúp tái hiện lỗi và rollback về đúng bản trước."
  - q: "Reconciliation loop trong Kubernetes là gì?"
    a: "Controller liên tục so sánh trạng thái thực tế với trạng thái mong muốn đã khai báo và hành động để kéo chúng về khớp nhau, ví dụ tạo lại Pod bị chết."
  - q: "Vì sao không nên gọi trực tiếp IP của Pod?"
    a: "Pod là ephemeral, có thể bị xoá và tạo lại với IP mới bất cứ lúc nào. Hãy gọi qua Service, có tên DNS và địa chỉ ổn định."
  - q: "Ingress dùng để làm gì?"
    a: "Là cổng HTTP từ ngoài vào cluster, định tuyến theo host và path tới các Service, thường kèm kết thúc TLS. Cần Ingress controller để hoạt động."
  - q: "Liveness và readiness probe khác nhau ra sao?"
    a: "Liveness kiểm tra container còn sống không, hỏng thì khởi động lại. Readiness kiểm tra đã sẵn sàng nhận traffic chưa, chưa thì tạm rút khỏi Service."
  - q: "Sidecar trong service mesh là gì?"
    a: "Một proxy chạy cạnh ứng dụng trong cùng Pod, chặn mọi traffic ra vào để áp dụng mTLS, retry, timeout và thu metric mà không sửa code."
  - q: "Cái giá của service mesh?"
    a: "Thêm một hop proxy mỗi cuộc gọi (latency, CPU, bộ nhớ), thêm hệ thống phức tạp phải vận hành, gỡ lỗi khó hơn, và nguy cơ retry chồng retry."
---

:::tip[Ý chính]
- Container đóng gói ứng dụng thành image bất biến, nhẹ hơn VM vì dùng chung kernel của host nhưng cách ly yếu hơn.
- Kubernetes lo scheduling, self-healing, scaling và service discovery theo mô hình khai báo, qua các khái niệm Pod, Deployment, Service, Ingress, HPA.
- Kubernetes và service mesh có chi phí vận hành thật; hệ thống nhỏ thường chạy tốt hơn với PaaS, serverless hoặc vài VM.
:::

Khi hệ thống tách thành hàng chục service (xem phần microservices trong bài [Tầng ứng dụng](../../2-khoi-xay-dung/03-application-layer/)), câu hỏi không còn là "viết service thế nào" mà là "chạy chúng ở đâu, bằng cách nào, và ai lo khi một máy chết lúc 3 giờ sáng". Mỗi service có runtime, thư viện và cấu hình riêng; cài tay lên từng server dẫn đến tình trạng "chạy trên máy tôi thì được".

Container đóng gói ứng dụng thành một đơn vị nhất quán; hệ thống điều phối (orchestrator) như Kubernetes tự quyết định chạy nó ở đâu, bao nhiêu bản, và tự sửa khi có sự cố. Bài này đi qua các khái niệm ở mức đủ để thiết kế và thảo luận.

## Container khác máy ảo (VM) thế nào

**Máy ảo (VM)** giả lập cả một máy tính: hypervisor chia phần cứng, mỗi VM chạy một hệ điều hành khách đầy đủ với kernel riêng. Cách ly mạnh, nhưng tốn bộ nhớ cho cả OS và khởi động chậm hơn.

**Container** không giả lập phần cứng. Các container trên một máy **dùng chung kernel của host**; kernel cách ly chúng bằng namespace (mỗi container thấy tiến trình, mạng, filesystem riêng) và cgroup (giới hạn CPU, bộ nhớ). Vì vậy container nhẹ, khởi động nhanh, và một máy chạy được nhiều container hơn hẳn số VM.

| Tiêu chí | Máy ảo (VM) | Container |
|---|---|---|
| Cách ly | Mạnh (kernel riêng) | Yếu hơn (chung kernel) |
| Kích thước | Thường hàng GB | Thường hàng chục đến hàng trăm MB |
| Khởi động | Chậm hơn (boot OS) | Nhanh (chỉ khởi một tiến trình) |
| Mật độ trên một máy | Thấp hơn | Cao hơn |

Hai thứ thường đi cùng nhau: cloud cấp VM, bạn chạy container bên trong. Khi phải chạy code của các khách hàng không tin cậy nhau, chung kernel là rủi ro cần cân nhắc (xem [Bảo mật](../../2-khoi-xay-dung/08-security/)).

## Image và registry

**Image** là bản đóng gói bất biến (immutable) gồm ứng dụng, thư viện và filesystem cần để chạy, xây theo từng **lớp (layer)**: OS nền, runtime, dependency, code. Lớp giống nhau được cache và dùng lại. **Container** là tiến trình đang chạy từ image, giống quan hệ class và object.

**Registry** là kho lưu image. Luồng điển hình: CI build image, gắn **tag** (thường theo commit hash), push lên registry; máy chạy pull về và khởi động. Định dạng image đã được chuẩn hoá bởi Open Container Initiative (OCI), nên image thường chạy được trên nhiều runtime. Sơ đồ dưới đây minh hoạ kiến trúc Docker và luồng build, pull, run:



<figure class="ccf-figure"><a href="../../guides/how-does-docker-work/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0414-how-does-docker-work.png" alt="How does Docker work?" loading="lazy" /><figcaption><strong>How does Docker work?</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



Nguyên tắc thực tế: image nhỏ (ít lỗ hổng, tải nhanh); không nhúng secret vào image; production dùng tag bất biến thay vì `latest` để biết chính xác đang chạy gì và rollback được.

## Kubernetes giải quyết vấn đề gì

Có container rồi, vẫn còn câu hỏi: chạy trên máy nào? Máy chết thì sao? Tải tăng gấp ba thì sao? Service A tìm service B ở đâu khi B liên tục đổi IP? Kubernetes (k8s) là orchestrator phổ biến nhất cho các câu hỏi này.

Ý tưởng cốt lõi là **mô hình khai báo (declarative)**: bạn mô tả trạng thái mong muốn ("chạy 5 bản image `api:v42`, mỗi bản 0.5 CPU"), các controller liên tục so sánh thực tế với mong muốn và hành động để kéo về khớp nhau (reconciliation loop).

- **Scheduling**: chọn node (máy) đặt container theo tài nguyên yêu cầu và ràng buộc.
- **Self-healing**: container crash thì khởi động lại; node chết thì tạo lại bản ở node khác; bản không qua health check thì không nhận traffic.
- **Scaling**: tăng giảm số bản thủ công hoặc tự động.
- **Service discovery và load balancing**: một tên ổn định cho một nhóm bản thay đổi liên tục.
- **Rolling update và rollback** (xem [CI/CD và chiến lược deploy](../../6-hien-dai/08-modern-cicd/)).

Sơ đồ dưới đây minh hoạ các thành phần của một cluster (control plane và node):



<figure class="ccf-figure"><a href="../../guides/what-is-k8s-kubernetes/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0245-k8s.png" alt="What is Kubernetes (k8s)?" loading="lazy" /><figcaption><strong>What is Kubernetes (k8s)?</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



## Các khái niệm chính

### Pod
Đơn vị nhỏ nhất được lên lịch: một hoặc vài container chạy cùng nhau, chung IP. Pod là **ephemeral** (dùng xong bỏ): có thể bị xoá và tạo lại với IP mới bất cứ lúc nào, nên đừng hard-code địa chỉ Pod.

### Deployment
Khai báo "image nào, bao nhiêu bản" và đảm bảo luôn có đúng số bản đó; khi đổi image thì rolling update và giữ lịch sử để rollback. Deployment hợp với service **stateless**; database cần cơ chế khác (StatefulSet) và khó vận hành hơn nhiều.

### Service
Địa chỉ ổn định (tên DNS nội bộ, IP ảo) đại diện cho nhóm Pod chọn theo nhãn (label), chia traffic giữa các Pod khoẻ. Đây là service discovery kết hợp [load balancer](../../2-khoi-xay-dung/01-load-balancer/) nội bộ. Service có vài kiểu lộ ra ngoài ở mức khác nhau, như sơ đồ dưới đây minh hoạ:



<figure class="ccf-figure"><a href="../../guides/top-4-kubernetes-service-types-in-one-diagram/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0005-4-k8s-service-types.png" alt="Top 4 Kubernetes Service Types" loading="lazy" /><figcaption><strong>Top 4 Kubernetes Service Types</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



### Ingress
Cổng HTTP từ ngoài vào cluster: định tuyến theo host và path tới các Service, thường kèm kết thúc TLS, giống một [reverse proxy](../../2-khoi-xay-dung/02-reverse-proxy/) cấu hình bằng khai báo. Cần một Ingress controller mới hoạt động. Gateway API là API mới hơn, giàu tính năng hơn cho cùng mục đích.

### HPA (Horizontal Pod Autoscaler)
Tự tăng giảm số Pod theo metric, phổ biến là CPU trung bình hoặc metric tuỳ chỉnh như request mỗi giây. HPA chỉ hiệu quả khi service stateless và nút thắt không nằm ở database phía sau. Cluster hết chỗ thì cần thêm cơ chế tự thêm node.

Để self-healing và rolling update đúng, ứng dụng phải khai báo **health check** (liveness: còn sống không; readiness: sẵn sàng nhận traffic chưa) và **resource request/limit**.

## Khi nào KHÔNG cần Kubernetes

Kubernetes có chi phí vận hành thật: nhiều khái niệm, YAML dài, mạng phức tạp, nâng cấp và bảo mật cluster, và cần người hiểu nó khi sự cố. Cân nhắc lựa chọn đơn giản hơn khi:

- Chỉ có vài service hoặc một monolith, đội nhỏ không có người chuyên vận hành.
- PaaS hoặc dịch vụ container managed đã đủ: đưa image, nền tảng lo chạy và scale.
- Workload theo sự kiện, chạy ngắt quãng: serverless có thể rẻ và gọn hơn.
- Tải ổn định, vài VM với load balancer và script deploy là đủ.

Kubernetes managed của cloud bỏ bớt việc vận hành control plane, nhưng cấu hình ứng dụng, mạng và bảo mật vẫn là của bạn.

## Service mesh

Nhiều service gọi nhau thì service nào cũng cần retry, timeout, mã hoá, đo đạc; cài vào thư viện của từng ngôn ngữ dễ lệch nhau. **Service mesh** (ví dụ Istio, Linkerd) đẩy các việc này xuống hạ tầng:

- **Sidecar**: mỗi Pod có thêm một proxy chạy cạnh ứng dụng, mọi traffic ra vào đi qua nó. Một số mesh hiện có chế độ không cần sidecar cho từng Pod.
- **mTLS (mutual TLS)**: hai đầu xác thực lẫn nhau và mã hoá traffic; mesh tự cấp và xoay vòng chứng chỉ.
- **Retry, timeout, circuit breaking** cấu hình tập trung (xem [Resilience](../../6-hien-dai/05-modern-resilience/)), cùng metric và trace cho từng cuộc gọi (xem [Observability](../../6-hien-dai/09-modern-observability/)).
- **Điều khiển traffic**: chia phần trăm theo phiên bản, hữu ích cho canary.

**Cái giá**: thêm một hop proxy mỗi cuộc gọi (tăng [latency](../../1-nen-tang/03-latency/), CPU, bộ nhớ), thêm hệ thống phức tạp phải vận hành, gỡ lỗi khó hơn. Retry ở mesh cộng retry ở ứng dụng có thể nhân số request khi sự cố. Mesh đáng giá khi số service lớn, cần mTLS đồng loạt hoặc điều khiển traffic tinh; với vài service thì thư viện client là đủ.

## Đánh đổi tóm tắt

- Container: triển khai nhất quán, nhanh, mật độ cao; đổi lại cách ly yếu hơn VM.
- Kubernetes: tự động hoá scheduling, healing, scaling; đổi lại độ phức tạp và chi phí vận hành.
- Service mesh: chính sách mạng thống nhất, không sửa code; đổi lại latency, tài nguyên và thêm hệ thống phức tạp.

## Trong phỏng vấn

- Khi vẽ kiến trúc: "service stateless chạy container trên Kubernetes, autoscale theo CPU hoặc QPS, phía trước là Ingress/load balancer", và nói rõ database không autoscale đơn giản như vậy.
- Câu hỏi hay gặp: container khác VM thế nào; node chết thì sao; service tìm nhau thế nào khi IP Pod đổi; HPA giới hạn ở đâu; service mesh có đáng không.
- Điểm cộng: biết khi nào **không** dùng Kubernetes, nhắc tới health check, resource limit, image bất biến.

## Đọc thêm

- [Kubernetes Overview (tài liệu chính thức)](https://kubernetes.io/docs/concepts/overview/)
- [Horizontal Pod Autoscaling (Kubernetes docs)](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Docker overview (Docker docs)](https://docs.docker.com/get-started/docker-overview/)
- [What is Istio? (Istio docs)](https://istio.io/latest/docs/concepts/what-is-istio/)
