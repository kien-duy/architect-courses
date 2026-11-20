---
title: 5.5 · Giám sát của con người và hiệu chỉnh độ tin cậy
description: Vì sao độ chính xác tổng thể đánh lừa, cách đo theo phân đoạn, hiệu chỉnh điểm tin cậy theo trường, định tuyến sang người duyệt và lấy mẫu phân tầng.
lesson:
  day: 11
  minutes: 13
quiz:
  - q: "An extraction pipeline reports 97% accuracy across 10,000 documents. The team plans to remove human review entirely. Before doing so, what is the most important check?"
    options:
      - text: "Confirm the 97% figure by re-running the same evaluation on the same documents"
        why: "Chạy lại cùng phép đo cho cùng một con số tổng. Nó không cho biết lỗi tập trung ở đâu."
      - text: "Break accuracy down by document type and by field to see whether any segment performs far below the average"
        why: "Đúng. Con số tổng có thể che một phân đoạn nhỏ có tỉ lệ lỗi rất cao. Phải xác nhận từng loại tài liệu và từng trường đều ổn trước khi bỏ người duyệt."
      - text: "Ask the model whether it is confident in its extractions"
        why: "Tự đánh giá của model không thay được phép đo trên dữ liệu gán nhãn."
      - text: "Increase the evaluation set to 100,000 documents"
        why: "Thêm tài liệu làm con số tổng ổn định hơn, nhưng nếu không tách theo phân đoạn thì vẫn không thấy phân đoạn yếu."
    answer: 1
    keyword: "con số tổng che phân đoạn yếu → đo theo **loại tài liệu** và **trường**"
    relearn: "#con-số-tổng-thể-che-giấu-điều-gì"
    relearnLabel: "Con số tổng thể che giấu điều gì"
  - q: "A pipeline auto-approves every extraction with model confidence above 0.9 and sends the rest to reviewers. Reviewers only ever see low-confidence items. Six months later a new invoice layout causes systematic errors in a high-confidence field, and nobody notices for weeks. Which practice would have caught this?"
    options:
      - text: "Lowering the auto-approve threshold to 0.8"
        why: "Hạ ngưỡng làm nhiều mục được tự duyệt hơn, tức là ít mục được người xem hơn."
      - text: "Reviewing only the items the model flags as uncertain, but more carefully"
        why: "Lỗi nằm ở các mục model tự tin. Xem kỹ hơn phần không tự tin không chạm tới chúng."
      - text: "Retraining reviewers on the new layout"
        why: "Người duyệt chưa bao giờ nhìn thấy các mục bị lỗi, nên đào tạo họ không thay đổi gì."
      - text: "Regularly auditing a stratified random sample of the auto-approved, high-confidence extractions"
        why: "Đúng. Chỉ có lấy mẫu trong chính nhóm được tự duyệt mới đo được tỉ lệ lỗi của nhóm đó và phát hiện kiểu lỗi mới."
    answer: 3
    keyword: "kiểm tra cả nhóm **tin cậy cao** bằng lấy mẫu ngẫu nhiên phân tầng"
    relearn: "#lấy-mẫu-ngẫu-nhiên-phân-tầng"
    relearnLabel: "Lấy mẫu ngẫu nhiên phân tầng"
  - q: "A team has the model output a confidence score for each extracted field and wants to pick the threshold below which a field goes to human review. How should the threshold be chosen?"
    options:
      - text: "Measure, on a labeled validation set, how often fields at each confidence level are actually correct, and set the threshold per field from that"
        why: "Đúng. Điểm tin cậy chỉ có nghĩa khi đã đối chiếu với kết quả thật. Hiệu chỉnh trên dữ liệu gán nhãn, và theo từng trường vì mỗi trường có độ khó khác nhau."
      - text: "Use 0.8 for every field, a common industry default"
        why: "Không có ngưỡng chung nào đúng cho mọi trường và mọi loại tài liệu. Ngưỡng không dựa trên dữ liệu là ngưỡng tùy tiện."
      - text: "Ask the model which threshold it recommends"
        why: "Model không biết tỉ lệ đúng thực tế của chính nó trên dữ liệu của bạn."
      - text: "Start at 0.5 and raise it whenever a customer complains"
        why: "Cách này dùng khách hàng làm bộ kiểm thử và chỉ phản ứng sau khi lỗi đã gây hại."
    answer: 0
    keyword: "ngưỡng duyệt = hiệu chỉnh trên **tập gán nhãn**, theo **từng trường**"
    relearn: "#điểm-tin-cậy-theo-trường-và-hiệu-chỉnh"
    relearnLabel: "Điểm tin cậy theo trường và hiệu chỉnh"
---

Một pipeline trích xuất dữ liệu đạt 97% chính xác nghe như đã sẵn sàng chạy không cần người duyệt. Bài này chỉ ra vì sao con số đó chưa đủ, và cách đặt con người vào đúng chỗ: không xem lại mọi thứ, nhưng không bao giờ mù hoàn toàn.

## Con số tổng thể che giấu điều gì

Xét một pipeline trích xuất trên 10.000 tài liệu:

