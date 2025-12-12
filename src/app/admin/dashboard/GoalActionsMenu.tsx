'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';
import type { GoalWithStats } from '@/db/goals';
import {
	COLOR_OPTIONS,
	DEFAULT_COLOR,
	DEFAULT_ICON,
	ICON_MAP,
	ICON_OPTIONS,
} from './iconOptions';

type Props = {
	goal: GoalWithStats;
};

export function GoalActionsMenu({ goal }: Props) {
	const router = useRouter();
	const [menuOpen, setMenuOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(goal.title);
	const [description, setDescription] = useState(goal.description ?? '');
	const [dailyTargetCount, setDailyTargetCount] = useState(
		goal.dailyTargetCount.toString()
	);
	const [icon, setIcon] = useState(goal.icon || DEFAULT_ICON);
	const [color, setColor] = useState(goal.color || DEFAULT_COLOR);
	const [message, setMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!editing) return;
		setMessage(null);
	}, [editing]);

	const IconPreview = useMemo(
		() => ICON_MAP[icon] ?? ICON_MAP[DEFAULT_ICON],
		[icon]
	);

	const handleDelete = async () => {
		const ok = window.confirm('Delete this goal? This cannot be undone.');
		if (!ok) return;

		setMessage(null);
		startTransition(async () => {
			const res = await fetch(`/api/goals/${goal.id}`, {
				method: 'DELETE',
				headers: { accept: 'application/json' },
			});
			if (!res.ok) {
				const json = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				setMessage(json?.message ?? 'Delete failed');
				return;
			}
			router.refresh();
		});
	};

	const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
		event.preventDefault();
		setMessage(null);

		const payload = {
			title: title.trim(),
			description,
			dailyTargetCount: Number(dailyTargetCount),
			icon,
			color,
		};

		startTransition(async () => {
			const res = await fetch(`/api/goals/${goal.id}`, {
				method: 'PATCH',
				headers: {
					'content-type': 'application/json',
					accept: 'application/json',
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const json = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				setMessage(json?.message ?? 'Save failed');
				return;
			}

			setEditing(false);
			setMenuOpen(false);
			router.refresh();
		});
	};

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setMenuOpen((prev) => !prev)}
				className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
				aria-haspopup="menu"
				aria-expanded={menuOpen}
			>
				<MoreHorizontal className="h-5 w-5" />
			</button>

			{menuOpen ? (
				<div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
					<button
						type="button"
						onClick={() => {
							setEditing(true);
							setMenuOpen(false);
						}}
						className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
					>
						<span>Edit</span>
					</button>
					<button
						type="button"
						onClick={handleDelete}
						className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
					>
						<span>Delete</span>
					</button>
				</div>
			) : null}

			{editing ? (
				<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div className="flex items-center gap-2 text-sm text-slate-600">
							<span>Edit goal</span>
							<span className="rounded-full bg-white px-2 py-0.5 text-sm text-slate-500 ring-1 ring-slate-200">
								ID {goal.id}
							</span>
						</div>
						{IconPreview ? (
							<span
								className="flex h-9 w-9 items-center justify-center rounded-full ring-2"
								style={{
									backgroundColor: `${color}22`,
									color,
									boxShadow: 'inset 0 0 0 1px #e2e8f0',
								}}
							>
								<IconPreview className="h-4 w-4" />
							</span>
						) : null}
					</div>

					<form className="grid gap-3" onSubmit={handleSubmit}>
						<label className="flex flex-col gap-1">
							<span className="text-xs font-medium text-slate-700">
								Goal name
							</span>
							<input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
								className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
							/>
						</label>

						<label className="flex flex-col gap-1">
							<span className="text-xs font-medium text-slate-700">
								Description
							</span>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="min-h-[72px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
							/>
						</label>

						<label className="flex flex-col gap-1">
							<span className="text-xs font-medium text-slate-700">
								Daily target count
							</span>
							<input
								type="number"
								min={1}
								value={dailyTargetCount}
								onChange={(e) => setDailyTargetCount(e.target.value)}
								className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
							/>
						</label>

						<div className="grid gap-2">
							<span className="text-xs font-medium text-slate-700">
								Choose an icon
							</span>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
								{ICON_OPTIONS.map((opt) => {
									const Icon = opt.Icon;
									const checked = icon === opt.value;
									return (
										<label
											key={opt.value}
											className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm transition hover:border-emerald-300 ${
												checked
													? 'border-emerald-500 ring-1 ring-emerald-200'
													: 'border-slate-200'
											}`}
										>
											<input
												type="radio"
												name={`icon-${goal.id}`}
												value={opt.value}
												checked={checked}
												onChange={() => setIcon(opt.value)}
												className="sr-only"
											/>
											<span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
												<Icon className="h-4 w-4" />
											</span>
											<span className="text-slate-700">{opt.label}</span>
										</label>
									);
								})}
							</div>
						</div>

						<div className="grid gap-2">
							<span className="text-xs font-medium text-slate-700">
								Choose a color
							</span>
							<div className="flex flex-wrap gap-2">
								{COLOR_OPTIONS.map((c) => {
									const checked = c === color;
									return (
										<label key={c} className="relative inline-flex">
											<input
												type="radio"
												name={`color-${goal.id}`}
												value={c}
												checked={checked}
												onChange={() => setColor(c)}
												className="peer sr-only"
											/>
											<span
												className="h-9 w-9 rounded-full border-2 border-transparent shadow-inner transition peer-focus:outline-2 peer-focus:outline-offset-2 peer-focus:outline-emerald-300"
												style={{ backgroundColor: c }}
											/>
											{checked ? (
												<span className="absolute inset-0 rounded-full border-2 border-white ring-2 ring-emerald-500" />
											) : null}
										</label>
									);
								})}
							</div>
						</div>

						{message ? (
							<p className="text-sm text-rose-600">{message}</p>
						) : null}

						<div className="flex items-center gap-2">
							<button
								type="submit"
								disabled={isPending}
								className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
							>
								{isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : null}
								<span>Save changes</span>
							</button>
							<button
								type="button"
								disabled={isPending}
								onClick={() => setEditing(false)}
								className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			) : null}
		</div>
	);
}
