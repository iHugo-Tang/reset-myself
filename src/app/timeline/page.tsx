import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Flame } from 'lucide-react';
import type { SVGProps } from 'react';
import type { TimelineData, TimelineDay, TimelineItem } from '@/db/goals';

export const dynamic = 'force-dynamic';

const getBaseUrl = async () => {
	const h = await headers();
	const host = h.get('x-forwarded-host') ?? h.get('host');
	const protocol =
		h.get('x-forwarded-proto') ??
		(host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https');
	return host ? `${protocol}://${host}` : '';
};

const fetchTimelineData = async (): Promise<TimelineData> => {
	try {
		const baseUrl = await getBaseUrl();
		const res = await fetch(`${baseUrl}/api/timeline`, { cache: 'no-store' });
		if (!res.ok) return { days: [], streak: 0 };
		const json = (await res.json()) as { data?: TimelineData };
		return json.data ?? { days: [], streak: 0 };
	} catch (error) {
		console.error('fetchTimelineData error', error);
		return { days: [], streak: 0 };
	}
};

export const metadata: Metadata = {
	title: 'Timeline | Reset Goals',
	description: '目标打卡时间线',
};

export default async function TimelinePage() {
	const timeline = await fetchTimelineData();
	const today = new Date().toISOString().slice(0, 10);

	return (
		<div className="min-h-screen bg-[#0f1419] text-slate-100">
			<div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
				<header className="flex flex-col gap-2">
					<p className="text-xs uppercase tracking-[0.18em] text-slate-500/80">Timeline</p>
					<h1 className="text-3xl font-semibold tracking-tight text-slate-50">打卡时间线</h1>
					<p className="text-sm text-slate-400">
						按日期查看所有目标的打卡情况，并可直接为每个目标完成当天打卡。
					</p>
					<div className="mt-3 flex flex-wrap items-center gap-3">
						<StreakBadge streak={timeline.streak} />
					</div>
				</header>

				{timeline.days.length === 0 ? (
					<div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1017] p-8 text-center text-slate-500">
						暂无数据，请先创建目标并开始打卡。
					</div>
				) : (
					<div className="overflow-hidden rounded-3xl border border-slate-900/70 bg-[#0b1017] shadow-[0_18px_80px_rgba(0,0,0,0.45)]">
						<div className="divide-y divide-slate-900/70">
							{timeline.days.map((day, idx) => (
								<DayCard key={day.date} day={day} today={today} isFirst={idx === 0} />
							))}
						</div>
					</div>
				)}
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
			className={`inline-flex w-full max-w-xl items-center gap-4 rounded-2xl border px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.35)] sm:w-auto ${containerClass}`}
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
			<span className={`hidden items-center rounded-full px-2 py-1 text-[11px] font-semibold sm:inline-flex ${chipClass}`}>
				{isActive ? '保持势头' : '开始第一天'}
			</span>
		</div>
	);
}

function DayCard({
	day,
	today,
	isFirst,
}: {
	day: TimelineDay;
	today: string;
	isFirst: boolean;
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
						<span
							className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
								allCompleted
									? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40'
									: 'bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30'
							}`}
						>
							{allCompleted ? '当天完成' : '未全部完成'}
						</span>
						{isToday && (
							<span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-200 ring-1 ring-sky-500/40">
								今天
							</span>
						)}
					</div>
					<p className="text-xs text-slate-500">
						{finishedCount} / {day.items.length} 个目标有打卡
					</p>
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

			<div className="space-y-2.5">
				{day.items.map((item) => (
					<GoalRow key={item.goalId} item={item} today={today} />
				))}
			</div>
		</section>
	);
}

function GoalRow({ item, today }: { item: TimelineItem; today: string }) {
	const ratio = item.count / Math.max(1, item.target);
	const isCompleted = ratio >= 1;
	const completionPercent = Math.min(100, Math.round(Math.min(1, ratio) * 100));
	const initial = (item.title.trim()[0] ?? '?').toUpperCase();
	const rowClass = isCompleted
		? 'group relative flex gap-3 rounded-2xl border border-emerald-800/60 bg-[#0f1a16] px-4 py-3 shadow-[0_12px_50px_rgba(16,185,129,0.12)] transition hover:border-emerald-600/70 hover:bg-[#122019]'
		: 'group relative flex gap-3 rounded-2xl border border-transparent bg-[#15202b] px-4 py-3 transition hover:border-slate-800 hover:bg-[#1c2733] active:bg-[#1e2d3c]';
	const badgeClass = isCompleted
		? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40'
		: 'bg-slate-800 text-slate-300 ring-1 ring-slate-700/80';

	return (
		<div className={rowClass}>
			<div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-[#0b1017] text-sm font-semibold text-slate-100">
				{initial}
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

			<form
				action={`/api/goals/${item.goalId}/completion`}
				method="post"
				className="flex items-center justify-end"
			>
				<input type="hidden" name="count" value={1} />
				<input type="hidden" name="date" value={today} />
				<button
					type="submit"
					className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
						isCompleted
							? 'cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500'
							: 'border border-slate-700 bg-transparent text-slate-100 hover:border-slate-500 hover:bg-slate-800/80 active:border-slate-400 active:bg-slate-800'
					}`}
					disabled={isCompleted}
					aria-disabled={isCompleted}
					title={isCompleted ? '今日已达标' : '今天打卡'}
				>
					{isCompleted ? '已完成' : '今天打卡'}
				</button>
			</form>
		</div>
	);
}

const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const formatDateLabel = (date: string) => {
	const d = new Date(`${date}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) return date;
	return `${date} · ${weekday[d.getUTCDay()]}`;
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
