import { apiDelete, apiGet, apiPost, apiPut } from "../lib/api-client";

export type Permission = {
  id: number;
  name: string;
  guard_name: string;
};

export type Role = {
  id: number;
  name: string;
  guard_name: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
};

export type RolePayload = {
  name: string;
  permissions?: string[];
  guard_name?: string;
};

type RoleCollectionResponse = { data: Role[] };
type RoleResponse = { data: Role };
type RoleMutationResponse = { message: string; data: Role };

export async function getRoles(): Promise<Role[]> {
  const response = await apiGet<RoleCollectionResponse>("/api/roles");
  return response.data ?? [];
}

export function getRole(id: number): Promise<RoleResponse> {
  return apiGet<RoleResponse>(`/api/roles/${id}`);
}

export function createRole(payload: RolePayload): Promise<RoleMutationResponse> {
  // Method tetap mengikuti kontrak backend nyata, tetapi UI baru boleh
  // memanggilnya setelah katalog permission lengkap tersedia.
  return apiPost<RoleMutationResponse>("/api/roles", payload);
}

export function updateRole(id: number, payload: RolePayload): Promise<RoleMutationResponse> {
  return apiPut<RoleMutationResponse>(`/api/roles/${id}`, payload);
}

export function deleteRole(id: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/api/roles/${id}`);
}
