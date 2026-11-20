---
title: 5.6 · Giữ nguồn gốc dữ liệu khi tổng hợp nhiều nguồn
description: Giữ ánh xạ từ nhận định tới nguồn qua các tầng tổng hợp, xử lý số liệu mâu thuẫn, dùng ngày tháng để diễn giải đúng, và trình bày theo loại nội dung.
lesson:
  day: 11
  minutes: 13
quiz:
  - q: "A research coordinator collects findings from four subagents and passes a prose summary to a report-writing subagent. The final report says 'the market is worth 3.2 billion dollars' with no source, and nobody can tell where the figure came from. What should change?"
    options:
      - text: "Ask the report writer to add a bibliography at the end listing every document the subagents read"
        why: "Danh sách tài liệu ở cuối không cho biết con số nào đến từ tài liệu nào. Liên kết giữa nhận định và nguồn vẫn mất."
      - text: "Have the report writer search the web again to find a source for each number"
        why: "Cách này tìm một nguồn có vẻ khớp sau khi đã viết, không phải nguồn thật mà con số được lấy ra. Nó cũng tốn thêm một vòng tìm kiếm."
      - text: "Require each subagent to return findings as structured claim-to-source mappings, and keep that structure intact through aggregation"
        why: "Đúng. Nguồn bị mất ở bước tóm tắt thành văn xuôi. Giữ từng nhận định gắn với nguồn, ngày và trích dẫn dưới dạng có cấu trúc qua mọi tầng thì báo cáo cuối mới truy ngược được."
      - text: "Use a larger model for the report writer"
        why: "Model lớn hơn cũng không khôi phục được thông tin nguồn đã bị bỏ trước khi tới nó."
    answer: 2
    keyword: "giữ ánh xạ **nhận định → nguồn** có cấu trúc qua mọi tầng"
    relearn: "#ánh-xạ-nhận-định-sang-nguồn"
    relearnLabel: "Ánh xạ nhận định sang nguồn"
  - q: "Two credible sources report different adoption rates for the same technology in the same year: 38% from a survey and 61% from platform telemetry. How should the analysis subagent report this to the coordinator?"
    options:
      - text: "Report both values with their sources, dates and methods, and flag the conflict for the coordinator to reconcile"
        why: "Đúng. Subagent không có căn cứ để phán nguồn nào đúng. Giữ cả hai kèm ngữ cảnh cho phép coordinator, hoặc người đọc, tự đánh giá."
      - text: "Report 49.5%, the average of the two"
        why: "Trung bình tạo ra một con số không nguồn nào đưa ra, và che mất việc hai nguồn đo hai thứ khác nhau."
      - text: "Report 61%, because telemetry is more objective than surveys"
        why: "Đây là tự chọn một giá trị. Hai nguồn có thể đo hai đại lượng khác nhau, và quyết định đó không thuộc về subagent."
      - text: "Omit the statistic, since the sources disagree"
        why: "Bỏ đi làm mất cả hai dữ kiện và che mất sự bất đồng, vốn là một phát hiện có giá trị."
    answer: 0
    keyword: "mâu thuẫn → **giữ cả hai** kèm nguồn, không tự chọn"
    relearn: "#số-liệu-mâu-thuẫn-thì-giữ-cả-hai"
    relearnLabel: "Số liệu mâu thuẫn thì giữ cả hai"
  - q: "A synthesis agent reports: 'Sources contradict each other: one says 12% of teams use the tool, another says 38%.' The first figure was published in 2023 and the second in 2026. What was missing from the subagents' output that caused this misreading?"
    options:
      - text: "A confidence score for each figure"
        why: "Điểm tin cậy không cho biết hai con số thuộc hai thời điểm khác nhau."
      - text: "The publication or collection date of each figure"
        why: "Đúng. Không có ngày, một thay đổi theo thời gian bị đọc thành mâu thuẫn. Có ngày, đây là mức tăng từ 12% lên 38% trong ba năm."
      - text: "The sample size of each survey"
        why: "Cỡ mẫu giúp đánh giá độ tin cậy, nhưng không giải thích được chênh lệch do cách nhau ba năm."
      - text: "A longer summary of each source"
        why: "Tóm tắt dài hơn không bảo đảm có ngày. Thứ cần là một trường ngày bắt buộc trong output."
    answer: 1
    keyword: "thiếu **ngày** → thay đổi theo thời gian bị hiểu thành mâu thuẫn"
    relearn: "#ngày-tháng-phân-biệt-thay-đổi-với-mâu-thuẫn"
    relearnLabel: "Ngày tháng phân biệt thay đổi với mâu thuẫn"
