import type { GoalWithStats } from '@/db/goals';

export type GoalAction = 'edit' | 'checkin';

type Params = {
  action: GoalAction;
  goal: GoalWithStats;
  onEdit?: (goal: GoalWithStats) => void;
  onRetroactiveCheckIn?: (goal: GoalWithStats) => void;
  routerPush: (href: string) => void;
};

export function runGoalAction({
  action,
  goal,
  onEdit,
  onRetroactiveCheckIn,
  routerPush,
}: Params) {
  if (action === 'edit') {
    if (onEdit) {
      onEdit(goal);
      return;
    }
    routerPush(`/admin/dashboard/goals/${goal.id}/edit`);
    return;
  }

  if (onRetroactiveCheckIn) {
    onRetroactiveCheckIn(goal);
    return;
  }
  routerPush(`/admin/dashboard/goals/${goal.id}/check-in`);
}

