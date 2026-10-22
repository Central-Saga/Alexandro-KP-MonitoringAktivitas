import type { WeeklyActivityData } from "../../services/dashboard-service";

type WeeklyActivityProps = {
  data: WeeklyActivityData | null;
  isLoading: boolean;
  hasError: boolean;
};

const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function WeeklyActivity({ data, isLoading, hasError }: WeeklyActivityProps) {
  const counts = data?.counts ?? Array<number>(7).fill(0);
  const maximum = Math.max(...counts, 1);
  const hasData = data !== null && data.total > 0;

  return (
    <section className="rounded-2xl border border-[#d3e5d1] bg-white shadow-[0_1px_3px_rgba(23,61,43,0.05)]">
      <header className="flex items-center justify-between border-b border-[#d3e5d1] px-6 py-5">
        <h2 className="font-bold text-[#030303]">Tren Aktivitas Mingguan</h2>
        <span className="rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-semibold text-[#245f3e] ring-1 ring-inset ring-[#245f3e]/20">
          Minggu Ini
        </span>
      </header>

      <div className="p-6" aria-busy={isLoading}>
        <div className="grid h-40 grid-cols-7 items-end gap-2 sm:gap-3">
          {counts.map((count, index) => (
            <div key={days[index]} className="flex h-full flex-col justify-end">
              <div className="flex h-[118px] items-end rounded-t-md bg-[#edf5e9]">
                <div
                  className="w-full rounded-t-md bg-[#4ba66b] transition-[height]"
                  style={{ height: hasData ? `${Math.max((count / maximum) * 100, count ? 8 : 0)}%` : "0%" }}
                  title={isLoading || hasError ? "Data belum tersedia" : `${count} aktivitas`}
                />
              </div>
              <span className="mt-2 text-center text-xs text-[#61776a]">{days[index]}</span>
            </div>
          ))}
        </div>

        <p role={hasError ? "alert" : "status"} className="mt-3 text-center text-sm text-[#61776a]">
          {isLoading
            ? "Memuat aktivitas minggu ini..."
            : hasError
              ? "Aktivitas mingguan tidak tersedia."
              : !hasData
                ? "Belum ada aktivitas pada minggu ini."
                : "Jumlah per hari berasal dari total pagination API."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#d3e5d1] pt-5 sm:flex sm:gap-8">
          <Summary value={!isLoading && data ? data.total : "—"} label="Total Aktivitas" tone="text-[#030303]" />
          <Summary value="—" label="Disetujui" tone="text-emerald-600" />
          <Summary value="—" label="Menunggu Validasi" tone="text-amber-600" />
          <Summary value="—" label="Perlu Revisi" tone="text-rose-600" />
        </div>
        <p className="mt-3 text-xs text-[#61776a]">
          Breakdown status mingguan belum tersedia dari API aggregate.
        </p>
      </div>
    </section>
  );
}

function Summary({ value, label, tone }: { value: number | string; label: string; tone: string }) {
  return (
    <div>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-[#60738f]">{label}</p>
    </div>
  );
}
