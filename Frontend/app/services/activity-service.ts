import { apiFetch, apiGet, apiPost, apiPut } from "../lib/api-client";
import type { PaginationMeta } from "./user-service";
import type { MediaItem } from "../types/media";

export type ActivityStatus = "pending" | "ongoing" | "selesai" | "approved" | "rejected";
export type ActivityUser = { id: number; name: string; email: string; profile_photo: string | null; division: { id: number; name: string } | null };
export type ReviewerSummary = { id: number; name: string };
export type ActivityTaskSummary = { id: number; title: string; status: "active" | "completed" | "cancelled" };
export type Activity = {
  id: number; user_id: number; project_id: number | null; title: string;
  description: string | null; status: ActivityStatus; activity_date: string;
  created_at: string; updated_at: string; user: ActivityUser;
  project?: { id: number; name: string; client_name: string } | null;
  task: ActivityTaskSummary | null;
  approved_by: ReviewerSummary | null; approved_at: string | null;
  rejected_by: ReviewerSummary | null; rejected_at: string | null;
  rejection_reason: string | null; media: MediaItem[];
};
export type ActivityQuery = { search?: string; userId?: number; projectId?: number; status?: ActivityStatus; divisionId?: number; dateFrom?: string; dateTo?: string; page?: number; perPage?: number };
export type ActivityListResponse = { data: Activity[]; meta: PaginationMeta; links: { first: string | null; last: string | null; prev: string | null; next: string | null } };
type ActivityMutationResponse = { message: string; data: Activity };
export type OperationalActivityStatus = "pending" | "ongoing" | "selesai";
export type ActivityPayload = {
  project_id: number;
  project_task_id?: number | null;
  user_id: number;
  title: string;
  description: string | null;
  status: OperationalActivityStatus;
  activity_date: string;
};

export function getActivities(params: ActivityQuery): Promise<ActivityListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.userId) query.set("user_id", String(params.userId));
  if (params.projectId) query.set("project_id", String(params.projectId));
  if (params.status) query.set("status", params.status);
  if (params.divisionId) query.set("division_id", String(params.divisionId));
  if (params.dateFrom) query.set("date_from", params.dateFrom);
  if (params.dateTo) query.set("date_to", params.dateTo);
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 10));
  return apiGet<ActivityListResponse>(`/api/activities?${query.toString()}`);
}

export function approveActivity(id: number): Promise<ActivityMutationResponse> {
  return apiPost<ActivityMutationResponse>(`/api/activities/${id}/approve`);
}

export function rejectActivity(id: number, rejectionReason: string): Promise<ActivityMutationResponse> {
  return apiPost<ActivityMutationResponse>(`/api/activities/${id}/reject`, { rejection_reason: rejectionReason });
}

export function createActivity(payload: ActivityPayload): Promise<ActivityMutationResponse> {
  return apiPost<ActivityMutationResponse>("/api/activities", payload);
}

export function updateActivity(id: number, payload: Partial<ActivityPayload>): Promise<ActivityMutationResponse> {
  return apiPut<ActivityMutationResponse>(`/api/activities/${id}`, payload);
}

export function uploadActivityMedia(id: number, file: File): Promise<{ message: string; data: MediaItem }> {
  const body = new FormData();
  body.set("file", file);

  // Boundary multipart dibiarkan dibentuk browser; apiFetch tetap menambahkan
  // Bearer token tanpa memaksa Content-Type JSON.
  return apiFetch<{ message: string; data: MediaItem }>(`/api/activities/${id}/media`, {
    method: "POST",
    body,
  });
}
