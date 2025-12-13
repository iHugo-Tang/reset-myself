import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { getDb, type EnvWithD1 } from './client';
import {
  goalCompletions,
  goals,
  dailySummaries,
  timelineEvents,
  timelineNotes,
  type Goal,
  type GoalCompletion,
  type TimelineEventRow,
} from '../../drizzle/schema';
import {
  addDaysUtc,
  buildDateKeys,
  startOfDayUtcMs,
  toDateKey,
} from '@/utils/time';

export type HeatmapDay = {
  date: string;
  count: number;
  target: number;
};

export type GoalWithStats = Goal & {
  streak: number;
  totalCompletedDays: number;
  heatmap: HeatmapDay[];
};

export type TimelineItem = {
  goalId: number;
  title: string;
  target: number;
  count: number;
  icon: string;
  color: string;
};

export type TimelineEventType =
  | 'note'
  | 'checkin'
  | 'goal_created'
  | 'goal_deleted'
  | 'summary';

type TimelineBaseEvent = {
  id: string;
  type: TimelineEventType;
  createdAt: string;
};

export type TimelineNoteEvent = TimelineBaseEvent & {
  type: 'note';
  content: string;
  noteId: number | null;
};

export type TimelineCheckinEvent = TimelineBaseEvent & {
  type: 'checkin';
  goalId: number;
  goalTitle: string;
  delta: number;
  newCount: number;
  icon: string;
  color: string;
  target: number;
};

export type TimelineGoalLifecycleEvent = TimelineBaseEvent & {
  type: 'goal_created' | 'goal_deleted';
  goalId: number | null;
  title: string;
  icon: string;
  color: string;
};

export type TimelineSummaryEvent = TimelineBaseEvent & {
  type: 'summary';
  items: TimelineItem[];
  allGoalsCompleted: boolean;
};

export type TimelineEvent =
  | TimelineNoteEvent
  | TimelineCheckinEvent
  | TimelineGoalLifecycleEvent
  | TimelineSummaryEvent;

export type TimelineDay = {
  date: string;
  items: TimelineItem[];
  allGoalsCompleted: boolean;
  events: TimelineEvent[];
};

export type TimelineHeatmapDay = {
  date: string;
  count: number;
};

export type TimelineData = {
  days: TimelineDay[];
  streak: number;
  heatmap: TimelineHeatmapDay[];
};

type TimeContext = { offsetMinutes?: number };

type LogEventInput = {
  date: string;
  type: TimelineEventType;
  goalId?: number | null;
  payload?: Record<string, unknown> | null;
  createdAt?: string;
};

const logTimelineEvent = async (env: EnvWithD1, input: LogEventInput) => {
  const db = getDb(env);
  await db.insert(timelineEvents).values({
    date: input.date,
    type: input.type,
    goalId: input.goalId ?? null,
    payload: input.payload ?? null,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
};

const checkAndLogSummaryEvent = async (
  env: EnvWithD1,
  dateKey: string,
  _ctx?: TimeContext
) => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);

  // Get all goals created on or before this date
  const goalsList = await db
    .select()
    .from(goals)
    .orderBy(desc(goals.createdAt));
  const activeGoals = goalsList.filter((g) => {
    const createdKey = toDateKey(g.createdAt, offsetMinutes);
    return createdKey && createdKey <= dateKey;
  });

  if (activeGoals.length === 0) return;

  // Get completions for this date
  const completions = await db
    .select()
    .from(goalCompletions)
    .where(
      and(
        eq(goalCompletions.date, dateKey),
        inArray(
          goalCompletions.goalId,
          activeGoals.map((g) => g.id)
        )
      )
    );

  const completionMap = new Map<number, number>();
  for (const c of completions) {
    completionMap.set(c.goalId, (completionMap.get(c.goalId) ?? 0) + c.count);
  }

  const items = activeGoals.map((g) => ({
    goalId: g.id,
    title: g.title,
    target: g.dailyTargetCount,
    count: completionMap.get(g.id) ?? 0,
    icon: g.icon,
    color: g.color,
  }));

  const allGoalsCompleted = activeGoals.every(
    (g) => (completionMap.get(g.id) ?? 0) >= g.dailyTargetCount
  );

  // If strictly only logging when all completed (for real-time):
  if (!allGoalsCompleted) {
    // If we want to remove existing summary if it became incomplete, we should do that.
    // For now, let's just delete any existing summary for this date to ensure correctness
    // (e.g. if user unchecked an item, the "all completed" summary is no longer valid).
    await db
      .delete(timelineEvents)
      .where(
        and(
          eq(timelineEvents.date, dateKey),
          eq(timelineEvents.type, 'summary')
        )
      );
    return;
  }

  // Upsert summary event
  // First delete existing to avoid duplicates (simplest upsert for this event log model)
  await db
    .delete(timelineEvents)
    .where(
      and(eq(timelineEvents.date, dateKey), eq(timelineEvents.type, 'summary'))
    );

  await logTimelineEvent(env, {
    date: dateKey,
    type: 'summary',
    payload: {
      items,
      allGoalsCompleted,
    },
  });
};