| Loại tài liệu | Số tài liệu | Trích đúng | Độ chính xác |
|---|--:|--:|--:|
| Hóa đơn điện tử | 7.000 | 6.930 | 99% |
| Hợp đồng đánh máy | 2.500 | 2.450 | 98% |
| Biên lai viết tay | 500 | 320 | **64%** |
| **Tổng** | 10.000 | 9.700 | **97%** |

Con số 97% là thật. Nó cũng che một sự thật khác: hơn một phần ba biên lai viết tay bị trích sai. Loại này chỉ chiếm 5% số tài liệu nên gần như không kéo con số tổng xuống.

Nếu bỏ người duyệt dựa trên 97%, mọi biên lai viết tay sẽ đi thẳng vào hệ thống kế toán với tỉ lệ lỗi 36%. Và sẽ không ai nhận ra, vì chỉ số duy nhất được theo dõi vẫn đẹp.

Điều tương tự xảy ra theo **trường**. Một pipeline có thể trích tên nhà cung cấp đúng 99,5% nhưng trích ngày đến hạn đúng 88%, vì ngày được viết theo nhiều kiểu. Trung bình trên mọi trường vẫn cao.

## Đo theo từng loại tài liệu và từng trường

Quy tắc: **trước khi tự động hóa, xác nhận độ chính xác ở từng phân đoạn, không chỉ ở tổng thể.**

| Chiều phân tích | Câu hỏi cần trả lời |
|---|---|
| Loại tài liệu | Có loại nào thấp hơn hẳn mức chung không? |
| Trường | Có trường nào (ngày, số tiền, mã số thuế) kém hơn các trường khác không? |
| Loại tài liệu × trường | Có tổ hợp nào đặc biệt yếu không, ví dụ "số tiền trên biên lai viết tay"? |
| Nguồn hoặc thời gian | Độ chính xác có thay đổi khi xuất hiện mẫu biểu mới, nhà cung cấp mới không? |

Kết quả của phân tích này là quyết định tự động hóa **theo phân đoạn**, không phải một công tắc bật tắt cho cả pipeline:

- hóa đơn điện tử: tự động, kiểm tra bằng lấy mẫu;
- hợp đồng đánh máy: tự động với các trường ổn định, người duyệt trường "điều khoản thanh toán";
- biên lai viết tay: người duyệt toàn bộ cho tới khi độ chính xác được cải thiện và đo lại.

Điều kiện để một phân đoạn được tự động hóa là độ chính xác của nó **đã được đo** và **ổn định** qua thời gian, không phải vì nó nằm trong một pipeline có số tổng đẹp.

## Điểm tin cậy theo trường và hiệu chỉnh

Để quyết định từng mục có cần người xem không, pipeline cần một tín hiệu ở mức chi tiết. Cách làm phổ biến là yêu cầu model xuất **điểm tin cậy cho từng trường**, không phải một điểm cho cả tài liệu.

```json
{
  "vendor_name":  {"value": "Công ty TNHH Sông Lam", "confidence": 0.98},
  "total_amount": {"value": 12450000,               "confidence": 0.96},
  "due_date":     {"value": "2026-12-15",           "confidence": 0.71,
                   "note": "ngày viết tay, số 1 và số 7 khó phân biệt"}
}
```

Điểm theo trường cho phép gửi đúng một trường đáng ngờ cho người duyệt thay vì cả tài liệu.

Nhưng một con số model tự đưa ra chưa có nghĩa gì. [Bài 5.2](../02-escalation-va-yeu-cau-mo-ho/) đã nói: model có thể sai một cách tự tin. Điểm chỉ dùng được sau khi **hiệu chỉnh** (calibration): đối chiếu nó với kết quả thật trên một **tập kiểm định đã gán nhãn**.

| Điểm model báo | Số trường trong tập kiểm định | Tỉ lệ đúng thực tế |
|---|--:|--:|
| 0,95 trở lên | 4.000 | 99,1% |
| 0,85 đến dưới 0,95 | 1.500 | 96,0% |
| 0,70 đến dưới 0,85 | 600 | 81,0% |
| dưới 0,70 | 300 | 55,0% |

Bảng này biến điểm thành thứ có thể ra quyết định. Nếu yêu cầu nghiệp vụ là sai dưới 1%, chỉ nhóm từ 0,95 trở lên được tự duyệt. Ngưỡng đến từ dữ liệu, không từ cảm giác.

Ba điểm cần nhớ:

- **Hiệu chỉnh theo từng trường và từng loại tài liệu.** Điểm 0,95 ở trường "tên nhà cung cấp" có thể đúng 99%, còn 0,95 ở trường "ngày đến hạn" chỉ đúng 91%. Dùng chung một ngưỡng là lặp lại sai lầm của con số tổng.
- **Tập kiểm định phải có nhãn do con người xác nhận** và đại diện cho dữ liệu thật, gồm cả các loại hiếm.
- **Hiệu chỉnh lại khi dữ liệu đổi.** Mẫu hóa đơn mới, nhà cung cấp mới, model mới đều có thể làm bảng trên lệch đi.

