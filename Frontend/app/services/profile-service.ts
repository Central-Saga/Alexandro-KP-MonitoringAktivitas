import { apiFetch, apiGet } from "../lib/api-client";

export type Profile = {
  id: number;
  name: string;
  email: string;
  role: string;
  profile_photo: string | null;
};

export type ProfileResponse = {
  message: string;
  data: Profile;
};

export function getProfile(): Promise<ProfileResponse> {
  return apiGet<ProfileResponse>("/api/profile");
}

export function updateProfile(data: FormData): Promise<ProfileResponse> {
  // Content-Type tidak di-set manual agar browser menambahkan boundary
  // multipart/form-data yang dibutuhkan Laravel saat membaca file.
  return apiFetch<ProfileResponse>("/api/profile", {
    method: "PUT",
    body: data,
  });
}
