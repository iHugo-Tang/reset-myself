import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, StickyNote } from 'lucide-react';
import type { SVGProps } from 'react';
import CheckinPanel from '@/app/timeline/CheckinPanel';
import TimelineComposer from '@/app/timeline/TimelineComposer';
import { NoteActions } from '@/app/timeline/NoteActions';
import type {
	TimelineData,
	TimelineDay,
	TimelineItem,
	TimelineNoteEvent,
	TimelineHeatmapDay,
} from '@/db/goals';
import { DEFAULT_COLOR, DEFAULT_ICON, ICON_MAP } from '@/app/admin/dashboard/iconOptions';
import {
	addDaysUtc,
	formatTimeInTimeZone,
	resolveRequestTimeSettings,
	startOfDayUtcMs,
	toDateKey,
	weekDayIndex,
} from '@/utils/time';

export const dynamic = 'force-dynamic';
const HEATMAP_DAYS = 105;

const getBaseUrl = async () => {
	const h = await headers();
	const host = h.get('x-forwarded-host') ?? h.get('host');
	const protocol = host?.includes('localhost')
		|| host?.includes('127.0.0.1')
		? 'http' : (h.get('x-forwarded-proto') ?? 'https');
	return host ? `${protocol}://${host}` : '';
};

const fetchTimelineData = async (offsetMinutes: number): Promise<TimelineData> => {
	try {
		const baseUrl = await getBaseUrl();
		const headerList = await headers();
		const cookieHeader = headerList.get('cookie') ?? '';
		const res = await fetch(`${baseUrl}/api/timeline?tz_offset=${offsetMinutes}`, {
			cache: 'no-store',
			headers: cookieHeader ? { cookie: cookieHeader } : undefined,
		});
		if (!res.ok) return { days: [], streak: 0, heatmap: [] };
		const json = (await res.json()) as { data?: TimelineData };
		return json.data ?? { days: [], streak: 0, heatmap: [] };
	} catch (error) {
		console.error('fetchTimelineData error', error);
		return { days: [], streak: 0, heatmap: [] };
	}
};

export const metadata: Metadata = {
	title: 'Timeline | Reset Myself',
	description: 'Reset Myself 目标打卡时间线',
};

