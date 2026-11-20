// Toàn bộ phần tương tác của trang học: tiến trình (localStorage), quiz,
// đánh giá sao + comment, checklist nổi, ngăn trượt tài liệu, lưu/khôi phục.
// Không dùng framework: mỗi trang là một lần tải đầy đủ.

type LessonState = {
	done?: boolean;
	doneAt?: string;
	best?: number; // tỉ lệ đúng cao nhất, 0..1
	attempts?: number;
	rating?: number; // 1..5
	comment?: string;
	note?: string;
	lastExam?: { at: string; correct: number; total: number; byDomain: Record<string, { correct: number; total: number }> };
};
type State = { app: string; version: 1; lessons: Record<string, LessonState> };

type Option = { text: string; why?: string };
type Question = {
	q: string;
	code?: string;
	options: Option[];
	answer: number;
	why?: string;
	keyword?: string;
	relearn?: string;
	relearnLabel?: string;
	domain?: number;
};
type Item = {
	id: string;
	title: string;
	course: string;
	group: string;
	kind: 'lesson' | 'lab' | 'quiz' | 'exam';
	href: string;
};
type Card = { q: string; a: string };
type PageData = {
	base: string;
	current: string;
	course: string | null;
	courses: { id: string; name: string; href: string }[];
	items: Item[];
	cards: Card[];
	quiz: Question[] | null;
	exam: Question[] | null;
};

const APP = 'architect-courses';
const KEY = 'ccf-progress-v1';
const PASS_MODULE = 0.7;
const PASS_EXAM = 0.72;
const EXAM_MINUTES = 120;
const EXAM_RUN_KEY = 'ccf-exam-run-v1';
const DOMAINS: Record<number, string> = {
	1: 'Kiến trúc agent và điều phối',
	2: 'Thiết kế tool và tích hợp MCP',
	3: 'Cấu hình và quy trình Claude Code',
	4: 'Prompt engineering và structured output',
	5: 'Quản lý context và độ tin cậy',
};
const DOC_HOSTS = ['platform.claude.com', 'code.claude.com', 'modelcontextprotocol.io'];
const LETTERS = 'ABCDEFGH';

const page: PageData = JSON.parse(document.getElementById('ccf-data')?.textContent ?? '{}');
const currentItem = page.items?.find((i) => i.id === page.current) ?? null;

// ---------------------------------------------------------------- tiện ích

const esc = (s: string) =>
	s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Markdown tối giản cho câu hỏi và lời giải: `code` và **đậm**. */
const inline = (s: string) =>
	esc(s)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

function h<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attrs: Record<string, string> = {},
	html = ''
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	if (html) el.innerHTML = html;
	return el;
}

function toast(message: string) {
	document.querySelector('.ccf-toast')?.remove();
	const el = h('div', { class: 'ccf-toast', role: 'status' });
	el.textContent = message;
	document.body.append(el);
	setTimeout(() => el.remove(), 3200);
}

// ---------------------------------------------------------------- lưu trữ

function load(): State {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const s = JSON.parse(raw);
			if (s && typeof s.lessons === 'object') return { app: APP, version: 1, lessons: s.lessons };
		}
	} catch {
		/* localStorage bị chặn hoặc dữ liệu hỏng: bắt đầu lại từ trống */
	}
	return { app: APP, version: 1, lessons: {} };
}

let state = load();

function save() {
	try {
		localStorage.setItem(KEY, JSON.stringify(state));
	} catch {
		toast('Trình duyệt không cho lưu tiến trình (localStorage bị chặn).');
	}
	renderChecklist();
}

function lessonState(id: string): LessonState {
	return (state.lessons[id] ??= {});
}

// ---------------------------------------------------------------- quiz

const relearnButton = (q: Question) => {
	if (!q.relearn) return '';
	const label = q.relearnLabel ? `Học lại: ${esc(q.relearnLabel)}` : 'Học lại';
	return `<button type="button" class="ccf-relearn" data-relearn="${esc(q.relearn)}">← ${label}</button>`;
};

/** Lời giải đầy đủ: phương án đúng, lý do từng phương án, từ khóa. */
const fullExplanation = (q: Question, picked: number) => {
	// Câu hỏi chỉ có một lời giải chung (không có lý do riêng cho từng phương án).
	if (!q.options.some((o) => o.why)) {
		const answer = `<p><strong>Đáp án: ${LETTERS[q.answer]}.</strong> ${inline(q.options[q.answer].text)}</p>`;
		return answer + (q.why ? `<p>${inline(q.why)}</p>` : '');
	}
	const rows = q.options
		.map((o, i) => {
			const mark = i === q.answer ? '✓' : '✗';
			const cls = i === q.answer ? 'ok' : i === picked ? 'bad' : '';
			return `<li class="${cls}"><strong>${mark} ${LETTERS[i]}.</strong> ${inline(o.why ?? '')}</li>`;
		})
		.join('');
	const kw = q.keyword
		? `<p class="ccf-keyword"><strong>Từ khóa chốt đáp án:</strong> ${inline(q.keyword)}</p>`
		: '';
	return `<ul class="ccf-why">${rows}</ul>${kw}`;
};

