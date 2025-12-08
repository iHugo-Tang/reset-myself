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
		const ok = window.confirm('Delete this entry? This cannot be undone.');
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
				setError(json?.message ?? 'Delete failed. Please try again soon.');
				return;
			}

			router.refresh();
		} catch (err) {
			console.error('delete note error', err);
			setError('Request error. Please try again soon.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="absolute right-3 top-3">
			<details className="group text-slate-400">
				<summary
					className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 [&::-webkit-details-marker]:hidden"
					aria-label="More actions"
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
						{loading ? 'Deleting...' : 'Delete'}
					</button>
					{error ? <p className="px-3 pb-2 text-sm text-amber-300">{error}</p> : null}
				</div>
			</details>
		</div>
	);
}
