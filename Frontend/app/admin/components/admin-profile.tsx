"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { ApiError } from "../../lib/api-client";
import { getApiUrl } from "../../lib/auth";
import {
  changePassword,
  getAccountActivityLogs,
  getProfile,
  updateProfile,
  type AccountActivityLog,
  type Profile,
} from "../../services/profile-service";
import {
  firstFieldError,
  parseLaravelError,
  type LaravelFieldErrors,
} from "../../lib/validation";
import { AdminIcon, type AdminIconName } from "./admin-icons";

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  project_manager: "Project Manager",
  karyawan: "Karyawan",
};

export default function AdminProfile() {
  const { refreshCurrentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accountActivityLogs, setAccountActivityLogs] = useState<AccountActivityLog[]>([]);
  const [accountActivityTotal, setAccountActivityTotal] = useState(0);
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [isActivityLogLoading, setIsActivityLogLoading] = useState(true);
  const [activityLogError, setActivityLogError] = useState("");
  const [showAllActivityLogs, setShowAllActivityLogs] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LaravelFieldErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoPreviewRef = useRef<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] =
    useState<LaravelFieldErrors>({});
  const [passwordFormError, setPasswordFormError] = useState("");
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const clearPhotoSelection = useCallback(() => {
    if (photoPreviewRef.current) {
      URL.revokeObjectURL(photoPreviewRef.current);
      photoPreviewRef.current = null;
    }
    setPhotoPreviewUrl(null);
    setProfilePhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewRef.current) URL.revokeObjectURL(photoPreviewRef.current);
    };
  }, []);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await getProfile();
      setProfile(response.data);
      setName(response.data.name);

    } catch (error) {
      setLoadError(
        error instanceof ApiError && error.status !== 401
          ? error.message
          : "Profil belum dapat dimuat.",
      );
      if (error instanceof ApiError && error.status === 401) {
        void refreshCurrentUser();
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshCurrentUser]);

  const loadAccountActivityLogs = useCallback(async (perPage = 5) => {
    setIsActivityLogLoading(true);
    setActivityLogError("");
    try {
      const response = await getAccountActivityLogs(perPage);
      setAccountActivityLogs(response.data);
      setAccountActivityTotal(response.meta.total);
    } catch {
      setActivityLogError("Riwayat aktivitas gagal dimuat.");
    } finally {
      setIsActivityLogLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfile, reloadKey]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAccountActivityLogs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAccountActivityLogs]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setFieldErrors({});
    setSuccessMessage("");

    const normalizedName = name.trim();

    if (!normalizedName) {
      setFieldErrors({ name: ["Nama lengkap wajib diisi."] });
      return;
    }

    const photoError = validateProfilePhoto(profilePhoto);
    if (photoError) {
      setFieldErrors({ profile_photo: [photoError] });
      return;
    }

    if (normalizedName === profile?.name && !profilePhoto) {
      setFormError("Tidak ada perubahan untuk disimpan.");
      return;
    }

    setIsSaving(true);
    const body = new FormData();
    body.set("name", normalizedName);
    if (profilePhoto) body.set("profile_photo", profilePhoto);

    try {
      const response = await updateProfile(body);
      setProfile(response.data);
      setName(response.data.name);
      clearPhotoSelection();
      await refreshCurrentUser();
      setSuccessMessage(response.message);
    } catch (error) {
      const validation = parseLaravelError(
        error instanceof ApiError ? error.data : null,
      );
      setFieldErrors(validation.errors ?? {});
      setFormError(
        error instanceof ApiError
          ? error.status >= 500
            ? "Server sedang bermasalah. Silakan coba lagi."
            : validation.message ?? error.message
          : "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordChange(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setPasswordFormError("");
    setPasswordFieldErrors({});
    setPasswordSuccessMessage("");

    if (!currentPassword) {
      setPasswordFieldErrors({
        current_password: ["Password saat ini wajib diisi."],
      });
      return;
    }

    if (!newPassword) {
      setPasswordFieldErrors({
        password: ["Password baru wajib diisi."],
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFieldErrors({
        password: ["Password baru minimal 8 karakter."],
      });
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      setPasswordFieldErrors({
        password: ["Konfirmasi password baru tidak cocok."],
      });
      return;
    }

    setIsSavingPassword(true);

    try {
      const response = await changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirmation,
      });

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setPasswordSuccessMessage(response.message);
    } catch (error) {
      const validation = parseLaravelError(
        error instanceof ApiError ? error.data : null,
      );
      setPasswordFieldErrors(validation.errors ?? {});
      setPasswordFormError(
        error instanceof ApiError
          ? error.status >= 500
            ? "Server sedang bermasalah. Silakan coba lagi."
            : validation.message ?? error.message
          : "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) return <ProfileLoading />;

  if (!profile) {
    return (
      <main className="space-y-5 p-4 sm:p-6 lg:p-7">
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AdminIcon name="shield" className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-red-900">
            Gagal Memuat Profil
          </h2>
          <p className="mt-1 text-xs text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((prev) => prev + 1)}
            className="mt-4 rounded-xl bg-[#016273] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#014d5a]"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const photoUrl =
    photoPreviewUrl ??
    (profile.profile_photo ? resolvePhotoUrl(profile.profile_photo) : null);
  const roleLabel = roleLabels[profile.role] ?? profile.role;
  const divisionName = profile.division?.name ?? "—";
  const joinedDate = formatDate(profile.created_at);

  return (
    <main className="space-y-5 p-4 sm:p-6 lg:p-7">
      <header>
        <h1 className="text-xl font-bold text-[#030303] sm:text-2xl">
          Profil Saya
        </h1>
        <p className="text-xs text-[#5a737e] sm:text-sm">
          Kelola informasi profil dan keamanan akun Anda
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.7fr)]">
        {/* LEFT COLUMN: Identity Card & Activity Statistics (Role-specific) */}
        <div className="space-y-4">
          {/* Identity Card */}
          <section className="rounded-2xl border border-[#d0e6ed] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="text-center">
              <div
                role={photoUrl ? "img" : undefined}
                aria-label={
                  photoUrl ? `Foto profil ${profile.name}` : undefined
                }
                style={
                  photoUrl
                    ? { backgroundImage: `url("${photoUrl}")` }
                    : undefined
                }
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#016273] bg-cover bg-center text-2xl font-bold text-white shadow-sm ring-4 ring-[#EAF7FB]"
              >
                {!photoUrl && (initials || "U")}
              </div>
              <h2 className="mt-3.5 text-base font-bold text-[#030303] sm:text-lg">
                {profile.name}
              </h2>
              <p className="text-xs text-[#5a737e]">{profile.email}</p>
              <div className="mt-2.5">
                <span className="inline-flex rounded-full bg-[#EAF7FB] px-3 py-0.5 text-xs font-semibold text-[#016273] ring-1 ring-inset ring-[#016273]/20">
                  {roleLabel}
                </span>
              </div>
            </div>

            <dl className="mt-5 space-y-3 border-t border-[#d0e6ed] pt-4 text-xs sm:text-sm">
              <ProfileDetail label="Divisi" value={divisionName} />
              <ProfileDetail label="Bergabung" value={joinedDate} />
            </dl>
          </section>

          <AccountActivityHistory
            logs={accountActivityLogs}
            total={accountActivityTotal}
            isLoading={isActivityLogLoading}
            error={activityLogError}
            onRetry={() => void loadAccountActivityLogs()}
            onShowAll={() => {
              setShowAllActivityLogs(true);
              void loadAccountActivityLogs(50);
            }}
            onCloseAll={() => setShowAllActivityLogs(false)}
            showingAll={showAllActivityLogs}
          />
        </div>

        {/* RIGHT COLUMN: Account Info & Password Update */}
        <div className="space-y-5">
          {/* Top Form: Informasi Akun */}
          <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <header className="border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
              <h2 className="text-sm font-bold text-[#030303] sm:text-base">
                Informasi Akun
              </h2>
              <p className="text-xs text-[#5a737e]">
                Perbarui nama lengkap dan foto profil Anda.
              </p>
            </header>

            <form onSubmit={saveProfile} className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileInput
                  id="profile-name"
                  label="Nama Lengkap"
                  name="name"
                  value={name}
                  required
                  error={firstFieldError(fieldErrors, "name")}
                  onChange={(value) => {
                    setName(value);
                    setFieldErrors((current) => ({ ...current, name: [] }));
                  }}
                />
                <ProfileInput
                  label="Email"
                  value={profile.email}
                  readOnly
                  helperText="Email tidak dapat diubah langsung"
                />
                <ProfileInput
                  label="Role"
                  value={roleLabel}
                  readOnly
                />
                <ProfileInput
                  label="Divisi"
                  value={divisionName}
                  readOnly
                />

                {/* Profile Photo Upload */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="profile-photo"
                    className="block text-xs font-semibold text-[#030303]"
                  >
                    Foto Profil
                  </label>
                  <input
                    ref={photoInputRef}
                    id="profile-photo"
                    name="profile_photo"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
                    aria-invalid={Boolean(fieldErrors.profile_photo?.length)}
                    aria-describedby="profile-photo-help profile-photo-error"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      const error = validateProfilePhoto(file);

                      if (photoPreviewRef.current) {
                        URL.revokeObjectURL(photoPreviewRef.current);
                        photoPreviewRef.current = null;
                      }
                      setPhotoPreviewUrl(null);
                      setProfilePhoto(error ? null : file);

                      if (error && photoInputRef.current) {
                        photoInputRef.current.value = "";
                      }

                      if (file && !error) {
                        const objectUrl = URL.createObjectURL(file);
                        photoPreviewRef.current = objectUrl;
                        setPhotoPreviewUrl(objectUrl);
                      }
                      setFieldErrors((current) => ({
                        ...current,
                        profile_photo: error ? [error] : [],
                      }));
                    }}
                    className="mt-1.5 block w-full rounded-xl border border-[#c8dfe8] bg-white text-xs text-[#5a737e] file:mr-3 file:border-0 file:bg-[#EAF7FB] file:px-3.5 file:py-2.5 file:text-xs file:font-semibold file:text-[#016273] focus:outline-none focus:ring-2 focus:ring-[#016273]/20"
                  />
                  <span
                    id="profile-photo-help"
                    className="mt-1 block text-[11px] font-normal text-[#8399a2]"
                  >
                    Format: JPG, PNG, GIF, BMP, atau WebP (Maks. 5 MB).
                  </span>
                  {fieldErrors.profile_photo?.[0] && (
                    <span
                      id="profile-photo-error"
                      className="mt-1 block text-xs font-normal text-red-600"
                    >
                      {fieldErrors.profile_photo[0]}
                    </span>
                  )}
                  {profilePhoto && !fieldErrors.profile_photo?.length && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        clearPhotoSelection();
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#d0e6ed] px-2.5 py-1 text-xs font-semibold text-[#5a737e] hover:bg-[#EAF7FB]"
                    >
                      <AdminIcon name="x" className="h-3 w-3" />
                      Batalkan foto terpilih
                    </button>
                  )}
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800"
                >
                  <AdminIcon
                    name="shield"
                    className="h-4 w-4 shrink-0 text-red-600"
                  />
                  <span>{formError}</span>
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs text-green-800"
                >
                  <AdminIcon
                    name="user-check"
                    className="h-4 w-4 shrink-0 text-green-600"
                  />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-9.5 items-center justify-center rounded-xl bg-[#016273] px-5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] focus:outline-none focus:ring-2 focus:ring-[#016273]/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </section>

          {/* Bottom Form: Keamanan Akun / Ubah Password */}
          <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <header className="border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
              <h2 className="text-sm font-bold text-[#030303] sm:text-base">
                Keamanan Akun
              </h2>
              <p className="text-xs text-[#5a737e]">
                Ubah password akun Anda secara berkala untuk menjaga keamanan.
              </p>
            </header>

            <form onSubmit={handlePasswordChange} className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <ProfileInput
                    id="current-password"
                    label="Password Lama"
                    type="password"
                    value={currentPassword}
                    required
                    error={firstFieldError(
                      passwordFieldErrors,
                      "current_password",
                    )}
                    placeholder="Masukkan password saat ini"
                    onChange={(value) => {
                      setCurrentPassword(value);
                      setPasswordFieldErrors((current) => ({
                        ...current,
                        current_password: [],
                      }));
                    }}
                  />
                </div>
                <ProfileInput
                  id="new-password"
                  label="Password Baru"
                  type="password"
                  value={newPassword}
                  required
                  error={firstFieldError(passwordFieldErrors, "password")}
                  placeholder="Minimal 8 karakter"
                  onChange={(value) => {
                    setNewPassword(value);
                    setPasswordFieldErrors((current) => ({
                      ...current,
                      password: [],
                    }));
                  }}
                />
                <ProfileInput
                  id="confirm-password"
                  label="Konfirmasi Password Baru"
                  type="password"
                  value={newPasswordConfirmation}
                  required
                  placeholder="Ulangi password baru"
                  onChange={(value) => {
                    setNewPasswordConfirmation(value);
                    setPasswordFieldErrors((current) => ({
                      ...current,
                      password: [],
                    }));
                  }}
                />
              </div>

              {passwordFormError && (
                <div
                  role="alert"
                  className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800"
                >
                  <AdminIcon
                    name="shield"
                    className="h-4 w-4 shrink-0 text-red-600"
                  />
                  <span>{passwordFormError}</span>
                </div>
              )}

              {passwordSuccessMessage && (
                <div
                  role="status"
                  className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs text-green-800"
                >
                  <AdminIcon
                    name="user-check"
                    className="h-4 w-4 shrink-0 text-green-600"
                  />
                  <span>{passwordSuccessMessage}</span>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="inline-flex h-9.5 items-center justify-center rounded-xl bg-[#016273] px-5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] focus:outline-none focus:ring-2 focus:ring-[#016273]/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingPassword ? "Memproses..." : "Ubah Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function ProfileInput({
  id,
  label,
  name,
  value,
  type = "text",
  placeholder,
  readOnly = false,
  required = false,
  error = "",
  helperText = "",
  onChange,
}: {
  id?: string;
  label: string;
  name?: string;
  value: string;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block text-xs font-semibold text-[#030303]">
      {label}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error && id
            ? `${id}-error`
            : helperText && id
              ? `${id}-helper`
              : undefined
        }
        onChange={(event) => onChange?.(event.target.value)}
        className={`mt-1.5 h-10 w-full rounded-xl border px-3 text-xs font-normal outline-none transition-colors focus:ring-2 ${
          readOnly
            ? "cursor-default border-[#d0e6ed] bg-[#EAF7FB]/40 text-[#5a737e]"
            : error
              ? "border-red-300 bg-white text-[#030303] focus:border-red-500 focus:ring-red-500/20"
              : "border-[#c8dfe8] bg-white text-[#030303] focus:border-[#016273] focus:ring-[#016273]/20"
        }`}
      />
      {error ? (
        <span
          id={id ? `${id}-error` : undefined}
          className="mt-1 block text-xs font-normal text-red-600"
        >
          {error}
        </span>
      ) : helperText ? (
        <span
          id={id ? `${id}-helper` : undefined}
          className="mt-1 block text-[11px] font-normal text-[#8399a2]"
        >
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function ProfileDetail({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[#5a737e]">{label}</dt>
      <dd
        className={
          emphasis
            ? "font-bold text-[#016273]"
            : "font-semibold text-[#030303]"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function AccountActivityHistory({
  logs,
  total,
  isLoading,
  error,
  onRetry,
  onShowAll,
  onCloseAll,
  showingAll,
}: {
  logs: AccountActivityLog[];
  total: number;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  onShowAll: () => void;
  onCloseAll: () => void;
  showingAll: boolean;
}) {
  const latestLogs = logs.slice(0, 5);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5">
        <header className="border-b border-[#d0e6ed] pb-3">
          <h2 className="text-sm font-bold text-[#030303]">Riwayat Aktivitas Akun</h2>
          <p className="mt-0.5 text-[11px] text-[#5a737e]">Jejak aktivitas penting akun Anda</p>
        </header>

        {isLoading && !showingAll ? (
        <div className="divide-y divide-[#e5eef2]" aria-label="Memuat riwayat aktivitas">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex animate-pulse gap-2.5 py-3">
              <div className="h-7 w-7 shrink-0 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-1.5 py-0.5"><div className="h-3 rounded bg-slate-200" /><div className="h-2.5 w-1/2 rounded bg-slate-100" /></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-6 text-center">
          <p className="text-xs font-semibold text-rose-700">{error}</p>
          <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-[#016273]/25 px-3 py-1.5 text-xs font-semibold text-[#016273] hover:bg-[#EAF7FB]">Coba Lagi</button>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-7 text-center">
          <p className="text-xs font-semibold text-[#030303]">Belum ada riwayat aktivitas.</p>
          <p className="mx-auto mt-1 max-w-64 text-[11px] leading-relaxed text-[#5a737e]">Aktivitas penting yang Anda lakukan di WorkTrack akan muncul di sini.</p>
        </div>
      ) : (
        <div>
          <ActivityFeed logs={latestLogs} />
          {total > 5 && (
            <div className="border-t border-[#e5eef2] pt-3 text-right">
              <button type="button" onClick={onShowAll} className="text-[11px] font-semibold text-[#016273] hover:text-[#014d5a]">Lihat semua aktivitas →</button>
            </div>
          )}
        </div>
      )}
      </section>

      {showingAll && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="all-activity-title">
          <section className="flex max-h-[min(720px,88vh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-[#d0e6ed] px-5 py-4">
              <div><h2 id="all-activity-title" className="text-base font-bold text-[#030303]">Semua Aktivitas Akun</h2><p className="text-xs text-[#5a737e]">Menampilkan hingga 50 aktivitas terbaru</p></div>
              <button type="button" onClick={onCloseAll} aria-label="Tutup riwayat aktivitas" className="rounded-lg p-1.5 text-[#5a737e] hover:bg-[#EAF7FB] hover:text-[#016273]"><AdminIcon name="x" className="h-4 w-4" /></button>
            </header>
            <div className="overflow-y-auto px-5 pb-4">
              {isLoading ? <div className="py-8 text-center text-xs text-[#5a737e]">Memuat aktivitas...</div> : <ActivityFeed logs={logs} />}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function ActivityFeed({ logs }: { logs: AccountActivityLog[] }) {
  const groups = groupActivityLogs(logs);

  return (
    <div>
      {groups.map((group) => (
        <section key={group.key} className="pt-3 first:pt-3">
          <h3 className="pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#8399a2]">{group.label}</h3>
          <div className="divide-y divide-[#edf2f4]">
            {group.logs.map((log) => {
              const presentation = activityPresentation(log);
              return (
                <div key={log.id} className="flex items-start gap-2.5 py-2.5 first:pt-2 sm:gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${presentation.tone}`}>
                    <AdminIcon name={presentation.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13px] font-semibold leading-snug text-[#172126] sm:text-sm">{presentation.action}</p>
                    {presentation.subject && (
                      <p className="mt-0.5 line-clamp-1 text-xs font-normal text-[#5a737e] sm:text-[13px]" title={presentation.subject}>“{presentation.subject}”</p>
                    )}
                  </div>
                  <time dateTime={log.created_at} className="shrink-0 pt-1 text-[10.5px] tabular-nums text-[#8399a2]">{formatActivityTime(log.created_at)}</time>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ProfileLoading() {
  return (
    <main className="space-y-5 p-4 sm:p-6 lg:p-7">
      <div className="h-14 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.7fr)]">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-[480px] animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </main>
  );
}

function resolvePhotoUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return getApiUrl(value);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).replace(":", ".");
}

function groupActivityLogs(logs: AccountActivityLog[]) {
  const groups = new Map<string, { key: string; label: string; logs: AccountActivityLog[] }>();

  for (const log of logs) {
    const date = new Date(log.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = groups.get(key) ?? { key, label: activityDateLabel(date), logs: [] };
    group.logs.push(log);
    groups.set(key, group);
  }

  return [...groups.values()];
}

function activityDateLabel(date: Date) {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return "Hari ini";
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function activityPresentation(log: AccountActivityLog): {
  action: string;
  subject: string | null;
  icon: AdminIconName;
  tone: string;
} {
  const categoryLabels: Record<string, string> = {
    user: "pengguna",
    division: "divisi",
    project: "proyek",
    project_task: "tugas",
    activity: "aktivitas",
    assignment: "penugasan proyek",
    role: "hak akses",
    profile: "profil",
  };
  const noun = categoryLabels[log.category] ?? "data";
  const event = log.event ?? "";
  const action = (() => {
    if (event === "login") return "Login ke sistem";
    if (event === "logout") return "Logout dari sistem";
    if (event === "approved") return "Menyetujui aktivitas";
    if (event === "resubmitted") return "Mengirim ulang aktivitas";
    if (event === "revision_requested" || event === "rejected") return "Meminta revisi aktivitas";
    if (event === "password_updated" || event === "password_changed") return "Mengubah password akun";
    if (event === "activated") return `Mengaktifkan ${noun}`;
    if (event === "deactivated") return `Menonaktifkan ${noun}`;
    if (event === "status_updated") return `Mengubah status ${noun}`;
    if (event === "created") return log.category === "assignment" ? "Menambahkan anggota proyek" : `Membuat ${noun}`;
    if (event === "updated") return `Mengubah ${noun}`;
    if (event === "deleted") return `Menghapus ${noun}`;
    return log.description;
  })();

  const icon = (() : AdminIconName => {
    if (event === "login") return "log-in";
    if (event === "logout") return "log-out";
    if (event === "created") return log.category === "assignment" ? "users" : "plus";
    if (event === "updated" || event === "status_updated") return "edit";
    if (event === "approved") return "check-circle";
    if (event === "resubmitted") return "rotate";
    if (event === "revision_requested" || event === "rejected") return "rotate";
    if (event === "password_updated" || event === "password_changed") return "key";
    if (log.category === "profile") return "settings";
    if (log.category === "role") return "shield";
    return "activity";
  })();

  const tone = event === "approved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : event === "revision_requested" || event === "rejected"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : event === "logout"
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : "border-[#cfe4e9] bg-[#EAF7FB] text-[#016273]";

  return { action, subject: log.subject_name, icon, tone };
}

const supportedProfilePhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
]);

function validateProfilePhoto(file: File | null): string {
  if (!file) return "";
  if (!supportedProfilePhotoTypes.has(file.type)) {
    return "Format foto harus JPG, PNG, GIF, BMP, atau WebP.";
  }
  if (file.size > 5 * 1024 * 1024) {
    return "Ukuran foto tidak boleh melebihi 5 MB.";
  }
  return "";
}
