import { TimelineDay } from '@/db/goals';
import { NoteCard } from './NoteCard';
import { CheckinEventCard } from './CheckinEventCard';
import { GoalLifecycleCard } from './GoalLifecycleCard';
import { GoalsEventCard } from './GoalsEventCard';

const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateLabel = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return `${date} · ${weekday[d.getUTCDay()]}`;
};

export function DayCard({
  day,
  today,
  isFirst,
  timeZone,
}: {
  day: TimelineDay;
  today: string;
  isFirst: boolean;
  timeZone: string;
}) {
  const isToday = day.date === today;
  const allCompleted = day.allGoalsCompleted;

  return (
    <section className={`space-y-3 ${isFirst ? 'pt-6' : 'pt-6'}`}>
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-semibold text-slate-50">
              {formatDateLabel(day.date)}
            </p>
            {isToday && (
              <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-sm font-semibold text-sky-200 ring-1 ring-sky-500/40">
                Today
              </span>
            )}
          </div>
          <p
            className={`text-sm font-medium ${allCompleted ? 'text-emerald-200' : 'text-amber-200'}`}
          >
            {allCompleted
              ? 'All goals met; counted toward streak'
              : 'Goals remaining; does not count toward streak'}
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3.5 py-1 text-sm font-medium text-slate-300 ring-1 ring-slate-800">
          {day.items.length} goals
        </span>
      </div>

      <div className="space-y-3 px-4 pb-2 sm:px-5">
        {day.events.length === 0 ? (
          <p className="text-base text-slate-500">No entries yet</p>
        ) : (
          day.events.map((event) =>
            event.type === 'note' ? (
              <NoteCard key={event.id} note={event} timeZone={timeZone} />
            ) : event.type === 'checkin' ? (
              <CheckinEventCard
                key={event.id}
                event={event}
                timeZone={timeZone}
              />
            ) : event.type === 'goal_created' ||
              event.type === 'goal_deleted' ? (
              <GoalLifecycleCard
                key={event.id}
                event={event}
                timeZone={timeZone}
              />
            ) : event.type === 'summary' ? (
              <GoalsEventCard key={event.id} event={event} />
            ) : null
          )
        )}
      </div>
    </section>
  );
}