export default async function TimelinePage() {
	const headerList = await headers();
	const cookieStore = await cookies();
	const timeSettings = resolveRequestTimeSettings({
		cookies: cookieStore,
		cookieHeader: headerList.get('cookie'),
	});
	const timeline = await fetchTimelineData(timeSettings.offsetMinutes);
	const today = toDateKey(Date.now(), timeSettings.offsetMinutes);
	const todayData = timeline.days.find((day) => day.date === today);

	return (
		<div className="min-h-screen bg-[#0f1419] text-slate-100">
			<div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:gap-8 lg:px-8">
				<header className="flex items-center justify-between rounded-3xl border border-slate-900/70 bg-linear-to-r from-[#0c121a] via-[#0f1724] to-[#0c121a] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.45)]">
					<div className="flex items-center gap-3">
						<div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1017] shadow-inner ring-1 ring-slate-900/70">
							<Image
								src="/logo.png"
								alt="Reset Myself 标志"
								width={56}
								height={56}
								className="h-full w-full object-cover"
								priority
							/>
						</div>
						<div className="space-y-1">
							<p className="text-sm font-semibold text-slate-100">RESET MYSELF</p>
							<p className="text-xs text-slate-500">保持节奏，专注当下</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded-2xl bg-slate-900/60 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-800">
							<span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.08)] ring-2 ring-emerald-500/40" aria-hidden />
							<span>实时刷新</span>
						</div>
						<Link
							href="/admin/dashboard"
							className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition hover:border-slate-700 hover:bg-slate-900"
						>
							Dashboard
						</Link>
					</div>
				</header>

				<div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
					<div className="space-y-4 lg:order-2 lg:col-span-1">
						<StreakBadge streak={timeline.streak} />
						<HeatmapCard heatmap={timeline.heatmap} offsetMinutes={timeSettings.offsetMinutes} />
						{todayData ? <CheckinPanel day={todayData} today={today} /> : null}
					</div>

					<div className="space-y-6 lg:order-1 lg:col-span-2">
						<TimelineComposer />
						{timeline.days.length === 0 ? (
							<div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1017] p-8 text-center text-slate-500">
								暂无数据，请先创建目标并开始打卡。
							</div>
						) : (
							<div className="overflow-hidden rounded-3xl border border-slate-900/70 bg-[#0b1017] shadow-[0_18px_80px_rgba(0,0,0,0.45)]">
								<div className="divide-y divide-slate-900/70">
									{timeline.days.map((day, idx) => (
										<DayCard
											key={day.date}
											day={day}
											today={today}
											isFirst={idx === 0}
											timeZone={timeSettings.timeZone}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function StreakBadge({ streak }: { streak: number }) {
	const isActive = streak > 0;
	const containerClass = isActive
		? 'border-amber-500/40 bg-[#1e1a11] text-amber-100'
		: 'border-slate-800 bg-[#11161c] text-slate-200';
	const chipClass = isActive
		? 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/40'
		: 'bg-slate-800 text-slate-300 ring-1 ring-slate-700/80';
	const circleClass = isActive
		? 'text-amber-200 ring-amber-500/30 bg-[#2a2110]'
		: 'text-slate-400 ring-slate-800 bg-[#0b1017]';

	return (
		<div
			className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.35)] ${containerClass}`}
			aria-live="polite"
			title={isActive ? `已连续打卡 ${streak} 天` : '尚未开始连续打卡'}
		>
			<div
				className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ring-1 ${circleClass}`}
				aria-hidden
			>
				<Flame className={`h-5 w-5 ${isActive ? '' : 'opacity-70'}`} />
			</div>
			<div className="space-y-0.5">
				<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
					连续打卡
				</p>
				<p className="text-sm font-semibold text-slate-50">
					{isActive ? `当前 ${streak} 天` : '还没有连续纪录'}
				</p>
				<p className="text-[11px] text-slate-400">
					{isActive ? '保持节奏，全部目标完成才算一天' : '完成今天所有目标即可开启连续打卡'}
				</p>
			</div>
		</div>
	);
}

const heatmapColors = ['#0b1017', '#123040', '#15516f', '#1c77a0', '#2bb4d9'];

const normalizeHeatmap = (heatmap: TimelineHeatmapDay[] | undefined, offsetMinutes: number, days = HEATMAP_DAYS) => {
	const byDate = new Map<string, number>();
	for (const entry of heatmap ?? []) {
		byDate.set(entry.date, entry.count);
	}

	// 以当前周的最后一天为结束，向前填充 days 天，保证当前周展示完整
	const todayUtcStart = startOfDayUtcMs(Date.now(), offsetMinutes);
	const todayKey = toDateKey(todayUtcStart, offsetMinutes);
	const weekdayIdx = weekDayIndex(todayKey); // 0 = 周日
	const endOfWeekUtc = addDaysUtc(todayUtcStart, 6 - weekdayIdx);
	const startUtc = addDaysUtc(endOfWeekUtc, -(days - 1));

	const filled: TimelineHeatmapDay[] = [];
	for (let i = 0; i < days; i++) {
		const cursorUtc = addDaysUtc(startUtc, i);
		const dateKey = toDateKey(cursorUtc, offsetMinutes);
		filled.push({ date: dateKey, count: byDate.get(dateKey) ?? 0 });
	}
	return filled;
};

function HeatmapCard({ heatmap, offsetMinutes }: { heatmap: TimelineHeatmapDay[]; offsetMinutes: number }) {
	const data = normalizeHeatmap(heatmap, offsetMinutes);
	const maxCount = data.reduce((max, entry) => Math.max(max, entry.count), 0);

	if (!(heatmap?.length ?? 0)) {
		return (
			<div className="rounded-2xl border border-slate-900/70 bg-[#0b1017] p-4 shadow-[0_12px_45px_rgba(0,0,0,0.45)]">
				<div className="flex items-center justify-between">
					<p className="text-sm font-semibold text-slate-100">最近 {HEATMAP_DAYS} 天热力图</p>
					<span className="text-xs text-slate-500">暂无数据</span>
				</div>
				<p className="mt-2 text-xs text-slate-500">完成打卡后这里会出现热力图。</p>
			</div>
		);
	}

	const cells = data.map((entry) => {
		const d = new Date(`${entry.date}T00:00:00Z`);
		return { ...entry, weekday: d.getUTCDay(), dateObj: d };
	});

	const offset = cells[0]?.weekday ?? 0;
	const padded: (typeof cells[number] | null)[] = [...Array(offset).fill(null), ...cells];
	const remainder = padded.length % 7;
	if (remainder !== 0) {
		padded.push(...Array(7 - remainder).fill(null));
	}

	const columns: (typeof cells[number] | null)[][] = [];
	for (let i = 0; i < padded.length; i += 7) {
		columns.push(padded.slice(i, i + 7));
	}

	const getLevel = (count: number) => {
		if (count <= 0 || maxCount <= 0) return 0;
		const ratio = count / maxCount;
		if (ratio >= 0.8) return 4;
		if (ratio >= 0.6) return 3;
		if (ratio >= 0.3) return 2;
		return 1;
	};

	const formatTooltip = (cell: (typeof cells)[number]) => {
		const weekLabel = weekday[cell.weekday];
		return `${cell.date} · ${weekLabel}\n完成次数：${cell.count}`;
	};

	return (
		<div className="rounded-2xl border border-slate-900/70 bg-[#0b1017] p-4 shadow-[0_12px_45px_rgba(0,0,0,0.45)]">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-semibold text-slate-100">
					最近 {Math.ceil(HEATMAP_DAYS / 7)} 周热力图
				</p>
				<span className="text-[11px] text-slate-500">颜色表示当天完成次数</span>
			</div>

			<div className="mt-4 overflow-visible pb-1">
				<div className="flex gap-1 overflow-visible">
					{columns.map((col, colIdx) => (
						<div key={`col-${colIdx}`} className="flex flex-col gap-1 overflow-visible">
							{col.map((cell, rowIdx) => {
								if (!cell) {
									return (
										<div
											key={`empty-${colIdx}-${rowIdx}`}
											className="h-[14px] w-[14px] rounded-[4px] bg-transparent"
											aria-hidden
										/>
									);
								}

								const level = getLevel(cell.count);
								const color = heatmapColors[level];
								const borderColor = level === 0 ? '#1f2933' : '#265c74';

								return (
									<div key={cell.date} className="group relative overflow-visible">
										<div
											className="h-[14px] w-[14px] rounded-[4px] ring-1 ring-transparent transition"
											style={{
												backgroundColor: color,
												boxShadow: `0 0 0 1px ${borderColor}`,
											}}
											role="presentation"
										/>
										<div className="pointer-events-none absolute left-1/2 top-0 z-30 hidden -translate-x-1/2 -translate-y-[110%] whitespace-pre rounded-md bg-slate-950 px-2 py-1 text-[11px] text-slate-100 shadow-lg ring-1 ring-slate-800 group-hover:block">
											{formatTooltip(cell)}
										</div>
									</div>
								);
							})}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function DayCard({
	day,
	today,
	isFirst,
	timeZone,
}: {
	day: TimelineDay;
	today: string;
	isFirst: boolean;
	timeZone: string;
}) {
	const finishedCount = day.items.filter((item) => item.count > 0).length;
	const isToday = day.date === today;
	const allCompleted = day.allGoalsCompleted;

	return (
		<section className={`space-y-3 ${isFirst ? 'pt-6' : 'pt-6'}`}>
			<div className="flex items-start justify-between gap-3 px-4 sm:px-5">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-lg font-semibold text-slate-50">{formatDateLabel(day.date)}</p>
						{isToday && (
							<span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-200 ring-1 ring-sky-500/40">
								今天
							</span>
						)}
					</div>
					<p
						className={`text-[11px] font-medium ${allCompleted ? 'text-emerald-200' : 'text-amber-200'}`}
					>
						{allCompleted ? '当天全部目标已达标，计入连续打卡' : '尚有目标未完成，不计入连续打卡'}
					</p>
				</div>
				<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-800">
					{day.items.length} 个目标
				</span>
			</div>

			<div className="space-y-3 px-4 pb-2 sm:px-5">
				{day.events.length === 0 ? (
					<p className="text-sm text-slate-500">暂无记录</p>
				) : (
					day.events.map((event) =>
						event.type === 'note' ? (
							<NoteCard key={`note-${event.id}`} note={event} timeZone={timeZone} />
						) : (
							<GoalsEventCard key="goals" items={event.items} today={today} />
						),
					)
				)}
			</div>
		</section>
	);
}

function GoalsEventCard({ items, today }: { items: TimelineItem[]; today: string }) {
	if (!items.length) {
		return (
			<div className="rounded-2xl border border-slate-900/80 bg-[#0f1722] px-4 py-3 text-sm text-slate-400">
				今日暂无目标记录
			</div>
		);
	}

	return (
		<div className="space-y-2.5">
			{items.map((item) => (
				<GoalRow key={item.goalId} item={item} today={today} />
			))}
		</div>
	);
}

function NoteCard({ note, timeZone }: { note: TimelineNoteEvent; timeZone: string }) {
	const timeLabel = formatTimeLabel(note.createdAt, timeZone);
	return (
		<div className="relative flex gap-3 rounded-2xl border border-slate-900/80 bg-[#111a24] px-4 py-3 pr-12">
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-slate-200 ring-1 ring-slate-800">
				<StickyNote className="h-4 w-4" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{note.content}</p>
				<span className="text-[11px] text-slate-500">{timeLabel}</span>
			</div>
			<NoteActions noteId={note.id} />
		</div>
	);
}

function GoalRow({ item, today }: { item: TimelineItem; today: string }) {
	const ratio = item.count / Math.max(1, item.target);
	const isCompleted = ratio >= 1;
	const completionPercent = Math.min(100, Math.round(Math.min(1, ratio) * 100));
	const Icon = ICON_MAP[item.icon] ?? ICON_MAP[DEFAULT_ICON];
	const color = item.color || DEFAULT_COLOR;
	const rowClass = isCompleted
		? 'group relative flex gap-3 rounded-2xl border border-emerald-800/60 bg-[#0f1a16] px-4 py-3 shadow-[0_12px_50px_rgba(16,185,129,0.12)] transition hover:border-emerald-600/70 hover:bg-[#122019]'
		: 'group relative flex gap-3 rounded-2xl border border-transparent bg-[#15202b] px-4 py-3 transition hover:border-slate-800 hover:bg-[#1c2733] active:bg-[#1e2d3c]';
	const badgeClass = isCompleted
		? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40'
		: 'bg-slate-800 text-slate-300 ring-1 ring-slate-700/80';

	return (
		<div className={rowClass}>
			<div
				className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-[#0b1017] text-sm font-semibold text-slate-100"
				style={{ backgroundColor: `${color}22`, color, borderColor: `${color}55` }}
			>
				{Icon ? <Icon className="h-4 w-4" /> : (item.title.trim()[0] ?? '?').toUpperCase()}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex min-w-0 items-center gap-2">
					<p className="truncate text-sm font-semibold text-slate-50">{item.title}</p>
					<span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
						{isCompleted && <CheckIcon className="h-3 w-3" />}
						{isCompleted ? '已达标' : '未达标'}
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
					<span className="font-semibold text-slate-100">
						{item.count} / {item.target} 次
					</span>
					<span className={isCompleted ? 'font-semibold text-emerald-300' : 'text-slate-400'}>
						{completionPercent}% 完成
					</span>
				</div>
				<div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
					<div
						className={`h-full transition-[width] duration-500 ${
							isCompleted ? 'bg-emerald-400' : 'bg-sky-400/80'
						}`}
						style={{ width: `${completionPercent}%` }}
					/>
					{isCompleted && <span className="absolute inset-0 rounded-full border border-emerald-500/40" aria-hidden />}
				</div>
			</div>
		</div>
	);
}

const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const formatDateLabel = (date: string) => {
	const d = new Date(`${date}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) return date;
	return `${date} · ${weekday[d.getUTCDay()]}`;
};

const formatTimeLabel = (iso: string, timeZone: string) => {
	return formatTimeInTimeZone(iso, timeZone, 'zh-CN');
};

function CheckIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M16.25 5.75 8.5 13.5 5.25 10.25"
			/>
		</svg>
	);
}
