import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const question = z.object({
	/** Câu hỏi. Hỗ trợ `code` và **đậm**. */
	q: z.string(),
	/** Đoạn code kèm theo câu hỏi (không bắt buộc). */
	code: z.string().optional(),
	/** Phương án: chuỗi, hoặc object kèm lý do vì sao phương án đó đúng/sai. */
	options: z
		.array(z.union([z.string(), z.object({ text: z.string(), why: z.string().optional() })]))
		.min(2)
		.transform((opts) => opts.map((o) => (typeof o === 'string' ? { text: o } : o))),
	/** Chỉ số (từ 0) của phương án đúng. */
	answer: z.number().int().min(0),
	/** Lời giải chung của câu, dùng khi từng phương án không có `why` riêng. */
	why: z.string().optional(),
	/** Từ khóa chốt đáp án. */
	keyword: z.string().optional(),
	/** Nơi học lại: `#id-tieu-de` trong cùng bài, hoặc `slug-bai#id` cho bài khác. */
	relearn: z.string().optional(),
	relearnLabel: z.string().optional(),
});

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				/** Có mặt nghĩa là trang này nằm trong checklist của khóa. */
				lesson: z
					.object({
						/** Khóa học mà bài thuộc về. Mặc định suy ra từ thư mục đầu tiên của đường dẫn. */
						course: z.string().optional(),
						/** Ngày trong lộ trình (khóa có lộ trình theo ngày). */
						day: z.number().int().min(1).optional(),
						/** Tên nhóm trong checklist khi khóa không chia theo ngày. */
						group: z.string().optional(),
						kind: z.enum(['lesson', 'lab', 'quiz', 'exam']).default('lesson'),
						minutes: z.number().int().optional(),
					})
					.optional(),
				quiz: z.array(question).optional(),
				/** Flashcard ôn tập cuối bài. */
				cards: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
			}),
		}),
	}),
};
