type WeeklyActivityProps = {
  counts: number[];
  total: number;
  approved: number;
  waiting: number;
  hasData: boolean;
};

const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function WeeklyActivity({
  counts,
  total,
  approved,
  waiting,
  hasData,
}: WeeklyActivityProps) {
  const maximum = Math.max(...counts, 1);

  return (
    <section className="rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="flex items-center justify-between border-b border-[#e1e7ee] px-6 py-5">
        <h2 className="font-bold text-[#172b4d]">Tren Aktivitas Mingguan</h2>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-[#2f9e44]">
          Minggu Ini
        </span>
      </header>

      <div className="p-6">
        <div className="grid h-40 grid-cols-7 items-end gap-2 sm:gap-3">
          {counts.map((count, index) => (
            <div key={days[index]} className="flex h-full flex-col justify-end">
              <div className="flex h-[118px] items-end rounded-t-md bg-green-50">
                <div
                  className="w-full rounded-t-md bg-[#43a956] transition-[height]"
                  style={{ height: hasData ? `${Math.max((count / maximum) * 100, count ? 8 : 0)}%` : "0%" }}
                  title={`${count} aktivitas`}
                />
              </div>
              <span className="mt-2 text-center text-xs text-[#60738f]">
                {days[index]}
              </span>
            </div>
          ))}
        </div>

        {!hasData && (
          <p className="mt-3 text-center text-sm text-[#71829a]">
            Belum ada aktivitas pada minggu ini.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#e1e7ee] pt-5 sm:flex sm:gap-8">
          <Summary value={hasData ? total : "—"} label="Total Aktivitas" tone="text-[#172b4d]" />
          <Summary value={hasData ? approved : "—"} label="Disetujui" tone="text-[#43a956]" />
          <Summary value={hasData ? waiting : "—"} label="Menunggu" tone="text-amber-500" />
          <Summary value="—" label="Ditolak" tone="text-red-500" />
        </div>
      </div>
    </section>
  );
}

function Summary({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: string;
}) {
  return (
    <div>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-[#60738f]">{label}</p>
    </div>
  );
}
