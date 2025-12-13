'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimelineEvent } from '@/db/goals';
import type { TimelineResponse } from '@/api/types';
import { NoteCard } from './NoteCard';
import { CheckinEventCard } from './CheckinEventCard';
import { GoalLifecycleCard } from './GoalLifecycleCard';
import { GoalsEventCard } from './GoalsEventCard';
import { Loader2 } from 'lucide-react';
import { readJson } from '@/utils/api';

type TimelineFeedProps = {
    initialEvents: TimelineEvent[];
    initialNextCursor: string | null;
    timeZone: string;
};

export default function TimelineFeed({
    initialEvents,
    initialNextCursor,
    timeZone,
}: TimelineFeedProps) {
    const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
    const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
    const [loading, setLoading] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setEvents(initialEvents);
        setNextCursor(initialNextCursor);
    }, [initialEvents, initialNextCursor]);

    const loadMore = useCallback(async () => {
        if (loading || !nextCursor) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/timeline?cursor=${encodeURIComponent(nextCursor)}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await readJson<TimelineResponse>(res);
            if (json?.success) {
                setEvents((prev) => [...prev, ...json.data.events]);
                setNextCursor(json.data.nextCursor);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [nextCursor, loading]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [loadMore]);

    return (
        <div className="space-y-6">
            {events.map((event) => (
                <div key={event.id}>
                    {event.type === 'note' ? (
                        <NoteCard note={event} timeZone={timeZone} />
                    ) : event.type === 'checkin' ? (
                        <CheckinEventCard event={event} timeZone={timeZone} />
                    ) : event.type === 'goal_created' || event.type === 'goal_deleted' ? (
                        <GoalLifecycleCard event={event} timeZone={timeZone} />
                    ) : event.type === 'summary' ? (
                        <GoalsEventCard event={event} timeZone={timeZone} />
                    ) : null}
                </div>
            ))}

            {nextCursor && (
                <div ref={observerTarget} className="flex justify-center py-4">
                    {loading ? <Loader2 className="animate-spin text-slate-500" /> : <div className="h-4" />}
                </div>
            )}

            {!nextCursor && events.length > 0 && (
                <div className="text-center text-slate-500 py-8">
                    No more updates
                </div>
            )}

            {events.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1017] p-8 text-center text-slate-500">
                    No data yet; create a goal and start checking in.
                </div>
            )}
        </div>
    );
}
