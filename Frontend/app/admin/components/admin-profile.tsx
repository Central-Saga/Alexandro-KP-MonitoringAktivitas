"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { ApiError } from "../../lib/api-client";
import { getApiUrl } from "../../lib/auth";
import { getActivities, type Activity } from "../../services/activity-service";
import {
  getProfile,
  updateProfile,
  type Profile,
} from "../../services/profile-service";
import {
  firstFieldError,
  parseLaravelError,
  type LaravelFieldErrors,
} from "../../lib/validation";

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  project_manager: "Project Manager",
  karyawan: "Karyawan",
};

export default function AdminProfile() {
  const { user, refreshCurrentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [activityDataAvailable, setActivityDataAvailable] = useState(false);
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
    // Object URL harus dicabut saat halaman ditutup agar browser tidak
    // menahan memory file preview yang sudah tidak digunakan.
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

      try {
        const activityResponse = await getActivities();
        setActivities(activityResponse);
        setActivityDataAvailable(true);
      } catch {
        setActivities([]);
        setActivityDataAvailable(false);
      }
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfile, reloadKey]);

  const myActivities = useMemo(
    () => activities.filter((activity) => activity.user_id === user?.id),
    [activities, user?.id],
  );
  const approvedActivities = myActivities.filter(
    (activity) => activity.status === "approved",
  ).length;

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

  if (isLoading) return <ProfileLoading />;

  if (!profile) {
    return (
      <main className="p-4 sm:p-7">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="font-semibold text-amber-900">{loadError}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 rounded-xl bg-[#18a84f] px-5 py-2.5 text-sm font-semibold text-white">
            Coba Lagi
          </button>
        </section>
      </main>
    );
  }

  const initials = profile.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const photoUrl = photoPreviewUrl ?? (profile.profile_photo ? resolvePhotoUrl(profile.profile_photo) : null);
  const roleLabel = roleLabels[profile.role] ?? profile.role;

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header>
        <h2 className="text-2xl font-bold text-[#172b4d]">Profil Saya</h2>
        <p className="mt-1 text-sm text-[#71829a] sm:text-base">
          Kelola informasi profil dan keamanan akun Anda
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.7fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#dce4ec] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
            <div className="text-center">
              <div
                role={photoUrl ? "img" : undefined}
                aria-label={photoUrl ? `Foto profil ${profile.name}` : undefined}
                style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#18a84f] bg-cover bg-center text-2xl font-bold text-white"
              >
                {!photoUrl && (initials || "U")}
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#172b4d]">{profile.name}</h3>
              <p className="mt-1 text-sm text-[#71829a]">{profile.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-[#dcf8e5] px-3 py-1 text-xs font-semibold text-[#168c44]">
                {roleLabel}
              </span>
            </div>
            <dl className="mt-6 space-y-4 border-t border-[#e1e7ee] pt-5 text-sm">
              <ProfileDetail label="Divisi" value="—" />
              <ProfileDetail label="NIK" value="—" />
              <ProfileDetail label="Bergabung" value="—" />
            </dl>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
            <h3 className="border-b border-[#e1e7ee] px-6 py-4 font-bold text-[#172b4d]">Statistik Saya</h3>
            <dl className="space-y-4 p-6 text-sm">
              <ProfileDetail label="Total Aktivitas" value={activityDataAvailable ? String(myActivities.length) : "—"} emphasis={activityDataAvailable} />
              <ProfileDetail label="Disetujui" value={activityDataAvailable ? String(approvedActivities) : "—"} emphasis={activityDataAvailable} />
              <ProfileDetail label="Jam Kerja" value="—" />
            </dl>
          </section>
        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
            <h3 className="border-b border-[#e1e7ee] px-6 py-4 font-bold text-[#172b4d]">Informasi Pribadi</h3>
            <form onSubmit={saveProfile} className="p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
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
                <ProfileInput label="Email" value={profile.email} readOnly />
                <ProfileInput label="No. Telepon" value="—" readOnly />
                <ProfileInput label="NIK" value="—" readOnly />
                <ProfileInput label="Divisi" value="—" readOnly />
                <ProfileInput label="Role" value={roleLabel} readOnly />
                <label className="block text-sm font-semibold text-[#172b4d] md:col-span-2">
                  Alamat
                  <textarea readOnly value="—" rows={3} className="mt-2 w-full resize-none rounded-xl border border-[#dce4ec] bg-[#f8fafc] px-4 py-3 font-normal text-[#71829a] outline-none" />
                </label>
                <label htmlFor="profile-photo" className="block text-sm font-semibold text-[#172b4d] md:col-span-2">
                  Foto Profil
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

                      // Preview hanya dibuat setelah file lolos pemeriksaan
                      // dasar; backend tetap menjadi validator keamanan final.
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
                    className="mt-2 block w-full rounded-xl border border-[#dce4ec] bg-white text-sm text-[#60738f] file:mr-4 file:border-0 file:bg-[#e8f8ed] file:px-4 file:py-3 file:font-semibold file:text-[#168c44] focus:outline-none focus:ring-2 focus:ring-[#18a84f]/30"
                  />
                  <span id="profile-photo-help" className="mt-1 block text-xs font-normal text-[#91a0b3]">JPG, PNG, GIF, BMP, atau WebP. Maksimum 5 MB.</span>
                  {fieldErrors.profile_photo?.[0] && <span id="profile-photo-error" className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.profile_photo[0]}</span>}
                  {profilePhoto && !fieldErrors.profile_photo?.length && <button type="button" onClick={(event) => { event.preventDefault(); clearPhotoSelection(); }} className="mt-2 rounded-lg border border-[#dce4ec] px-3 py-2 text-xs font-semibold text-[#60738f]">Batalkan foto terpilih</button>}
                </label>
              </div>

              {formError && <p role="alert" className="mt-4 text-sm text-red-600">{formError}</p>}
              {successMessage && <p role="status" className="mt-4 text-sm text-[#168c44]">{successMessage}</p>}
              <button type="submit" disabled={isSaving} className="mt-5 rounded-xl bg-[#18a84f] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </form>
          </section>

          <PasswordUnavailable />
        </div>
      </div>
    </main>
  );
}

