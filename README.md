# Khóa học Architect

Hai khóa tự học tiếng Việt, **không chính thức**, trên cùng một trang. Không do Anthropic thực hiện hay bảo trợ.

**Trang học:** https://kien-duy.github.io/architect-courses/

| Khóa | Nội dung |
|---|---|
| **Claude Certified Architect — Foundations** | 29 bài theo 5 domain của đề thi, 5 lab chạy bằng Claude Code, quiz cuối mỗi domain, đề thi thử 60 câu tính giờ |
| **System Design** | 38 bài từ nền tảng tới thiết kế thực chiến, 65 câu hỏi, 307 flashcard, dựa trên The System Design Primer |

## Có gì trong trang học

- Bài học ngắn, mỗi bài kết thúc bằng câu hỏi kiểm tra. Đúng toàn bộ trong một lượt thì bài được tích hoàn thành.
- Tài liệu chính thức của Anthropic mở ngay trong trang (ngăn trượt bên phải), không phải chuyển tab.
- Lab chạy bằng Claude Code với tài khoản đang đăng nhập, không cần API key.
- Flashcard ôn tập (khóa System Design) và đề thi thử tính giờ có điểm theo domain (khóa Claude).
- Checklist nổi theo từng khóa, ghi chú theo bài, đánh giá sao và góp ý.
- Tiến trình chỉ lưu trong trình duyệt; tải về và khôi phục bằng file JSON.

## Chạy ở máy

Cần Node.js 22 trở lên.

```bash
npm install
```

```bash
npm run dev
```

Mở http://localhost:4321/architect-courses/.

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chụp các trang tài liệu còn thiếu, rồi chạy server phát triển |
| `npm run build` | Chụp lại toàn bộ tài liệu, rồi build ra `dist/` |
| `npm run check` | Kiểm tra `dist/`: link nội bộ, ảnh, anchor và mọi đích “Học lại” |
| `npm run snapshot` | Chỉ chụp lại tài liệu |

## Cấu trúc

```text
src/pages/index.astro            trang chủ, dựng bằng markup của bộ kit tasteskill
src/content/docs/cca/            khóa Claude Certified Architect (Markdown)
src/content/docs/system-design/  khóa System Design (sinh từ scripts/import-system-design.py)
src/data/courses.ts              danh sách khóa; thư mục cấp một trong docs/ là id khóa
src/data/exam/                   ngân hàng câu hỏi thi thử, mỗi domain một file JSON
src/components/                  quiz, flashcard, đánh giá, thi thử, thanh trên cùng
src/scripts/course.ts            tiến trình, quiz, checklist nổi, ngăn trượt, thi thử
src/routeData.ts                 mỗi trang chỉ hiện sidebar của khóa mình
src/styles/                      tokens.css (bảng màu, bo góc chung), theme.css (Starlight),
                                 course.css (quiz, checklist, flashcard), home.css (trang chủ)
scripts/snapshot-docs.mjs        chụp tài liệu chính thức lúc build
scripts/check-links.py           kiểm tra site đã build
labs/                            thư mục lab chạy bằng Claude Code
public/sd-images/                ảnh của khóa System Design
public/assets/                   file của bộ kit tasteskill mà trang chủ dùng; chép nguyên, không sửa
```

### Viết một bài học

Thêm file `.md` vào thư mục của khóa. Frontmatter:

```yaml
title: 1.1 · Tên bài
lesson:
  day: 1            # ngày trong lộ trình (khóa chia theo ngày), hoặc
  group: Nền tảng   # tên nhóm trong checklist
  kind: lesson      # lesson | lab | quiz (đạt từ 70%) | exam (trang thi thử)
quiz:
  - q: "Question?"
    options:
      - text: "Option A"
        why: "Vì sao đúng hoặc sai."   # hoặc options là mảng chuỗi + một `why` chung cho cả câu
    answer: 0       # chỉ số phương án đúng, từ 0
    keyword: "Từ khóa chốt đáp án"
    relearn: "#id-tieu-de"          # hoặc "cca/domain-1/01-agentic-loop#id-tieu-de"
    relearnLabel: "Tên đoạn cần học lại"
cards:
  - q: "Mặt trước flashcard"
    a: "Mặt sau"
```

Có `lesson` thì bài nằm trong checklist. Bài có `lesson` mà không có `quiz` sẽ có nút “Đánh dấu đã đọc xong”.

Link tới `platform.claude.com/docs`, `code.claude.com/docs` và `modelcontextprotocol.io` trong bài sẽ tự được chụp và mở trong ngăn trượt. Link nội bộ có thuộc tính `data-drawer` cũng mở trong ngăn trượt.

### Thêm một khóa

Tạo thư mục mới trong `src/content/docs/`, thêm khóa vào `src/data/courses.ts`, và thêm một nhóm cấp một cùng tên vào `sidebar` trong `astro.config.mjs`.

## Bản chụp tài liệu chính thức

Trình duyệt không cho nhúng trực tiếp các trang tài liệu của Anthropic (`X-Frame-Options`). Vì vậy `scripts/snapshot-docs.mjs` tải bản Markdown của các trang được dẫn trong bài lúc build và đưa vào `public/docs-snapshot/`. Thư mục này **không được commit**. Workflow build lại mỗi tuần để bản chụp không cũ quá 7 ngày. Mỗi ngăn trượt ghi ngày chụp và link về trang gốc.

## Nguồn và giấy phép

- Bài học do khóa này viết (toàn bộ khóa Claude; tiêu đề, ý chính, câu hỏi, flashcard và mười bài “chủ đề hiện đại” của khóa System Design) phát hành theo [CC BY 4.0](./LICENSE).
- Code (trang web, script, lab) phát hành theo [MIT](./LICENSE-CODE).
- Phần thân tiếng Anh của 28 bài System Design và các ảnh đi kèm lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer) của Donne Martin, giấy phép CC BY 4.0. Mỗi bài có link về đoạn gốc.
- Mục “Hình minh họa ByteByteGo” dẫn hình và nội dung của [ByteByteGo](https://bytebytego.com/guides/), giữ nguyên bản gốc kèm link nguồn. Bản quyền thuộc ByteByteGo; phần này không thuộc các giấy phép trên.
- Nội dung bản chụp tài liệu chính thức thuộc bản quyền của chủ sở hữu tương ứng (Anthropic, dự án Model Context Protocol).
- Phạm vi kiến thức của khóa Claude có tham khảo bộ ghi chú cộng đồng [paullarionov/claude-certified-architect](https://github.com/paullarionov/claude-certified-architect). Nội dung bài học được viết mới.

"Claude" và "Anthropic" là nhãn hiệu của Anthropic, PBC.
