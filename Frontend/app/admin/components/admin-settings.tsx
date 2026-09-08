"use client";

import Link from "next/link";
import BrandLogo from "../../components/brand-logo";
import { AdminIcon } from "./admin-icons";

type AdminSettingsProps = {
  appVersion: string;
};

export default function AdminSettings({ appVersion }: AdminSettingsProps) {
  return (
    <main className="space-y-5 p-4 sm:p-6 lg:p-7">
      <header>
        <h1 className="text-xl font-bold text-[#030303] sm:text-2xl">
          Pengaturan & Informasi Sistem
        </h1>
        <p className="text-xs text-[#5a737e] sm:text-sm">
          Informasi aplikasi, standar sistem, dan kebijakan pengelolaan akun.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* LEFT COLUMN: Informasi Aplikasi & Standar Sistem */}
        <div className="space-y-5">
          {/* Card: Informasi Aplikasi */}
          <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <header className="border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
              <BrandLogo size="md" textVariant="settings" />
            </header>
            <dl className="divide-y divide-[#d0e6ed] px-5 text-xs sm:px-6 sm:text-sm">
              <DetailRow label="Nama Aplikasi" value="WorkTrack" />
              <DetailRow
                label="Deskripsi"
                value="Monitoring Aktivitas Karyawan"
              />
              <DetailRow
                label="Organisasi"
                value="Central Saga Mandala"
              />
              <DetailRow
                label="Versi Frontend"
                value={`v${appVersion}`}
                badge="bg-[#EAF7FB] text-[#016273] ring-1 ring-inset ring-[#016273]/20"
              />
              <DetailRow
                label="Status Sistem"
                value="Aktif"
                badge="bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
              />
            </dl>
          </section>

          {/* Card: Standar Sistem */}
          <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <header className="flex items-center gap-3 border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#016273] text-white">
                <AdminIcon name="settings" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#030303] sm:text-base">
                  Standar Sistem
                </h2>
                <p className="text-xs text-[#5a737e]">
                  Konfigurasi format dan lokalisasi aplikasi
                </p>
              </div>
            </header>
            <dl className="divide-y divide-[#d0e6ed] px-5 text-xs sm:px-6 sm:text-sm">
              <DetailRow
                label="Bahasa Antarmuka"
                value="Bahasa Indonesia (id-ID)"
              />
              <DetailRow
                label="Format Tanggal"
                value="DD MMM YYYY (contoh: 24 Agu 2026)"
              />
              <DetailRow
                label="Waktu Aktivitas"
                value="Tanggal Kalender Lokal Pengguna"
              />
            </dl>
          </section>
        </div>

        {/* RIGHT COLUMN: Kebijakan Akun & Keamanan */}
        <div className="space-y-5">
          {/* Card: Kebijakan Akun */}
          <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <header className="flex items-center gap-3 border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#016273] text-white">
                <AdminIcon name="users" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#030303] sm:text-base">
                  Kebijakan Pengelolaan Akun
                </h2>
                <p className="text-xs text-[#5a737e]">
                  Aturan hak akses dan manajemen entitas
                </p>
              </div>
            </header>
            <div className="space-y-3.5 p-5 text-xs text-[#5a737e] sm:p-6 sm:text-sm">
              <PolicyItem
                title="Pendaftaran & Status Akun"
                description="Akun pengguna dibuat dan dikelola statusnya (aktif/nonaktif) secara terpusat oleh Administrator melalui menu Data User."
              />
              <PolicyItem
                title="Role & Hak Akses (RBAC)"
                description="Peran pengguna (Administrator, Project Manager, Karyawan) dan hak izin fitur dikendalikan melalui menu Manajemen Role."
              />
              <PolicyItem
                title="Struktur Divisi & Penugasan"
                description="Penetapan divisi dan kepala divisi dikelola pada menu Data Divisi, sedangkan penugasan anggota proyek dikelola di Manajemen Proyek."
              />
              <PolicyItem
                title="Otonomi Profil Pengguna"
                description="Pengguna dapat mengubah nama, foto profil, dan password akun sendiri, namun tidak dapat mengubah role atau divisi secara mandiri."
              />
            </div>
          </section>

          {/* Card: Keamanan & Akun */}
          <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <header className="flex items-center justify-between border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-bold text-[#030303] sm:text-base">
                  Keamanan Akun
                </h2>
                <p className="text-xs text-[#5a737e]">
                  Pengaturan kredensial dan kata sandi
                </p>
              </div>
              <Link
                href="/admin/profile"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#016273]/30 px-3 py-1.5 text-xs font-semibold text-[#016273] transition-colors hover:bg-[#EAF7FB]"
              >
                <AdminIcon name="user" className="h-3.5 w-3.5" />
                Buka Profil Saya
              </Link>
            </header>
            <div className="p-5 text-xs text-[#5a737e] sm:p-6 sm:text-sm">
              <p>
                Perubahan kata sandi dan pembaruan informasi profil akun
                Administrator Anda dapat dikelola langsung melalui halaman Profil.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function DetailRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-4 last:pb-4">
      <dt className="text-[#5a737e]">{label}</dt>
      <dd className="text-right">
        {badge ? (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}
          >
            {value}
          </span>
        ) : (
          <span className="font-semibold text-[#030303]">{value}</span>
        )}
      </dd>
    </div>
  );
}

function PolicyItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[#d0e6ed] bg-[#EAF7FB]/40 p-3.5 sm:p-4">
      <h3 className="font-semibold text-[#030303]">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#5a737e] sm:text-xs">
        {description}
      </p>
    </div>
  );
}
