import Link from "next/link";
import type { Project } from "../../services/project-service";

type ProjectProgressProps = {
  projects: Project[] | null;
  isLoading: boolean;
  hasError: boolean;
};

export default function ProjectProgress({ projects, isLoading, hasError }: ProjectProgressProps) {
  return (
    <section className="rounded-xl border border-[#e0e3dc] bg-[#fbfbf8]">
      <header className="flex items-center justify-between gap-3 border-b border-[#e6e8e2] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-[#20292a]">Proyek</h2>
          <p className="mt-1 text-xs text-[#737d79]">Ringkasan proyek aktif</p>
        </div>
        <Link href="/admin/projects" className="text-xs font-semibold text-[#426d68] hover:underline focus:outline-none focus:ring-2 focus:ring-[#426d68]/30">
          Lihat Semua
        </Link>
      </header>
      <div className="space-y-4 p-5 sm:p-6" aria-busy={isLoading}>
        {isLoading ? (
          <Message message="Memuat data proyek..." />
        ) : hasError ? (
          <Message message="Data proyek tidak tersedia." alert />
        ) : !projects?.length ? (
          <Message message="Belum ada data proyek." />
        ) : (
          projects.slice(0, 4).map((project) => (
            <article key={project.id}>
              <div className="flex items-center justify-between gap-4">
                <p className="truncate text-sm font-semibold text-[#20292a]">{project.name}</p>
                <span className="rounded-md bg-[#edf1eb] px-2 py-1 text-[11px] font-medium text-[#526b62]">
                  {formatStatus(project.status)}
                </span>
              </div>
              {/* Backend belum memiliki progress numerik. Placeholder teks
                  mencegah bar kosong dibaca sebagai progres 0%. */}
              <p className="mt-2 border-l-2 border-[#d2b36e] bg-[#f4f3ec] px-3 py-2 text-xs text-[#737d79]">
                Progress belum tersedia
              </p>
              <p className="mt-1.5 truncate text-xs text-[#737d79]">
                {project.client_name || "—"} · {formatDate(project.end_date)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function Message({ message, alert = false }: { message: string; alert?: boolean }) {
  return (
    <div
      role={alert ? "alert" : "status"}
      className="flex min-h-36 flex-col items-center justify-center text-center text-sm text-[#737d79]"
    >
      {message}
    </div>
  );
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string | null) {
  if (!date) return "Deadline —";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
