#!/usr/bin/env python3
"""Kiểm tra site đã build (dist/): mọi link nội bộ, ảnh cục bộ, anchor trong trang,
và mọi đích "Học lại" của quiz/thi thử đều tồn tại. Chạy sau `npm run build`.

    python3 scripts/check-links.py          # in lỗi, thoát mã 1 nếu có
"""
import glob, html, json, os, posixpath, re, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
BASE = '/architect-courses'
cfg = open(os.path.join(ROOT, 'astro.config.mjs'), encoding='utf-8').read()
m = re.search(r"base:\s*'([^']+)'", cfg)
if m: BASE = m.group(1).rstrip('/')

_ids = {}
def ids(page):
    """Tập id trong một trang đã build; None nếu trang không tồn tại."""
    page = page.strip('/')
    if page not in _ids:
        p = os.path.join(DIST, page, 'index.html')
        _ids[page] = set(html.unescape(x) for x in re.findall(r'\sid="([^"]+)"', open(p, encoding='utf-8').read())) if os.path.exists(p) else None
    return _ids[page]

bad = []
# 1. Đích "Học lại" trong frontmatter và ngân hàng thi thử
def check_relearn(owner, slug, target):
    page, _, anchor = (slug + target).partition('#') if target.startswith('#') else target.partition('#')
    found = ids(page)
    if found is None: bad.append(f'{owner}: Học lại -> trang không tồn tại: {target}')
    elif anchor and anchor not in found: bad.append(f'{owner}: Học lại -> thiếu tiêu đề: {target}')

n_relearn = 0
for f in glob.glob(os.path.join(ROOT, 'src/content/docs/**/*.md*'), recursive=True):
    slug = os.path.relpath(f, os.path.join(ROOT, 'src/content/docs')).rsplit('.', 1)[0]
    for t in re.findall(r'relearn: "([^"]+)"', open(f, encoding='utf-8').read()):
        check_relearn(slug, slug, t); n_relearn += 1
for f in glob.glob(os.path.join(ROOT, 'src/data/exam/*.json')):
    for q in json.load(open(f, encoding='utf-8')):
        check_relearn(os.path.basename(f), '', q['relearn']); n_relearn += 1

# 2. Link, ảnh và anchor trong phần nội dung của mọi trang đã build
n_links = 0
for f in glob.glob(os.path.join(DIST, '**/index.html'), recursive=True):
    page = '/' + os.path.relpath(os.path.dirname(f), DIST).replace(os.sep, '/').strip('.').strip('/')
    page = (page.rstrip('/') + '/')
    text = open(f, encoding='utf-8').read()
    main = re.search(r'<main[\s\S]*?</main>', text)
    if not main: continue
    for attr, url in re.findall(r'\s(href|src)="([^"]+)"', main.group(0)):
        url = html.unescape(url)
        if re.match(r'^(https?:|mailto:|data:|javascript:)', url): continue
        n_links += 1
        path, _, anchor = url.partition('#')
        if not path:
            target = page
        elif path.startswith('/'):
            if not path.startswith(BASE + '/') and path != BASE: bad.append(f'{page}: đường dẫn ngoài base: {url}'); continue
            target = path[len(BASE):]
        else:
            target = posixpath.normpath(posixpath.join(page, path))
        target = urllib.parse.unquote(target)
        fs = os.path.join(DIST, target.strip('/'))
        if os.path.isfile(fs):
            continue
        if not os.path.isfile(os.path.join(fs, 'index.html')):
            bad.append(f'{page}: hỏng {attr}: {url}'); continue
        if anchor and attr == 'href':
            found = ids(target)
            if urllib.parse.unquote(anchor) not in (found or set()):
                bad.append(f'{page}: thiếu anchor: {url}')

for b in bad: print(b)
print(f'[check-links] {n_relearn} đích Học lại, {n_links} link/ảnh nội bộ, {len(bad)} lỗi')
sys.exit(1 if bad else 0)
