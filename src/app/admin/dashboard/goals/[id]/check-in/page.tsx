import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { CheckInGoalClient } from '../CheckInGoalClient';
import { resolveRequestTimeSettings } from '@/utils/time';
import type { GoalWithStats } from '@/db/goals';
import type { GoalDetailResponse } from '@/api/types';
import { readJson } from '@/utils/api';

export const dynamic = 'force-dynamic';

const getBaseUrl = async () => {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const protocol =
    h.get('x-forwarded-proto') ??
    (host?.includes('localhost') || host?.includes('127.0.0.1')
      ? 'http'
      : 'https');
  return host ? `${protocol}://${host}` : '';
};

const fetchGoal = async (
  goalId: number,
  offsetMinutes: number,
  cookieHeader: string
): Promise<GoalWithStats | null> => {
  try {
    const baseUrl = await getBaseUrl();
    const res = await fetch(
      `${baseUrl}/api/goals/${goalId}?tz_offset=${offsetMinutes}`,
      {
        cache: 'no-store',
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      }
    );
    if (!res.ok) return null;
    const json = await readJson<GoalDetailResponse>(res);
    return json?.success ? json.data : null;
  } catch (error) {
    console.error('fetchGoal error', error);
    return null;
  }
};

export default async function CheckInGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const goalId = Number(id);
  if (!goalId) notFound();

  const headerList = await headers();
  const cookieHeader = headerList.get('cookie') ?? '';
  const cookieStore = await cookies();
  const timeSettings = resolveRequestTimeSettings({
    cookies: cookieStore,
    cookieHeader,
  });

  const goal = await fetchGoal(goalId, timeSettings.offsetMinutes, cookieHeader);
  if (!goal) notFound();

  return <CheckInGoalClient goal={goal} />;
}