const buildHeatmap = (
  completions: GoalCompletion[],
  days: number,
  target: number,
  offsetMinutes: number
): HeatmapDay[] => {
  const byDate = new Map<string, number>();
  for (const c of completions) {
    byDate.set(c.date, c.count);
  }

  const todayUtcStart = startOfDayUtcMs(Date.now(), offsetMinutes);
  const startUtc = addDaysUtc(todayUtcStart, -(days - 1));

  const heatmap: HeatmapDay[] = [];
  for (let i = 0; i < days; i++) {
    const utcMs = addDaysUtc(startUtc, i);
    const dateKey = toDateKey(utcMs, offsetMinutes);
    heatmap.push({ date: dateKey, count: byDate.get(dateKey) ?? 0, target });
  }

  return heatmap;
};

const computeStreak = (
  completions: GoalCompletion[],
  offsetMinutes: number
): number => {
  const completionDates = new Map<string, number>();
  for (const completion of completions) {
    completionDates.set(completion.date, completion.count);
  }

  let streak = 0;
  let cursorUtc = startOfDayUtcMs(Date.now(), offsetMinutes);

  // Streak days: walk backward from today until a day without completion (user time zone based)
  while (true) {
    const key = toDateKey(cursorUtc, offsetMinutes);
    const count = completionDates.get(key) ?? 0;

    if (count > 0) {
      streak += 1;
      cursorUtc = addDaysUtc(cursorUtc, -1);
    } else {
      break;
    }
  }

  return streak;
};

const computeTimelineStreak = (
  goalsList: Goal[],
  byDate: Map<string, Map<number, number>>,
  offsetMinutes: number
): number => {
  let streak = 0;
  let cursorUtc = startOfDayUtcMs(Date.now(), offsetMinutes);

  while (true) {
    const key = toDateKey(cursorUtc, offsetMinutes);
    const dateMap = byDate.get(key);

    const allCompleted = goalsList.every(
      (goal) => (dateMap?.get(goal.id) ?? 0) >= goal.dailyTargetCount
    );

    if (!allCompleted) break;

    streak += 1;
    cursorUtc = addDaysUtc(cursorUtc, -1);
  }

  return streak;
};

type DailySummaryData = {
  date: string;
  totalGoals: number;
  completedGoals: number;
  successRate: number;
};

const computeDailySummary = (
  dateKey: string,
  goalRows: Goal[],
  byDate: Map<string, Map<number, number>>,
  offsetMinutes: number
): DailySummaryData | null => {
  const goalsForDate = goalRows.filter((goal) => {
    const createdKey = toDateKey(goal.createdAt, offsetMinutes);
    return createdKey && createdKey <= dateKey;
  });

  const totalGoals = goalsForDate.length;
  if (totalGoals === 0) return null;

  const dateMap = byDate.get(dateKey) ?? new Map<number, number>();
  let completedGoals = 0;
  for (const goal of goalsForDate) {
    const count = dateMap.get(goal.id) ?? 0;
    if (count >= goal.dailyTargetCount) completedGoals += 1;
  }

  const successRate = totalGoals > 0 ? completedGoals / totalGoals : 0;
  return { date: dateKey, totalGoals, completedGoals, successRate };
};

const upsertDailySummaries = async (
  env: EnvWithD1,
  summaries: DailySummaryData[]
) => {
  if (!summaries.length) return;
  const db = getDb(env);
  await db
    .insert(dailySummaries)
    .values(
      summaries.map((summary) => ({
        date: summary.date,
        totalGoals: summary.totalGoals,
        completedGoals: summary.completedGoals,
        successRate: summary.successRate,
      }))
    )
    .onConflictDoUpdate({
      target: dailySummaries.date,
      set: {
        totalGoals: sql`excluded.total_goals`,
        completedGoals: sql`excluded.completed_goals`,
        successRate: sql`excluded.success_rate`,
      },
    });
};

