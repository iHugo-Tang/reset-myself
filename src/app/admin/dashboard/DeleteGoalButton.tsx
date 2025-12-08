'use client';

type Props = {
	goalId: number;
};

export function DeleteGoalButton({ goalId }: Props) {
	const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
		const ok = window.confirm('确定删除该目标？此操作不可恢复。');
		if (!ok) event.preventDefault();
	};

	return (
		<form action={`/api/goals/${goalId}`} method="post" onSubmit={handleSubmit} className="self-start">
			<button
				type="submit"
				className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
			>
				删除
			</button>
		</form>
	);
}
