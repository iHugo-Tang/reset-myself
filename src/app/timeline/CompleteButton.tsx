'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ButtonVariant = 'default' | 'compact';
type ButtonLabels = {
	idle?: string;
	loading?: string;
	completed?: string;
};

type Props = {
	goalId: number;
	date: string;
	isCompleted: boolean;
	variant?: ButtonVariant;
	labels?: ButtonLabels;
};

export function CompleteButton({
	goalId,
	date,
	isCompleted,
	variant = 'default',
	labels,
}: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleClick = async () => {
		if (isCompleted || loading) return;
		setError(null);
		setLoading(true);

		try {
			const res = await fetch(`/api/goals/${goalId}/completion`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
				},
				body: new URLSearchParams({
					count: '1',
					date,
				}).toString(),
			});

			if (!res.ok) {
				const json = (await res.json().catch(() => null)) as { error?: string } | null;
				setError(json?.error ? `失败：${json.error}` : '记录失败，请稍后重试');
				return;
			}

			router.refresh();
		} catch (err) {
			console.error('complete goal error', err);
			setError('请求异常，请稍后重试');
		} finally {
			setLoading(false);
		}
	};

	const disabled = isCompleted || loading;

	const buttonText = isCompleted
		? labels?.completed ?? '已完成'
		: loading
			? labels?.loading ?? '处理中…'
			: labels?.idle ?? '今天打卡';

	const baseClass =
		'font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500';
	const sizeClass = variant === 'compact' ? 'rounded-xl px-2.5 py-1 text-sm' : 'rounded-full px-3 py-1.5 text-xs';
	const enabledClass =
		variant === 'compact'
			? 'border border-slate-700 bg-slate-900/70 text-slate-100 hover:border-slate-500 hover:bg-slate-800 active:border-slate-400'
			: 'border border-slate-700 bg-transparent text-slate-100 hover:border-slate-500 hover:bg-slate-800/80 active:border-slate-400 active:bg-slate-800';
	const completedClass = 'cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500';
	const loadingClass = loading ? 'opacity-80' : '';

	return (
		<div className="flex flex-col items-end gap-1">
			<button
				type="button"
				onClick={handleClick}
				className={`${baseClass} ${sizeClass} ${isCompleted ? completedClass : enabledClass} ${loadingClass}`}
				disabled={disabled}
				aria-disabled={disabled}
				aria-busy={loading}
				title={isCompleted ? '今日已达标' : '今天打卡'}
			>
				{buttonText}
			</button>
			{error ? <p className="text-sm text-amber-300">{error}</p> : null}
		</div>
	);
}
