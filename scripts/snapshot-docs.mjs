// Chụp các trang tài liệu chính thức được dẫn trong bài học, để người học đọc
// ngay trong trang (ngăn trượt bên phải) mà không phải mở tab mới.
//
// - Quét src/content/docs tìm link tới các site tài liệu bên dưới.
// - Tải bản Markdown của từng trang (thêm ".md" vào URL).
// - Chuyển thành HTML đã lọc, ghi vào public/docs-snapshot/ (KHÔNG commit).
// - Một trang tải lỗi không làm hỏng build: ngăn trượt sẽ hiện link gốc.
//
// Dùng:  node scripts/snapshot-docs.mjs            (tải lại tất cả)
//        node scripts/snapshot-docs.mjs --if-missing (chỉ tải trang chưa có)

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'src/content/docs');
const OUT_DIR = path.join(ROOT, 'public/docs-snapshot');
const IF_MISSING = process.argv.includes('--if-missing');

const DOC_HOSTS = ['platform.claude.com', 'code.claude.com', 'modelcontextprotocol.io'];
const URL_RE = new RegExp(
	`https://(?:${DOC_HOSTS.map((h) => h.replaceAll('.', '\\.')).join('|')})/[^\\s)"'<>\\]]*`,
	'g'
);

/** Bỏ #hash, ?query, dấu / cuối và đuôi .md để có một khóa duy nhất cho mỗi trang. */
export function canonical(url) {
	const u = new URL(url);
	let p = u.pathname.replace(/\.md$/, '').replace(/\/$/, '');
	return `${u.origin}${p}`;
}

const keyOf = (url) => createHash('sha1').update(url).digest('hex').slice(0, 12);

async function walk(dir) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await walk(full)));
		else if (/\.mdx?$/.test(entry.name)) out.push(full);
	}
	return out;
}

async function collectUrls() {
	const urls = new Set();
	for (const file of await walk(CONTENT_DIR)) {
		const text = await readFile(file, 'utf8');
		for (const m of text.matchAll(URL_RE)) {
			try {
				const c = canonical(m[0].replace(/[.,;:]+$/, ''));
				const u = new URL(c);
				// Chỉ chụp trang tài liệu, không chụp trang console hay trang chủ.
				if (u.hostname === 'modelcontextprotocol.io' ? u.pathname.length > 1 : u.pathname.startsWith('/docs/'))
					urls.add(c);
			} catch {
				/* bỏ qua URL hỏng */
			}
		}
	}
	return [...urls].sort();
}

// ---------- Markdown của site tài liệu -> Markdown thường ----------

const CALLOUTS = { Note: 'note', Tip: 'tip', Warning: 'warning', Info: 'note', Check: 'tip' };

function attr(tag, name) {
	const m = tag.match(new RegExp(`${name}="([^"]*)"`));
	return m ? m[1] : '';
}