const buildTimelineHeatmap = (
  byDate: Map<string, Map<number, number>>,
  days: number,
  offsetMinutes: number
): TimelineHeatmapDay[] => {
  const todayUtcStart = startOfDayUtcMs(Date.now(), offsetMinutes);
  const startUtc = addDaysUtc(todayUtcStart, -(days - 1));

  const heatmap: TimelineHeatmapDay[] = [];
  for (let i = 0; i < days; i++) {
    const utcMs = addDaysUtc(startUtc, i);
    const dateKey = toDateKey(utcMs, offsetMinutes);
    const dateMap = byDate.get(dateKey);
    const totalCount = dateMap
      ? Array.from(dateMap.values()).reduce((sum, val) => sum + val, 0)
      : 0;
    heatmap.push({ date: dateKey, count: totalCount });
  }

  return heatmap;
};

const computeSummaryStreak = (
  summaries: DailySummaryData[],
  offsetMinutes: number
): number => {
  const summaryMap = new Map<string, DailySummaryData>();
  for (const summary of summaries) {
    summaryMap.set(summary.date, summary);
  }

  let streak = 0;
  let cursorUtc = addDaysUtc(startOfDayUtcMs(Date.now(), offsetMinutes), -1);

  while (true) {
    const key = toDateKey(cursorUtc, offsetMinutes);
    const summary = summaryMap.get(key);
    if (!summary) break;

    if (
      summary.totalGoals > 0 &&
      summary.completedGoals >= summary.totalGoals
    ) {
      streak += 1;
      cursorUtc = addDaysUtc(cursorUtc, -1);
    } else {
      break;
    }
  }

  return streak;
};

const buildDateRangeKeys = (startKey: string, endKey: string): string[] => {
  const keys: string[] = [];
  const startDate = new Date(`${startKey}T00:00:00Z`);
  const endDate = new Date(`${endKey}T00:00:00Z`);

  /* c8 ignore next */
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate > endDate
  ) {
    return keys;
  }

  for (
    let cursor = endDate;
    cursor >= startDate;
    cursor = new Date(cursor.getTime() - 86_400_000)
  ) {
    keys.push(cursor.toISOString().slice(0, 10));
  }

  return keys;
};

const processTimelineRows = (
  rows: TimelineEventRow[],
  goalMetaMap: Map<
    number,
    { title: string; icon: string; color: string; target: number }
  >,
  byDate: Map<string, Map<number, number>>
): TimelineEvent[] => {
  const parseNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const parseString = (value: unknown, fallback: string) =>
    typeof value === 'string' ? value : fallback;

  const events: TimelineEvent[] = [];
  const seenCheckins = new Set<string>();

  for (const row of rows) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    if (row.type === 'note') {
      const noteIdRaw = payload.noteId ?? payload.id;
      const noteId = Number.isFinite(Number(noteIdRaw))
        ? Number(noteIdRaw)
        : null;
      const content = parseString(payload.content, '');
      events.push({
        id: `event-${row.id}`,
        type: 'note',
        content,
        noteId,
        createdAt: row.createdAt,
      });
    } else if (row.type === 'checkin') {
      const goalIdRaw = payload.goalId ?? row.goalId;
      const goalId = Number.isFinite(Number(goalIdRaw))
        ? Number(goalIdRaw)
        : null;
      if (goalId === null) continue;

      const checkinKey = `${row.date}:${goalId}`;
      if (seenCheckins.has(checkinKey)) continue;
      seenCheckins.add(checkinKey);

      const meta = goalMetaMap.get(goalId);
      const delta = parseNumber(payload.delta, 0);
      const newCount = parseNumber(
        payload.newCount,
        byDate.get(row.date)?.get(goalId) ?? 0
      );
      const target = parseNumber(payload.target, meta?.target ?? 0);
      events.push({
        id: `event-${row.id}`,
        type: 'checkin',
        goalId,
        goalTitle: parseString(payload.title, meta?.title ?? 'Goal'),
        delta,
        newCount,
        icon: parseString(payload.icon, meta?.icon ?? 'Target'),
        color: parseString(payload.color, meta?.color ?? '#10b981'),
        target,
        createdAt: row.createdAt,
      });
    } else if (row.type === 'goal_created' || row.type === 'goal_deleted') {
      const goalId = Number.isFinite(Number(row.goalId))
        ? Number(row.goalId)
        : null;
      const meta = goalId ? goalMetaMap.get(goalId) : undefined;
      events.push({
        id: `event-${row.id}`,
        type: row.type,
        goalId,
        title: parseString(payload.title, meta?.title ?? 'Goal'),
        icon: parseString(payload.icon, meta?.icon ?? 'Target'),
        color: parseString(payload.color, meta?.color ?? '#10b981'),
        createdAt: row.createdAt,
      });
    } else if (row.type === 'summary') {
      events.push({
        id: `event-${row.id}`,
        type: 'summary',
        items: (payload.items as TimelineItem[]) ?? [],
        allGoalsCompleted: !!payload.allGoalsCompleted,
        createdAt: row.createdAt,
      });
    }
  }

  return events;
};

