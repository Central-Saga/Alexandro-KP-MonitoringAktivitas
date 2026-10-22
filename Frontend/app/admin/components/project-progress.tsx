import Link from "next/link";
import type { Project } from "../../services/project-service";

type ProjectProgressProps = {
  projects: Project[] | null;
  isLoading: boolean;
  hasError: boolean;
};

export default function ProjectProgress({ projects, isLoading, hasError }: ProjectProgressProps) {
  return (
    <section className="rounded-2xl border border-[#d3e5d1] bg-white shadow-[0_1px_3px_rgba(23,61,43,0.05)]">
      <header className="flex items-center justify-between gap-3 border-b border-[#d3e5d1] px-6 py-5">
        <h2 className="font-bold text-[#030303]">Progress Proyek</h2>
        <Link href="/admin/projects" className="text-sm font-semibold text-[#245f3e] hover:underline focus:outline-none focus:ring-2 focus:ring-[#245f3e]/30">
          Lihat Semua
        </Link>
      </header>
      <div className="space-y-5 p-6" aria-busy={isLoading}>
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
                <p className="truncate font-semibold text-[#030303]">{project.name}</p>
                <span className="rounded-full bg-[#edf5e9] px-2.5 py-1 text-xs font-semibold text-[#245f3e] ring-1 ring-inset ring-[#245f3e]/20">
                  {formatStatus(project.status)}
                </span>
              </div>
              {/* Backend belum memiliki progress numerik. Placeholder teks
                  mencegah bar kosong dibaca sebagai progres 0%. */}
              <p className="mt-2 rounded-lg bg-[#edf5e9]/70 px-3 py-2 text-xs text-[#61776a]">
                Progress belum tersedia
              </p>
              <p className="mt-1.5 truncate text-xs text-[#61776a]">
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
      className="flex min-h-48 items-center justify-center text-center text-sm text-[#718074]"
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
