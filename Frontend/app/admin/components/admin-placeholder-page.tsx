export default function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <main className="p-4 sm:p-7">
      <section className="rounded-2xl border border-[#dce4ec] bg-white p-8 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#43a956]">
          Placeholder
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#172b4d]">{title}</h2>
        <p className="mt-3 text-[#60738f]">
          Halaman ini belum diimplementasikan pada tahap dashboard Admin.
        </p>
      </section>
    </main>
  );
}