function setupQuiz() {
	const root = document.querySelector<HTMLElement>('.ccf-quiz');
	if (!root || !page.quiz || !currentItem) return;
	const questions = page.quiz;
	const isModule = currentItem.kind === 'quiz';
	const submit = root.querySelector<HTMLButtonElement>('.ccf-submit')!;
	const retry = root.querySelector<HTMLButtonElement>('.ccf-retry')!;
	const result = root.querySelector<HTMLElement>('.ccf-result')!;
	const status = root.querySelector<HTMLElement>('.ccf-quiz-status')!;
	const items = [...root.querySelectorAll<HTMLElement>('.ccf-q')];

	const showStatus = () => {
		const s = state.lessons[currentItem.id];
		if (s?.done) {
			status.hidden = false;
			status.textContent = isModule
				? `Đã đạt. Điểm cao nhất: ${Math.round((s.best ?? 0) * 100)}%.`
				: 'Bạn đã hoàn thành bài này. Có thể làm lại để ôn.';
		} else if (isModule && s?.best != null) {
			status.hidden = false;
			status.textContent = `Chưa đạt. Điểm cao nhất: ${Math.round(s.best * 100)}% (cần 70%).`;
		} else status.hidden = true;
	};
	showStatus();

	const chosen = (i: number) => {
		const el = items[i].querySelector<HTMLInputElement>('input:checked');
		return el ? Number(el.value) : -1;
	};

	submit.addEventListener('click', () => {
		const picks = questions.map((_, i) => chosen(i));
		const missing = picks.findIndex((p) => p < 0);
		if (missing >= 0) {
			result.textContent = `Bạn chưa trả lời câu ${missing + 1}.`;
			items[missing].scrollIntoView({ behavior: 'smooth', block: 'center' });
			return;
		}
		const correct = picks.filter((p, i) => p === questions[i].answer).length;
		const ratio = correct / questions.length;
		const passed = isModule ? ratio >= PASS_MODULE : correct === questions.length;
		const reveal = isModule || passed;

		items.forEach((item, i) => {
			const q = questions[i];
			const ok = picks[i] === q.answer;
			const fb = item.querySelector<HTMLElement>('.ccf-feedback')!;
			item.classList.toggle('is-correct', ok);
			item.classList.toggle('is-wrong', !ok);
			item.querySelectorAll<HTMLInputElement>('input').forEach((input) => (input.disabled = true));
			if (reveal) {
				item.querySelectorAll('.ccf-opt')[q.answer]?.classList.add('is-answer');
				fb.innerHTML =
					`<p class="ccf-verdict">${ok ? '✓ Đúng' : '✗ Sai'}</p>` +
					fullExplanation(q, picks[i]) +
					(ok ? '' : relearnButton(q));
			} else if (ok) {
				fb.innerHTML = `<p class="ccf-verdict">✓ Đúng</p>`;
			} else {
				// Chưa qua thì không lộ đáp án: chỉ nói vì sao lựa chọn này sai.
				fb.innerHTML =
					`<p class="ccf-verdict">✗ Chưa đúng</p>` +
					`<p>${inline(q.options[picks[i]].why ?? 'Đọc lại phần liên quan trong bài rồi thử lại.')}</p>` +
					relearnButton(q);
			}
			fb.hidden = false;
		});

		const s = lessonState(currentItem.id);
		s.attempts = (s.attempts ?? 0) + 1;
		s.best = Math.max(s.best ?? 0, ratio);
		if (passed && !s.done) {
			s.done = true;
			s.doneAt = new Date().toISOString();
		}
		save();
		showStatus();

		const score = `${correct}/${questions.length}`;
		if (passed) {
			result.textContent = isModule
				? `Đạt: ${score} (${Math.round(ratio * 100)}%). Đã tích hoàn thành.`
				: `Đúng cả ${score}. Bài học đã được tích hoàn thành.`;
			result.className = 'ccf-result is-pass';
		} else {
			result.textContent = isModule
				? `Chưa đạt: ${score} (${Math.round(ratio * 100)}%). Cần từ 70%.`
				: `Đúng ${score}. Cần đúng toàn bộ trong một lượt để hoàn thành bài.`;
			result.className = 'ccf-result is-fail';
		}
		submit.hidden = true;
		retry.hidden = false;
		retry.textContent = passed ? 'Làm lại để ôn' : 'Làm lại';
	});

	retry.addEventListener('click', () => {
		items.forEach((item) => {
			item.classList.remove('is-correct', 'is-wrong');
			item.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
				input.disabled = false;
				input.checked = false;
			});
			item.querySelectorAll('.ccf-opt').forEach((o) => o.classList.remove('is-answer'));
			const fb = item.querySelector<HTMLElement>('.ccf-feedback')!;
			fb.hidden = true;
			fb.innerHTML = '';
		});
		result.textContent = '';
		result.className = 'ccf-result';
		submit.hidden = false;
		retry.hidden = true;
		items[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
	});

	root.addEventListener('click', (e) => {
		const btn = (e.target as HTMLElement).closest<HTMLElement>('.ccf-relearn');
		if (btn) relearn(btn.dataset.relearn!);
	});
}

