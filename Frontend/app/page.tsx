"use client";

// Mengimpor useState dari React.
// useState digunakan untuk menyimpan data yang berubah
// ketika pengguna berinteraksi dengan halaman.
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DASHBOARD_BY_ROLE,
  getApiUrl,
  type AuthUser,
} from "./lib/auth";
import { useAuth } from "./components/auth-provider";
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

export default function Home() {
  const router = useRouter();
  const { login } = useAuth();

  // Menyimpan nilai email yang dimasukkan pengguna.
  const [email, setEmail] = useState("");

  // Menyimpan nilai password yang dimasukkan pengguna.
  const [password, setPassword] = useState("");

  // Menentukan apakah password ditampilkan atau disembunyikan.
  const [showPassword, setShowPassword] = useState(false);

  // Menentukan apakah checkbox "Ingat saya" aktif.
  const [rememberMe, setRememberMe] = useState(false);

  // Menyimpan pesan error untuk email.
// Jika tidak ada error, nilainya adalah string kosong.
  const [emailError, setEmailError] = useState("");

// Menyimpan pesan error untuk password.
// Jika tidak ada error, nilainya adalah string kosong.
  const [passwordError, setPasswordError] = useState("");

  // Menyimpan error umum dari API atau jaringan.
  const [loginError, setLoginError] = useState("");

// Menyimpan status proses login.
// Nanti state ini juga akan digunakan ketika
// proses login sudah terhubung dengan Laravel.
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // Mencegah halaman melakukan reload.
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
            : error.message ?? "Login gagal. Periksa kembali data Anda.",
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
    // Container utama halaman login.
    // min-h-screen membuat halaman memenuhi tinggi layar.
    <main className="min-h-screen bg-white lg:flex">

      {/* =====================================================
          BAGIAN KIRI - FORM LOGIN
      ====================================================== */}
      <section className="flex w-full items-center justify-center px-6 py-10 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">

        {/* Container utama isi form.
            max-w digunakan supaya form tidak terlalu lebar. */}
        <div className="w-full max-w-[560px]">

          {/* =================================================
              LOGO WORKTRACK
          ================================================== */}
          <div className="mb-14 flex items-center gap-4">

            {/* Kotak logo hijau. */}
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#43A956]">

              {/* Icon shield menggunakan SVG.
                  Kita menggunakan SVG langsung agar tidak
                  membutuhkan library icon tambahan. */}
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Bentuk shield. */}
                <path
                  d="M12 3L19 6V11C19 15.5 16.1 19.4 12 21C7.9 19.4 5 15.5 5 11V6L12 3Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Tanda centang. */}
                <path
                  d="M9 12L11 14L15 10"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

            </div>

            {/* Nama aplikasi. */}
            <div>
              <h1 className="text-[28px] font-bold leading-none text-[#172B4D]">
                Central Saga Mandala
              </h1>

              <p className="mt-1 text-[16px] text-[#60738F]">
                Employee Monitoring System CSM
              </p>
            </div>

          </div>

          {/* =================================================
              JUDUL LOGIN
          ================================================== */}
          <div className="mb-10">

            <h2 className="text-[34px] font-bold leading-tight text-[#172B4D] sm:text-[38px]">
              Selamat Datang
            </h2>

            <p className="mt-3 text-[19px] leading-7 text-[#60738F]">
              Masuk menggunakan akun yang diberikan oleh Administrator
            </p>

          </div>

          {/* =================================================
              FORM
          ================================================== */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ================= EMAIL ================= */}

            <div>

              {/* Label email. */}
              <label
                htmlFor="email"
                className="mb-2 block text-[17px] font-semibold text-[#172B4D]"
              >
                Email
              </label>

              {/* Input email. */}
              <input
                id="email"
                name="email"
                type="email"
                value={email}

                // Mengubah state email ketika pengguna mengetik.
                onChange={(event) => setEmail(event.target.value)}

                onInput={() => setEmailError("")}

                placeholder="Masukkan email"

                // Email wajib diisi.
                required

                className="h-[61px] w-full rounded-[10px] border border-[#D9E1EC] bg-white px-5 text-[17px] text-[#172B4D] outline-none transition placeholder:text-[#9AA9BC] focus:border-[#43A956] focus:ring-2 focus:ring-[#43A956]/15"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "email-error" : undefined}
              />

              {emailError && (
                <p id="email-error" className="mt-2 text-sm text-red-600">
                  {emailError}
                </p>
              )}

            </div>

            {/* ================= PASSWORD ================= */}

            <div>

              {/* Label password. */}
              <label
                htmlFor="password"
                className="mb-2 block text-[17px] font-semibold text-[#172B4D]"
              >
                Password
              </label>

              {/* Container password. */}
              <div className="relative">

                {/* Input password. */}
                <input
                  id="password"
                  name="password"

                  // Password berubah menjadi text ketika
                  // showPassword bernilai true.
                  type={showPassword ? "text" : "password"}

                  value={password}

                  // Mengubah state password.
                  onChange={(event) => setPassword(event.target.value)}

                  onInput={() => setPasswordError("")}

                  placeholder="Masukkan password"

                  required

                  className="h-[61px] w-full rounded-[10px] border border-[#D9E1EC] bg-white px-5 pr-14 text-[17px] text-[#172B4D] outline-none transition placeholder:text-[#9AA9BC] focus:border-[#43A956] focus:ring-2 focus:ring-[#43A956]/15"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "password-error" : undefined}
                />

                {/* Tombol show/hide password. */}
                <button
                  type="button"

                  // Membalik status password.
                  onClick={() => setShowPassword(!showPassword)}

                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71829A] hover:text-[#43A956]"
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                >

                  {/* Icon mata. */}
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
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
                <p id="password-error" className="mt-2 text-sm text-red-600">
                  {passwordError}
                </p>
              )}

            </div>

            {/* =================================================
                INGAT SAYA + LUPA PASSWORD
            ================================================== */}

            <div className="flex items-center justify-between">

              {/* Checkbox ingat saya. */}
              <label className="flex cursor-pointer items-center gap-2 text-[17px] text-[#60738F]">

                <input
                  id="remember-me"
                  name="remember_me"
                  type="checkbox"
                  checked={rememberMe}

                  // Mengubah nilai checkbox.
                  onChange={(event) =>
                    setRememberMe(event.target.checked)
                  }

                  className="h-[17px] w-[17px] accent-[#43A956]"
                />

                <span>Ingat saya</span>

              </label>

              {/* Tombol lupa password.
                  Untuk sementara belum diarahkan ke halaman lain. */}
              <button
                type="button"
                disabled
                title="Fitur lupa password belum tersedia"
                className="cursor-not-allowed text-[17px] font-medium text-[#43A956] opacity-70"
              >
                Lupa password?
              </button>

            </div>

            {/* =================================================
                TOMBOL MASUK
            ================================================== */}

            {/* Tombol untuk mengirim form login. */}
