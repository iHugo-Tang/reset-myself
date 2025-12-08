import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { GoalWithStats, HeatmapDay } from '@/db/goals';
import { DeleteGoalButton } from './DeleteGoalButton';

export const dynamic = 'force-dynamic';

const getBaseUrl = async () => {
	const h = await headers();
	const host = h.get('x-forwarded-host') ?? h.get('host');
	const protocol =
		h.get('x-forwarded-proto') ??
		(host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https');
	return host ? `${protocol}://${host}` : '';
};

const fetchDashboardData = async (): Promise<GoalWithStats[]> => {
	try {
		const baseUrl = await getBaseUrl();
		const res = await fetch(`${baseUrl}/api/goals`, { cache: 'no-store' });
		if (!res.ok) return [];
		const json = (await res.json()) as { data?: GoalWithStats[] };
		return json.data ?? [];
	} catch (error) {
		console.error('fetchDashboardData error', error);
		return [];
	}
};

export const metadata: Metadata = {
	title: 'Admin | Reset Goals',
	description: '目标管理仪表盘',
};

export default async function AdminDashboardPage() {
	const goals = await fetchDashboardData();

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
				<header className="flex flex-col gap-2">
					<p className="text-sm uppercase tracking-[0.2em] text-slate-500">Admin</p>
					<h1 className="text-3xl font-semibold tracking-tight text-slate-900">目标仪表盘</h1>
					<p className="text-sm text-slate-600">
						查看目标、连续完成天数与热力图，并直接在此创建或更新每日目标。
					</p>
				</header>

				<CreateGoalForm />

				<section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex items-center justify-between gap-4">
						<h2 className="text-lg font-semibold text-slate-900">目标列表</h2>
						<span className="text-sm text-slate-500">最近 90 天的热力图</span>
					</div>

					{goals.length === 0 ? (
						<div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
							暂无目标，请先创建一个目标。
						</div>
					) : (
						<div className="grid gap-4 md:grid-cols-2">
							{goals.map((goal) => (
								<GoalCard key={goal.id} goal={goal} />
							))}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}

function CreateGoalForm() {
	return (
		<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<h2 className="text-lg font-semibold text-slate-900">新建目标</h2>
			<p className="mt-1 text-sm text-slate-600">填写名称、描述与每日完成次数。</p>
			<form action="/api/goals" method="post" className="mt-4 grid gap-4 md:grid-cols-2">
				<label className="flex flex-col gap-2">
					<span className="text-sm font-medium text-slate-700">目标名称</span>
					<input
						required
						name="title"
						placeholder="例如：每日阅读"
						className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring-2"
					/>
				</label>

				<label className="flex flex-col gap-2">
					<span className="text-sm font-medium text-slate-700">每日完成次数</span>
					<input
						type="number"
						min={1}
						name="dailyTargetCount"
						defaultValue={1}
						className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring-2"
					/>
				</label>

				<label className="md:col-span-2 flex flex-col gap-2">
					<span className="text-sm font-medium text-slate-700">描述（可选）</span>
					<textarea
						name="description"
						placeholder="补充说明或备注"
						className="min-h-[96px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring-2"
					/>
				</label>

				<div className="md:col-span-2">
					<button
						type="submit"
						className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
					>
						创建目标
					</button>
				</div>
			</form>
		</section>
	);
}

function GoalCard({ goal }: { goal: GoalWithStats }) {
	const completionRate = goal.heatmap.filter((day) => day.count > 0).length;
	const today = new Date().toISOString().slice(0, 10);

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<h3 className="text-lg font-semibold text-slate-900">{goal.title}</h3>
					<p className="text-sm text-slate-600">{goal.description || '无描述'}</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
						每日 {goal.dailyTargetCount} 次
					</span>
					<DeleteGoalButton goalId={goal.id} />
				</div>
			</div>

			<div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700 md:grid-cols-3">
				<Stat label="连续完成" value={`${goal.streak} 天`} />
				<Stat label="完成天数" value={`${goal.totalCompletedDays} 天`} />
				<Stat label="近 90 天完成" value={`${completionRate}/${goal.heatmap.length}`} />
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between text-xs text-slate-500">
					<span>热力图</span>
					<span>深色代表更接近/超过每日目标</span>
				</div>
				<Heatmap heatmap={goal.heatmap} />
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<form
					action={`/api/goals/${goal.id}/completion`}
					method="post"
					className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
				>
					<div className="flex flex-col gap-2">
						<label className="text-sm font-medium text-slate-700">今日完成次数</label>
						<div className="grid grid-cols-[1fr_auto] gap-2">
							<input
								type="number"
								name="count"
								min={1}
								defaultValue={1}
								className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring-2"
							/>
							<button
								type="submit"
								className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
							>
								记录
							</button>
						</div>
						<input
							type="date"
							name="date"
							defaultValue={today}
							className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring-2"
						/>
					</div>
				</form>

				<form
					action={`/api/goals/${goal.id}/target`}
					method="post"
					className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
				>
					<div className="flex flex-col gap-2">
						<label className="text-sm font-medium text-slate-700">更新每日目标次数</label>
						<div className="grid grid-cols-[1fr_auto] gap-2">
							<input
								type="number"
								name="dailyTargetCount"
								min={1}
								defaultValue={goal.dailyTargetCount}
								className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring-2"
							/>
							<button
								type="submit"
								className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
							>
								保存
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
			<p className="text-xs text-slate-500">{label}</p>
			<p className="text-sm font-semibold text-slate-900">{value}</p>
		</div>
	);
}

function Heatmap({ heatmap }: { heatmap: HeatmapDay[] }) {
	const columns = Math.ceil(heatmap.length / 7);

	return (
		<div
			className="grid gap-1"
			style={{
				gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
			}}
		>
			{heatmap.map((day) => {
				const color = getColor(day);
				return (
					<div
						key={day.date}
						className={`h-3 w-3 rounded-[4px] ${color}`}
						title={`${day.date} | 完成 ${day.count} 次 / 目标 ${day.target} 次`}
					/>
				);
			})}
		</div>
	);
}

const getColor = (day: HeatmapDay) => {
	if (day.count === 0) return 'bg-slate-200';
	const ratio = day.count / Math.max(1, day.target);
	if (ratio < 1) return 'bg-emerald-200';
	if (ratio < 1.5) return 'bg-emerald-400';
	return 'bg-emerald-600';
};
