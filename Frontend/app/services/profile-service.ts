import { apiFetch, apiGet, apiPut } from "../lib/api-client";

export type Profile = {
  id: number;
  name: string;
  email: string;
  role: string;
  division?: {
    id: number;
    name: string;
  } | null;
  profile_photo: string | null;
  created_at?: string;
};

export type ProfileResponse = {
  message: string;
  data: Profile;
};

export type ChangePasswordPayload = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export type MessageResponse = {
  message: string;
};

export type AccountActivityLog = {
  id: number;
  event: string | null;
  category: string;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  subject_name: string | null;
  created_at: string;
  created_at_human: string;
};

export type AccountActivityLogResponse = {
  data: AccountActivityLog[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export function getProfile(): Promise<ProfileResponse> {
  return apiGet<ProfileResponse>("/api/profile");
}

export function getAccountActivityLogs(perPage = 5): Promise<AccountActivityLogResponse> {
  return apiGet<AccountActivityLogResponse>(`/api/profile/activity-logs?per_page=${perPage}`);
}

export function updateProfile(data: FormData): Promise<ProfileResponse> {
  // Content-Type tidak di-set manual agar browser menambahkan boundary
  // multipart/form-data yang dibutuhkan Laravel saat membaca file.
  return apiFetch<ProfileResponse>("/api/profile", {
    method: "PUT",
    body: data,
  });
}

export function changePassword(
  payload: ChangePasswordPayload,
): Promise<MessageResponse> {
  return apiPut<MessageResponse>("/api/profile/password", payload);
}