/** Đổi các thẻ component (Note, Card, Accordion…) thành HTML thường và gỡ thụt lề của chúng. */
function preprocess(md) {
	// Bỏ frontmatter và khối "Documentation Index" ở đầu file.
	md = md.replace(/^---\n[\s\S]*?\n---\n/, '');
	md = md.replace(/^> ## Documentation Index\n(?:>.*\n)*/m, '');

	const out = [];
	let depth = 0;
	let fence = null; // { marker, indent }
	for (const raw of md.split('\n')) {
		if (fence) {
			const line = raw.slice(Math.min(fence.indent, raw.length - raw.trimStart().length));
			out.push(line);
			if (line.trimStart().startsWith(fence.marker) && line.trim() === fence.marker) fence = null;
			continue;
		}
		const indent = raw.length - raw.trimStart().length;
		const line = raw.slice(Math.min(indent, depth * 2));
		const t = line.trim();

		const fm = t.match(/^(`{3,}|~{3,})(.*)$/);
		if (fm) {
			// "```python Python theme={null}" -> "```python"
			const lang = fm[2].trim().split(/\s+/)[0] || '';
			fence = { marker: fm[1], indent: Math.min(indent, depth * 2) };
			out.push(fm[1] + lang.replace(/[^\w+-]/g, ''));
			continue;
		}

		const open = t.match(/^<([A-Z][A-Za-z]*)(\s[^>]*)?>$/);
		const close = t.match(/^<\/([A-Z][A-Za-z]*)>$/);
		const selfClosing = t.match(/^<([A-Z][A-Za-z]*)(\s[^>]*)?\/>$/);
		if (selfClosing) continue;
		if (open) {
			const [, name, attrs = ''] = open;
			const title = attr(attrs, 'title');
			depth++;
			if (CALLOUTS[name]) out.push('', `<div class="ccf-callout ccf-${CALLOUTS[name]}">`, '');
			else if (name === 'Accordion') out.push('', `<details><summary>${title}</summary>`, '');
			else if (name === 'Card') {
				const href = attr(attrs, 'href');
				out.push('', `<div class="ccf-card">`, '', href ? `**[${title}](${href})**` : `**${title}**`, '');
			} else if (title) out.push('', `<div class="ccf-block">`, '', `**${title}**`, '');
			else out.push('', `<div class="ccf-block">`, '');
			continue;
		}
		if (close) {
			depth = Math.max(0, depth - 1);
			out.push('', close[1] === 'Accordion' ? '</details>' : '</div>', '');
			continue;
		}
		out.push(line);
	}
	return out.join('\n');
}

function slugify(text) {
	return text
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/[`*_~]/g, '')
		.replace(/&[a-z]+;/g, '')
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');
}

function render(md, pageUrl) {
	const marked = new Marked({ gfm: true });
	const seen = new Map();
	marked.use({
		renderer: {
			heading({ tokens, depth }) {
				const inner = this.parser.parseInline(tokens);
				let id = slugify(inner);
				const n = seen.get(id) ?? 0;
				seen.set(id, n + 1);
				if (n) id = `${id}-${n}`;
				// h1 của trang gốc thành h2 trong ngăn trượt.
				const level = Math.min(6, depth + 1);
				return `<h${level} id="${id}">${inner}</h${level}>\n`;
			},
		},
	});
	const html = marked.parse(md);

	return sanitizeHtml(html, {
		allowedTags: [
			'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em',
			'strong', 'del', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br', 'div', 'span',
			'details', 'summary', 'img', 'kbd', 'sup', 'sub',
		],
		allowedAttributes: {
			a: ['href', 'title'],
			img: ['src', 'alt', 'title'],
			code: ['class'],
			div: ['class'],
			th: ['align'],
			td: ['align'],
			'*': ['id'],
		},
		allowedSchemes: ['https', 'mailto'],
		allowedClasses: {
			div: ['ccf-callout', 'ccf-note', 'ccf-tip', 'ccf-warning', 'ccf-card', 'ccf-block'],
			code: [/^language-[\w+-]+$/],
		},
		transformTags: {
			// Link và ảnh tương đối -> tuyệt đối, để chạy được ngoài site gốc.
			a: (tagName, attribs) => {
				if (attribs.href) {
					try {
						attribs.href = new URL(attribs.href, pageUrl).href;
					} catch {
						delete attribs.href;
					}
				}
				return { tagName, attribs };
			},
			img: (tagName, attribs) => {
				if (attribs.src) {
					try {
						attribs.src = new URL(attribs.src, pageUrl).href;
					} catch {
						delete attribs.src;
					}
				}
				return { tagName, attribs: { ...attribs, loading: 'lazy' } };
			},
		},
	});
}

function titleOf(md, url) {
	const fm = md.match(/^---\n(?:[^\n]*\n)*?title:\s*(.+)\n/);
	if (fm) return fm[1].trim().replace(/^["']|["']$/g, '');
	const h1 = md.match(/^# (.+)$/m);
	return h1 ? h1[1].trim() : new URL(url).pathname.split('/').pop();
}

async function snapshot(url) {
	const res = await fetch(`${url}.md`, {
		redirect: 'follow',
		headers: { accept: 'text/markdown, text/plain;q=0.9' },
		signal: AbortSignal.timeout(30_000),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const type = res.headers.get('content-type') ?? '';
	if (!/markdown|text\/plain/.test(type)) throw new Error(`không phải Markdown (${type})`);
	const md = await res.text();
	// Trang có thể đã chuyển địa chỉ; link tương đối phải tính theo địa chỉ cuối.
	const finalUrl = canonical(res.url);
	return { title: titleOf(md, url), html: render(preprocess(md), finalUrl), finalUrl };
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	const indexPath = path.join(OUT_DIR, 'index.json');
	let index = { generatedAt: null, pages: {} };
	if (IF_MISSING && existsSync(indexPath)) {
		try {
			index = JSON.parse(await readFile(indexPath, 'utf8'));
		} catch {
			/* index hỏng thì dựng lại */
		}
	}

	const urls = await collectUrls();
	const today = new Date().toISOString().slice(0, 10);
	const pages = {};
	let ok = 0;
	let failed = 0;
	let reused = 0;

	for (const url of urls) {
		const key = keyOf(url);
		const prev = index.pages?.[url];
		if (IF_MISSING && prev?.ok && existsSync(path.join(OUT_DIR, `${key}.html`))) {
			pages[url] = prev;
			reused++;
			continue;
		}
		try {
			const { title, html, finalUrl } = await snapshot(url);
			await writeFile(path.join(OUT_DIR, `${key}.html`), html);
			pages[url] = { ok: true, key, title, date: today, source: finalUrl };
			ok++;
			console.log(`  ✓ ${url}`);
		} catch (err) {
			pages[url] = { ok: false, key, source: url };
			failed++;
			console.warn(`  ✗ ${url} — ${err.message}`);
		}
	}

	await writeFile(indexPath, JSON.stringify({ generatedAt: today, pages }, null, 1));
	console.log(
		`[snapshot-docs] ${urls.length} trang: ${ok} mới, ${reused} dùng lại, ${failed} lỗi.`
	);
}

main().catch((err) => {
	// Không bao giờ làm hỏng build vì tài liệu bên ngoài.
	console.warn(`[snapshot-docs] bỏ qua do lỗi: ${err.message}`);
});