<button
  type="submit"

  // Tombol dinonaktifkan ketika proses login sedang berjalan.
  disabled={isLoading}

  className="h-[62px] w-full rounded-[10px] bg-[#43A956] text-[19px] font-bold text-white transition hover:bg-[#39964B] focus:outline-none focus:ring-2 focus:ring-[#43A956] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
>
  {/* Mengubah tulisan tombol ketika proses login berlangsung. */}
  {isLoading ? "Memproses..." : "Masuk"}
</button>

            {loginError && (
              <p role="alert" className="text-center text-sm text-red-600">
                {loginError}
              </p>
            )}

          </form>

        </div>

      </section>

      {/* =====================================================
          BAGIAN KANAN - BRANDING & STATISTIK
          hidden pada layar kecil supaya login tetap nyaman.
      ====================================================== */}

      <section className="relative hidden min-h-screen overflow-hidden bg-[#246438] lg:flex lg:w-1/2 lg:items-center lg:justify-center">

        {/* Dekorasi lingkaran. */}
        <div className="absolute -right-20 top-20 h-[260px] w-[260px] rounded-full bg-[#3C7D4C]/50" />

        <div className="absolute -left-16 bottom-28 h-[170px] w-[170px] rounded-full bg-[#3C7D4C]/40" />

        {/* Isi panel kanan. */}
        <div className="relative z-10 w-full max-w-[600px] px-10 text-center">

          {/* =================================================
              STATISTIK
          ================================================== */}

          <div className="mx-auto grid max-w-[445px] grid-cols-2 gap-4 rounded-[28px] border border-white/15 bg-white/10 p-6">

            {/* Monitoring */}
            <div className="rounded-[15px] bg-white/15 p-6 text-left">

              <p className="text-[28px] font-bold text-white">
                98.2%
              </p>

              <p className="mt-1 text-[16px] text-white/60">
                Monitoring
              </p>

            </div>

            {/* Aktivitas */}
            <div className="rounded-[15px] bg-white/15 p-6 text-left">

              <p className="text-[28px] font-bold text-white">
                342
              </p>

              <p className="mt-1 text-[16px] text-white/60">
                Aktivitas
              </p>

            </div>

            {/* Proyek */}
            <div className="rounded-[15px] bg-white/15 p-6 text-left">

              <p className="text-[28px] font-bold text-white">
                24
              </p>

              <p className="mt-1 text-[16px] text-white/60">
                Proyek
              </p>

            </div>

            {/* Karyawan */}
            <div className="rounded-[15px] bg-white/15 p-6 text-left">

              <p className="text-[28px] font-bold text-white">
                87
              </p>

              <p className="mt-1 text-[16px] text-white/60">
                Karyawan
              </p>

            </div>

          </div>

          {/* Judul panel kanan. */}
          <h2 className="mt-12 text-[32px] font-bold text-white">
            Sistem Monitoring Karyawan
          </h2>

          {/* Deskripsi panel kanan. */}
          <p className="mx-auto mt-5 max-w-[510px] text-[18px] leading-8 text-white/75">
            Pantau aktivitas kerja karyawan secara real-time.
            Kelola proyek, tugas, dan produktivitas tim dengan mudah.
          </p>

          {/* Fitur utama. */}
          <div className="mt-10 flex justify-center gap-10">

            <div>
              <p className="text-[19px] font-bold text-white">
                Real-time
              </p>

              <p className="mt-1 text-[15px] text-white/55">
                Monitoring
              </p>
            </div>

            <div>
              <p className="text-[19px] font-bold text-white">
                Multi-role
              </p>

              <p className="mt-1 text-[15px] text-white/55">
                Akses
              </p>
            </div>

            <div>
              <p className="text-[19px] font-bold text-white">
                Laporan
              </p>

              <p className="mt-1 text-[15px] text-white/55">
                Otomatis
              </p>
            </div>

          </div>

        </div>

      </section>

    </main>
  );
}