export const getTimelineData = async (
  env: EnvWithD1,
  days = 91,
  _ctx?: TimeContext
): Promise<TimelineData> => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);
  const goalRows = await db.select().from(goals).orderBy(desc(goals.createdAt));
  const goalIds = goalRows.map((g) => g.id);
  const goalMetaMap = new Map(
    goalRows.map((goal) => [
      goal.id,
      {
        title: goal.title,
        icon: goal.icon,
        color: goal.color,
        target: goal.dailyTargetCount,
      },
    ])
  );

  const todayKey = toDateKey(
    startOfDayUtcMs(Date.now(), offsetMinutes),
    offsetMinutes
  );

  const completions = goalIds.length
    ? await db
        .select()
        .from(goalCompletions)
        .where(inArray(goalCompletions.goalId, goalIds))
        .orderBy(goalCompletions.date)
    : [];

  const byDate = new Map<string, Map<number, number>>();
  for (const completion of completions) {
    const dateMap = byDate.get(completion.date) ?? new Map<number, number>();
    dateMap.set(
      completion.goalId,
      (dateMap.get(completion.goalId) ?? 0) + completion.count
    );
    byDate.set(completion.date, dateMap);
  }

  const dates: string[] = buildDateKeys(
    days,
    offsetMinutes,
    startOfDayUtcMs(Date.now(), offsetMinutes)
  );
  const pastDates = dates.filter((date) => date !== todayKey);

  const computedSummaries = pastDates
    .map((date) => computeDailySummary(date, goalRows, byDate, offsetMinutes))
    .filter((s): s is DailySummaryData => Boolean(s));

  await upsertDailySummaries(env, computedSummaries);

  const storedSummaries =
    pastDates.length > 0
      ? await db
          .select()
          .from(dailySummaries)
          .where(inArray(dailySummaries.date, pastDates))
      : [];

  const summaryData: DailySummaryData[] = storedSummaries.map((row) => ({
    date: row.date,
    totalGoals: row.totalGoals,
    completedGoals: row.completedGoals,
    successRate: row.successRate,
  }));

  const summaryMap = new Map(summaryData.map((s) => [s.date, s]));

  const eventRows: TimelineEventRow[] =
    dates.length === 0
      ? []
      : await db
          .select()
          .from(timelineEvents)
          .where(inArray(timelineEvents.date, dates))
          .orderBy(
            desc(timelineEvents.date),
            desc(timelineEvents.createdAt),
            desc(timelineEvents.id)
          );

  const noteIdsFromEvents = new Set<number>();
  const eventsByDate = new Map<string, TimelineEvent[]>();
  const seenCheckins = new Set<string>();

  // RESTORING ORIGINAL LOOP FOR SAFETY in getTimelineData

  const pushEventOriginal = (date: string, event: TimelineEvent) => {
    const list = eventsByDate.get(date) ?? [];
    list.push(event);
    eventsByDate.set(date, list);
  };

  const parseNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const parseString = (value: unknown, fallback: string) =>
    typeof value === 'string' ? value : fallback;

  for (const row of eventRows) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    if (row.type === 'note') {
      const noteIdRaw = payload.noteId ?? payload.id;
      const noteId = Number.isFinite(Number(noteIdRaw))
        ? Number(noteIdRaw)
        : null;
      if (typeof noteId === 'number') noteIdsFromEvents.add(noteId);
      const content = parseString(payload.content, '');
      pushEventOriginal(row.date, {
        id: `event-${row.id}`,
        type: 'note',
        content,
        noteId,
        createdAt: row.createdAt,
      });
    } else if (row.type === 'checkin') {
      const goalIdRaw = payload.goalId ?? row.goalId;
      const goalId = Number.isFinite(Number(goalIdRaw))
        ? Number(goalIdRaw)
        : null;
      if (goalId === null) continue;

      const checkinKey = `${row.date}:${goalId}`;
      if (seenCheckins.has(checkinKey)) continue;
      seenCheckins.add(checkinKey);

      const meta = goalMetaMap.get(goalId);
      const delta = parseNumber(payload.delta, 0);
      const newCount = parseNumber(
        payload.newCount,
        byDate.get(row.date)?.get(goalId) ?? 0
      );
      const target = parseNumber(payload.target, meta?.target ?? 0);
      pushEventOriginal(row.date, {
        id: `event-${row.id}`,
        type: 'checkin',
        goalId,
        goalTitle: parseString(payload.title, meta?.title ?? 'Goal'),
        delta,
        newCount,
        icon: parseString(payload.icon, meta?.icon ?? 'Target'),
        color: parseString(payload.color, meta?.color ?? '#10b981'),
        target,
        createdAt: row.createdAt,
      });
    } else if (row.type === 'goal_created' || row.type === 'goal_deleted') {
      const goalId = Number.isFinite(Number(row.goalId))
        ? Number(row.goalId)
        : null;
      const meta = goalId ? goalMetaMap.get(goalId) : undefined;
      pushEventOriginal(row.date, {
        id: `event-${row.id}`,
        type: row.type,
        goalId,
        title: parseString(payload.title, meta?.title ?? 'Goal'),
        icon: parseString(payload.icon, meta?.icon ?? 'Target'),
        color: parseString(payload.color, meta?.color ?? '#10b981'),
        createdAt: row.createdAt,
      });
    } else if (row.type === 'summary') {
      pushEventOriginal(row.date, {
        id: `event-${row.id}`,
        type: 'summary',
        items: (payload.items as TimelineItem[]) ?? [],
        allGoalsCompleted: !!payload.allGoalsCompleted,
        createdAt: row.createdAt,
      });
    }
  }

  const daysData = dates
    .map((date) => {
      const dateMap = byDate.get(date) ?? new Map<number, number>();
      const summaryForDate = summaryMap.get(date);
      const items = goalRows
        .map((goal) => ({
          goalId: goal.id,
          title: goal.title,
          target: goal.dailyTargetCount,
          count: dateMap.get(goal.id) ?? 0,
          icon: goal.icon,
          color: goal.color,
        }))
        .filter((item) => date === todayKey || item.count > 0);

      const allGoalsCompleted = summaryForDate
        ? summaryForDate.totalGoals > 0 &&
          summaryForDate.completedGoals >= summaryForDate.totalGoals
        : goalRows.length > 0 &&
          goalRows.every(
            (goal) => (dateMap.get(goal.id) ?? 0) >= goal.dailyTargetCount
          );

      const eventList = eventsByDate.get(date) ?? [];
      const summaryEvent: TimelineSummaryEvent = {
        id: `summary-${date}`,
        type: 'summary',
        items,
        allGoalsCompleted,
        createdAt: `${date}T23:59:59.999Z`,
      };

      /* c8 ignore start */
      const extractNumericId = (value: string) => {
        const numericPart = Number(value.replace(/^\D+/, ''));
        return Number.isFinite(numericPart) ? numericPart : 0;
      };

      /* c8 ignore start */
      const sortedEvents = [...eventList].sort((a, b) => {
        const idA = extractNumericId(a.id);
        const idB = extractNumericId(b.id);
        if (idA !== idB) return idB - idA;
        const ta = Date.parse(a.createdAt);
        const tb = Date.parse(b.createdAt);
        return tb - ta;
      });

      const hasPersistedSummary = sortedEvents.some(
        (e) => e.type === 'summary'
      );
      const finalEvents =
        date !== todayKey && summaryForDate && !hasPersistedSummary
          ? [summaryEvent, ...sortedEvents]
          : sortedEvents;

      return {
        date,
        items,
        allGoalsCompleted,
        events: finalEvents,
      };
      /* c8 ignore end */
    })
    .filter(
      (day) =>
        day.date === todayKey ||
        day.items.length > 0 ||
        day.events.some((event) => event.type !== 'summary')
    );
  /* c8 ignore end */

  const streak =
    summaryData.length > 0
      ? computeSummaryStreak(summaryData, offsetMinutes)
      : goalRows.length
        ? computeTimelineStreak(goalRows, byDate, offsetMinutes)
        : 0;
  const heatmap = buildTimelineHeatmap(byDate, days, offsetMinutes);

  return { days: daysData, streak, heatmap };
};

