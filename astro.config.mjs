// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Trang được host ở GitHub Pages của repo, nên cần `base`.
export default defineConfig({
	site: 'https://kien-duy.github.io',
	base: '/architect-courses',
	integrations: [
		starlight({
			title: 'Khóa học Architect',
			description:
				'Hai khóa học tiếng Việt, không chính thức: luyện thi Claude Certified Architect — Foundations và System Design.',
			locales: { root: { label: 'Tiếng Việt', lang: 'vi' } },
			credits: false,
			// theme.css: bảng màu, font, bo góc dùng chung với trang chủ (src/pages/index.astro).
			customCss: ['./src/styles/theme.css', './src/styles/course.css'],
			// Font của cả site (IBM Plex Sans + IBM Plex Mono, có đủ dấu tiếng Việt), display=swap.
			head: [
				{ tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
				{ tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wdth,wght@85..100,400..700&family=IBM+Plex+Mono:wght@400;500&display=swap',
					},
				},
			],
			// Mỗi trang chỉ hiện sidebar của khóa mình thuộc về (xem src/routeData.ts).
			routeMiddleware: './src/routeData.ts',
			components: {
				Footer: './src/components/Footer.astro',
				SocialIcons: './src/components/HeaderActions.astro',
			},
			// Nhóm cấp một = một khóa học; tên nhóm phải khớp `name` trong src/data/courses.ts.
			sidebar: [
				{
					label: 'Claude Certified Architect',
					items: [
						{
							label: 'Bắt đầu',
							items: [
								{ label: 'Giới thiệu khóa học', slug: 'cca' },
								{ label: 'Lộ trình 2 tuần', slug: 'cca/bat-dau/lo-trinh' },
								{ label: 'Cách dùng trang học', slug: 'cca/bat-dau/cach-hoc' },
								{ label: 'Chuẩn bị chạy lab', slug: 'cca/bat-dau/chuan-bi-lab' },
							],
						},
						{
							label: 'Domain 1 · Kiến trúc agent (27%)',
							collapsed: true,
							items: [{ autogenerate: { directory: 'cca/domain-1' } }],
						},
						{
							label: 'Domain 2 · Tool và MCP (18%)',
							collapsed: true,
							items: [{ autogenerate: { directory: 'cca/domain-2' } }],
						},
						{
							label: 'Domain 3 · Claude Code (20%)',
							collapsed: true,
							items: [{ autogenerate: { directory: 'cca/domain-3' } }],
						},
						{
							label: 'Domain 4 · Prompt và output (20%)',
							collapsed: true,
							items: [{ autogenerate: { directory: 'cca/domain-4' } }],
						},
						{
							label: 'Domain 5 · Context và độ tin cậy (15%)',
							collapsed: true,
							items: [{ autogenerate: { directory: 'cca/domain-5' } }],
						},
						{
							label: 'Ôn tập và thi thử',
							items: [{ autogenerate: { directory: 'cca/on-tap' } }],
						},
					],
				},
				{
					label: 'System Design',
					items: [
						{ label: 'Giới thiệu khóa học', slug: 'system-design' },
						{
							label: '1 · Nền tảng',
							collapsed: true,
							items: [{ autogenerate: { directory: 'system-design/1-nen-tang' } }],
						},
						{
							label: '2 · Các khối xây dựng',
							collapsed: true,
							items: [{ autogenerate: { directory: 'system-design/2-khoi-xay-dung' } }],
						},
						{
							label: '3 · Hệ phân tán',
							collapsed: true,
							items: [{ autogenerate: { directory: 'system-design/3-he-phan-tan' } }],
						},
						{
							label: '4 · Thiết kế thực chiến',
							collapsed: true,
							items: [{ autogenerate: { directory: 'system-design/4-thuc-chien' } }],
						},
						{
							label: '5 · Học tiếp',
							collapsed: true,
							items: [{ autogenerate: { directory: 'system-design/5-hoc-tiep' } }],
						},
						{
							label: '6 · Chủ đề hiện đại',
							collapsed: true,
							items: [{ autogenerate: { directory: 'system-design/6-hien-dai' } }],
						},
						{
							label: 'Hình minh họa ByteByteGo',
							collapsed: true,
							items: [{ autogenerate: { directory: 'system-design/guides' } }],
						},
					],
				},
			],
		}),
	],
});
