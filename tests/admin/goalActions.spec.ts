import { describe, expect, it, vi } from 'vitest';
import { runGoalAction } from '@/app/admin/dashboard/goalActions';

describe('runGoalAction', () => {
  it('uses onEdit callback when provided', () => {
    const goal = { id: 123 } as any;
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
    const goal = { id: 123 } as any;
    const routerPush = vi.fn();

    runGoalAction({
      action: 'edit',
      goal,
      routerPush,
    });

    expect(routerPush).toHaveBeenCalledWith('/admin/dashboard/goals/123/edit');
  });

  it('uses onRetroactiveCheckIn callback when provided', () => {
    const goal = { id: 123 } as any;
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
    const goal = { id: 123 } as any;
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