export const backfillDailySummaries = async (
  env: EnvWithD1,
  _ctx?: TimeContext
) => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);

  const earliestGoal = await db
    .select()
    .from(goals)
    .orderBy(goals.createdAt)
    .limit(1);
  if (!earliestGoal.length) return { upserted: 0 };

  const firstGoalKey = toDateKey(earliestGoal[0].createdAt, offsetMinutes);
  const yesterdayKey = toDateKey(
    addDaysUtc(startOfDayUtcMs(Date.now(), offsetMinutes), -1),
    offsetMinutes
  );

  if (!firstGoalKey || firstGoalKey > yesterdayKey) return { upserted: 0 };

  const goalRows = await db.select().from(goals).orderBy(desc(goals.createdAt));
  const goalIds = goalRows.map((g) => g.id);

  const completions =
    goalIds.length > 0
      ? await db
          .select()
          .from(goalCompletions)
          .where(inArray(goalCompletions.goalId, goalIds))
          .orderBy(goalCompletions.date)
      : [];

  const byDate = new Map<string, Map<number, number>>();
  for (const completion of completions) {
    const dateMap = byDate.get(completion.date) ?? new Map<number, number>();
    dateMap.set(
      completion.goalId,
      (dateMap.get(completion.goalId) ?? 0) + completion.count
    );
    byDate.set(completion.date, dateMap);
  }

  const dateKeys = buildDateRangeKeys(firstGoalKey, yesterdayKey);
  const summaries = dateKeys
    .map((date) => computeDailySummary(date, goalRows, byDate, offsetMinutes))
    .filter((s): s is DailySummaryData => Boolean(s));

  await upsertDailySummaries(env, summaries);

  return { upserted: summaries.length };
};

