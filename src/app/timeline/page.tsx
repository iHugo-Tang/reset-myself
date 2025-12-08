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
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
				<header className="flex flex-col gap-2">
					<p className="text-sm uppercase tracking-[0.2em] text-slate-500">Timeline</p>
					<h1 className="text-3xl font-semibold tracking-tight text-slate-900">打卡时间线</h1>
					<p className="text-sm text-slate-600">
						按日期查看所有目标的打卡情况，并可直接为每个目标完成当天打卡。
					</p>
					<div className="mt-2 flex flex-wrap items-center gap-3">
						<StreakBadge streak={timeline.streak} />
					</div>
				</header>

				{timeline.days.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
						暂无数据，请先创建目标并开始打卡。
					</div>
				) : (
					<div className="grid gap-4">
						{timeline.days.map((day) => (
							<DayCard key={day.date} day={day} today={today} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function StreakBadge({ streak }: { streak: number }) {
	const isActive = streak > 0;
	const containerClass = isActive
		? 'border-amber-100 bg-amber-50 text-amber-800'
		: 'border-slate-200 bg-white text-slate-700';
	const chipClass = isActive
		? 'bg-amber-100 text-amber-800'
		: 'bg-slate-100 text-slate-600';
	const circleClass = isActive
		? 'text-amber-700 ring-amber-100'
		: 'text-slate-500 ring-slate-200';

	return (
		<div
			className={`inline-flex w-full max-w-xl items-center gap-4 rounded-xl border px-4 py-3 shadow-sm sm:w-auto ${containerClass}`}
			aria-live="polite"
			title={isActive ? `已连续打卡 ${streak} 天` : '尚未开始连续打卡'}
		>
			<div
				className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-inner ring-1 ${circleClass}`}
				aria-hidden
			>
				<Flame className={`h-5 w-5 ${isActive ? '' : 'opacity-70'}`} />
			</div>
			<div className="space-y-0.5">
				<p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
					连续打卡
				</p>
				<p className="text-sm font-semibold">
					{isActive ? `当前 ${streak} 天` : '还没有连续纪录'}
				</p>
				<p className="text-[11px] text-current/80">
					{isActive ? '保持节奏，全部目标完成才算一天' : '完成今天所有目标即可开启连续打卡'}
				</p>
			</div>
			<span className={`hidden items-center rounded-full px-2 py-1 text-[11px] font-semibold sm:inline-flex ${chipClass}`}>
				{isActive ? '保持势头' : '开始第一天'}
			</span>
		</div>
	);
}

function DayCard({ day, today }: { day: TimelineDay; today: string }) {
	const finishedCount = day.items.filter((item) => item.count > 0).length;
	const isToday = day.date === today;
	const allCompleted = day.allGoalsCompleted;

	return (
		<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex items-center justify-between gap-3">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<p className="text-lg font-semibold text-slate-900">{formatDateLabel(day.date)}</p>
						<span
							className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
								allCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
							}`}
						>
							{allCompleted ? '当天完成' : '未全部完成'}
						</span>
						{isToday && (
							<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
								今天
							</span>
						)}
					</div>
					<p className="text-xs text-slate-500">
						{finishedCount} / {day.items.length} 个目标有打卡
					</p>
					<p
						className={`text-[11px] font-medium ${
							allCompleted ? 'text-emerald-700' : 'text-amber-700'
						}`}
					>
						{allCompleted ? '当天全部目标已达标，计入连续打卡' : '尚有目标未完成，不计入连续打卡'}
					</p>
				</div>
				<span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
					{day.items.length} 个目标
				</span>
			</div>

			<div className="space-y-2">
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
	const cardClass = isCompleted
		? 'grid gap-3 rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50 via-white to-emerald-50 p-3 shadow-[0_10px_30px_rgba(16,185,129,0.12)] md:grid-cols-[1fr_auto] md:items-center'
		: 'grid gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 md:grid-cols-[1fr_auto] md:items-center';
	const badgeClass = isCompleted
		? 'bg-emerald-50 text-emerald-700'
		: 'bg-slate-100 text-slate-600';

	return (
		<div className={cardClass}>
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<p className="text-sm font-semibold text-slate-900">{item.title}</p>
					<span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
						{isCompleted && <CheckIcon className="h-3 w-3" />}
						{isCompleted ? '已达标' : '未达标'}
					</span>
				</div>
				<div className="flex items-center gap-2 text-[11px] text-slate-600">
					<span className="font-medium text-slate-700">
						{item.count} / {item.target} 次
					</span>
					<span className={isCompleted ? 'font-semibold text-emerald-700' : 'text-slate-500'}>
						{completionPercent}% 完成
					</span>
				</div>
				<div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
					<div
						className={`h-full transition-[width] duration-500 ${
							isCompleted ? 'bg-linear-to-r from-emerald-500 to-emerald-400' : 'bg-emerald-300'
						}`}
						style={{ width: `${completionPercent}%` }}
					/>
					{isCompleted && <span className="absolute inset-0 rounded-full border border-emerald-200/70" aria-hidden />}
				</div>
			</div>

			<form
				action={`/api/goals/${item.goalId}/completion`}
				method="post"
				className="flex items-center justify-end gap-2"
			>
				<input type="hidden" name="count" value={1} />
				<input type="hidden" name="date" value={today} />
				<button
					type="submit"
					className={`rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition ${
						isCompleted
							? 'cursor-not-allowed bg-slate-200 text-slate-500'
							: 'bg-emerald-600 text-white hover:bg-emerald-700'
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
