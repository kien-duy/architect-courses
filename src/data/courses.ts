// Danh sách khóa học của site. Thư mục đầu tiên trong src/content/docs/ là id khóa.
export const COURSES = [
	{
		id: 'cca',
		name: 'Claude Certified Architect',
		short: 'Claude Architect',
		tagline: 'Luyện thi chứng chỉ Claude Certified Architect — Foundations',
		home: 'cca/',
	},
	{
		id: 'system-design',
		name: 'System Design',
		short: 'System Design',
		tagline: 'Lộ trình system design từ cơ bản đến nâng cao',
		home: 'system-design/',
	},
] as const;

export type CourseId = (typeof COURSES)[number]['id'];

/** Khóa của một trang, suy ra từ đường dẫn (ví dụ "cca/domain-1/01-x" -> "cca"). */
export function courseOf(entryId: string): CourseId | null {
	const first = entryId.split('/')[0];
	return (COURSES.find((c) => c.id === first)?.id ?? null) as CourseId | null;
}
