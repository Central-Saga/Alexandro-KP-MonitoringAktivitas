import type { Project } from "../../services/project-service";

export default function ProjectProgress({ projects }: { projects: Project[] }) {
  return (
    <section className="rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="border-b border-[#e1e7ee] px-6 py-5">
        <h2 className="font-bold text-[#172b4d]">Progress Proyek</h2>
      </header>
      <div className="space-y-5 p-6">
        {projects.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center text-center text-sm text-[#71829a]">
            Belum ada data proyek.
          </div>
        ) : (
          projects.slice(0, 4).map((project) => (
            <article key={project.id}>
              <div className="flex items-center justify-between gap-4">
                <p className="truncate font-semibold text-[#172b4d]">{project.name}</p>
                <span className="text-sm font-semibold text-[#71829a]">—</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#e4e9ef]" />
              <p className="mt-1.5 truncate text-xs text-[#60738f]">
                {project.client_name || "—"} · {formatDate(project.end_date)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function formatDate(date: string | null) {
  if (!date) {
    return "Deadline —";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
