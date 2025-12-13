import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import type { GoalWithStats } from '@/db/goals';
import { AdminDashboard } from './AdminDashboard';
import { resolveRequestTimeSettings } from '@/utils/time';

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

const fetchDashboardData = async (
  offsetMinutes: number,
  cookieHeader: string
): Promise<GoalWithStats[]> => {
  try {
    const baseUrl = await getBaseUrl();
    const res = await fetch(`${baseUrl}/api/goals?tz_offset=${offsetMinutes}`, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
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
  description: 'Goal management dashboard',
};

export default async function AdminDashboardPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get('cookie') ?? '';
  const cookieStore = await cookies();
  const timeSettings = resolveRequestTimeSettings({
    cookies: cookieStore,
    cookieHeader,
  });
  const goals = await fetchDashboardData(
    timeSettings.offsetMinutes,
    cookieHeader
  );

  return <AdminDashboard goals={goals} />;
}