export const getDashboardData = async (
  env: EnvWithD1,
  days = 90,
  _ctx?: TimeContext
): Promise<GoalWithStats[]> => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);
  const goalRows = await db.select().from(goals).orderBy(desc(goals.createdAt));

  if (!goalRows.length) return [];

  const goalIds = goalRows.map((g) => g.id);
  const allCompletions = await db
    .select()
    .from(goalCompletions)
    .where(inArray(goalCompletions.goalId, goalIds))
    .orderBy(goalCompletions.date);

  const byGoal = new Map<number, GoalCompletion[]>();
  for (const completion of allCompletions) {
    const current = byGoal.get(completion.goalId) ?? [];
    current.push(completion);
    byGoal.set(completion.goalId, current);
  }

  return goalRows.map((goal) => {
    const completions = byGoal.get(goal.id) ?? [];
    return {
      ...goal,
      streak: computeStreak(completions, offsetMinutes),
      totalCompletedDays: completions.filter((c) => c.count > 0).length,
      heatmap: buildHeatmap(
        completions,
        days,
        goal.dailyTargetCount,
        offsetMinutes
      ),
    };
  });
};

export const createGoal = async (
  env: EnvWithD1,
  payload: {
    title: string;
    description?: string;
    dailyTargetCount: number;
    icon?: string;
    color?: string;
  },
  _ctx?: TimeContext
) => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);
  const [inserted] = await db
    .insert(goals)
    .values({
      title: payload.title,
      description: payload.description ?? '',
      dailyTargetCount: payload.dailyTargetCount,
      icon: payload.icon?.trim() || 'Target',
      color: payload.color?.trim() || '#10b981',
      createdAt: new Date(Date.now()).toISOString(),
      updatedAt: new Date(Date.now()).toISOString(),
    })
    .returning();

  const dateKey = toDateKey(Date.now(), offsetMinutes);
  await logTimelineEvent(env, {
    date: dateKey,
    type: 'goal_created',
    goalId: inserted.id,
    payload: {
      goalId: inserted.id,
      title: inserted.title,
      icon: inserted.icon,
      color: inserted.color,
    },
    createdAt: inserted.createdAt,
  });

  return inserted;
};