/** "Học lại": cuộn tới đoạn trong bài này, hoặc mở bài khác trong ngăn trượt. */
function relearn(target: string) {
	if (target.startsWith('#')) {
		const el = document.getElementById(target.slice(1));
		if (!el) return;
		el.scrollIntoView({ block: 'start' });
		const section = el.closest('.sl-heading-wrapper') ?? el;
		section.classList.add('ccf-flash');
		setTimeout(() => section.classList.remove('ccf-flash'), 2400);
		return;
	}
	const [slug, hash = ''] = target.split('#');
	openLesson(`${page.base}/${slug.replace(/^\/|\/$/g, '')}/`, hash);
}


// ---------------------------------------------------------------- thi thử

type ExamRun = { order: number[]; answers: Record<string, number>; deadline: number };

function setupExam() {
	const root = document.querySelector<HTMLElement>('.ccf-exam');
	if (!root || !page.exam?.length || !currentItem) return;
	const bank = page.exam;
	const intro = root.querySelector<HTMLElement>('.ccf-exam-intro')!;
	const status = root.querySelector<HTMLElement>('.ccf-quiz-status')!;
	const bar = root.querySelector<HTMLElement>('.ccf-exam-bar')!;
	const timerEl = root.querySelector<HTMLElement>('.ccf-exam-timer')!;
	const countEl = root.querySelector<HTMLElement>('.ccf-exam-count')!;
	const list = root.querySelector<HTMLElement>('.ccf-exam-questions')!;
	const resultEl = root.querySelector<HTMLElement>('.ccf-exam-result')!;
	let run: ExamRun | null = null;
	let tick: number | undefined;

	const pct = (n: number) => `${Math.round(n * 100)}%`;

	const showStatus = () => {
		const s = state.lessons[currentItem.id];
		if (s?.best == null) return void (status.hidden = true);
		status.hidden = false;
		status.textContent = s.done
			? `Đã đạt. Điểm cao nhất: ${pct(s.best)}. Số lần thi: ${s.attempts ?? 1}.`
			: `Chưa đạt. Điểm cao nhất: ${pct(s.best)} (cần ${pct(PASS_EXAM)}). Số lần thi: ${s.attempts ?? 1}.`;
		status.classList.toggle('is-fail', !s.done);
	};

	const saveRun = () => {
		try {
			if (run) localStorage.setItem(EXAM_RUN_KEY, JSON.stringify(run));
			else localStorage.removeItem(EXAM_RUN_KEY);
		} catch {
			/* không lưu được thì bài thi vẫn chạy, chỉ mất khả năng khôi phục khi tải lại trang */
		}
	};

	const renderQuestions = () => {
		list.innerHTML = run!.order
			.map((qi, n) => {
				const q = bank[qi];
				const opts = q.options
					.map(
						(o, j) => `<label class="ccf-opt">
							<input type="radio" name="ccf-e${n}" value="${j}"${run!.answers[n] === j ? ' checked' : ''} />
							<span class="ccf-letter">${LETTERS[j]}</span>
							<span class="ccf-opt-text">${inline(o.text)}</span>
						</label>`
					)
					.join('');
				const code = q.code ? `<pre class="ccf-q-code"><code>${esc(q.code)}</code></pre>` : '';
				return `<li class="ccf-q" data-n="${n}">
					<p class="ccf-q-text">${inline(q.q)}</p>${code}
					<div class="ccf-options" role="radiogroup" aria-label="Câu ${n + 1}">${opts}</div>
					<div class="ccf-feedback" hidden></div>
				</li>`;
			})
			.join('');
	};

	const updateCount = () => {
		countEl.textContent = `Đã trả lời ${Object.keys(run!.answers).length}/${run!.order.length}`;
	};

	const updateTimer = () => {
		const left = Math.max(0, Math.round((run!.deadline - Date.now()) / 1000));
		const m = Math.floor(left / 60);
		timerEl.textContent = `${String(m).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
		timerEl.classList.toggle('is-low', left <= 300);
		if (left <= 0) finish(true);
	};

	const begin = (resumed: boolean) => {
		intro.hidden = true;
		resultEl.hidden = true;
		bar.hidden = false;
		renderQuestions();
		updateCount();
		updateTimer();
		clearInterval(tick);
		tick = window.setInterval(updateTimer, 1000);
		if (resumed) toast('Đã khôi phục bài thi đang làm dở.');
	};

	const start = () => {
		const order = bank.map((_, i) => i);
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}
		run = { order, answers: {}, deadline: Date.now() + EXAM_MINUTES * 60_000 };
		saveRun();
		begin(false);
		root.scrollIntoView({ block: 'start' });
	};

	function finish(timeUp: boolean) {
		if (!run) return;
		const total = run.order.length;
		const answered = Object.keys(run.answers).length;
		if (!timeUp && answered < total && !confirm(`Bạn còn ${total - answered} câu chưa trả lời. Câu bỏ trống tính là sai. Nộp bài?`)) return;
		clearInterval(tick);

		const byDomain: Record<string, { correct: number; total: number }> = {};
		let correct = 0;
		const items = [...list.querySelectorAll<HTMLElement>('.ccf-q')];
		run.order.forEach((qi, n) => {
			const q = bank[qi];
			const picked = run!.answers[n] ?? -1;
			const ok = picked === q.answer;
			const d = (byDomain[String(q.domain ?? 0)] ??= { correct: 0, total: 0 });
			d.total++;
			if (ok) {
				d.correct++;
				correct++;
			}
			const item = items[n];
			item.classList.add(ok ? 'is-correct' : 'is-wrong');
			item.querySelectorAll<HTMLInputElement>('input').forEach((i) => (i.disabled = true));
			item.querySelectorAll('.ccf-opt')[q.answer]?.classList.add('is-answer');
			const fb = item.querySelector<HTMLElement>('.ccf-feedback')!;
			const verdict = ok ? '✓ Đúng' : picked < 0 ? '✗ Bỏ trống' : '✗ Sai';
			fb.innerHTML = `<p class="ccf-verdict">${verdict} · Domain ${q.domain ?? '?'}</p>` + fullExplanation(q, picked) + (ok ? '' : relearnButton(q));
			fb.hidden = false;
		});

		const ratio = correct / total;
		const passed = ratio >= PASS_EXAM;
		const s = lessonState(currentItem!.id);
		s.attempts = (s.attempts ?? 0) + 1;
		s.best = Math.max(s.best ?? 0, ratio);
		s.lastExam = { at: new Date().toISOString(), correct, total, byDomain };
		if (passed && !s.done) {
			s.done = true;
			s.doneAt = s.lastExam.at;
		}
		run = null;
		saveRun();
		save();
		showStatus();

		const rows = Object.entries(byDomain)
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([d, v]) => {
				const r = v.correct / v.total;
				return `<tr class="${r < PASS_EXAM ? 'is-weak' : ''}"><td>${d}. ${esc(DOMAINS[Number(d)] ?? 'Khác')}</td><td>${v.correct}/${v.total}</td><td>${pct(r)}</td></tr>`;
			})
			.join('');
		const weakest = Object.entries(byDomain).sort(([, a], [, b]) => a.correct / a.total - b.correct / b.total)[0];
		resultEl.innerHTML = `
			<h3>${passed ? 'Đạt' : 'Chưa đạt'}: ${correct}/${total} (${pct(ratio)})</h3>
			<p>${timeUp ? 'Hết giờ, bài được nộp tự động. ' : ''}Ngưỡng luyện tập của khóa học là ${pct(PASS_EXAM)}.${
				weakest ? ` Domain yếu nhất: <strong>${weakest[0]}. ${esc(DOMAINS[Number(weakest[0])] ?? '')}</strong>.` : ''
			}</p>
			<table class="ccf-exam-table"><thead><tr><th>Domain</th><th>Đúng</th><th>Tỉ lệ</th></tr></thead><tbody>${rows}</tbody></table>
			<p><button type="button" class="ccf-btn ccf-btn-primary ccf-exam-again">Thi lại với thứ tự câu mới</button></p>
			<p class="ccf-muted">Lời giải từng câu nằm bên dưới. Câu sai có nút “Học lại” mở đúng đoạn bài học.</p>`;
		resultEl.hidden = false;
		bar.hidden = true;
		resultEl.scrollIntoView({ block: 'start' });
	}

	list.addEventListener('change', (e) => {
		const input = e.target as HTMLInputElement;
		if (!run || input.type !== 'radio') return;
		const n = input.closest<HTMLElement>('.ccf-q')!.dataset.n!;
		run.answers[n] = Number(input.value);
		saveRun();
		updateCount();
	});
	root.addEventListener('click', (e) => {
		const el = e.target as HTMLElement;
		const rl = el.closest<HTMLElement>('.ccf-relearn');
		if (rl) return relearn(rl.dataset.relearn!);
		if (el.closest('.ccf-exam-start') || el.closest('.ccf-exam-again')) return start();
		if (el.closest('.ccf-exam-submit')) return finish(false);
	});

	showStatus();
	// Tải lại trang giữa chừng: khôi phục bài đang làm nếu còn giờ.
	try {
		const saved = JSON.parse(localStorage.getItem(EXAM_RUN_KEY) ?? 'null') as ExamRun | null;
		if (saved && saved.deadline > Date.now() && saved.order?.length === bank.length) {
			run = saved;
			begin(true);
		} else if (saved) localStorage.removeItem(EXAM_RUN_KEY);
	} catch {
		/* dữ liệu bài thi dở bị hỏng: bỏ qua */
	}
}


// ---------------------------------------------------------------- flashcard

function setupCards() {
	const root = document.querySelector<HTMLElement>('.ccf-cards');
	if (!root || !page.cards?.length) return;
	const card = root.querySelector<HTMLButtonElement>('.ccf-card')!;
	const side = root.querySelector<HTMLElement>('.ccf-card-side')!;
	const text = root.querySelector<HTMLElement>('.ccf-card-text')!;
	const count = root.querySelector<HTMLElement>('.ccf-card-count')!;
	let order = page.cards.map((_, i) => i);
	let pos = 0;
	let flipped = false;

	const paint = () => {
		const c = page.cards[order[pos]];
		card.classList.toggle('is-flipped', flipped);
		side.textContent = flipped ? 'Trả lời' : 'Câu hỏi';
		text.innerHTML = inline(flipped ? c.a : c.q);
		count.textContent = `Thẻ ${pos + 1}/${order.length}`;
	};
	const go = (delta: number) => {
		pos = (pos + delta + order.length) % order.length;
		flipped = false;
		paint();
	};

	card.addEventListener('click', () => {
		flipped = !flipped;
		paint();
	});
	root.querySelector('.ccf-card-prev')!.addEventListener('click', () => go(-1));
	root.querySelector('.ccf-card-next')!.addEventListener('click', () => go(1));
	root.querySelector('.ccf-card-shuffle')!.addEventListener('click', () => {
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}
		pos = 0;
		flipped = false;
		paint();
	});
	// Phím mũi tên chỉ có tác dụng khi tiêu điểm đang ở trong khối flashcard.
	root.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowRight') go(1);
		else if (e.key === 'ArrowLeft') go(-1);
	});
	paint();
}

// ---------------------------------------------------------------- bài không có quiz

function setupManualDone() {
	const root = document.querySelector<HTMLElement>('.ccf-manual');
	if (!root || !currentItem) return;
	const btn = root.querySelector<HTMLButtonElement>('.ccf-manual-done')!;
	const status = root.querySelector<HTMLElement>('.ccf-quiz-status')!;
	const paint = () => {
		const done = !!state.lessons[currentItem.id]?.done;
		status.hidden = !done;
		status.textContent = 'Bạn đã đánh dấu hoàn thành bài này.';
		btn.hidden = done;
	};
	btn.addEventListener('click', () => {
		const s = lessonState(currentItem.id);
		s.done = true;
		s.doneAt = new Date().toISOString();
		save();
		paint();
	});
	paint();
}

// ---------------------------------------------------------------- đánh giá

function setupRating() {
	const root = document.querySelector<HTMLElement>('.ccf-rating');
	if (!root || !currentItem) return;
	const stars = [...root.querySelectorAll<HTMLButtonElement>('.ccf-star')];
	const comment = root.querySelector<HTMLTextAreaElement>('textarea')!;
	const saved = root.querySelector<HTMLElement>('.ccf-saved')!;
	const label = root.querySelector<HTMLElement>('.ccf-star-label')!;
	const NAMES = ['', 'Rất kém', 'Kém', 'Tạm được', 'Tốt', 'Rất tốt'];

	const paint = (n: number) => {
		stars.forEach((s, i) => {
			s.classList.toggle('is-on', i < n);
			s.setAttribute('aria-checked', String(i + 1 === n));
		});
		label.textContent = n ? `${n}/5 · ${NAMES[n]}` : 'Chưa đánh giá';
	};
	const flash = () => {
		saved.textContent = 'Đã lưu trên trình duyệt này';
		setTimeout(() => (saved.textContent = ''), 1800);
	};

	const s = state.lessons[currentItem.id] ?? {};
	paint(s.rating ?? 0);
	comment.value = s.comment ?? '';

	stars.forEach((star, i) => {
		star.addEventListener('click', () => {
			const ls = lessonState(currentItem.id);
			// Bấm lại đúng số sao đang chọn để bỏ đánh giá.
			ls.rating = ls.rating === i + 1 ? undefined : i + 1;
			paint(ls.rating ?? 0);
			save();
			flash();
		});
		star.addEventListener('mouseenter', () => stars.forEach((x, j) => x.classList.toggle('is-hover', j <= i)));
		star.addEventListener('mouseleave', () => stars.forEach((x) => x.classList.remove('is-hover')));
	});

	let timer: number | undefined;
	comment.addEventListener('input', () => {
		clearTimeout(timer);
		timer = window.setTimeout(() => {
			lessonState(currentItem.id).comment = comment.value;
			save();
			flash();
		}, 400);
	});
}

// ---------------------------------------------------------------- checklist nổi

let fab: HTMLButtonElement;
let panel: HTMLElement;
const COURSE_KEY = 'ccf-course';
/** Khóa đang xem trong checklist: khóa của trang hiện tại, hoặc khóa xem gần nhất. */
let viewCourse: string =
	page.course ??
	(() => {
		try {
			return localStorage.getItem(COURSE_KEY);
		} catch {
			return null;
		}
	})() ??
	page.courses?.[0]?.id ??
	'';
const courseItems = () => page.items.filter((i) => i.course === viewCourse);

function setupChecklist() {
	if (!page.items?.length) return;
	fab = h('button', { class: 'ccf-fab', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'ccf-panel' });
	panel = h('aside', { class: 'ccf-panel', id: 'ccf-panel', 'aria-label': 'Checklist và ghi chú', hidden: '' });
	panel.innerHTML = `
		<header class="ccf-panel-head">
			<div class="ccf-tabs" role="tablist">
				<button type="button" role="tab" data-tab="list" aria-selected="true">Checklist</button>
				<button type="button" role="tab" data-tab="note" aria-selected="false">Ghi chú</button>
			</div>
			<button type="button" class="ccf-icon-btn ccf-panel-close" aria-label="Đóng">✕</button>
		</header>
		<div class="ccf-course-switch" role="group" aria-label="Chọn khóa học"></div>
		<div class="ccf-progress"><div class="ccf-progress-bar"></div></div>
		<div class="ccf-panel-body" data-pane="list"></div>
		<div class="ccf-panel-body" data-pane="note" hidden></div>`;
	document.body.append(fab, panel);

	const toggle = (open: boolean) => {
		panel.hidden = !open;
		fab.setAttribute('aria-expanded', String(open));
	};
	fab.addEventListener('click', () => toggle(panel.hidden));
	panel.querySelector('.ccf-panel-close')!.addEventListener('click', () => toggle(false));

	panel.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((tab) =>
		tab.addEventListener('click', () => {
			panel.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((t) =>
				t.setAttribute('aria-selected', String(t === tab))
			);
			panel.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== tab.dataset.tab));
		})
	);

	// Ghi chú theo bài đang mở.
	const notePane = panel.querySelector<HTMLElement>('[data-pane="note"]')!;
	if (currentItem) {
		notePane.innerHTML = `
			<label class="ccf-note-label" for="ccf-note">Ghi chú cho bài: <strong>${esc(currentItem.title)}</strong></label>
			<textarea id="ccf-note" class="ccf-textarea" rows="10" placeholder="Ghi lại điều cần nhớ, câu hay sai, ý tưởng…"></textarea>
			<p class="ccf-saved" aria-live="polite"></p>`;
		const ta = notePane.querySelector('textarea')!;
		const saved = notePane.querySelector<HTMLElement>('.ccf-saved')!;
		ta.value = state.lessons[currentItem.id]?.note ?? '';
		let timer: number | undefined;
		ta.addEventListener('input', () => {
			clearTimeout(timer);
			timer = window.setTimeout(() => {
				lessonState(currentItem.id).note = ta.value;
				save();
				saved.textContent = 'Đã lưu';
				setTimeout(() => (saved.textContent = ''), 1500);
			}, 400);
		});
	} else {
		notePane.innerHTML = `<p class="ccf-muted">Mở một bài học để ghi chú cho bài đó. Ghi chú của các bài nằm trong file “Lưu tiến trình học”.</p>`;
	}

	const switcher = panel.querySelector<HTMLElement>('.ccf-course-switch')!;
	if (page.courses.length > 1) {
		switcher.innerHTML = page.courses
			.map((c) => `<button type="button" data-course="${esc(c.id)}">${esc(c.name)}</button>`)
			.join('');
		switcher.addEventListener('click', (e) => {
			const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-course]');
			if (!btn) return;
			viewCourse = btn.dataset.course!;
			try {
				localStorage.setItem(COURSE_KEY, viewCourse);
			} catch {
				/* không nhớ được lựa chọn thì lần sau về mặc định */
			}
			renderChecklist();
		});
	} else switcher.hidden = true;

	panel.querySelector('[data-pane="list"]')!.addEventListener('click', (e) => {
		const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-reset]');
		if (!btn) return;
		const id = btn.dataset.reset!;
		const item = page.items.find((i) => i.id === id);
		if (!confirm(`Học lại từ đầu “${item?.title}”? Trạng thái hoàn thành và điểm sẽ bị xóa; ghi chú, sao và comment được giữ.`)) return;
		const s = lessonState(id);
		delete s.done;
		delete s.doneAt;
		delete s.best;
		delete s.attempts;
		save();
		if (id === page.current) location.reload();
	});

	renderChecklist();
}

function renderChecklist() {
	if (!panel) return;
	const list = courseItems();
	const done = list.filter((i) => state.lessons[i.id]?.done).length;
	const total = list.length;
	panel.querySelectorAll<HTMLElement>('.ccf-course-switch [data-course]').forEach((b) =>
		b.setAttribute('aria-pressed', String(b.dataset.course === viewCourse))
	);
	fab.innerHTML = `<span class="ccf-fab-icon" aria-hidden="true">☑</span><span class="ccf-fab-count">${done}/${total}</span><span class="sr-only">Mở checklist bài học</span>`;
	panel.querySelector<HTMLElement>('.ccf-progress-bar')!.style.width = `${total ? (done / total) * 100 : 0}%`;

	const byGroup = new Map<string, Item[]>();
	for (const item of list) byGroup.set(item.group, [...(byGroup.get(item.group) ?? []), item]);
	const KIND = { lesson: '', lab: 'Lab', quiz: 'Quiz', exam: 'Thi thử' };

	const courseHome = page.courses.find((c) => c.id === viewCourse);
	const html = [...byGroup.entries()]
		.map(([group, items]) => {
			const rows = items
				.map((item) => {
					const s = state.lessons[item.id];
					const isDone = !!s?.done;
					const score = (item.kind === 'quiz' || item.kind === 'exam') && s?.best != null ? ` · ${Math.round(s.best * 100)}%` : '';
					const tag = KIND[item.kind] ? `<span class="ccf-tag">${KIND[item.kind]}${score}</span>` : '';
					const reset = isDone
						? `<button type="button" class="ccf-icon-btn" data-reset="${esc(item.id)}" title="Học lại từ đầu" aria-label="Học lại từ đầu: ${esc(item.title)}">↺</button>`
						: '';
					const here = item.id === page.current ? ' aria-current="page"' : '';
					return `<li class="${isDone ? 'is-done' : ''}">
						<span class="ccf-check" aria-hidden="true">${isDone ? '✓' : ''}</span>
						<a href="${esc(item.href)}"${here}>${esc(item.title)}</a>${tag}${reset}
						<span class="sr-only">${isDone ? 'đã hoàn thành' : 'chưa hoàn thành'}</span>
					</li>`;
				})
				.join('');
			return `<h3>${esc(group)}</h3><ul class="ccf-list">${rows}</ul>`;
		})
		.join('');

	panel.querySelector('[data-pane="list"]')!.innerHTML =
		`<p class="ccf-muted">${done}/${total} mục đã hoàn thành${
			courseHome ? ` · <a href="${esc(courseHome.href)}">Trang khóa học</a>` : ''
		}. Một bài được tích khi bạn trả lời đúng toàn bộ câu hỏi cuối bài.</p>` + html;
}

// ---------------------------------------------------------------- ngăn trượt

type Snapshot = { ok: boolean; key: string; title?: string; date?: string; source: string };
let snapshotIndex: Promise<Record<string, Snapshot>> | null = null;
let drawer: HTMLElement;
const history: (() => void)[] = [];

const canonical = (url: string) => {
	const u = new URL(url);
	return u.origin + u.pathname.replace(/\.md$/, '').replace(/\/$/, '');
};

function isDocLink(a: HTMLAnchorElement) {
	try {
		const u = new URL(a.href);
		if (u.protocol !== 'https:' || !DOC_HOSTS.includes(u.hostname)) return false;
		// Chỉ trang tài liệu mới mở trong ngăn trượt; trang console, trang chủ mở bình thường.
		return u.hostname === 'modelcontextprotocol.io' ? u.pathname.length > 1 : u.pathname.startsWith('/docs/');
	} catch {
		return false;
	}
}

function getIndex() {
	snapshotIndex ??= fetch(`${page.base}/docs-snapshot/index.json`)
		.then((r) => (r.ok ? r.json() : { pages: {} }))
		.then((j) => j.pages ?? {})
		.catch(() => ({}));
	return snapshotIndex;
}

function setupDrawer() {
	drawer = h('aside', { class: 'ccf-drawer', 'aria-label': 'Tài liệu tham chiếu', hidden: '' });
	drawer.innerHTML = `
		<header class="ccf-drawer-head">
			<button type="button" class="ccf-icon-btn ccf-drawer-back" aria-label="Quay lại" hidden>←</button>
			<div class="ccf-drawer-title">
				<strong></strong>
				<span class="ccf-drawer-meta"></span>
			</div>
			<a class="ccf-drawer-source" target="_blank" rel="noopener">Mở trang gốc ↗</a>
			<button type="button" class="ccf-icon-btn ccf-drawer-close" aria-label="Đóng">✕</button>
		</header>
		<div class="ccf-drawer-body sl-markdown-content" tabindex="0"></div>`;
	document.body.append(drawer);

	const close = () => {
		drawer.hidden = true;
		history.length = 0;
		document.documentElement.classList.remove('ccf-drawer-open');
	};
	drawer.querySelector('.ccf-drawer-close')!.addEventListener('click', close);
	drawer.querySelector('.ccf-drawer-back')!.addEventListener('click', () => {
		history.pop(); // trang hiện tại
		const prev = history.pop();
		prev?.();
	});
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && !drawer.hidden) close();
	});

	// Chặn mọi cú bấm vào link tài liệu chính thức, kể cả link nằm trong ngăn trượt.
	document.addEventListener('click', (e) => {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const a = (e.target as HTMLElement).closest?.('a');
		if (!(a instanceof HTMLAnchorElement) || a.classList.contains('ccf-drawer-source')) return;
		const inDrawer = drawer.contains(a);

		if (inDrawer && a.getAttribute('href')?.startsWith('#')) {
			e.preventDefault();
			scrollDrawerTo(a.getAttribute('href')!.slice(1));
			return;
		}
		if (a.dataset.drawer !== undefined) {
			e.preventDefault();
			const u = new URL(a.href);
			openLesson(u.pathname, u.hash.slice(1));
			return;
		}
		if (!isDocLink(a)) {
			if (inDrawer) a.target = '_blank';
			return;
		}
		e.preventDefault();
		openDoc(a.href, inDrawer);
	});
}

function showDrawer(title: string, meta: string, source: string, html: string, replay: () => void) {
	history.push(replay);
	drawer.hidden = false;
	document.documentElement.classList.add('ccf-drawer-open');
	drawer.querySelector('.ccf-drawer-title strong')!.textContent = title;
	drawer.querySelector('.ccf-drawer-meta')!.textContent = meta;
	const src = drawer.querySelector<HTMLAnchorElement>('.ccf-drawer-source')!;
	src.href = source;
	drawer.querySelector<HTMLElement>('.ccf-drawer-back')!.hidden = history.length < 2;
	const body = drawer.querySelector<HTMLElement>('.ccf-drawer-body')!;
	body.innerHTML = html;
	body.scrollTop = 0;
	return body;
}

function scrollDrawerTo(id: string) {
	if (!id) return;
	const body = drawer.querySelector<HTMLElement>('.ccf-drawer-body')!;
	const el = body.querySelector<HTMLElement>(`[id="${CSS.escape(decodeURIComponent(id))}"]`);
	if (!el) return;
	el.scrollIntoView({ block: 'start' });
	el.classList.add('ccf-flash');
	setTimeout(() => el.classList.remove('ccf-flash'), 2400);
}

async function openDoc(href: string, fromDrawer = false) {
	const url = new URL(href);
	const key = canonical(href);
	const index = await getIndex();
	const snap = index[key];

	if (!snap?.ok) {
		// Trang chưa được chụp. Từ trong ngăn trượt thì mở tab mới, còn từ bài học
		// thì báo rõ thay vì âm thầm rời trang.
		if (fromDrawer) {
			window.open(href, '_blank', 'noopener');
			return;
		}
		showDrawer(
			'Không tải được bản chụp',
			'',
			href,
			`<p>Trang tài liệu này chưa có bản chụp trong lần build gần nhất (có thể trang gốc đã đổi địa chỉ).</p>
			 <p><a class="ccf-drawer-source" href="${esc(href)}" target="_blank" rel="noopener">Mở trang gốc trong tab mới ↗</a></p>`,
			() => openDoc(href)
		);
		return;
	}

	try {
		const res = await fetch(`${page.base}/docs-snapshot/${snap.key}.html`);
		if (!res.ok) throw new Error(String(res.status));
		const html = await res.text();
		const host = new URL(snap.source).hostname;
		showDrawer(
			snap.title ?? key,
			`${host} · bản chụp ngày ${snap.date}`,
			snap.source + url.hash,
			html,
			() => openDoc(href)
		);
		scrollDrawerTo(url.hash.slice(1));
	} catch {
		window.open(href, '_blank', 'noopener');
	}
}

/** Mở một bài học khác của chính khóa này trong ngăn trượt (dùng cho "Học lại"). */
async function openLesson(href: string, hash: string) {
	try {
		const res = await fetch(href);
		if (!res.ok) throw new Error(String(res.status));
		const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
		const content = doc.querySelector('.sl-markdown-content');
		if (!content) throw new Error('no content');
		const abs = new URL(href, location.href);
		content.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
			const raw = a.getAttribute('href')!;
			if (!raw.startsWith('#')) a.setAttribute('href', new URL(raw, abs).href);
		});
		showDrawer(
			doc.querySelector('h1')?.textContent ?? 'Bài học',
			'Bài học trong khóa này',
			abs.href + (hash ? `#${hash}` : ''),
			content.innerHTML,
			() => openLesson(href, hash)
		);
		scrollDrawerTo(hash);
	} catch {
		location.href = href + (hash ? `#${hash}` : '');
	}
}

