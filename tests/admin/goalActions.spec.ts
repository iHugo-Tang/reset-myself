import { describe, expect, it, vi } from 'vitest';
import { runGoalAction } from '@/app/admin/dashboard/goalActions';
import type { GoalWithStats } from '@/db/goals';

const makeGoal = (id: number): GoalWithStats => ({
  id,
  userId: 'user_1',
  title: 'Test goal',
  description: null,
  dailyTargetCount: 1,
  icon: 'Target',
  color: '#10b981',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  streak: 0,
  totalCompletedDays: 0,
  heatmap: [],
});

describe('runGoalAction', () => {
  it('uses onEdit callback when provided', () => {
    const goal = makeGoal(123);
    const onEdit = vi.fn();
    const routerPush = vi.fn();

    runGoalAction({
      action: 'edit',
      goal,
      onEdit,
      routerPush,
    });

    expect(onEdit).toHaveBeenCalledWith(goal);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('routes to edit page when no onEdit callback', () => {
    const goal = makeGoal(123);
    const routerPush = vi.fn();

    runGoalAction({
      action: 'edit',
      goal,
      routerPush,
    });

    expect(routerPush).toHaveBeenCalledWith('/admin/dashboard/goals/123/edit');
  });

  it('uses onRetroactiveCheckIn callback when provided', () => {
    const goal = makeGoal(123);
    const onRetroactiveCheckIn = vi.fn();
    const routerPush = vi.fn();

    runGoalAction({
      action: 'checkin',
      goal,
      onRetroactiveCheckIn,
      routerPush,
    });

    expect(onRetroactiveCheckIn).toHaveBeenCalledWith(goal);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('routes to check-in page when no onRetroactiveCheckIn callback', () => {
    const goal = makeGoal(123);
    const routerPush = vi.fn();

    runGoalAction({
      action: 'checkin',
      goal,
      routerPush,
    });

    expect(routerPush).toHaveBeenCalledWith(
      '/admin/dashboard/goals/123/check-in'
    );
  });
});