export const updateGoalTarget = async (
  env: EnvWithD1,
  goalId: number,
  dailyTargetCount: number
) => {
  const db = getDb(env);
  await db
    .update(goals)
    .set({
      dailyTargetCount,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(goals.id, goalId));
};

export const updateGoal = async (
  env: EnvWithD1,
  goalId: number,
  payload: {
    title?: string;
    description?: string;
    dailyTargetCount?: number;
    icon?: string;
    color?: string;
  }
) => {
  const db = getDb(env);

  const updates: Partial<typeof goals.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (payload.title !== undefined) {
    const title = payload.title.trim();
    if (!title) throw new Error('title_required');
    updates.title = title;
  }

  if (payload.description !== undefined) {
    updates.description = payload.description.trim();
  }

  if (payload.dailyTargetCount !== undefined) {
    const parsed = Number(payload.dailyTargetCount);
    if (!Number.isFinite(parsed) || parsed <= 0)
      throw new Error('daily_target_invalid');
    updates.dailyTargetCount = Math.floor(parsed);
  }

  if (payload.icon !== undefined) {
    updates.icon = payload.icon.trim() || 'Target';
  }

  if (payload.color !== undefined) {
    updates.color = payload.color.trim() || '#10b981';
  }

  await db.update(goals).set(updates).where(eq(goals.id, goalId));
};

export const recordGoalCompletion = async (
  env: EnvWithD1,
  goalId: number,
  count: number,
  date?: string,
  _ctx?: TimeContext
) => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);
  const targetDate =
    (date?.trim?.() ?? '') || toDateKey(Date.now(), offsetMinutes);
  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.id, goalId))
    .limit(1);
  if (!goal) throw new Error('goal_not_found');
  const [existing] = await db
    .select()
    .from(goalCompletions)
    .where(
      and(
        eq(goalCompletions.goalId, goalId),
        eq(goalCompletions.date, targetDate)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(goalCompletions)
      .set({ count: existing.count + count })
      .where(
        and(
          eq(goalCompletions.goalId, goalId),
          eq(goalCompletions.date, targetDate)
        )
      );
  } else {
    await db.insert(goalCompletions).values({
      goalId,
      date: targetDate,
      count,
    });
  }

  const newCount = (existing?.count ?? 0) + count;

  // Cleanup existing checkin events for this goal and date to keep only the latest one
  await db
    .delete(timelineEvents)
    .where(
      and(
        eq(timelineEvents.date, targetDate),
        eq(timelineEvents.type, 'checkin'),
        eq(timelineEvents.goalId, goalId)
      )
    );

  await logTimelineEvent(env, {
    date: targetDate,
    type: 'checkin',
    goalId,
    payload: {
      goalId,
      delta: count,
      newCount,
      title: goal.title,
      icon: goal.icon,
      color: goal.color,
      target: goal.dailyTargetCount,
    },
  });

  await checkAndLogSummaryEvent(env, targetDate, _ctx);
};

export const createTimelineNote = async (
  env: EnvWithD1,
  content: string,
  date?: string,
  _ctx?: TimeContext
) => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);
  const trimmed = content.trim();
  if (!trimmed) throw new Error('content_required');

  const targetDate = date?.trim() || toDateKey(Date.now(), offsetMinutes);
  const [inserted] = await db
    .insert(timelineNotes)
    .values({
      content: trimmed,
      date: targetDate,
      createdAt: new Date(Date.now()).toISOString(),
    })
    .returning();

  await logTimelineEvent(env, {
    date: targetDate,
    type: 'note',
    payload: { noteId: inserted.id, content: trimmed },
    createdAt: inserted.createdAt,
  });

  return inserted;
};

export const deleteTimelineNote = async (env: EnvWithD1, noteId: number) => {
  const db = getDb(env);
  if (!noteId) throw new Error('note_id_required');
  await db.delete(timelineNotes).where(eq(timelineNotes.id, noteId));
  await db
    .delete(timelineEvents)
    .where(
      and(
        eq(timelineEvents.type, 'note'),
        eq(sql`json_extract(${timelineEvents.payload}, '$.noteId')`, noteId)
      )
    );
};

export const deleteGoal = async (
  env: EnvWithD1,
  goalId: number,
  _ctx?: TimeContext
) => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);
  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.id, goalId))
    .limit(1);

  if (goal) {
    const dateKey = toDateKey(Date.now(), offsetMinutes);
    await logTimelineEvent(env, {
      date: dateKey,
      type: 'goal_deleted',
      goalId,
      payload: {
        goalId,
        title: goal.title,
        icon: goal.icon,
        color: goal.color,
      },
    });
  }

  await db.delete(goals).where(eq(goals.id, goalId));
};

