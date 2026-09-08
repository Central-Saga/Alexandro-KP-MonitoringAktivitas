import { apiFetch, apiGet, apiPost, apiPut } from "../lib/api-client";
import type { PaginationMeta } from "./user-service";

export type DivisionStatus = "active" | "inactive";
export type DivisionOption = { value: string; label: string };

export type DivisionHead = {
  id: number;
  name: string;
  email: string;
};

export type Division = {
  id: number;
  name: string;
  description: string | null;
  status: DivisionStatus;
  head: DivisionHead | null;
  member_count: number;
  created_at: string;
};

export type DivisionQuery = {
  search?: string;
  status?: DivisionStatus;
  page?: number;
  perPage?: number;
};

export type DivisionPayload = {
  name: string;
  description: string | null;
  head_user_id: number | null;
  status?: DivisionStatus;
};

export type DivisionListResponse = {
  data: Division[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: PaginationMeta;
};

type DivisionResponse = { data: Division };
type DivisionMutationResponse = { message: string; data: Division };

export function getDivisionOptions(): Promise<{ data: DivisionOption[] }> {
  return apiGet<{ data: DivisionOption[] }>("/api/divisions/options");
}

export function getDivisions(params: DivisionQuery): Promise<DivisionListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 9));

  return apiGet<DivisionListResponse>(`/api/divisions?${query.toString()}`);
}

export function getDivision(id: number): Promise<DivisionResponse> {
  return apiGet<DivisionResponse>(`/api/divisions/${id}`);
}

export function createDivision(payload: DivisionPayload): Promise<DivisionMutationResponse> {
  return apiPost<DivisionMutationResponse>("/api/divisions", payload);
}

export function updateDivision(id: number, payload: DivisionPayload): Promise<DivisionMutationResponse> {
  return apiPut<DivisionMutationResponse>(`/api/divisions/${id}`, payload);
}

export function updateDivisionStatus(id: number, status: DivisionStatus): Promise<DivisionMutationResponse> {
  return apiFetch<DivisionMutationResponse>(`/api/divisions/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
