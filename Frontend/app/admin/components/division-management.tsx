import { AdminIcon } from "./admin-icons";

export default function DivisionManagement() {
  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#172b4d]">Data Divisi</h2>
          <p className="mt-1 text-sm text-[#71829a]">
            Jumlah divisi aktif belum tersedia
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Endpoint tambah divisi belum tersedia"
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#18a84f] px-5 text-sm font-semibold text-white opacity-60 sm:self-auto"
        >
          <span className="text-xl leading-none">+</span>
          Tambah Divisi
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <AdminIcon
              name="search"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b3]"
            />
            <input
              type="search"
              disabled
              placeholder="Cari nama divisi..."
              aria-label="Cari divisi"
              title="Pencarian tersedia setelah endpoint daftar divisi tersedia"
              className="h-12 w-full rounded-xl border border-[#dce4ec] bg-white pl-12 pr-4 text-sm text-[#172b4d] outline-none placeholder:text-[#91a0b3] disabled:cursor-not-allowed"
            />
          </label>

          <button
            type="button"
            disabled
            title="Filter tersedia setelah data divisi tersedia"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dce4ec] bg-white px-5 text-sm font-semibold text-[#60738f] opacity-60"
          >
            <AdminIcon name="filter" className="h-5 w-5" />
            Filter
          </button>
        </div>

        <div className="mt-5 grid min-h-[410px] place-items-center rounded-xl border border-dashed border-[#dce4ec] bg-[#f8fafc] p-6 text-center sm:min-h-[460px]">
          <div className="max-w-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#dcf8e5] text-[#18a84f]">
              <AdminIcon name="building" className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-[#172b4d]">
              Data divisi belum tersedia
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#71829a]">
              Backend belum menyediakan resource dan endpoint divisi. Tidak ada
              data contoh dari mockup yang ditampilkan.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
