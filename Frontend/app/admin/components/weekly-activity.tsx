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
    <section className="rounded-xl border border-[#e0e3dc] bg-[#fbfbf8]">
      <header className="flex items-center justify-between border-b border-[#e6e8e2] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-[#20292a]">Aktivitas mingguan</h2>
          <p className="mt-1 text-xs text-[#737d79]">Jumlah laporan per hari</p>
        </div>
        <span className="text-xs font-medium text-[#737d79]">Minggu ini</span>
      </header>

      <div className="p-5 sm:p-6" aria-busy={isLoading}>
        {isLoading || hasError || !hasData ? (
          <div
            role={hasError ? "alert" : "status"}
            className="flex min-h-40 flex-col items-center justify-center border-y border-dashed border-[#dfe3dc] px-4 text-center"
          >
            <p className="text-2xl font-semibold tracking-tight text-[#344344]">
              {isLoading ? "—" : hasError ? "Tidak tersedia" : "0 laporan"}
            </p>
            <p className="mt-2 max-w-xs text-xs leading-5 text-[#737d79]">
              {isLoading
                ? "Memuat aktivitas minggu ini…"
                : hasError
                  ? "Data aktivitas mingguan belum dapat dimuat."
                  : "Belum ada aktivitas yang tercatat minggu ini."}
            </p>
          </div>
        ) : (
          <div className="grid h-40 grid-cols-7 items-end gap-2 sm:gap-3">
            {counts.map((count, index) => (
              <div key={days[index]} className="flex h-full flex-col justify-end">
                <div className="flex h-[118px] items-end border-b border-[#e4e7e0]">
                  <div
                    className="w-full rounded-t-sm bg-[#557e78] transition-[height]"
                    style={{ height: `${Math.max((count / maximum) * 100, count ? 6 : 0)}%` }}
                    title={`${count} aktivitas`}
                  />
                </div>
                <span className="mt-2 text-center text-[11px] text-[#737d79]">{days[index]}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-baseline justify-between border-t border-[#e6e8e2] pt-4">
          <span className="text-xs text-[#737d79]">Total laporan minggu ini</span>
          <span className="text-lg font-semibold tabular-nums text-[#20292a]">
            {!isLoading && data ? data.total : "—"}
          </span>
        </div>
      </div>
    </section>
  );
}
