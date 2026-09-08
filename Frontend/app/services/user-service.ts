import { apiFetch, apiGet, apiPost, apiPut } from "../lib/api-client";
import type { UserRole } from "../lib/auth";

export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  division: { id: number; name: string } | null;
};

export type UserQuery = {
  search?: string;
  role?: UserRole;
  status?: "active" | "inactive";
  page?: number;
  perPage?: number;
};

export type PaginationMeta = {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
};

export type UserListResponse = {
  data: ManagedUser[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: PaginationMeta;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: UserRole;
  division_id?: number | null;
};

export type UpdateUserPayload = Pick<ManagedUser, "name" | "email" | "role"> & {
  division_id?: number | null;
};
type UserResponse = { data: ManagedUser };
type UserMutationResponse = { message: string; data: ManagedUser };

export function getUsers(params: UserQuery): Promise<UserListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 10));

  return apiGet<UserListResponse>(`/api/users?${query.toString()}`);
}

export function getUser(id: number): Promise<UserResponse> {
  return apiGet<UserResponse>(`/api/users/${id}`);
}

export function createUser(payload: CreateUserPayload): Promise<UserMutationResponse> {
  return apiPost<UserMutationResponse>("/api/users", payload);
}

export function updateUser(id: number, payload: UpdateUserPayload): Promise<UserMutationResponse> {
  return apiPut<UserMutationResponse>(`/api/users/${id}`, payload);
}

export function updateUserStatus(id: number, isActive: boolean): Promise<UserMutationResponse> {
  return apiFetch<UserMutationResponse>(`/api/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}
