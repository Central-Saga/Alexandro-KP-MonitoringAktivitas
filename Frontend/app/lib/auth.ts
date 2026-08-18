export type UserRole = "admin" | "project_manager" | "karyawan";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type StoredAuth = {
  token: string;
  user: AuthUser;
  rememberMe: boolean;
};

export const ACCESS_TOKEN_KEY = "csm_access_token";
export const USER_KEY = "csm_user";

export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  project_manager: "/project-manager/dashboard",
  karyawan: "/karyawan/dashboard",
};

export function getApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL belum dikonfigurasi.");
  }

  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function saveAuth(
  token: string,
  user: AuthUser,
  rememberMe: boolean,
): void {
  clearAuth();

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredAuth(): StoredAuth | null {
  const storageOptions = [
    { storage: localStorage, rememberMe: true },
    { storage: sessionStorage, rememberMe: false },
  ];

  for (const { storage, rememberMe } of storageOptions) {
    const token = storage.getItem(ACCESS_TOKEN_KEY);
    const serializedUser = storage.getItem(USER_KEY);

    if (!token || !serializedUser) {
      continue;
    }

    try {
      return {
        token,
        user: JSON.parse(serializedUser) as AuthUser,
        rememberMe,
      };
    } catch {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(USER_KEY);
    }
  }

  return null;
}

export function clearAuth(): void {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(USER_KEY);
  }
}
