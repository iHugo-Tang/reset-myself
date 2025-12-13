import type { GoalWithStats, TimelineEvent } from '@/db/goals';

export type ApiSuccess<T> = { success: true; data: T };
export type ApiSuccessNoData = { success: true };
export type ApiFailure = { success: false; message?: string; error?: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export type ApiResponseNoData = ApiSuccessNoData | ApiFailure;

export type OkSuccess = { ok: true };
export type OkFailure = { ok: false; error: string };
export type OkResponse = OkSuccess | OkFailure;

export type GoalsListResponse = ApiResponse<GoalWithStats[]>;
export type GoalDetailResponse = ApiResponse<GoalWithStats>;

export type GoalsMutationResponse = ApiResponseNoData;

export type TimelinePage = {
  events: TimelineEvent[];
  nextCursor: string | null;
  streak: number;
  heatmap: { date: string; count: number }[];
};

export type TimelineResponse = ApiResponse<TimelinePage>;

export type TimelineNote = {
  id: number;
  content: string;
  date: string;
  createdAt: string;
};

export type TimelineNoteCreateResponse = ApiResponse<TimelineNote>;
export type TimelineNoteDeleteResponse = ApiResponseNoData;