---

Một báo cáo tổng hợp chỉ đáng tin khi người đọc truy được mỗi nhận định về nguồn của nó. Trong hệ nhiều agent, thông tin đi qua nhiều tầng tóm tắt, và mỗi tầng là một cơ hội để nguồn rơi mất. Bài này nói về **provenance**: nguồn gốc của dữ liệu, và cách giữ nó tới tận báo cáo cuối.

## Nguồn gốc bị mất ở đâu

Theo dõi một con số đi qua hệ nghiên cứu:

```text
Tài liệu gốc:  "Theo khảo sát 420 nhóm công bố ngày 2026-03-10, 38% đang dùng AI review."
Subagent:      "Khoảng 38% số nhóm dùng AI review (khảo sát 2026)."
Coordinator:   "Gần 40% số nhóm đã dùng AI review."
Báo cáo cuối:  "Phần lớn các nhóm đang chuyển sang AI review."
```

Qua ba tầng, một dữ kiện có nguồn, ngày và cỡ mẫu thành một nhận định mơ hồ, không kiểm chứng được, và sai về nghĩa: 38% không phải "phần lớn".

Nguồn gốc mất ở ba chỗ:

| Chỗ mất | Vì sao |
|---|---|
| **Subagent tóm tắt thành văn xuôi** | Văn xuôi không có chỗ bắt buộc cho nguồn. Model viết câu trôi chảy và bỏ phần "theo tài liệu nào" |
| **Coordinator gộp kết quả** | Khi gộp năm báo cáo thành một, liên kết giữa từng câu và nguồn của nó bị trộn lẫn |
| **Compaction** | Như [bài 5.1](../01-giu-thong-tin-hoi-thoai-dai/): con số và ngày bị làm mờ khi lịch sử bị tóm tắt |

Điểm chung: nguồn mất ở bước **chuyển từ có cấu trúc sang văn xuôi**. Vì vậy cách giữ là trì hoãn bước đó tới cuối cùng.

## Ánh xạ nhận định sang nguồn

Yêu cầu mỗi subagent trả kết quả dưới dạng **ánh xạ nhận định → nguồn** có cấu trúc. Mỗi nhận định là một bản ghi, không phải một câu trong đoạn văn.

```json
{
  "claim": "38% số nhóm phát triển đang dùng trợ lý AI trong bước review code",
  "value": 38,
  "unit": "% số nhóm",
  "source_name": "Khảo sát DevViet 2026",
  "source_ref": "sources/khao-sat-devviet-2026.md",
  "published": "2026-03-10",
  "collected": "2026-01",
  "method": "bảng hỏi tự khai, 420 nhóm",
  "quote": "38% số nhóm cho biết đang dùng trợ lý AI trong bước review code."
}
```

| Trường | Giữ để làm gì |
|---|---|
| `source_ref`, `source_name` | Truy ngược về tài liệu (URL, tên file, tên tài liệu) |
| `published`, `collected` | Diễn giải đúng theo thời gian |
| `method` | So sánh được hai con số đo bằng hai cách |
| `quote` | Kiểm chứng: câu trích nguyên văn phải tìm được trong nguồn |

Ba quy tắc khi các bản ghi này đi qua hệ thống:

- **Coordinator gộp bản ghi, không viết lại bản ghi.** Gộp là nối danh sách và nhóm theo chủ đề. Trường nguồn đi nguyên vẹn.
- **Định danh nguồn được sao chép, không gõ lại.** Một URL hay tên file bị model "viết lại gần đúng" là một nguồn hỏng. [Lab 5.7](../07-lab/) cho thấy lỗi này xảy ra thật.
- **Văn xuôi chỉ xuất hiện ở tầng viết báo cáo**, và tầng đó nhận các bản ghi, không nhận bản tóm tắt.

