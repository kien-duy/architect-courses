// Mỗi trang chỉ hiện sidebar của khóa học mà nó thuộc về, và nút Trước/Tiếp
// không nhảy sang khóa khác.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import type { StarlightRouteData } from '@astrojs/starlight/route-data';
import { COURSES, courseOf } from './data/courses';

type Entry = StarlightRouteData['sidebar'][number];

/** Mọi đường dẫn nằm trong một nhánh sidebar. */
function hrefs(entries: Entry[]): string[] {
	return entries.flatMap((e) => (e.type === 'link' ? [e.href] : hrefs(e.entries)));
}

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	const course = COURSES.find((c) => c.id === courseOf(route.entry.id));
	if (!course) return; // trang chung (trang chủ): giữ nguyên

	const group = route.sidebar.find((e) => e.type === 'group' && e.label === course.name);
	if (!group || group.type !== 'group') return;

	const own = new Set(hrefs(group.entries));
	route.sidebar = group.entries;
	if (route.pagination.prev && !own.has(route.pagination.prev.href)) route.pagination.prev = undefined;
	if (route.pagination.next && !own.has(route.pagination.next.href)) route.pagination.next = undefined;
});
