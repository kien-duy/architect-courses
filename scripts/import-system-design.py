"""Chuyển dữ liệu của site SystemDesign (data-vi.js) thành bài học Markdown cho Starlight.
Dùng: python3 -I import_sd.py <thư mục repo SystemDesign> <thư mục dự án khóa học>
"""
import json, os, re, shutil, sys

src, dst = sys.argv[1], sys.argv[2]
raw = open(os.path.join(src, 'data-vi.js'), encoding='utf-8').read()
d = json.loads(raw[raw.index('{'):raw.rindex('}') + 1])

LEVEL_DIR = {
    'foundation': '1-nen-tang', 'building': '2-khoi-xay-dung', 'distributed': '3-he-phan-tan',
    'practice': '4-thuc-chien', 'beyond': '5-hoc-tiep', 'modern': '6-hien-dai',
}
level_name = {l['id']: l['name'] for l in d['levels']}
out_root = os.path.join(dst, 'src/content/docs/system-design')
if os.path.isdir(out_root):
    shutil.rmtree(out_root)

# id bài -> (thư mục, tên file không đuôi)
where, counter = {}, {}
for l in d['lessons']:
    n = counter[l['level']] = counter.get(l['level'], 0) + 1
    where[l['id']] = (LEVEL_DIR[l['level']], f"{n:02d}-{l['id']}")

NO_HEADING = {'system-design-interview-questions-with-solutions', 'appendix'}
IMG = '../../../sd-images/'           # từ /system-design/<cấp>/<bài>/ tới /sd-images/
def lesson_href(lid, anchor=''):
    folder, name = where[lid]
    return f"../../{folder}/{name}/" + (f"#{anchor}" if anchor else '')

def shift_headings(md):
    """Đưa cấp tiêu đề nhỏ nhất của bài về h2 để mục lục của Starlight hiện đúng."""
    lines, fence, levels = md.split('\n'), False, []
    for ln in lines:
        if re.match(r'\s*(```|~~~)', ln): fence = not fence
        elif not fence:
            m = re.match(r'(#{1,6}) ', ln)
            if m: levels.append(len(m.group(1)))
    if not levels: return md
    delta, fence, out = min(levels) - 2, False, []
    for ln in lines:
        if re.match(r'\s*(```|~~~)', ln): fence = not fence
        elif not fence:
            m = re.match(r'(#{1,6}) ', ln)
            if m: ln = '#' * max(2, len(m.group(1)) - delta) + ln[len(m.group(1)):]
        out.append(ln)
    return '\n'.join(out)

def convert(md, lid):
    # hình minh họa ByteByteGo -> hình có link mở trang guide trong ngăn trượt
    def bbg(m):
        g = d['guides'].get(m.group(1))
        if not g: return ''
        t = g['t'].replace('"', '&quot;')
        return (f'\n\n<figure class="ccf-figure"><a href="../../guides/{m.group(1)}/" data-drawer>'
                f'<img src="{g["img"]}" alt="{t}" loading="lazy" />'
                f'<figcaption><strong>{t}</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>\n\n')
    md = re.sub(r'<div class="bbg" data-guide="([^"]+)">\s*</div>', bbg, md)

    # ảnh cục bộ
    # Ảnh nằm trong public/, nên dùng thẻ <img> để Astro không coi là asset cần import.
    md = re.sub(r'!\[([^\]]*)\]\(images/([^)\s]+)\)',
                lambda m: f'<img src="{IMG}{m.group(2)}" alt="{m.group(1)}" loading="lazy" />', md)
    md = re.sub(r'(<img[^>]*\ssrc=")images/', r'\1' + IMG, md)

    # link nội bộ (#id-bài hoặc #anchor của Primer)
    def internal(m):
        text, target = m.group(1), m.group(2)
        if target in where:
            return f"[{text}]({lesson_href(target)})"
        owner = d['anchors'].get(target)
        if owner and owner in where:
            # Tiêu đề chương của Primer không còn là tiêu đề trong bài đã tách: bỏ anchor.
            if target in NO_HEADING:
                return f"[{text}]({lesson_href(owner)})"
            return f"[{text}](#{target})" if owner == lid else f"[{text}]({lesson_href(owner, target)})"
        return f"[{text}](../../)"   # mục lục của Primer -> trang giới thiệu khóa
    md = re.sub(r'(?<!!)\[([^\]]*)\]\(#([^)\s]+)\)', internal, md)

    # link ngoài: thêm tóm tắt tiếng Việt làm chú giải, link chết thì dùng bản lưu trữ
    def external(m):
        text, url = m.group(1), m.group(2)
        info = d['links'].get(url)
        if not info: return m.group(0)
        href = info['a'] if info.get('x') and info.get('a') else url
        title = (info.get('s') or '').replace('"', '”').replace('\n', ' ')
        return f'[{text}]({href} "{title}")' if title else f'[{text}]({href})'
    md = re.sub(r'(?<!!)\[([^\]]*)\]\((https?://[^)\s]+)\)', external, md)
    return shift_headings(md).strip()