Câu trích nguyên văn còn là kỹ thuật giảm bịa đặt được tài liệu chính thức khuyến nghị: yêu cầu model trích câu liên quan trước rồi mới phân tích, và rút lại nhận định nào không tìm được câu trích hỗ trợ.

:::note[Tính năng citations của API]
Tài liệu luyện thi trình bày provenance như một việc thuần thiết kế prompt. API hiện có sẵn hai cơ chế hỗ trợ. Với **citations**, bạn gửi tài liệu dưới dạng document block có `"citations": {"enabled": true}`; phản hồi gồm các text block, mỗi block kèm danh sách `citations` chứa `cited_text` (đoạn trích do API lấy trực tiếp từ tài liệu), tên tài liệu và vị trí. Vì đoạn trích do API cắt ra, nó luôn trỏ tới nội dung có thật. Với block **`search_result`**, tool tìm kiếm của bạn trả kết quả kèm `source` và `title`, và Claude trích dẫn chúng như trích dẫn kết quả web search. Nguyên tắc của bài không đổi: dù dùng cơ chế nào, liên kết nhận định với nguồn phải được giữ qua mọi tầng.
:::

## Số liệu mâu thuẫn thì giữ cả hai

Hai nguồn đáng tin đưa hai con số khác nhau cho cùng một chỉ số. Subagent phân tích không được tự chọn một, lấy trung bình, hay bỏ cả hai.

```json
{
  "metric": "Tỉ lệ dùng AI review code, năm 2026",
  "conflict_detected": true,
  "values": [
    {"value": "38%", "source": "Khảo sát DevViet 2026", "published": "2026-03-10",
     "method": "bảng hỏi tự khai, 420 nhóm; đơn vị đếm: nhóm"},
    {"value": "61%", "source": "Báo cáo nền tảng GitNhanh", "published": "2026-06-02",
     "method": "đo tự động trên 1.150 repository; đơn vị đếm: repository"}
  ],
  "possible_explanation": "Khác đơn vị đếm (nhóm so với repository) và khác tập mẫu"
}
```

| Cách xử lý | Vì sao sai |
|---|---|
| Chọn con số "đáng tin hơn" | Subagent không có căn cứ. Hai nguồn có thể đo hai đại lượng khác nhau, và cả hai đều đúng |
| Lấy trung bình | Tạo ra một con số không nguồn nào đưa ra |
| Bỏ chỉ số này | Mất cả hai dữ kiện, và che mất sự bất đồng |
| Chọn con số xuất hiện trước | Kết quả phụ thuộc thứ tự đọc file |

Cách đúng: **giữ mọi giá trị, gắn nguồn và phương pháp, đánh dấu mâu thuẫn, và chuyển lên coordinator**. Coordinator có toàn cảnh để quyết định: tìm nguồn thứ ba, trình bày cả hai, hoặc giải thích chênh lệch. Nếu coordinator cũng không phân xử được, mâu thuẫn đi tiếp tới báo cáo dưới dạng một mục "còn tranh cãi".

`possible_explanation` là giả thuyết, và phải được ghi là giả thuyết. Subagent được gợi ý vì sao hai con số khác nhau; nó không được trình bày gợi ý đó như kết luận.

## Ngày tháng phân biệt thay đổi với mâu thuẫn

Không phải hai con số khác nhau nào cũng mâu thuẫn. Nhiều khi chúng chỉ thuộc hai thời điểm.

```text
Thiếu ngày:  "Nguồn A nói 12%, nguồn B nói 38%. Hai nguồn mâu thuẫn."
Có ngày:     "Nguồn A (công bố 2023-04) ghi 12%, nguồn B (công bố 2026-03) ghi 38%.
              Cùng đơn vị khảo sát, cùng phương pháp: tỉ lệ tăng 26 điểm phần trăm sau ba năm."
```

Vì vậy ngày là trường **bắt buộc** trong output của subagent, không phải thông tin thêm. Nên phân biệt hai loại ngày:

