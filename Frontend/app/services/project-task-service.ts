import { apiGet, apiPatch, apiPost, apiPut } from "../lib/api-client";
import type { PaginationMeta } from "./user-service";

export type ProjectTaskStatus = "active" | "completed" | "cancelled";
export type ProjectTask = {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: ProjectTaskStatus;
  project: { id: number; name: string };
  assignee: {
    id: number;
    name: string;
    email: string;
    division: { id: number; name: string } | null;
  };
  created_by: { id: number; name: string };
  created_at: string;
  updated_at: string;
};

export type ProjectTaskQuery = {
  projectId?: number;
  assignedTo?: number;
  status?: ProjectTaskStatus;
  search?: string;
  page?: number;
  perPage?: number;
};

export type ProjectTaskPayload = {
  project_id: number;
  assigned_to: number;
  title: string;
  description: string | null;
  due_date: string | null;
};

export type ProjectTaskListResponse = {
  data: ProjectTask[];
  meta: PaginationMeta;
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
};

type ProjectTaskResponse = { data: ProjectTask };
type ProjectTaskMutationResponse = { message: string; data: ProjectTask };

export function getProjectTasks(params: ProjectTaskQuery = {}): Promise<ProjectTaskListResponse> {
  const query = new URLSearchParams();
  if (params.projectId) query.set("project_id", String(params.projectId));
  if (params.assignedTo) query.set("assigned_to", String(params.assignedTo));
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 10));
  return apiGet<ProjectTaskListResponse>(`/api/project-tasks?${query.toString()}`);
}

export function getProjectTask(id: number): Promise<ProjectTaskResponse> {
  return apiGet<ProjectTaskResponse>(`/api/project-tasks/${id}`);
}

export function createProjectTask(payload: ProjectTaskPayload): Promise<ProjectTaskMutationResponse> {
  return apiPost<ProjectTaskMutationResponse>("/api/project-tasks", payload);
}

export function updateProjectTask(id: number, payload: Partial<ProjectTaskPayload>): Promise<ProjectTaskMutationResponse> {
  return apiPut<ProjectTaskMutationResponse>(`/api/project-tasks/${id}`, payload);
}

export function updateProjectTaskStatus(id: number, status: Exclude<ProjectTaskStatus, "active">): Promise<ProjectTaskMutationResponse> {
  return apiPatch<ProjectTaskMutationResponse>(`/api/project-tasks/${id}/status`, { status });
}