// ---------------------------------------------------------------- lưu / khôi phục

function setupBackup() {
	document.querySelectorAll<HTMLButtonElement>('.ccf-save').forEach((btn) =>
		btn.addEventListener('click', () => {
			const titles = Object.fromEntries((page.items ?? []).map((i) => [i.id, i.title]));
			const lessons = Object.fromEntries(
				Object.entries(state.lessons).map(([id, s]) => [id, { title: titles[id] ?? id, ...s }])
			);
			const payload = { app: APP, version: 1, exportedAt: new Date().toISOString(), lessons };
			const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
			const a = h('a', {
				href: URL.createObjectURL(blob),
				download: `tien-trinh-hoc-${new Date().toISOString().slice(0, 10)}.json`,
			});
			document.body.append(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(a.href), 1000);
			toast('Đã tải file tiến trình học.');
		})
	);

	document.querySelectorAll<HTMLInputElement>('.ccf-restore-input').forEach((input) =>
		input.addEventListener('change', async () => {
			const file = input.files?.[0];
			input.value = '';
			if (!file) return;
			try {
				const data = JSON.parse(await file.text());
				if (data?.app !== APP || typeof data.lessons !== 'object' || data.lessons === null)
					throw new Error('sai định dạng');
				const count = Object.keys(data.lessons).length;
				if (!confirm(`Khôi phục tiến trình từ file này (${count} bài)? Tiến trình hiện tại trên trình duyệt sẽ bị thay thế.`)) return;
				const lessons: Record<string, LessonState> = {};
				for (const [id, raw] of Object.entries<any>(data.lessons)) {
					const { title: _title, ...rest } = raw ?? {};
					lessons[id] = rest;
				}
				state = { app: APP, version: 1, lessons };
				localStorage.setItem(KEY, JSON.stringify(state));
				location.reload();
			} catch {
				toast('File không hợp lệ: đây không phải file “Lưu tiến trình học” của khóa này.');
			}
		})
	);
	document.querySelectorAll<HTMLButtonElement>('.ccf-restore').forEach((btn) =>
		btn.addEventListener('click', () => btn.parentElement?.querySelector<HTMLInputElement>('.ccf-restore-input')?.click())
	);
}

// ---------------------------------------------------------------- khởi động

setupDrawer();
setupChecklist();
setupQuiz();
setupExam();
setupCards();
setupManualDone();
setupRating();
setupBackup();
