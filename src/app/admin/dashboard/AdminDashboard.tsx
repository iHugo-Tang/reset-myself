'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Target, LayoutGrid, Menu, X } from 'lucide-react';
import type { GoalWithStats } from '@/db/goals';
import { GoalForm } from './GoalForm';
import { GoalActionsMenu } from './GoalActionsMenu';
import { RetroactiveCheckInForm } from './RetroactiveCheckInForm';
import { ICON_MAP, DEFAULT_ICON, DEFAULT_COLOR } from './iconOptions';

type ViewState = 'list' | 'create' | 'edit' | 'checkin';

type Props = {
  goals: GoalWithStats[];
};

export function AdminDashboard({ goals }: Props) {
  const [view, setView] = useState<ViewState>('list');
  const [selectedGoal, setSelectedGoal] = useState<GoalWithStats | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleCreate = () => {
    setSelectedGoal(null);
    setView('create');
  };

  const handleEdit = (goal: GoalWithStats) => {
    setSelectedGoal(goal);
    setView('edit');
  };

  const handleRetroactiveCheckIn = (goal: GoalWithStats) => {
    setSelectedGoal(goal);
    setView('checkin');
  };

  const handleBack = () => {
    setView('list');
    setSelectedGoal(null);
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0c121a]/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-slate-800 bg-[#0b1017]">
              <Image
                src="/logo.png"
                alt="Logo"
                width={56}
                height={56}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <span className="font-semibold text-slate-100">RESET MYSELF</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1017] text-slate-300 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-slate-800 bg-[#0c121a]">
            <div className="flex h-16 items-center justify-between px-4">
              <span className="text-sm font-semibold text-slate-200">Menu</span>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1017] text-slate-300 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-1 px-3 py-4">
              <button
                type="button"
                onClick={() => {
                  setView('list');
                  setIsMobileNavOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                ${view === 'list'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
              >
                <LayoutGrid className="h-5 w-5" />
                Goals
              </button>
            </nav>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-slate-800 bg-[#0c121a] lg:flex">
          <div className="flex h-20 items-center gap-3 px-6">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-slate-800 bg-[#0b1017]">
              <Image
                src="/logo.png"
                alt="Logo"
                width={56}
                height={56}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <span className="font-semibold text-slate-100">RESET MYSELF</span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            <button
              onClick={() => setView('list')}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                ${view === 'list'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
              <LayoutGrid className="h-5 w-5" />
              Goals
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 py-8 lg:px-8">
          {view === 'list' && (
            <div className="mx-auto max-w-5xl space-y-6">
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">Goals</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Manage your tracking goals and targets
                  </p>
                </div>
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Goal
                </button>
              </header>

              <div className="grid gap-4">
                {goals.map((goal) => {
                  const Icon = ICON_MAP[goal.icon] ?? ICON_MAP[DEFAULT_ICON];
                  const color = goal.color || DEFAULT_COLOR;

                  return (
                    <div
                      key={goal.id}
                      onClick={() => handleEdit(goal)}
                      className="group relative flex cursor-pointer items-center gap-4 rounded-xl border border-slate-800 bg-[#0f1724] p-4 transition hover:border-slate-700 hover:bg-[#151f2e]"
                    >

                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800/50 ring-1 ring-white/5"
                        style={{ color }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-slate-100 truncate">
                            {goal.title}
                          </h3>
                          <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
                            Target: {goal.dailyTargetCount}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500 truncate">
                          {goal.description || 'No description'}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <div className="hidden items-center gap-6 sm:flex">
                            <div className="flex flex-col items-end">
                              <span className="font-medium text-slate-200">{goal.streak}</span>
                              <span className="text-xs text-slate-500">Streak</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="font-medium text-slate-200">{goal.totalCompletedDays}</span>
                              <span className="text-xs text-slate-500">Total Days</span>
                            </div>
                          </div>

                          <div onClick={(event) => event.stopPropagation()}>
                            <GoalActionsMenu
                              goal={goal}
                              onEdit={handleEdit}
                              onRetroactiveCheckIn={handleRetroactiveCheckIn}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {goals.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#0b1017] p-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-800/50 p-4 ring-1 ring-white/5">
                      <Target className="h-8 w-8 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-200">No goals yet</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Create your first goal to start tracking your progress.
                    </p>
                    <button
                      onClick={handleCreate}
                      className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4" />
                      Create Goal
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {(view === 'create' || view === 'edit') && (
            <div className="mx-auto max-w-3xl">
              <button
                onClick={handleBack}
                className="mb-6 text-sm font-medium text-slate-400 transition hover:text-slate-200"
              >
                ← Back to goals
              </button>
              <GoalForm
                initialData={view === 'edit' ? selectedGoal! : undefined}
                onSuccess={handleBack}
                onCancel={handleBack}
              />
            </div>
          )}

          {view === 'checkin' && selectedGoal ? (
            <div className="mx-auto max-w-3xl">
              <button
                onClick={handleBack}
                className="mb-6 text-sm font-medium text-slate-400 transition hover:text-slate-200"
              >
                ← Back to goals
              </button>
              <RetroactiveCheckInForm
                goal={selectedGoal}
                onSuccess={handleBack}
                onCancel={handleBack}
              />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
