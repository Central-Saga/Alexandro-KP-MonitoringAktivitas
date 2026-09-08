"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AdminDialog from "../../admin/components/admin-dialog";
import { AdminIcon } from "../../admin/components/admin-icons";
import MediaList from "../../admin/components/media-list";
import { useAuth } from "../../components/auth-provider";
import { useActivities } from "../../hooks/use-activities";
import { ApiError } from "../../lib/api-client";
import { formatFileSize } from "../../lib/format-file-size";
import {
  firstFieldError,
  parseLaravelError,
  type LaravelFieldErrors,
} from "../../lib/validation";
import {
  createActivity,
  getTodayActivitySummary,
  updateActivity,
  uploadActivityMedia,
  type Activity,
  type ActivityStatus,
} from "../../services/activity-service";
import { getProjects, type Project } from "../../services/project-service";
import {
  getProjectTasks,
  type ProjectTask,
  type ProjectTaskStatus,
} from "../../services/project-task-service";
import type { PaginationMeta } from "../../services/user-service";

type ActivityTab = "input" | "history";
type Notice = { tone: "success" | "warning"; message: string } | null;
type DialogState = { type: "edit" | "media"; activity: Activity } | null;
type CreateForm = {
  activity_date: string;
  project_id: number;
  project_task_id: number | null;
  title: string;
  description: string;
};

const statusLabels: Record<ActivityStatus, string> = {
  pending: "Menunggu Validasi",
  ongoing: "Menunggu Validasi",
  selesai: "Menunggu Validasi",
  approved: "Disetujui",
  rejected: "Perlu Revisi",
};

export default function EmployeeActivities() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ActivityTab>(
    searchParams.has("task_id")
      ? "input"
      : searchParams.get("tab") === "history"
        ? "history"
        : "input",
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [projectError, setProjectError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [resourceVersion, setResourceVersion] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let active = true;
    void getProjects()
      .then((items) => {
        if (active) setProjects(items);
      })
      .catch(() => {
        if (active) {
          setProjects([]);
          setProjectError("Daftar proyek penugasan gagal dimuat.");
        }
      })
      .finally(() => {
        if (active) setProjectsLoading(false);
      });

    void getAllActiveTasks()
      .then((items) => {
        if (active) setTasks(items);
      })
      .catch(() => {
        if (active) {
          setTasks([]);
          setTaskError("Daftar tugas aktif gagal dimuat.");
        }
      })
      .finally(() => {
        if (active) setTasksLoading(false);
      });

    return () => {
      active = false;
    };
  }, [resourceVersion]);

  function activityCreated(nextNotice: Notice) {
    setNotice(nextNotice);
    setDataVersion((value) => value + 1);
  }

  function retryResources() {
    setProjectsLoading(true);
    setTasksLoading(true);
    setProjectError("");
    setTaskError("");
    setResourceVersion((value) => value + 1);
  }

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header>
        <h1 className="text-2xl font-bold text-[#172b4d]">Aktivitas Saya</h1>
        <p className="mt-1 text-sm text-[#71829a]">
          Catat dan pantau aktivitas kerja harian Anda.
        </p>
      </header>

      {notice && (
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      )}
      {(projectError || taskError) && (
        <ResourceError
          projectError={projectError}
          taskError={taskError}
          onRetry={retryResources}
        />
      )}

      {/* Tab Navigation Header */}
      <div
        className="flex items-center gap-2 border-b border-[#e1e7ee]"
        role="tablist"
        aria-label="Navigasi Aktivitas"
      >
        <TabButton
          id="daily-input-tab"
          controls="daily-input-panel"
          active={tab === "input"}
          onClick={() => setTab("input")}
        >
          Tambah Aktivitas
        </TabButton>
        <TabButton
          id="daily-history-tab"
          controls="daily-history-panel"
          active={tab === "history"}
          onClick={() => setTab("history")}
        >
          Riwayat Aktivitas
        </TabButton>
      </div>

      {tab === "input" ? (
        <section
          id="daily-input-panel"
          role="tabpanel"
          aria-labelledby="daily-input-tab"
        >
          <DailyActivityInput
            projects={projects}
            tasks={tasks}
            projectsLoading={projectsLoading}
            tasksLoading={tasksLoading}
            refreshVersion={dataVersion}
            onCreated={activityCreated}
          />
        </section>
      ) : (
        <section
          id="daily-history-panel"
          role="tabpanel"
          aria-labelledby="daily-history-tab"
        >
          <ActivityHistory
            projects={projects}
            projectsLoading={projectsLoading}
            refreshVersion={dataVersion}
            onNotice={setNotice}
          />
        </section>
      )}
    </main>
  );
}