function ProfileInput({ id, label, name, value, readOnly = false, required = false, error = "", onChange }: { id?: string; label: string; name?: string; value: string; readOnly?: boolean; required?: boolean; error?: string; onChange?: (value: string) => void }) {
  return (
    <label htmlFor={id} className="block text-sm font-semibold text-[#172b4d]">
      {label}
      <input id={id} name={name} value={value} readOnly={readOnly} required={required} aria-invalid={Boolean(error)} aria-describedby={error && id ? `${id}-error` : undefined} onChange={(event) => onChange?.(event.target.value)} className={`mt-2 h-11 w-full rounded-xl border border-[#dce4ec] px-4 font-normal outline-none focus:ring-2 focus:ring-[#18a84f]/20 ${readOnly ? "bg-[#f8fafc] text-[#71829a]" : "bg-white text-[#172b4d] focus:border-[#18a84f]"}`} />
      {error && <span id={id ? `${id}-error` : undefined} className="mt-1 block text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}

function ProfileDetail({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[#71829a]">{label}</dt>
      <dd className={emphasis ? "font-bold text-[#18a84f]" : "font-medium text-[#172b4d]"}>{value}</dd>
    </div>
  );
}

function PasswordUnavailable() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <h3 className="border-b border-[#e1e7ee] px-6 py-4 font-bold text-[#172b4d]">Ubah Password</h3>
      <div className="space-y-4 p-5 sm:p-6">
        {["Password Lama", "Password Baru", "Konfirmasi Password Baru"].map((label) => (
          <label key={label} className="block text-sm font-semibold text-[#172b4d]">
            {label}
            <input type="password" disabled placeholder="Belum tersedia" className="mt-2 h-11 w-full rounded-xl border border-[#dce4ec] bg-[#f8fafc] px-4 font-normal disabled:cursor-not-allowed" />
          </label>
        ))}
        <p className="text-xs text-[#71829a]">Backend belum menyediakan endpoint perubahan password.</p>
        <button type="button" disabled className="rounded-xl bg-[#147d70] px-5 py-3 text-sm font-semibold text-white opacity-60">Update Password</button>
      </div>
    </section>
  );
}

function ProfileLoading() {
  return (
    <main className="space-y-6 p-4 sm:p-7">
      <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.7fr)]">
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-[520px] animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </main>
  );
}

function resolvePhotoUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return getApiUrl(value);
}

const supportedProfilePhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
]);

function validateProfilePhoto(file: File | null): string {
  // Validasi client memberi feedback cepat. Aturan Laravel tetap menjadi
  // batas keamanan final karena MIME dan ukuran dari browser tidak dipercaya.
  if (!file) return "";
  if (!supportedProfilePhotoTypes.has(file.type)) {
    return "Format foto harus JPG, PNG, GIF, BMP, atau WebP.";
  }
  if (file.size > 5 * 1024 * 1024) {
    return "Ukuran foto tidak boleh melebihi 5 MB.";
  }
  return "";
}