export const getTimelineEventsInfinite = async (
  env: EnvWithD1,
  limit = 20,
  cursor?: string
) => {
  const db = getDb(env);

  const goalRows = await db.select().from(goals);
  const goalMetaMap = new Map(
    goalRows.map((goal) => [
      goal.id,
      {
        title: goal.title,
        icon: goal.icon,
        color: goal.color,
        target: goal.dailyTargetCount,
      },
    ])
  );

  let query = db
    .select()
    .from(timelineEvents)
    .orderBy(
      desc(timelineEvents.date),
      desc(timelineEvents.createdAt),
      desc(timelineEvents.id)
    )
    .limit(limit + 1);

  if (cursor) {
    try {
      const [cDate, cCreatedAt, cIdStr] = Buffer.from(cursor, 'base64')
        .toString()
        .split('|');
      const cId = Number(cIdStr);

      if (cDate && cCreatedAt && !isNaN(cId)) {
        query = query.where(
          or(
            lt(timelineEvents.date, cDate),
            and(
              eq(timelineEvents.date, cDate),
              lt(timelineEvents.createdAt, cCreatedAt)
            ),
            and(
              eq(timelineEvents.date, cDate),
              eq(timelineEvents.createdAt, cCreatedAt),
              lt(timelineEvents.id, cId)
            )
          )
        ) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    } catch (e) {
      console.warn('Invalid cursor', cursor, e);
    }
  }

  const rows = await query;
  const hasMore = rows.length > limit;
  const slicedRows = hasMore ? rows.slice(0, limit) : rows;

  const events = await processTimelineRows(slicedRows, goalMetaMap, new Map());

  let nextCursor: string | null = null;
  if (hasMore && slicedRows.length > 0) {
    const last = slicedRows[slicedRows.length - 1];
    nextCursor = Buffer.from(
      `${last.date}|${last.createdAt}|${last.id}`
    ).toString('base64');
  }

  return { events, nextCursor };
};

export const getTimelineStats = async (
  env: EnvWithD1,
  days = 91,
  _ctx?: TimeContext
) => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);
  const goalRows = await db.select().from(goals).orderBy(desc(goals.createdAt));
  const goalIds = goalRows.map((g) => g.id);

  const completions = goalIds.length
    ? await db
        .select()
        .from(goalCompletions)
        .where(inArray(goalCompletions.goalId, goalIds))
        .orderBy(goalCompletions.date)
    : [];

  const byDate = new Map<string, Map<number, number>>();
  for (const completion of completions) {
    const dateMap = byDate.get(completion.date) ?? new Map<number, number>();
    dateMap.set(
      completion.goalId,
      (dateMap.get(completion.goalId) ?? 0) + completion.count
    );
    byDate.set(completion.date, dateMap);
  }

  const summaryDataRaw = await db
    .select()
    .from(dailySummaries)
    .orderBy(desc(dailySummaries.date))
    .limit(days);

  const summaryData: DailySummaryData[] = summaryDataRaw.map((row) => ({
    date: row.date,
    totalGoals: row.totalGoals,
    completedGoals: row.completedGoals,
    successRate: row.successRate,
  }));

  let streak =
    summaryData.length > 0
      ? computeSummaryStreak(summaryData, offsetMinutes)
      : goalRows.length
        ? computeTimelineStreak(goalRows, byDate, offsetMinutes)
        : 0;

  if (summaryData.length > 0) {
    const todayKey = toDateKey(
      startOfDayUtcMs(Date.now(), offsetMinutes),
      offsetMinutes
    );
    const todaySummary = computeDailySummary(
      todayKey,
      goalRows,
      byDate,
      offsetMinutes
    );

    if (
      todaySummary &&
      todaySummary.totalGoals > 0 &&
      todaySummary.completedGoals >= todaySummary.totalGoals
    ) {
      streak += 1;
    }
  }

  const heatmap = buildTimelineHeatmap(byDate, days, offsetMinutes);

  return { streak, heatmap };
};

export const getTodayStatus = async (env: EnvWithD1, _ctx?: TimeContext) => {
  const offsetMinutes = _ctx?.offsetMinutes ?? 0;
  const db = getDb(env);
  const todayKey = toDateKey(
    startOfDayUtcMs(Date.now(), offsetMinutes),
    offsetMinutes
  );

  const goalsList = await db
    .select()
    .from(goals)
    .orderBy(desc(goals.createdAt));
  const activeGoals = goalsList.filter((g) => {
    const createdKey = toDateKey(g.createdAt, offsetMinutes);
    return createdKey && createdKey <= todayKey;
  });

  if (activeGoals.length === 0) return [];

  const completions = await db
    .select()
    .from(goalCompletions)
    .where(
      and(
        eq(goalCompletions.date, todayKey),
        inArray(
          goalCompletions.goalId,
          activeGoals.map((g) => g.id)
        )
      )
    );

  const completionMap = new Map<number, number>();
  for (const c of completions) {
    completionMap.set(c.goalId, (completionMap.get(c.goalId) ?? 0) + c.count);
  }

  return activeGoals.map((g) => ({
    goalId: g.id,
    title: g.title,
    target: g.dailyTargetCount,
    count: completionMap.get(g.id) ?? 0,
    icon: g.icon,
    color: g.color,
  }));
};