function DailyActivityInput({
  projects,
  tasks,
  projectsLoading,
  tasksLoading,
  refreshVersion,
  onCreated,
}: {
  projects: Project[];
  tasks: ProjectTask[];
  projectsLoading: boolean;
  tasksLoading: boolean;
  refreshVersion: number;
  onCreated: (notice: Notice) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const deepLinkHandled = useRef(false);
  const [form, setForm] = useState<CreateForm>({
    activity_date: localDateKey(new Date()),
    project_id: 0,
    project_task_id: null,
    title: "",
    description: "",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deepLinkError, setDeepLinkError] = useState("");
  const [errors, setErrors] = useState<LaravelFieldErrors>({});

  const selectedTask =
    tasks.find((task) => task.id === form.project_task_id) ?? null;
  const availableTasks = tasks.filter(
    (task) => task.project.id === form.project_id && task.status === "active",
  );

  useEffect(() => {
    if (deepLinkHandled.current || projectsLoading || tasksLoading) return;
    deepLinkHandled.current = true;
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      const rawTaskId = searchParams.get("task_id");
      const taskId =
        rawTaskId && /^\d+$/.test(rawTaskId) ? Number(rawTaskId) : null;
      if (rawTaskId) {
        const task = taskId
          ? tasks.find((item) => item.id === taskId)
          : undefined;
        if (!task) {
          setDeepLinkError(
            "Tugas tidak ditemukan, sudah selesai, atau bukan tugas Anda.",
          );
          return;
        }
        setForm((current) => ({
          ...current,
          project_id: task.project.id,
          project_task_id: task.id,
        }));
        return;
      }

      const rawProjectId = searchParams.get("project_id");
      const projectId =
        rawProjectId && /^\d+$/.test(rawProjectId)
          ? Number(rawProjectId)
          : null;
      if (projectId && projects.some((project) => project.id === projectId)) {
        setForm((current) => ({ ...current, project_id: projectId }));
      }
    });

    return () => {
      active = false;
    };
  }, [projects, projectsLoading, searchParams, tasks, tasksLoading]);

  function change<K extends keyof CreateForm>(field: K, value: CreateForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: [] }));
  }

  function changeProject(projectId: number) {
    setForm((current) => ({
      ...current,
      project_id: projectId,
      project_task_id: null,
    }));
    setErrors((current) => ({
      ...current,
      project_id: [],
      project_task_id: [],
    }));
  }

  function changeTask(taskId: number | null) {
    const task = tasks.find((item) => item.id === taskId);
    setForm((current) => ({
      ...current,
      project_task_id: taskId,
      project_id: task?.project.id ?? current.project_id,
    }));
    setErrors((current) => ({ ...current, project_task_id: [] }));
  }

  function chooseFile(file: File | null) {
    setErrors((current) => ({ ...current, file: [] }));
    if (file && file.size > 10 * 1024 * 1024) {
      setAttachment(null);
      setErrors((current) => ({
        ...current,
        file: ["Ukuran file maksimum 10 MB."],
      }));
      return;
    }
    setAttachment(file);
  }

  function resetForm() {
    setForm({
      activity_date: localDateKey(new Date()),
      project_id: 0,
      project_task_id: null,
      title: "",
      description: "",
    });
    setAttachment(null);
    setDragActive(false);
    setMessage("");
    setDeepLinkError("");
    setErrors({});
    router.replace("/karyawan/activities", { scroll: false });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    const clientErrors = validateCreate(form);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }
    if (!user) {
      setMessage("Sesi pengguna tidak tersedia.");
      return;
    }

    setSaving(true);
    try {
      const response = await createActivity({
        project_id: form.project_id,
        project_task_id: form.project_task_id,
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        activity_date: form.activity_date,
        status: "selesai",
      });

      let noticeMessage: Notice = {
        tone: "success",
        message: response.message,
      };

      if (attachment) {
        try {
          await uploadActivityMedia(response.data.id, attachment);
          noticeMessage = {
            tone: "success",
            message: "Aktivitas dan lampiran berhasil dikirim.",
          };
        } catch (uploadError) {
          noticeMessage = {
            tone: "warning",
            message: `Aktivitas tersimpan, namun lampiran gagal diunggah. ${getErrorMessage(
              uploadError,
              "Silakan unggah ulang dari Riwayat Aktivitas.",
            )}`,
          };
        }
      }

      resetForm();
      onCreated(noticeMessage);
    } catch (requestError) {
      const parsed = parseLaravelError(
        requestError instanceof ApiError ? requestError.data : null,
      );
      setErrors(parsed.errors ?? {});
      setMessage(
        getErrorMessage(requestError, "Aktivitas gagal dikirim."),
      );
    } finally {
      setSaving(false);
    }
  }

  const noProjects = !projectsLoading && projects.length === 0;
  const noTasks = !tasksLoading && tasks.length === 0;
  const projectUnavailable = projectsLoading || noProjects;
  const taskUnavailable = tasksLoading || noTasks || !form.project_id;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.85fr)]">
      {/* Input Form Panel */}
      <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
        <header className="border-b border-[#e1e7ee] px-5 py-4 sm:px-6">
          <h2 className="text-base font-bold text-[#172b4d]">
            Formulir Tambah Aktivitas
          </h2>
        </header>
        <form
          onSubmit={submit}
          className="space-y-3.5 p-5 sm:p-6"
          aria-busy={saving}
        >
          {deepLinkError && (
            <p
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
            >
              {deepLinkError}
            </p>
          )}
          {noProjects && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Belum ada proyek yang ditugaskan kepada Anda.
            </p>
          )}
          {!noProjects && noTasks && (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 sm:flex-row sm:items-center sm:justify-between">
              <span>Belum ada tugas aktif yang diberikan kepada Anda.</span>
              <Link
                href="/karyawan/tasks"
                className="font-semibold underline"
              >
                Lihat Tugas
              </Link>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="daily-date"
              label="Tanggal"
              error={firstFieldError(errors, "activity_date")}
            >
              <input
                id="daily-date"
                type="date"
                required
                value={form.activity_date}
                onChange={(event) =>
                  change("activity_date", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
              />
            </FormField>

            <FormField
              id="daily-project"
              label="Proyek"
              error={firstFieldError(errors, "project_id")}
            >
              <select
                id="daily-project"
                required
                disabled={projectUnavailable}
                value={form.project_id || ""}
                onChange={(event) =>
                  changeProject(Number(event.target.value))
                }
                className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20 disabled:bg-[#f5f7fa]"
              >
                <option value="">
                  {projectsLoading ? "Memuat Proyek..." : "Pilih Proyek"}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField
            id="daily-task"
            label="Tugas Proyek"
            error={firstFieldError(errors, "project_task_id")}
          >
            <select
              id="daily-task"
              required
              disabled={taskUnavailable}
              value={form.project_task_id ?? ""}
              onChange={(event) =>
                changeTask(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20 disabled:bg-[#f5f7fa]"
            >
              <option value="">
                {tasksLoading
                  ? "Memuat Tugas Proyek..."
                  : form.project_id
                    ? availableTasks.length === 0
                      ? "Tidak ada tugas aktif pada proyek ini."
                      : "Pilih Tugas Proyek Aktif"
                    : "Pilih Proyek terlebih dahulu"}
              </option>
              {availableTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            {!tasksLoading &&
              form.project_id > 0 &&
              availableTasks.length === 0 && (
                <span className="mt-1 block text-[11px] text-[#71829a]">
                  Tidak ada tugas aktif pada proyek ini.
                </span>
              )}
          </FormField>

          <FormField
            id="daily-title"
            label="Aktivitas"
            error={firstFieldError(errors, "title")}
          >
            <input
              id="daily-title"
              required
              maxLength={255}
              value={form.title}
              onChange={(event) => change("title", event.target.value)}
              placeholder="Contoh: Implementasi halaman dashboard admin"
              className="h-11 w-full rounded-xl border border-[#dce4ec] px-3.5 text-xs outline-none placeholder:text-[#91a0b3] focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
            />
          </FormField>

          <FormField
            id="daily-description"
            label="Deskripsi Aktivitas"
            error={firstFieldError(errors, "description")}
          >
            <textarea
              id="daily-description"
              rows={4}
              value={form.description}
              onChange={(event) => change("description", event.target.value)}
              placeholder="Tuliskan hasil pekerjaan utama yang dilakukan."
              className="w-full rounded-xl border border-[#dce4ec] p-3 text-xs outline-none placeholder:text-[#91a0b3] focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
            />
          </FormField>

          <FormField
            id="daily-file"
            label="Lampiran (Opsional)"
            error={firstFieldError(errors, "file")}
          >
            <label
              htmlFor="daily-file"
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                chooseFile(event.dataTransfer.files[0] ?? null);
              }}
              className={`flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-3 text-center transition-colors ${
                dragActive
                  ? "border-[#18a84f] bg-emerald-50/50"
                  : "border-[#dce4ec] bg-[#fafbfc] hover:bg-slate-50"
              }`}
            >
              <AdminIcon
                name="download"
                className="h-5 w-5 rotate-180 text-[#60738f]"
              />
              <span className="mt-1.5 text-xs font-semibold text-[#52657f]">
                Klik atau seret file ke sini
              </span>
              <span className="mt-0.5 text-[11px] text-[#71829a]">
                Gambar, PDF, atau dokumen • Maks. 10 MB
              </span>
              <input
                id="daily-file"
                type="file"
                className="sr-only"
                onChange={(event) =>
                  chooseFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
            {attachment && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#e1e7ee] bg-[#fafbfc] px-3.5 py-2 text-xs">
                <span className="min-w-0 truncate font-medium text-[#52657f]">
                  {attachment.name} ({formatFileSize(attachment.size)})
                </span>
                <button
                  type="button"
                  onClick={() => chooseFile(null)}
                  className="shrink-0 font-semibold text-rose-600 hover:underline"
                >
                  Hapus
                </button>
              </div>
            )}
          </FormField>

          {message && (
            <p role="alert" className="text-xs text-red-600">
              {message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5 border-t border-[#e1e7ee] pt-3">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-[#dce4ec] bg-white px-5 py-2.5 text-xs font-semibold text-[#52657f] transition-colors hover:bg-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                projectUnavailable ||
                taskUnavailable ||
                !form.project_task_id ||
                !form.title.trim()
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#18a84f] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#158f43] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>✓</span>
              {saving ? "Mengirim..." : "Kirim Aktivitas"}
            </button>
          </div>
        </form>
      </section>

      {/* Sidebar Info Panels */}
      <aside className="space-y-4 xl:sticky xl:top-6">
        <TodaySummary refreshVersion={refreshVersion} />

        <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
          <header className="border-b border-[#e1e7ee] px-5 py-4">
            <h2 className="text-base font-bold text-[#172b4d]">
              Informasi Tugas
            </h2>
          </header>
          <div className="p-4">
            {!selectedTask ? (
              <p className="rounded-xl border border-dashed border-[#dce4ec] bg-[#fafbfc] p-4 text-center text-xs leading-relaxed text-[#71829a]">
                Pilih proyek dan tugas untuk melihat detail tugas.
              </p>
            ) : (
              <div className="text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#18a84f]">
                    {selectedTask.project.name}
                  </span>
                  <TaskBadge status={selectedTask.status} />
                </div>
                <h3 className="mt-2 text-sm font-bold text-[#172b4d]">
                  {selectedTask.title}
                </h3>
                {selectedTask.description && (
                  <p className="mt-1.5 line-clamp-3 leading-relaxed text-[#60738f]">
                    {selectedTask.description}
                  </p>
                )}
                {selectedTask.due_date && (
                  <div className="mt-3 flex items-center justify-between border-t border-[#e1e7ee] pt-2.5 text-[#71829a]">
                    <span>Deadline</span>
                    <span className="font-semibold text-[#172b4d]">
                      {formatDate(selectedTask.due_date)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function TodaySummary({ refreshVersion }: { refreshVersion: number }) {
  const [values, setValues] = useState<Array<number | null>>([
    null,
    null,
    null,
    null,
  ]);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryVersion, setRetryVersion] = useState(0);
  const today = localDateKey(new Date());

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setHasError(false);
      try {
        const response = await getTodayActivitySummary(today);
        if (!active) return;
        setValues([
          response.data.total,
          response.data.waiting_validation,
          response.data.approved,
          response.data.needs_revision,
        ]);
      } catch {
        if (!active) return;
        setHasError(true);
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [refreshVersion, retryVersion, today]);

  const metricsConfig = [
    {
      label: "Aktivitas Hari Ini",
      className: "bg-slate-50 text-slate-800 border-slate-200",
    },
    {
      label: "Menunggu Validasi",
      className: "bg-amber-50 text-amber-800 border-amber-200",
    },
    {
      label: "Disetujui",
      className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    {
      label: "Perlu Revisi",
      className: "bg-rose-50 text-rose-800 border-rose-200",
    },
  ];

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm"
      aria-busy={loading}
    >
      <header className="border-b border-[#e1e7ee] px-5 py-4">
        <h2 className="text-base font-bold text-[#172b4d]">
          Ringkasan Hari Ini
        </h2>
        <p className="mt-0.5 text-xs text-[#71829a]">{formatDate(today)}</p>
      </header>
      {hasError && !loading ? (
        <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
          <p className="text-xs font-semibold text-rose-800">
            Ringkasan gagal dimuat
          </p>
          <button
            type="button"
            onClick={() => setRetryVersion((value) => value + 1)}
            className="mt-1.5 text-xs font-semibold text-[#18a84f] underline"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 p-4">
          {metricsConfig.map((item, index) => (
            <div
              key={item.label}
              className={`rounded-xl border p-3 text-center ${item.className}`}
            >
              {loading ? (
                <>
                  <div className="mx-auto h-6 w-8 animate-pulse rounded bg-current/10" />
                  <div className="mx-auto mt-2 h-2.5 w-20 max-w-full animate-pulse rounded bg-current/10" />
                </>
              ) : (
                <>
                  <p className="text-xl font-extrabold">
                    {values[index] ?? 0}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold">
                    {item.label}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityHistory({
  projects,
  projectsLoading,
  refreshVersion,
  onNotice,
}: {
  projects: Project[];
  projectsLoading: boolean;
  refreshVersion: number;
  onNotice: (notice: Notice) => void;
}) {
  const searchParams = useSearchParams();
  const linkedActivityHandled = useRef(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ActivityStatus | "">(
    searchParams.get("status") === "rejected" ? "rejected" : "",
  );
  const [projectId, setProjectId] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const initialRefreshVersion = useRef(refreshVersion);

  const activitiesState = useActivities({
    search: search || undefined,
    status: status || undefined,
    projectId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    perPage: 10,
  });

  const assignedProjectIds = new Set(projects.map((project) => project.id));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (initialRefreshVersion.current === refreshVersion) return;
    initialRefreshVersion.current = refreshVersion;
    activitiesState.refetch();
  }, [activitiesState, refreshVersion]);

  useEffect(() => {
    if (linkedActivityHandled.current || activitiesState.isLoading) return;
    const rawActivityId = searchParams.get("activity_id");
    if (!rawActivityId || !/^\d+$/.test(rawActivityId)) return;

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const activity = activitiesState.data.find(
        (item) => item.id === Number(rawActivityId),
      );
      if (!activity || activity.status !== "rejected") return;

      linkedActivityHandled.current = true;
      setDialog({ type: "edit", activity });
    });

    return () => {
      active = false;
    };
  }, [activitiesState.data, activitiesState.isLoading, searchParams]);

  function mutationSucceeded(message: string) {
    setDialog(null);
    onNotice({ tone: "success", message });
    activitiesState.refetch();
  }

  const filtered = Boolean(
    search || status || projectId || dateFrom || dateTo,
  );

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
        <div className="grid gap-3 border-b border-[#e1e7ee] p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative xl:col-span-2">
            <span className="sr-only">Cari judul aktivitas</span>
            <AdminIcon
              name="search"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b3]"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari judul aktivitas..."
              className="h-11 w-full rounded-xl border border-[#dce4ec] pl-11 pr-3 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
            />
          </label>

          <select
            disabled={projectsLoading}
            value={projectId ?? ""}
            onChange={(event) => {
              setProjectId(
                event.target.value ? Number(event.target.value) : undefined,
              );
              setPage(1);
            }}
            aria-label="Filter proyek"
            className="h-11 rounded-xl border border-[#dce4ec] bg-white px-3 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20 disabled:bg-[#f5f7fa]"
          >
            <option value="">Semua Proyek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ActivityStatus | "");
              setPage(1);
            }}
            aria-label="Filter status"
            className="h-11 rounded-xl border border-[#dce4ec] bg-white px-3 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
          >
            <option value="">Semua Status</option>
            <option value="selesai">Menunggu Validasi</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Perlu Revisi</option>
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              aria-label="Tanggal mulai"
              className="h-11 w-full rounded-xl border border-[#dce4ec] px-2 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
            />
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              aria-label="Tanggal akhir"
              className="h-11 w-full rounded-xl border border-[#dce4ec] px-2 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
            />
          </div>
        </div>

        {activitiesState.error ? (
          <ErrorState onRetry={activitiesState.refetch} />
        ) : (
          <ActivityTable
            activities={activitiesState.data}
            loading={activitiesState.isLoading}
            emptyText={
              filtered
                ? "Tidak ada aktivitas yang cocok dengan filter."
                : "Belum ada riwayat aktivitas yang dicatat."
            }
            assignedProjectIds={assignedProjectIds}
            onEdit={(activity) => setDialog({ type: "edit", activity })}
            onMedia={(activity) => setDialog({ type: "media", activity })}
          />
        )}

        <Pagination
          meta={activitiesState.meta}
          loading={activitiesState.isLoading}
          onPage={setPage}
        />
      </section>

      {dialog?.type === "edit" && (
        <EditActivityDialog
          activity={dialog.activity}
          onClose={() => setDialog(null)}
          onSuccess={mutationSucceeded}
        />
      )}
      {dialog?.type === "media" && (
        <MediaUploadDialog
          activity={dialog.activity}
          onClose={() => setDialog(null)}
          onSuccess={mutationSucceeded}
        />
      )}
    </>
  );
}

function ActivityTable({
  activities,
  loading,
  emptyText,
  assignedProjectIds,
  onEdit,
  onMedia,
}: {
  activities: Activity[];
  loading: boolean;
  emptyText: string;
  assignedProjectIds: Set<number>;
  onEdit: (activity: Activity) => void;
  onMedia: (activity: Activity) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
        <thead className="border-b border-[#e1e7ee] bg-[#f8fafc] text-xs font-semibold uppercase tracking-wider text-[#60738f]">
          <tr>
            <th className="px-5 py-3.5">Tanggal</th>
            <th className="px-4 py-3.5">Proyek</th>
            <th className="px-4 py-3.5">Tugas Proyek</th>
            <th className="px-4 py-3.5">Aktivitas</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5">Hasil Review</th>
            <th className="px-4 py-3.5">Lampiran</th>
            <th className="px-5 py-3.5 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e1e7ee]">
          {loading ? (
            <MessageRow text="Memuat riwayat aktivitas..." />
          ) : activities.length === 0 ? (
            <MessageRow text={emptyText} />
          ) : (
            activities.map((activity) => {
              const isRevision = activity.status === "rejected";
              const assigned =
                activity.project_id !== null &&
                assignedProjectIds.has(activity.project_id);

              return (
                <tr
                  key={activity.id}
                  className="transition-colors hover:bg-slate-50/70 align-top"
                >
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-[#60738f]">
                    {formatDate(activity.activity_date)}
                  </td>
                  <td className="px-4 py-4 text-xs text-[#60738f]">
                    {activity.project?.name ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-xs text-[#60738f]">
                    {activity.task?.title ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#172b4d]">
                      {activity.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 max-w-xs text-xs text-[#71829a]">
                      {activity.description || "Tanpa deskripsi"}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <ActivityBadge status={activity.status} />
                  </td>
                  <td className="px-4 py-4">
                    <ReviewSummary activity={activity} />
                  </td>
                  <td className="px-4 py-4">
                    {activity.media.length > 0 ? (
                      <MediaList items={activity.media} />
                    ) : (
                      <span className="text-xs text-[#91a0b3]">
                        Tidak ada lampiran
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {isRevision ? (
                        <button
                          type="button"
                          onClick={() => onEdit(activity)}
                          disabled={!assigned}
                          title={
                            !assigned
                              ? "Penugasan proyek sudah tidak aktif"
                              : "Perbaiki dan kirim ulang aktivitas"
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <AdminIcon name="edit" className="h-3.5 w-3.5" />
                          Perbaiki Aktivitas
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => onMedia(activity)}
                        title="Unggah lampiran"
                        aria-label={`Unggah lampiran untuk ${activity.title}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#dce4ec] bg-white px-2.5 py-1.5 text-xs font-medium text-[#60738f] shadow-2xs transition-colors hover:bg-slate-50"
                      >
                        <AdminIcon
                          name="download"
                          className="h-3.5 w-3.5 rotate-180"
                        />
                        Lampiran
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function EditActivityDialog({
  activity,
  onClose,
  onSuccess,
}: {
  activity: Activity;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: activity.title,
    description: activity.description ?? "",
    activity_date: activity.activity_date.slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<LaravelFieldErrors>({});

  function change(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: [] }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    if (!form.title.trim()) {
      setErrors({ title: ["Judul aktivitas wajib diisi."] });
      return;
    }
    if (!user || activity.project_id === null) return;
    setSaving(true);
    try {
      const response = await updateActivity(activity.id, {
        project_id: activity.project_id,
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        activity_date: form.activity_date,
        status: "selesai",
      });
      onSuccess(response.message);
    } catch (requestError) {
      setErrors(
        parseLaravelError(
          requestError instanceof ApiError ? requestError.data : null,
        ).errors ?? {},
      );
      setMessage(
        getErrorMessage(requestError, "Aktivitas gagal diperbarui."),
      );
    } finally {
      setSaving(false);
    }
  }

  const isRevision = activity.status === "rejected";

  return (
    <AdminDialog
      title={
        isRevision
          ? "Perbaiki & Kirim Ulang Aktivitas"
          : "Ubah Data Aktivitas"
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        {isRevision && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            <p className="font-bold">Catatan Revisi</p>
            <p className="mt-1 font-medium text-red-700">
              {activity.rejection_reason || "—"}
            </p>
            <p className="mt-2 text-[11px] text-red-600">
              {activity.rejected_by?.name ?? "Project Manager"} • {formatDateTime(activity.rejected_at ?? "")}
            </p>
            <p className="mt-2 text-[11px] text-red-600">
              Setelah memperbaiki isi aktivitas, klik tombol{" "}
              <strong>Kirim Ulang untuk Validasi</strong> agar aktivitas kembali masuk ke
              antrean peninjauan.
            </p>
          </div>
        )}

        <dl className="grid gap-3 rounded-xl border border-[#e1e7ee] bg-[#fafbfc] p-3 text-xs sm:grid-cols-2">
          <Detail label="Proyek" value={activity.project?.name ?? "—"} />
          <Detail label="Tugas Proyek" value={activity.task?.title ?? "—"} />
        </dl>

        <FormField
          id="edit-title"
          label="Aktivitas"
          error={firstFieldError(errors, "title")}
        >
          <input
            id="edit-title"
            required
            maxLength={255}
            value={form.title}
            onChange={(event) => change("title", event.target.value)}
            className="h-11 w-full rounded-xl border border-[#dce4ec] px-3.5 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
          />
        </FormField>

        <FormField
          id="edit-description"
          label="Deskripsi Aktivitas"
          error={firstFieldError(errors, "description")}
        >
          <textarea
            id="edit-description"
            rows={4}
            value={form.description}
            onChange={(event) => change("description", event.target.value)}
            className="w-full rounded-xl border border-[#dce4ec] p-3 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
          />
        </FormField>

        <FormField
          id="edit-date"
          label="Tanggal"
          error={firstFieldError(errors, "activity_date")}
        >
          <input
            id="edit-date"
            type="date"
            required
            value={form.activity_date}
            onChange={(event) => change("activity_date", event.target.value)}
            className="h-11 w-full rounded-xl border border-[#dce4ec] px-3 text-xs outline-none focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20"
          />
        </FormField>

        {message && (
          <p role="alert" className="text-xs text-red-600">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-[#e1e7ee] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#dce4ec] px-4 py-2 text-xs font-semibold text-[#60738f] hover:bg-slate-50 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#158f43] disabled:opacity-60 ${
              isRevision ? "bg-[#18a84f]" : "bg-[#18a84f]"
            }`}
          >
            {saving
              ? "Menyimpan..."
              : isRevision
                ? "Kirim Ulang untuk Validasi"
                : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function MediaUploadDialog({
  activity,
  onClose,
  onSuccess,
}: {
  activity: Activity;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!file) {
      setMessage("Pilih file lampiran terlebih dahulu.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Ukuran file maksimum 10 MB.");
      return;
    }
    setSaving(true);
    try {
      const response = await uploadActivityMedia(activity.id, file);
      onSuccess(response.message);
    } catch (requestError) {
      setMessage(
        getErrorMessage(requestError, "File lampiran gagal diunggah."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog title="Unggah Lampiran Aktivitas" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <p className="text-xs text-[#60738f]">
          Tambahkan file lampiran atau bukti untuk:{" "}
          <strong className="text-[#172b4d]">{activity.title}</strong>.
        </p>

        {activity.media.length > 0 && (
          <div className="rounded-xl border border-[#e1e7ee] bg-[#fafbfc] p-3">
            <p className="mb-2 text-[11px] font-semibold text-[#71829a]">
              Lampiran Terunggah:
            </p>
            <MediaList items={activity.media} />
          </div>
        )}

        <label
          htmlFor="history-file"
          className="block text-xs font-semibold text-[#172b4d]"
        >
          Pilih File Lampiran
          <input
            id="history-file"
            type="file"
            required
            onChange={(event) =>
              setFile(event.target.files?.[0] ?? null)
            }
            className="mt-1.5 block w-full rounded-xl border border-[#dce4ec] text-xs file:mr-4 file:border-0 file:bg-emerald-50 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-[#18a84f] hover:file:bg-emerald-100"
          />
          <span className="mt-1 block text-[11px] font-normal text-[#71829a]">
            Maksimum 10 MB (Gambar / PDF / Dokumen)
          </span>
        </label>

        {message && (
          <p role="alert" className="text-xs text-red-600">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-[#e1e7ee] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#dce4ec] px-4 py-2 text-xs font-semibold text-[#60738f] hover:bg-slate-50 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#18a84f] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#158f43] disabled:opacity-60"
          >
            {saving ? "Mengunggah..." : "Unggah Lampiran"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function ReviewSummary({ activity }: { activity: Activity }) {
  if (activity.status === "rejected") {
    return (
      <div className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-bold uppercase tracking-wide">Perlu Revisi</p>
        <p className="mt-1 text-[11px]">Project Manager meminta Anda memperbaiki aktivitas ini.</p>
        <p className="mt-2 font-semibold">Catatan Project Manager</p>
        <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed">“{activity.rejection_reason || "—"}”</p>
        <p className="mt-2 text-[10px] text-amber-700">{activity.rejected_by?.name ?? "Project Manager"} • {formatDateTime(activity.rejected_at ?? "")}</p>
        <EmployeeReviewHistory activity={activity} />
      </div>
    );
  }
  if (activity.status === "approved") {
    return (
      <div className="text-xs text-emerald-700">
        <p className="font-semibold">
          Disetujui
          {activity.approved_by ? ` oleh ${activity.approved_by.name}` : ""}
        </p>
        {activity.approved_at && (
          <p className="mt-0.5 text-[10px] text-[#71829a]">
            {formatDateTime(activity.approved_at)}
          </p>
        )}
        <EmployeeReviewHistory activity={activity} />
      </div>
    );
  }
  return (
    <div><span className="text-xs text-amber-700">Menunggu validasi Project Manager</span>{activity.revision_count > 0 && <p className="mt-1 text-[10px] text-[#71829a]">Pernah direvisi {activity.revision_count}x</p>}<EmployeeReviewHistory activity={activity} /></div>
  );
}

function EmployeeReviewHistory({ activity }: { activity: Activity }) {
  if (activity.review_history.length === 0) return null;
  return (
    <details className="mt-2 border-t border-current/15 pt-2">
      <summary className="cursor-pointer text-[10.5px] font-semibold">Riwayat Review</summary>
      <div className="mt-2 space-y-2">
        {activity.review_history.map((item, index) => (
          <div key={`${item.created_at}-${index}`} className="border-l border-current/20 pl-2">
            <p className="text-[10.5px] font-semibold">{item.action === "submitted" ? "Mengirim aktivitas untuk validasi" : item.action === "revision_requested" ? "Meminta revisi" : item.action === "resubmitted" ? "Mengirim ulang aktivitas" : "Aktivitas disetujui"}</p>
            {item.note && <p className="mt-0.5 text-[10px]">“{item.note}”</p>}
            <p className="mt-0.5 text-[9.5px] opacity-75">{item.action === "resubmitted" ? "Anda" : item.actor?.name ?? "Project Manager"} • {formatDateTime(item.created_at)}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function ActivityBadge({ status }: { status: ActivityStatus }) {
  const tone =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
      : status === "rejected"
        ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
        : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function TaskBadge({ status }: { status: ProjectTaskStatus }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
      : status === "completed"
        ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"
        : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20";
  const label =
    status === "active"
      ? "Aktif"
      : status === "completed"
        ? "Selesai"
        : "Dibatalkan";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}

function NoticeBanner({
  notice,
  onClose,
}: {
  notice: NonNullable<Notice>;
  onClose: () => void;
}) {
  const tone =
    notice.tone === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${tone}`}
    >
      <span>{notice.message}</span>
      <button
        type="button"
        aria-label="Tutup notifikasi"
        onClick={onClose}
        className="rounded p-1 hover:bg-black/5"
      >
        <AdminIcon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

function ResourceError({
  projectError,
  taskError,
  onRetry,
}: {
  projectError: string;
  taskError: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{[projectError, taskError].filter(Boolean).join(" ")}</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 font-semibold underline"
      >
        Coba lagi
      </button>
    </div>
  );
}

function TabButton({
  id,
  controls,
  active,
  onClick,
  children,
}: {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
        active
          ? "border-[#18a84f] text-[#18a84f]"
          : "border-transparent text-[#71829a] hover:text-[#172b4d]"
      }`}
    >
      {children}
    </button>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-[#172b4d]"
      >
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[#71829a]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#172b4d]">{value}</dd>
    </div>
  );
}

function Pagination({
  meta,
  loading,
  onPage,
}: {
  meta: PaginationMeta | null;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  if (!meta) return null;
  return (
    <footer className="flex flex-col gap-3 border-t border-[#e1e7ee] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#71829a]">
        Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} aktivitas
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={loading || meta.current_page <= 1}
          onClick={() => onPage(meta.current_page - 1)}
          className="rounded-lg border border-[#dce4ec] px-3 py-1.5 text-xs font-semibold text-[#60738f] transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          Sebelumnya
        </button>
        <span
          className="rounded-lg bg-[#18a84f] px-3 py-1.5 text-xs font-bold text-white"
          aria-label={`Halaman ${meta.current_page} dari ${meta.last_page}`}
        >
          {meta.current_page} / {meta.last_page}
        </span>
        <button
          type="button"
          disabled={loading || meta.current_page >= meta.last_page}
          onClick={() => onPage(meta.current_page + 1)}
          className="rounded-lg border border-[#dce4ec] px-3 py-1.5 text-xs font-semibold text-[#60738f] transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          Berikutnya
        </button>
      </div>
    </footer>
  );
}

function MessageRow({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={8} className="px-6 py-16 text-center text-xs text-[#71829a]">
        {text}
      </td>
    </tr>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-6 py-16 text-center">
      <p role="alert" className="text-xs font-semibold text-red-700">
        Riwayat aktivitas gagal dimuat.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-[#18a84f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#158f43]"
      >
        Coba Lagi
      </button>
    </div>
  );
}

function validateCreate(form: CreateForm): LaravelFieldErrors {
  const errors: LaravelFieldErrors = {};
  if (!form.activity_date) errors.activity_date = ["Tanggal wajib diisi."];
  if (!form.project_id) errors.project_id = ["Proyek wajib dipilih."];
  if (!form.project_task_id)
    errors.project_task_id = ["Tugas proyek aktif wajib dipilih."];
  if (!form.title.trim()) errors.title = ["Aktivitas wajib diisi."];
  return errors;
}

async function getAllActiveTasks(): Promise<ProjectTask[]> {
  const first = await getProjectTasks({
    status: "active",
    page: 1,
    perPage: 100,
  });
  if (first.meta.last_page <= 1) return first.data;
  const remaining = await Promise.all(
    Array.from({ length: first.meta.last_page - 1 }, (_, index) =>
      getProjectTasks({ status: "active", page: index + 2, perPage: 100 }),
    ),
  );
  return [first.data, ...remaining.map((response) => response.data)].flat();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError))
    return "Tidak dapat terhubung ke server.";
  if (error.status === 403)
    return "Anda tidak memiliki akses atau penugasan proyek sudah tidak aktif.";
  if (error.status === 404) return "Data aktivitas tidak ditemukan.";
  if (error.status >= 500)
    return "Server sedang bermasalah. Silakan coba lagi.";
  return error.message || fallback;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
