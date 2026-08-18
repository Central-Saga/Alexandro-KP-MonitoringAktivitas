type AdminSettingsProps = {
  appVersion: string;
};

export default function AdminSettings({ appVersion }: AdminSettingsProps) {
  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header>
        <h2 className="text-2xl font-bold text-[#172b4d]">Pengaturan</h2>
        <p className="mt-1 text-sm text-[#71829a] sm:text-base">
          Kelola preferensi dan konfigurasi aplikasi
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <SettingsCard title="Notifikasi">
            <ToggleRow
              id="email-notifications"
              title="Notifikasi Email"
              description="Preferensi notifikasi email belum tersedia"
            />
            <ToggleRow
              id="browser-notifications"
              title="Notifikasi Browser"
              description="Notification API dan service worker belum tersedia"
            />
            <ToggleRow
              id="dark-mode"
              title="Mode Gelap"
              description="Theme global aplikasi belum tersedia"
              last
            />
          </SettingsCard>

          <SettingsCard title="Preferensi Sistem">
            <PreferenceField
              label="Bahasa"
              description="Preferensi pengguna belum tersedia"
            />
            <PreferenceField
              label="Zona Waktu"
              description="Preferensi pengguna belum tersedia"
            />
            <PreferenceField
              label="Format Tanggal"
              description="Preferensi pengguna belum tersedia"
            />
            <button
              type="button"
              disabled
              title="Penyimpanan preferensi belum tersedia"
              className="mt-1 rounded-xl bg-[#18a84f] px-5 py-3 text-sm font-semibold text-white opacity-60"
            >
              Simpan Preferensi
            </button>
          </SettingsCard>
        </div>

        <div className="space-y-5">
          <SettingsCard title="Keamanan">
            <SecurityRow
              title="Autentikasi Dua Faktor"
              description="Backend 2FA belum tersedia"
              action="Aktifkan 2FA"
            />
            <SecurityRow
              title="Sesi Aktif"
              description="Informasi perangkat dan sesi belum tersedia"
              action="Kelola Sesi"
            />
            <SecurityRow
              title="Riwayat Login"
              description="Riwayat autentikasi belum tersedia"
              action="Lihat Riwayat"
              last
            />
          </SettingsCard>

          <SettingsCard title="Tentang Sistem">
            <SystemDetail label="Versi Aplikasi" value={appVersion} />
            <SystemDetail label="Tanggal Build" value="—" />
            <SystemDetail label="Lisensi" value="—" />
            <SystemDetail label="Dukungan" value="—" last />
          </SettingsCard>
        </div>
      </div>
    </main>
  );
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <h3 className="border-b border-[#e1e7ee] px-5 py-4 font-bold text-[#172b4d] sm:px-6">
        {title}
      </h3>
      <div className="px-5 sm:px-6">{children}</div>
    </section>
  );
}

function ToggleRow({
  id,
  title,
  description,
  last = false,
}: {
  id: string;
  title: string;
  description: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-5 ${
        last ? "" : "border-b border-[#e1e7ee]"
      }`}
    >
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-[#172b4d]">
          {title}
        </label>
        <p className="mt-1 text-xs leading-5 text-[#71829a]">{description}</p>
      </div>
      <label className="relative inline-flex shrink-0 cursor-not-allowed items-center">
        <input id={id} type="checkbox" disabled className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-[#ccd6e2] opacity-70 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm" />
      </label>
    </div>
  );
}

function PreferenceField({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <label className="block py-3 text-sm font-semibold text-[#172b4d] first:pt-5">
      {label}
      <select
        disabled
        value=""
        className="mt-2 h-11 w-full rounded-xl border border-[#dce4ec] bg-[#f8fafc] px-4 font-normal text-[#71829a] disabled:cursor-not-allowed"
      >
        <option value="">Belum tersedia</option>
      </select>
      <span className="mt-1 block text-xs font-normal text-[#91a0b3]">
        {description}
      </span>
    </label>
  );
}

function SecurityRow({
  title,
  description,
  action,
  last = false,
}: {
  title: string;
  description: string;
  action: string;
  last?: boolean;
}) {
  return (
    <div className={`py-5 ${last ? "" : "border-b border-[#e1e7ee]"}`}>
      <p className="text-sm font-semibold text-[#172b4d]">{title}</p>
      <p className="mt-1 text-xs text-[#71829a]">{description}</p>
      <button
        type="button"
        disabled
        title={`${action} belum tersedia`}
        className="mt-3 rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-semibold text-[#60738f] opacity-60"
      >
        {action}
      </button>
    </div>
  );
}

function SystemDetail({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-5 py-5 text-sm ${
        last ? "" : "border-b border-[#e1e7ee]"
      }`}
    >
      <dt className="text-[#71829a]">{label}</dt>
      <dd className="text-right font-semibold text-[#172b4d]">{value}</dd>
    </div>
  );
}
