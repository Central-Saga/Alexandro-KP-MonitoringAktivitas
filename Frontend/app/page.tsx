"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "./components/brand-logo";
import { useAuth } from "./components/auth-provider";
import {
  DASHBOARD_BY_ROLE,
  getApiUrl,
  type AuthUser,
} from "./lib/auth";
import {
  firstFieldError,
  parseLaravelError,
} from "./lib/validation";

type LoginResponse = {
  message: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim();
    let isValid = true;

    setEmailError("");
    setPasswordError("");
    setLoginError("");

    if (!normalizedEmail) {
      setEmailError("Email wajib diisi.");
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setEmailError("Format email tidak valid.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password wajib diisi.");
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl("/api/login"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data: unknown = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = parseLaravelError(data);

        setEmailError(firstFieldError(error.errors, "email"));
        setPasswordError(firstFieldError(error.errors, "password"));
        setLoginError(
          response.status >= 500
            ? "Server sedang bermasalah. Silakan coba lagi."
            : error.message ?? "Email atau password yang Anda masukkan salah.",
        );
        return;
      }

      const result = data as LoginResponse;

      if (!result.access_token || !result.user) {
        setLoginError("Respons login tidak valid atau role tidak dikenali.");
        return;
      }

      const destination = DASHBOARD_BY_ROLE[result.user.role];

      if (!destination) {
        setLoginError("Respons login tidak valid atau role tidak dikenali.");
        return;
      }

      login(result.access_token, result.user, rememberMe);
      router.replace(destination);
    } catch {
      setLoginError(
        "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white lg:flex">
      {/* =====================================================
          BAGIAN KIRI - FORM LOGIN
      ====================================================== */}
      <section className="flex w-full items-center justify-center px-6 py-10 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="w-full max-w-[500px]">
          {/* Logo & Branding Central Saga Mandala / WorkTrack */}
          <div className="mb-10 sm:mb-12">
            <BrandLogo size="lg" textVariant="login" />
          </div>

          {/* Header Login */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold leading-tight text-[#030303] sm:text-3xl">
              Selamat Datang
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5a737e] sm:text-base">
              Masuk menggunakan akun internal yang terdaftar pada sistem WorkTrack.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold text-[#030303] sm:text-sm"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onInput={() => setEmailError("")}
                placeholder="nama@csm.co.id"
                required
                className="h-12 w-full rounded-xl border border-[#c8dfe8] bg-white px-4 text-sm text-[#030303] outline-none transition placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "email-error" : undefined}
              />
              {emailError && (
                <p id="email-error" className="mt-1.5 text-xs text-red-600">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold text-[#030303] sm:text-sm"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onInput={() => setPasswordError("")}
                  placeholder="Masukkan password Anda"
                  required
                  className="h-12 w-full rounded-xl border border-[#c8dfe8] bg-white px-4 pr-12 text-sm text-[#030303] outline-none transition placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#5a737e] hover:text-[#016273]"
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M2.5 12C2.5 12 6 5.5 12 5.5C18 5.5 21.5 12 21.5 12C21.5 12 18 18.5 12 18.5C6 18.5 2.5 12 2.5 12Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="2.7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="mt-1.5 text-xs text-red-600">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Ingat Saya */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#5a737e] sm:text-sm">
                <input
                  id="remember-me"
                  name="remember_me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-[#c8dfe8] text-[#016273] accent-[#016273]"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
            </div>

            {/* Tombol Masuk */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-12 w-full rounded-xl bg-[#016273] text-sm font-bold text-white shadow-sm transition hover:bg-[#014d5a] focus:outline-none focus:ring-2 focus:ring-[#016273] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
            >
              {isLoading ? "Memproses Masuk..." : "Masuk"}
            </button>

            {loginError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-semibold text-red-700 sm:text-sm"
              >
                {loginError}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* =====================================================
          BAGIAN KANAN - BRANDING & INFORMASI FITUR
      ====================================================== */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#016273] lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        {/* Dekorasi lingkaran halus */}
        <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#004f5d]/60 blur-2xl" />
        <div className="absolute -left-20 bottom-20 h-64 w-64 rounded-full bg-[#003d48]/50 blur-2xl" />

        {/* Isi panel kanan */}
        <div className="relative z-10 w-full max-w-[540px] px-8 text-center text-white xl:px-12">
          {/* Feature Highlights Grid */}
          <div className="mx-auto grid gap-3.5 text-left sm:grid-cols-1">
            <FeatureCard
              title="Monitoring Aktivitas Harian"
              description="Catat dan pantau aktivitas harian karyawan dengan alur validasi persetujuan terstruktur."
              icon={
                <svg className="h-5 w-5 text-[#E1F25F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
            />
            <FeatureCard
              title="Manajemen Proyek & Penugasan"
              description="Kelola jadwal proyek, rincian tugas tim, dan alokasi anggota secara terkoordinasi."
              icon={
                <svg className="h-5 w-5 text-[#E1F25F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            <FeatureCard
              title="Otorisasi Berbasis Peran (RBAC)"
              description="Akses fitur disesuaikan secara presisi untuk Administrator, Project Manager, dan Karyawan."
              icon={
                <svg className="h-5 w-5 text-[#E1F25F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
          </div>

          {/* Judul & Deskripsi Sistem */}
          <h2 className="mt-10 text-2xl font-bold tracking-tight text-white xl:text-3xl">
            Sistem Monitoring Karyawan
          </h2>
          <p className="mx-auto mt-3 max-w-[460px] text-xs leading-relaxed text-[#EAF7FB]/80 sm:text-sm">
            Pantau aktivitas, proyek, tugas, dan proses validasi karyawan dalam
            satu sistem terpusat di lingkungan Central Saga Mandala.
          </p>

          {/* Key System Capabilities Badges */}
          <div className="mt-8 flex items-center justify-center gap-6 border-t border-white/10 pt-6 text-center sm:gap-8">
            <div>
              <p className="text-sm font-bold text-white sm:text-base">
                Monitoring Terpusat
              </p>
              <p className="mt-0.5 text-[11px] text-[#E1F25F]/80 font-medium">
                Aktivitas Tim
              </p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-sm font-bold text-white sm:text-base">
                Multi-Role
              </p>
              <p className="mt-0.5 text-[11px] text-[#E1F25F]/80 font-medium">
                Hak Akses RBAC
              </p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-sm font-bold text-white sm:text-base">
                Laporan Aktivitas
              </p>
              <p className="mt-0.5 text-[11px] text-[#E1F25F]/80 font-medium">
                Export XLSX & PDF
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md transition-all hover:bg-white/[0.12]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-[#EAF7FB]/80">
          {description}
        </p>
      </div>
    </div>
  );
}
