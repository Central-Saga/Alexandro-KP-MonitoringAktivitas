import Link from "next/link";
import type { Project } from "../../services/project-service";

type ProjectProgressProps = {
  projects: Project[] | null;
  isLoading: boolean;
  hasError: boolean;
};

export default function ProjectProgress({ projects, isLoading, hasError }: ProjectProgressProps) {
  return (
    <section className="rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <header className="flex items-center justify-between gap-3 border-b border-[#d0e6ed] px-6 py-5">
        <h2 className="font-bold text-[#030303]">Progress Proyek</h2>
        <Link href="/admin/projects" className="text-sm font-semibold text-[#016273] hover:underline focus:outline-none focus:ring-2 focus:ring-[#016273]/30">
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
                <span className="rounded-full bg-[#EAF7FB] px-2.5 py-1 text-xs font-semibold text-[#016273] ring-1 ring-inset ring-[#016273]/20">
                  {formatStatus(project.status)}
                </span>
              </div>
              {/* Backend belum memiliki progress numerik. Placeholder teks
                  mencegah bar kosong dibaca sebagai progres 0%. */}
              <p className="mt-2 rounded-lg bg-[#EAF7FB]/60 px-3 py-2 text-xs text-[#5a737e]">
                Progress belum tersedia
              </p>
              <p className="mt-1.5 truncate text-xs text-[#5a737e]">
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
      className="flex min-h-48 items-center justify-center text-center text-sm text-[#71829a]"
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
