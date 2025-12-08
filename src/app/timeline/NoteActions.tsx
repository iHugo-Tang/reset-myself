'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
	noteId: number;
};

export function NoteActions({ noteId }: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleDelete = async () => {
		if (loading) return;
		const ok = window.confirm('确定删除这条记录？');
		if (!ok) return;

		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/timeline/notes/${noteId}`, {
				method: 'DELETE',
				headers: { Accept: 'application/json' },
			});

			if (!res.ok) {
				const json = (await res.json().catch(() => null)) as { message?: string } | null;
				setError(json?.message ?? '删除失败，请稍后再试');
				return;
			}

			router.refresh();
		} catch (err) {
			console.error('delete note error', err);
			setError('请求异常，请稍后再试');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="absolute right-3 top-3">
			<details className="group text-slate-400">
				<summary
					className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 [&::-webkit-details-marker]:hidden"
					aria-label="更多操作"
				>
					<span className="text-xl leading-none">...</span>
				</summary>
				<div className="absolute right-0 z-10 mt-2 w-32 overflow-hidden rounded-xl border border-slate-800 bg-[#0b1017] text-sm text-slate-200 shadow-xl shadow-black/40">
					<button
						type="button"
						onClick={handleDelete}
						disabled={loading}
						className="flex w-full items-center gap-2 px-3 py-2 text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{loading ? '删除中…' : '删除'}
					</button>
					{error ? <p className="px-3 pb-2 text-[11px] text-amber-300">{error}</p> : null}
				</div>
			</details>
		</div>
	);
}
