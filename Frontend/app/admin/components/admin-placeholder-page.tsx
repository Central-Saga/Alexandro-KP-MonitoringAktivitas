export default function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <main className="p-4 sm:p-7">
      <section className="rounded-2xl border border-[#d0e6ed] bg-white p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#016273]">
          Placeholder
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#030303]">{title}</h2>
        <p className="mt-3 text-[#5a737e]">
          Halaman ini belum diimplementasikan pada tahap dashboard Admin.
        </p>
      </section>
    </main>
  );
}