## Định tuyến sang người duyệt

Với điểm đã hiệu chỉnh, luồng xử lý chia làm hai nhánh.

| Điều kiện | Đi đâu |
|---|---|
| Điểm trên ngưỡng **và** phân đoạn đã được xác nhận ổn định | Xử lý tự động, có lấy mẫu kiểm tra |
| Điểm dưới ngưỡng | Người duyệt |
| Nguồn mơ hồ hoặc mâu thuẫn (hai số tiền khác nhau trên cùng hóa đơn, trang bị mờ) | Người duyệt, dù điểm cao |
| Loại tài liệu chưa có trong tập kiểm định | Người duyệt, cho tới khi đo được |
| Trường thiếu trong tài liệu | Trả giá trị rỗng kèm ghi chú, không điền giá trị suy đoán |

Dòng thứ ba đáng chú ý: mơ hồ trong nguồn là lý do chuyển cho người **độc lập với điểm tin cậy**. Model có thể rất tự tin chọn một trong hai số tiền, và vẫn sai.

Dòng cuối liên quan tới một kỹ thuật giảm bịa đặt trong tài liệu chính thức: cho model quyền nói "không có thông tin". Một trường được phép rỗng thì ít bị điền bừa hơn một trường bắt buộc phải có giá trị.

Người duyệt cần đủ ngữ cảnh để quyết định nhanh: giá trị được trích, đoạn gốc trong tài liệu, và lý do bị gắn cờ. Đó là cùng nguyên tắc với bản chuyển giao tự đủ ở bài 5.2.

## Lấy mẫu ngẫu nhiên phân tầng

Định tuyến theo điểm có một điểm mù: người duyệt chỉ thấy các mục **điểm thấp**. Nếu model sai một cách tự tin, lỗi đi thẳng qua nhánh tự động và không ai nhìn thấy. Bảng hiệu chỉnh hôm qua không bảo đảm cho dữ liệu hôm nay.

Cách xử lý là **kiểm tra định kỳ một mẫu ngẫu nhiên trong chính nhóm được tự duyệt**. Và mẫu phải được **phân tầng**.

| Cách lấy mẫu | Trên 10.000 tài liệu ở ví dụ đầu bài | Vấn đề |
|---|---|---|
| Ngẫu nhiên đơn giản, 2% | Khoảng 140 hóa đơn, 50 hợp đồng, 10 biên lai | 10 biên lai không đủ để đo tỉ lệ lỗi của loại này |
| Phân tầng, 60 mẫu mỗi loại | 60 hóa đơn, 60 hợp đồng, 60 biên lai | Mỗi loại có đủ mẫu để thấy vấn đề |

**Phân tầng** nghĩa là chia dữ liệu thành các nhóm (loại tài liệu, trường, nhà cung cấp) rồi lấy mẫu ngẫu nhiên trong từng nhóm. Nhóm nhỏ không bị nhóm lớn nhấn chìm, đúng như cách con số tổng nhấn chìm biên lai viết tay.

Lấy mẫu phân tầng phục vụ hai mục đích:

- **Đo tỉ lệ lỗi thật của nhóm tin cậy cao**, để biết ngưỡng còn đúng không.
- **Phát hiện kiểu lỗi mới**: một mẫu biểu mới, một cách ghi ngày mới, thứ mà tập kiểm định cũ không có.

Khi mẫu kiểm tra cho thấy một phân đoạn xấu đi, phân đoạn đó quay về nhánh người duyệt cho tới khi được sửa và đo lại.

## Vòng giám sát hoàn chỉnh

Ghép các phần lại thành một vòng khép kín:

1. **Đo** độ chính xác theo loại tài liệu và trường trên tập gán nhãn.
2. **Hiệu chỉnh** điểm tin cậy theo trường; đặt ngưỡng từ dữ liệu.
3. **Tự động hóa** chỉ các phân đoạn đã được xác nhận; phần còn lại đi qua người duyệt.
4. **Lấy mẫu phân tầng** trong nhóm tự duyệt để theo dõi liên tục.
5. **Đưa kết quả duyệt trở lại** tập kiểm định, hiệu chỉnh lại, và mở rộng hoặc thu hẹp phần tự động.

Giám sát của con người ở đây không phải là "người xem lại mọi thứ", cũng không phải "tin model hoàn toàn". Con người xem phần model không chắc, phần nguồn mơ hồ, và một mẫu của phần model chắc chắn.

Tài liệu gốc: [Define success and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests), [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations).

## Tóm tắt

- Độ chính xác tổng thể có thể che một phân đoạn rất yếu. Đo theo loại tài liệu và theo trường trước khi tự động hóa.
- Điểm tin cậy xuất theo từng trường, và chỉ dùng được sau khi hiệu chỉnh trên tập gán nhãn.
- Ngưỡng duyệt đặt theo từng trường, từ dữ liệu.
- Điểm thấp hoặc nguồn mơ hồ → người duyệt.
- Lấy mẫu ngẫu nhiên phân tầng trong nhóm tin cậy cao để đo tỉ lệ lỗi thật và phát hiện kiểu lỗi mới.
