import { StickyNote } from 'lucide-react';
import { TimelineNoteEvent } from '@/db/goals';
import { NoteActions } from './NoteActions';
import { formatEventTime } from '@/utils/time';

export function NoteCard({
  note,
  timeZone,
}: {
  note: TimelineNoteEvent;
  timeZone: string;
}) {
  const timeLabel = formatEventTime(note.createdAt, timeZone);
  return (
    <div className="relative flex gap-3 rounded-2xl border border-slate-900/80 bg-[#111a24] px-4 py-3 pr-12">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-slate-200 ring-1 ring-slate-800">
        <StickyNote className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-400">Note</span>
          <span className="text-xs text-slate-500">{timeLabel}</span>
        </div>
        <p className="text-base leading-relaxed whitespace-pre-wrap text-slate-100">
          {note.content}
        </p>
      </div>
      {note.noteId ? <NoteActions noteId={note.noteId} /> : null}
    </div>
  );
}