J = lambda v: json.dumps(v, ensure_ascii=False)
for l in d['lessons']:
    folder, name = where[l['id']]
    fm = [
        '---',
        f"title: {J(l['title'])}",
        f"description: {J(l['summary'][0] if l['summary'] else l['title'])}",
        'lesson:',
        f"  group: {J(level_name[l['level']])}",
        f"  minutes: {l['minutes']}",
    ]
    if l['quiz']:
        fm.append('quiz:')
        for q in l['quiz']:
            fm.append(f"  - q: {J(q['q'])}")
            fm.append(f"    options: {J(q['options'])}")
            fm.append(f"    answer: {q['answer']}")
            if q.get('why'): fm.append(f"    why: {J(q['why'])}")
    if l['cards']:
        fm.append('cards:')
        for c in l['cards']:
            fm.append(f"  - q: {J(c['q'])}")
            fm.append(f"    a: {J(c['a'])}")
    fm.append('---')

    body = []
    if l['summary']:
        body += [':::tip[Ý chính]', *[f'- {s}' for s in l['summary']], ':::', '']
    if l.get('source'):
        body += [
            f"*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer]({l['source']}) "
            'của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*', '']
    body.append(convert(l['md'], l['id']))
    path = os.path.join(out_root, folder, name + '.md')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write('\n'.join(fm) + '\n\n' + '\n'.join(body) + '\n')

# trang guide của ByteByteGo
for slug, g in d['guides'].items():
    path = os.path.join(out_root, 'guides', slug + '.md')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(
        f"---\ntitle: {J(g['t'])}\ndescription: {J('Hình minh họa và giải thích của ByteByteGo: ' + g['t'])}\n---\n\n"
        f"*Hình và nội dung của [ByteByteGo]({g['url']}), giữ nguyên tiếng Anh. Bản quyền thuộc ByteByteGo.*\n\n"
        + g['md'].strip() + '\n')

# trang giới thiệu khóa
rows = []
for lv in d['levels']:
    ls = [l for l in d['lessons'] if l['level'] == lv['id']]
    first = where[ls[0]['id']]
    rows.append(f"| [{lv['name']}](./{first[0]}/{first[1]}/) | {lv['tag']} | {len(ls)} | {sum(l['minutes'] for l in ls)} phút | {lv['desc']} |")
total_q = sum(len(l['quiz']) for l in d['lessons']); total_c = sum(len(l['cards']) for l in d['lessons'])
open(os.path.join(out_root, 'index.md'), 'w', encoding='utf-8').write(f"""---
title: Lộ trình System Design
description: Lộ trình học system design từ cơ bản đến nâng cao, dựa trên The System Design Primer.
---

Khóa học đi từ tư duy nền tảng về hiệu năng tới các bài thiết kế hệ thống có lời giải đầy đủ. Phần lõi dựa trên [The System Design Primer](https://github.com/donnemartin/system-design-primer) của Donne Martin, bổ sung mười bài về các chủ đề hiện đại mà Primer chưa có.

## Lộ trình

| Chặng | Mức | Số bài | Thời lượng | Nội dung |
|---|---|---|---|---|
{chr(10).join(rows)}

Tổng cộng {len(d['lessons'])} bài, {total_q} câu hỏi kiểm tra và {total_c} flashcard.

## Mỗi bài gồm gì

1. **Ý chính** bằng tiếng Việt ở đầu bài.
2. **Nội dung.** 28 bài dựa trên Primer giữ nguyên phần thân tiếng Anh của bản gốc; 10 bài chủ đề hiện đại viết bằng tiếng Việt.
3. **Flashcard** để ôn nhanh các khái niệm của bài.
4. **Kiểm tra cuối bài.** Trả lời đúng toàn bộ trong một lượt thì bài được tích hoàn thành trong checklist ở góc phải dưới.
5. **Đánh giá** 1–5 sao và ô góp ý.

Link tới bài đọc thêm có chú giải tiếng Việt: rê chuột lên link để xem tóm tắt. Link đã chết được thay bằng bản lưu trữ trên web.archive.org.

## Bắt đầu

Vào bài đầu tiên: [{d['lessons'][0]['title']}](./{where[d['lessons'][0]['id']][0]}/{where[d['lessons'][0]['id']][1]}/).

## Nguồn và giấy phép

- Phần nội dung lấy từ The System Design Primer thuộc giấy phép [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); mỗi bài có link về đoạn gốc.
- Hình minh họa và phần giải thích trong mục “Hình minh họa ByteByteGo” là của [ByteByteGo](https://bytebytego.com/guides/), giữ nguyên bản gốc và luôn kèm link nguồn. Bản quyền thuộc ByteByteGo.
- Tiêu đề, ý chính, câu hỏi, flashcard và mười bài chủ đề hiện đại là phần riêng của khóa học.
""")

# ảnh
img_dst = os.path.join(dst, 'public/sd-images')
if os.path.isdir(img_dst): shutil.rmtree(img_dst)
shutil.copytree(os.path.join(src, 'images'), img_dst)
print('lessons', len(d['lessons']), 'guides', len(d['guides']), 'images', sum(len(f) for _, _, f in os.walk(img_dst)))