| Loại ngày | Ý nghĩa |
|---|---|
| Ngày công bố | Tài liệu ra đời khi nào |
| Thời gian thu thập | Dữ liệu mô tả giai đoạn nào. Một báo cáo công bố tháng 6 có thể dùng số liệu của năm trước |

Quy tắc đọc hai con số khác nhau:

1. Khác thời điểm → trước hết coi là **thay đổi theo thời gian**.
2. Cùng thời điểm, khác phương pháp hoặc khác đơn vị đếm → **không so sánh trực tiếp được**; trình bày cả hai kèm phương pháp.
3. Cùng thời điểm, cùng phương pháp, khác giá trị → **mâu thuẫn thật**; đánh dấu và chuyển lên.

## Tách phần chắc chắn khỏi phần còn tranh cãi

Báo cáo cuối không nên trộn mọi nhận định vào một giọng văn tự tin như nhau. Cấu trúc nên phản ánh mức độ căn cứ:

```markdown
## Kết luận có căn cứ vững
- Tỉ lệ nhóm dùng AI review tăng từ 12% (Khảo sát DevViet, 2023-04-18)
  lên 38% (Khảo sát DevViet, 2026-03-10). Cùng đơn vị khảo sát, cùng phương pháp.

## Còn tranh cãi
- Mức giảm thời gian merge: 22% theo tự ước lượng của các nhóm (Khảo sát DevViet,
  2026-03-10) so với 9% theo số đo tự động (GitNhanh, 2026-06-02).
  Chưa có nguồn thứ ba để phân xử.

## Chưa có dữ liệu
- Chi phí công cụ trên mỗi lập trình viên: nguồn dự kiến không đọc được.
```

Ba nhóm này tương ứng với ba trạng thái hiểu biết khác nhau: đã biết, biết là chưa thống nhất, và chưa biết. Mục thứ ba chính là chú thích độ phủ của [bài 5.3](../03-lan-truyen-loi/). Gộp cả ba vào một đoạn văn là xóa đi thông tin quan trọng nhất đối với người ra quyết định.

## Trình bày theo loại nội dung

Một lỗi tổng hợp phổ biến là ép mọi thứ vào một định dạng, thường là văn xuôi hoặc toàn gạch đầu dòng. Mỗi loại nội dung có dạng trình bày giữ được cấu trúc của nó:

| Loại nội dung | Trình bày | Vì sao |
|---|---|---|
| Số liệu tài chính, so sánh nhiều chỉ số | Bảng | Giữ được con số, đơn vị, kỳ báo cáo và nguồn theo từng dòng |
| Tin tức, phân tích, bối cảnh | Văn xuôi | Cần lập luận và quan hệ nhân quả |
| Phát hiện kỹ thuật | Danh sách có cấu trúc | Mỗi phát hiện kèm vị trí, mức độ, đề xuất |
| Diễn biến theo thời gian | Sắp theo trình tự thời gian | Thứ tự là một phần của thông tin |

Tài liệu gốc: [Citations](https://platform.claude.com/docs/en/build-with-claude/citations), [Search results](https://platform.claude.com/docs/en/build-with-claude/search-results), [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations).

## Tóm tắt

- Nguồn gốc mất ở bước chuyển từ dữ liệu có cấu trúc sang văn xuôi: khi subagent tóm tắt, khi coordinator gộp, khi compaction.
- Subagent trả ánh xạ nhận định → nguồn có cấu trúc: nguồn, ngày, phương pháp, câu trích. Coordinator gộp bản ghi chứ không viết lại.
- Số liệu mâu thuẫn: giữ mọi giá trị kèm nguồn, đánh dấu, chuyển lên coordinator. Không chọn, không lấy trung bình, không bỏ.
- Ngày là trường bắt buộc. Khác thời điểm là thay đổi theo thời gian, chưa phải mâu thuẫn.
- Báo cáo tách phần có căn cứ vững, phần còn tranh cãi và phần chưa có dữ liệu.
- Trình bày theo loại nội dung: số liệu thành bảng, phân tích thành văn xuôi, phát hiện kỹ thuật thành danh sách.
