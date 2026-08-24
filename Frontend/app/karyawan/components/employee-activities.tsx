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
import { firstFieldError, parseLaravelError, type LaravelFieldErrors } from "../../lib/validation";
import {
  createActivity,
  getActivities,
  updateActivity,
  uploadActivityMedia,
  type Activity,
  type ActivityStatus,
} from "../../services/activity-service";
import { getProjects, type Project } from "../../services/project-service";
import { getProjectTasks, type ProjectTask } from "../../services/project-task-service";
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
  const [tab, setTab] = useState<ActivityTab>(searchParams.has("task_id") ? "input" : searchParams.get("tab") === "history" ? "history" : "input");
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
      .then((items) => { if (active) setProjects(items); })
      .catch(() => { if (active) { setProjects([]); setProjectError("Project assignment gagal dimuat."); } })
      .finally(() => { if (active) setProjectsLoading(false); });

    void getAllActiveTasks()
      .then((items) => { if (active) setTasks(items); })
      .catch(() => { if (active) { setTasks([]); setTaskError("Task aktif gagal dimuat."); } })
      .finally(() => { if (active) setTasksLoading(false); });

    return () => { active = false; };
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

  return <main className="space-y-5 p-4 sm:p-7">
    <header>
      <h1 className="text-2xl font-bold text-[#172b4d]">Daily Activity</h1>
      <p className="mt-1 text-sm text-[#71829a]">Catat dan pantau aktivitas kerja harian Anda</p>
    </header>

    {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}
    {(projectError || taskError) && <ResourceError projectError={projectError} taskError={taskError} onRetry={retryResources} />}

    <div className="border-b border-[#dce4ec]" role="tablist" aria-label="Daily Activity">
      <TabButton id="daily-input-tab" controls="daily-input-panel" active={tab === "input"} onClick={() => setTab("input")}>Input Aktivitas</TabButton>
      <TabButton id="daily-history-tab" controls="daily-history-panel" active={tab === "history"} onClick={() => setTab("history")}>Riwayat Aktivitas</TabButton>
    </div>

    {tab === "input" ? <section id="daily-input-panel" role="tabpanel" aria-labelledby="daily-input-tab">
      <DailyActivityInput projects={projects} tasks={tasks} projectsLoading={projectsLoading} tasksLoading={tasksLoading} refreshVersion={dataVersion} onCreated={activityCreated} />
    </section> : <section id="daily-history-panel" role="tabpanel" aria-labelledby="daily-history-tab">
      <ActivityHistory projects={projects} projectsLoading={projectsLoading} refreshVersion={dataVersion} onNotice={setNotice} />
    </section>}
  </main>;
}

function DailyActivityInput({ projects, tasks, projectsLoading, tasksLoading, refreshVersion, onCreated }: {
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
  const [form, setForm] = useState<CreateForm>({ activity_date: localDateKey(new Date()), project_id: 0, project_task_id: null, title: "", description: "" });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deepLinkError, setDeepLinkError] = useState("");
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const selectedTask = tasks.find((task) => task.id === form.project_task_id) ?? null;
  const availableTasks = tasks.filter((task) => task.project.id === form.project_id);

  useEffect(() => {
    if (deepLinkHandled.current || projectsLoading || tasksLoading) return;
    deepLinkHandled.current = true;
    let active = true;

    // Deep link baru dapat divalidasi setelah resource scoped selesai dimuat.
    // Microtask menjaga sinkronisasi async ini tidak memicu render berantai.
    queueMicrotask(() => {
      if (!active) return;
      const rawTaskId = searchParams.get("task_id");
      const taskId = rawTaskId && /^\d+$/.test(rawTaskId) ? Number(rawTaskId) : null;
      if (rawTaskId) {
        const task = taskId ? tasks.find((item) => item.id === taskId) : undefined;
        if (!task) {
          setDeepLinkError("Task tidak ditemukan, sudah tidak aktif, atau bukan milik Anda.");
          return;
        }
        setForm((current) => ({ ...current, project_id: task.project.id, project_task_id: task.id, title: task.title }));
        return;
      }

      const rawProjectId = searchParams.get("project_id");
      const projectId = rawProjectId && /^\d+$/.test(rawProjectId) ? Number(rawProjectId) : null;
      if (projectId && projects.some((project) => project.id === projectId)) setForm((current) => ({ ...current, project_id: projectId }));
    });

    return () => { active = false; };
  }, [projects, projectsLoading, searchParams, tasks, tasksLoading]);

  function change<K extends keyof CreateForm>(field: K, value: CreateForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: [] }));
  }

  function changeProject(projectId: number) {
    setForm((current) => ({ ...current, project_id: projectId, project_task_id: null }));
    setErrors((current) => ({ ...current, project_id: [], project_task_id: [] }));
  }

  function changeTask(taskId: number | null) {
    const task = tasks.find((item) => item.id === taskId);
    setForm((current) => ({ ...current, project_task_id: taskId, project_id: task?.project.id ?? current.project_id, title: task?.title ?? current.title }));
    setErrors((current) => ({ ...current, project_task_id: [], title: [] }));
  }

  function chooseFile(file: File | null) {
    setErrors((current) => ({ ...current, file: [] }));
    if (file && file.size > 10 * 1024 * 1024) {
      setAttachment(null);
      setErrors((current) => ({ ...current, file: ["Ukuran file maksimum 10 MB."] }));
      return;
    }
    setAttachment(file);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    const clientErrors = validateCreate(form);
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); return; }
    if (!user) { setMessage("Sesi pengguna tidak tersedia."); return; }

    setSaving(true);
    try {
      const response = await createActivity({
        project_id: form.project_id,
        project_task_id: form.project_task_id,
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        activity_date: form.activity_date,
        // Submit aktivitas baru langsung berstatus selesai (Menunggu Validasi)
        // agar segera masuk antrean validasi Project Manager.
        status: "selesai",
      });

      let notice: Notice = { tone: "success", message: response.message };
      if (attachment) {
        try {
          await uploadActivityMedia(response.data.id, attachment);
          notice = { tone: "success", message: "Aktivitas dan lampiran berhasil dikirim." };
        } catch (uploadError) {
          // Activity tidak diulang ketika upload gagal karena record pertama
          // sudah valid; Karyawan dapat mencoba upload lagi dari Riwayat.
          notice = { tone: "warning", message: `Aktivitas tersimpan, tetapi lampiran gagal diunggah. ${getErrorMessage(uploadError, "Coba lagi dari Riwayat Aktivitas.")}` };
        }
      }

      setForm({ activity_date: localDateKey(new Date()), project_id: 0, project_task_id: null, title: "", description: "" });
      setAttachment(null);
      router.replace("/karyawan/activities", { scroll: false });
      onCreated(notice);
    } catch (requestError) {
      const parsed = parseLaravelError(requestError instanceof ApiError ? requestError.data : null);
      setErrors(parsed.errors ?? {});
      setMessage(getErrorMessage(requestError, "Aktivitas gagal dikirim."));
    } finally { setSaving(false); }
  }

  const noProjects = !projectsLoading && projects.length === 0;
  const noTasks = !tasksLoading && tasks.length === 0;
  const formUnavailable = projectsLoading || tasksLoading || noProjects || noTasks;

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
      <header className="border-b border-[#e1e7ee] px-5 py-4 sm:px-6"><h2 className="font-bold text-[#172b4d]">Form Input Aktivitas Harian</h2></header>
      <form onSubmit={submit} className="space-y-5 p-5 sm:p-6" aria-busy={saving}>
        {deepLinkError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{deepLinkError}</p>}
        {noProjects && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Belum ada proyek yang ditugaskan kepada Anda.</p>}
        {!noProjects && noTasks && <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"><span>Belum ada tugas aktif yang diberikan kepada Anda.</span><Link href="/karyawan/tasks" className="shrink-0 font-semibold underline">Lihat Tugas</Link></div>}

        <FormField id="daily-date" label="Tanggal" error={firstFieldError(errors, "activity_date")}>
          <input id="daily-date" type="date" required value={form.activity_date} onChange={(event) => change("activity_date", event.target.value)} aria-describedby={fieldDescriptionId("daily-date", errors.activity_date)} className="h-11 w-full rounded-xl border border-[#dce4ec] px-3 outline-none focus:border-[#43a956]" />
        </FormField>
        <FormField id="daily-project" label="Project" error={firstFieldError(errors, "project_id")}>
          <select id="daily-project" required disabled={formUnavailable} value={form.project_id || ""} onChange={(event) => changeProject(Number(event.target.value))} aria-describedby={fieldDescriptionId("daily-project", errors.project_id)} className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 disabled:bg-[#f5f7fa]"><option value="">{projectsLoading ? "Memuat Project..." : "Pilih Project"}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        </FormField>
        <FormField id="daily-task" label="Tugas" error={firstFieldError(errors, "project_task_id")}>
          <select id="daily-task" required disabled={formUnavailable || !form.project_id} value={form.project_task_id ?? ""} onChange={(event) => changeTask(event.target.value ? Number(event.target.value) : null)} aria-describedby={fieldDescriptionId("daily-task", errors.project_task_id)} className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 disabled:bg-[#f5f7fa]"><option value="">{tasksLoading ? "Memuat Task..." : form.project_id ? "Pilih Task aktif" : "Pilih Project terlebih dahulu"}</option>{availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select>
          {!tasksLoading && form.project_id > 0 && availableTasks.length === 0 && <span className="mt-1 block text-xs text-[#71829a]">Tidak ada Task active pada Project ini.</span>}
        </FormField>
        <FormField id="daily-title" label="Judul Aktivitas" error={firstFieldError(errors, "title")}>
          <input id="daily-title" required maxLength={255} value={form.title} onChange={(event) => change("title", event.target.value)} aria-describedby={fieldDescriptionId("daily-title", errors.title)} placeholder="Masukkan judul aktivitas" className="h-11 w-full rounded-xl border border-[#dce4ec] px-3 outline-none focus:border-[#43a956]" />
        </FormField>
        <FormField id="daily-description" label="Aktivitas yang Dilakukan" error={firstFieldError(errors, "description")}>
          <textarea id="daily-description" rows={5} value={form.description} onChange={(event) => change("description", event.target.value)} aria-describedby={fieldDescriptionId("daily-description", errors.description)} placeholder="Deskripsikan aktivitas yang telah dilakukan..." className="w-full rounded-xl border border-[#dce4ec] p-3 outline-none focus:border-[#43a956]" />
        </FormField>
        <FormField id="daily-file" label="Lampiran" error={firstFieldError(errors, "file")}>
          <label htmlFor="daily-file" onDragEnter={() => setDragActive(true)} onDragLeave={() => setDragActive(false)} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDrop={(event) => { event.preventDefault(); setDragActive(false); chooseFile(event.dataTransfer.files[0] ?? null); }} className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition ${dragActive ? "border-[#43a956] bg-green-50" : "border-[#cfd9e4] bg-[#fbfcfd]"}`}>
            <AdminIcon name="download" className="h-6 w-6 rotate-180 text-[#60738f]" />
            <span className="mt-2 text-sm font-medium text-[#52657f]">Klik atau seret file ke sini</span>
            <span className="mt-1 text-xs text-[#71829a]">Maksimum 10 MB; tipe file mengikuti validasi backend.</span>
            <input id="daily-file" type="file" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} aria-describedby={fieldDescriptionId("daily-file", errors.file)} />
          </label>
          {attachment && <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-[#f5f7fa] px-3 py-2 text-xs"><span className="min-w-0 truncate text-[#52657f]">{attachment.name} · {formatFileSize(attachment.size)}</span><button type="button" onClick={() => chooseFile(null)} className="shrink-0 font-semibold text-red-600">Hapus</button></div>}
        </FormField>

        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <button type="submit" disabled={saving || formUnavailable || !form.project_task_id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#18a84f] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><span aria-hidden="true">✓</span>{saving ? attachment ? "Mengirim dan mengunggah..." : "Mengirim..." : "Kirim Aktivitas"}</button>
      </form>
    </section>

    <aside className="space-y-5">
      <TodaySummary refreshVersion={refreshVersion} />
      <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
        <header className="border-b border-[#e1e7ee] px-5 py-4"><h2 className="font-bold text-[#172b4d]">Catatan Penting</h2></header>
        <div className="p-5"><div className={`rounded-xl border p-4 text-sm ${selectedTask?.due_date ? "border-amber-200 bg-amber-50 text-amber-800" : "border-[#dce4ec] bg-[#f8fafc] text-[#60738f]"}`}><p className="font-semibold">{selectedTask ? "Deadline Tugas" : "Informasi Tugas"}</p><p className="mt-1">{!selectedTask ? "Pilih tugas untuk melihat informasi deadline." : selectedTask.due_date ? formatDate(selectedTask.due_date) : "Tidak ada deadline khusus untuk tugas ini."}</p></div></div>
      </section>
    </aside>
  </div>;
}

function TodaySummary({ refreshVersion }: { refreshVersion: number }) {
  const [values, setValues] = useState<Array<number | null>>([null, null, null]);
  const [errors, setErrors] = useState<boolean[]>([false, false, false]);
  const [loading, setLoading] = useState(true);
  const [retryVersion, setRetryVersion] = useState(0);
  const today = localDateKey(new Date());

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      const results = await Promise.allSettled([
        getActivities({ dateFrom: today, dateTo: today, page: 1, perPage: 1 }),
        getActivities({ dateFrom: today, dateTo: today, status: "selesai", page: 1, perPage: 1 }),
        getActivities({ dateFrom: today, dateTo: today, status: "approved", page: 1, perPage: 1 }),
      ]);
      if (!active) return;
      setValues(results.map((result) => result.status === "fulfilled" ? result.value.meta.total : null));
      setErrors(results.map((result) => result.status === "rejected"));
      setLoading(false);
    });
    return () => { active = false; };
  }, [refreshVersion, retryVersion, today]);

  const labels = ["Aktivitas Hari Ini", "Menunggu Validasi", "Disetujui"];
  const tones = ["bg-green-50 text-green-700", "bg-amber-50 text-amber-700", "bg-blue-50 text-blue-700"];
  return <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm" aria-busy={loading}>
    <header className="border-b border-[#e1e7ee] px-5 py-4"><h2 className="font-bold text-[#172b4d]">Ringkasan Hari Ini</h2><p className="mt-1 text-xs text-[#71829a]">{formatDate(today)}</p></header>
    <div className="grid gap-3 p-5 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">{labels.map((label, index) => <div key={label} className={`rounded-xl p-4 text-center ${tones[index]}`}><p className="text-2xl font-bold">{loading || errors[index] ? "—" : values[index]}</p><p className="mt-1 text-xs font-medium">{errors[index] ? `${label} tidak tersedia` : label}</p></div>)}</div>
    {errors.some(Boolean) && <div className="px-5 pb-5"><button type="button" onClick={() => setRetryVersion((value) => value + 1)} className="text-sm font-semibold text-[#168c44] underline">Coba muat ringkasan lagi</button></div>}
  </section>;
}

function ActivityHistory({ projects, projectsLoading, refreshVersion, onNotice }: { projects: Project[]; projectsLoading: boolean; refreshVersion: number; onNotice: (notice: Notice) => void }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [projectId, setProjectId] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const initialRefreshVersion = useRef(refreshVersion);
  const activitiesState = useActivities({ search: search || undefined, status: status || undefined, projectId, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, perPage: 10 });
  const assignedProjectIds = new Set(projects.map((project) => project.id));

  useEffect(() => { const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350); return () => window.clearTimeout(timeout); }, [searchInput]);
  useEffect(() => {
    if (initialRefreshVersion.current === refreshVersion) return;
    initialRefreshVersion.current = refreshVersion;
    activitiesState.refetch();
  }, [activitiesState, refreshVersion]);

  function mutationSucceeded(message: string) {
    setDialog(null);
    onNotice({ tone: "success", message });
    activitiesState.refetch();
  }

  const filtered = Boolean(search || status || projectId || dateFrom || dateTo);
  return <>
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
      <div className="grid gap-3 border-b border-[#e1e7ee] p-4 md:grid-cols-2 xl:grid-cols-5 sm:p-6">
        <label className="relative xl:col-span-2"><span className="sr-only">Cari aktivitas</span><AdminIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b3]" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari judul aktivitas..." className="h-11 w-full rounded-xl border border-[#dce4ec] pl-11 pr-3 text-sm" /></label>
        <select disabled={projectsLoading} value={projectId ?? ""} onChange={(event) => { setProjectId(event.target.value ? Number(event.target.value) : undefined); setPage(1); }} aria-label="Filter project" className="h-11 rounded-xl border border-[#dce4ec] bg-white px-3 text-sm disabled:bg-[#f5f7fa]"><option value="">Semua Project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select value={status} onChange={(event) => { setStatus(event.target.value as ActivityStatus | ""); setPage(1); }} aria-label="Filter status" className="h-11 rounded-xl border border-[#dce4ec] bg-white px-3 text-sm">
          <option value="">Semua Status</option>
          <option value="selesai">Menunggu Validasi</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Perlu Revisi</option>
        </select>
        <div className="grid grid-cols-2 gap-2"><label><span className="sr-only">Tanggal mulai</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="h-11 w-full rounded-xl border border-[#dce4ec] px-2 text-xs" /></label><label><span className="sr-only">Tanggal akhir</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="h-11 w-full rounded-xl border border-[#dce4ec] px-2 text-xs" /></label></div>
      </div>
      {activitiesState.error ? <ErrorState onRetry={activitiesState.refetch} /> : <ActivityTable activities={activitiesState.data} loading={activitiesState.isLoading} emptyText={filtered ? "Belum ada aktivitas yang cocok." : "Belum ada riwayat aktivitas."} assignedProjectIds={assignedProjectIds} onEdit={(activity) => setDialog({ type: "edit", activity })} onMedia={(activity) => setDialog({ type: "media", activity })} />}
      <Pagination meta={activitiesState.meta} loading={activitiesState.isLoading} onPage={setPage} />
    </section>
    {dialog?.type === "edit" && <EditActivityDialog activity={dialog.activity} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
    {dialog?.type === "media" && <MediaUploadDialog activity={dialog.activity} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
  </>;
}

function ActivityTable({ activities, loading, emptyText, assignedProjectIds, onEdit, onMedia }: { activities: Activity[]; loading: boolean; emptyText: string; assignedProjectIds: Set<number>; onEdit: (activity: Activity) => void; onMedia: (activity: Activity) => void }) {
  return <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[1220px] text-left text-sm"><thead className="bg-[#f1f4f8] text-[#60738f]"><tr><th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Project</th><th className="px-5 py-3">Task</th><th className="px-5 py-3">Aktivitas</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Review</th><th className="px-5 py-3">Bukti</th><th className="px-5 py-3 text-center">Aksi</th></tr></thead><tbody>
    {loading ? <MessageRow text="Memuat riwayat aktivitas..." /> : activities.length === 0 ? <MessageRow text={emptyText} /> : activities.map((activity) => {
      const approved = activity.status === "approved";
      const assigned = activity.project_id !== null && assignedProjectIds.has(activity.project_id);
      return <tr key={activity.id} className="border-b border-[#e1e7ee] align-top last:border-0"><td className="whitespace-nowrap px-5 py-4 text-[#60738f]">{formatDate(activity.activity_date)}</td><td className="px-5 py-4 text-[#60738f]">{activity.project?.name ?? "—"}</td><td className="px-5 py-4 text-[#60738f]">{activity.task?.title ?? "—"}</td><td className="px-5 py-4"><p className="font-semibold text-[#172b4d]">{activity.title}</p><p className="mt-1 max-w-xs text-xs leading-5 text-[#71829a]">{activity.description || "Tanpa deskripsi"}</p></td><td className="px-5 py-4"><ActivityBadge status={activity.status} /></td><td className="px-5 py-4"><ReviewSummary activity={activity} /></td><td className="px-5 py-4"><MediaList items={activity.media} />{activity.media.length === 0 && <span className="text-xs text-[#91a0b3]">Belum ada bukti</span>}</td><td className="px-5 py-4"><div className="flex justify-center gap-2"><button type="button" aria-label={`Edit ${activity.title}`} title={approved ? "Activity yang disetujui bersifat read-only" : !assigned ? "Assignment project tidak lagi aktif" : "Edit aktivitas"} disabled={approved || !assigned} onClick={() => onEdit(activity)} className="rounded-lg border border-[#dce4ec] p-2 text-[#60738f] disabled:cursor-not-allowed disabled:opacity-35"><AdminIcon name="edit" className="h-4 w-4" /></button><button type="button" aria-label={`Unggah bukti untuk ${activity.title}`} title="Unggah bukti" onClick={() => onMedia(activity)} className="rounded-lg border border-[#dce4ec] p-2 text-[#60738f]"><AdminIcon name="download" className="h-4 w-4 rotate-180" /></button></div></td></tr>;
    })}
  </tbody></table></div>;
}

function EditActivityDialog({ activity, onClose, onSuccess }: { activity: Activity; onClose: () => void; onSuccess: (message: string) => void }) {
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
    event.preventDefault(); setMessage(""); setErrors({});
    if (!form.title.trim()) { setErrors({ title: ["Judul aktivitas wajib diisi."] }); return; }
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
      setErrors(parseLaravelError(requestError instanceof ApiError ? requestError.data : null).errors ?? {});
      setMessage(getErrorMessage(requestError, "Aktivitas gagal diperbarui."));
    } finally { setSaving(false); }
  }

  const isRevision = activity.status === "rejected";

  return <AdminDialog title={isRevision ? "Revisi Aktivitas" : "Edit Aktivitas"} onClose={onClose}><form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
    {isRevision && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p className="font-semibold">Aktivitas perlu direvisi.</p><p className="mt-1">{activity.rejection_reason ?? "Alasan revisi tidak tersedia."}</p><p className="mt-2 text-xs">Setelah diperbaiki, klik Kirim Ulang agar aktivitas masuk kembali ke antrean validasi.</p></div>}
    <dl className="grid gap-3 rounded-xl bg-[#f5f7fa] p-4 text-sm sm:grid-cols-2"><Detail label="Project" value={activity.project?.name ?? "—"} /><Detail label="Task" value={activity.task?.title ?? "—"} /></dl>
    <FormField id="edit-title" label="Judul Aktivitas" error={firstFieldError(errors, "title")}><input id="edit-title" required maxLength={255} value={form.title} onChange={(event) => change("title", event.target.value)} aria-describedby={fieldDescriptionId("edit-title", errors.title)} className="h-11 w-full rounded-xl border border-[#dce4ec] px-3" /></FormField>
    <FormField id="edit-description" label="Aktivitas yang Dilakukan" error={firstFieldError(errors, "description")}><textarea id="edit-description" rows={4} value={form.description} onChange={(event) => change("description", event.target.value)} aria-describedby={fieldDescriptionId("edit-description", errors.description)} className="w-full rounded-xl border border-[#dce4ec] p-3" /></FormField>
    <FormField id="edit-date" label="Tanggal" error={firstFieldError(errors, "activity_date")}><input id="edit-date" type="date" required value={form.activity_date} onChange={(event) => change("activity_date", event.target.value)} aria-describedby={fieldDescriptionId("edit-date", errors.activity_date)} className="h-11 w-full rounded-xl border border-[#dce4ec] px-3" /></FormField>
    {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
    <DialogActions saving={saving} onClose={onClose} submitLabel={isRevision ? "Kirim Ulang" : "Simpan Perubahan"} />
  </form></AdminDialog>;
}

function MediaUploadDialog({ activity, onClose, onSuccess }: { activity: Activity; onClose: () => void; onSuccess: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!file) { setMessage("Pilih file bukti terlebih dahulu."); return; }
    if (file.size > 10 * 1024 * 1024) { setMessage("Ukuran file maksimum 10 MB."); return; }
    setSaving(true);
    try { const response = await uploadActivityMedia(activity.id, file); onSuccess(response.message); }
    catch (requestError) { setMessage(getErrorMessage(requestError, "File gagal diunggah.")); }
    finally { setSaving(false); }
  }
  return <AdminDialog title="Unggah Bukti Aktivitas" onClose={onClose}><form onSubmit={submit} className="space-y-4 p-5 sm:p-6"><p className="text-sm text-[#60738f]">Tambahkan bukti untuk <strong className="text-[#172b4d]">{activity.title}</strong>.</p><MediaList items={activity.media} /><label htmlFor="history-file" className="block text-sm font-semibold text-[#172b4d]">File Bukti<input id="history-file" type="file" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-xl border border-[#dce4ec] text-sm file:mr-4 file:border-0 file:bg-[#e8f8ed] file:px-4 file:py-3 file:font-semibold file:text-[#168c44]" /><span className="mt-1 block text-xs font-normal text-[#71829a]">Maksimum 10 MB; tipe file mengikuti validasi backend.</span></label>{message && <p role="alert" className="text-sm text-red-600">{message}</p>}<DialogActions saving={saving} onClose={onClose} submitLabel="Unggah" /></form></AdminDialog>;
}

function ReviewSummary({ activity }: { activity: Activity }) {
  if (activity.status === "rejected") return <div className="max-w-xs text-xs text-red-700"><p className="font-semibold">Perlu revisi{activity.rejected_by ? ` dari ${activity.rejected_by.name}` : ""}</p><p className="mt-1 leading-5">{activity.rejection_reason ?? "Alasan tidak tersedia"}</p>{activity.rejected_at && <p className="mt-1 text-[#71829a]">{formatDateTime(activity.rejected_at)}</p>}</div>;
  if (activity.status === "approved") return <div className="text-xs text-green-700"><p className="font-semibold">Disetujui{activity.approved_by ? ` oleh ${activity.approved_by.name}` : ""}</p>{activity.approved_at && <p className="mt-1 text-[#71829a]">{formatDateTime(activity.approved_at)}</p>}</div>;
  return <span className="text-xs text-amber-700">Menunggu validasi Project Manager</span>;
}

function ActivityBadge({ status }: { status: ActivityStatus }) {
  const tone = status === "approved" ? "bg-green-100 text-green-700" : status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{statusLabels[status]}</span>;
}

function NoticeBanner({ notice, onClose }: { notice: NonNullable<Notice>; onClose: () => void }) {
  const tone = notice.tone === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800";
  return <div role="status" className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${tone}`}><span>{notice.message}</span><button type="button" aria-label="Tutup pesan" onClick={onClose}><AdminIcon name="x" className="h-4 w-4" /></button></div>;
}

function ResourceError({ projectError, taskError, onRetry }: { projectError: string; taskError: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{[projectError, taskError].filter(Boolean).join(" ")}</span><button type="button" onClick={onRetry} className="shrink-0 font-semibold underline">Coba lagi</button></div>;
}

function TabButton({ id, controls, active, onClick, children }: { id: string; controls: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button id={id} type="button" role="tab" aria-selected={active} aria-controls={controls} tabIndex={active ? 0 : -1} onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-semibold ${active ? "border-[#18a84f] text-[#168c44]" : "border-transparent text-[#71829a]"}`}>{children}</button>;
}

function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-[#172b4d]">{label}</label>{children}{error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">{error}</p>}</div>;
}

function DialogActions({ saving, onClose, submitLabel }: { saving: boolean; onClose: () => void; submitLabel: string }) {
  return <div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#dce4ec] px-4 py-2.5 text-sm font-semibold">Batal</button><button type="submit" disabled={saving} className="rounded-xl bg-[#43a956] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Memproses..." : submitLabel}</button></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold text-[#71829a]">{label}</dt><dd className="mt-1 text-[#172b4d]">{value}</dd></div>; }
function Pagination({ meta, loading, onPage }: { meta: PaginationMeta | null; loading: boolean; onPage: (page: number) => void }) { if (!meta) return null; return <footer className="flex flex-col gap-3 border-t border-[#e1e7ee] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#71829a]">Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} aktivitas</p><div className="flex gap-2"><button type="button" disabled={loading || meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Sebelumnya</button><span className="rounded-lg bg-[#43a956] px-3 py-2 text-sm font-semibold text-white">{meta.current_page} / {meta.last_page}</span><button type="button" disabled={loading || meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Berikutnya</button></div></footer>; }
function MessageRow({ text }: { text: string }) { return <tr><td colSpan={8} className="px-6 py-16 text-center text-[#71829a]">{text}</td></tr>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="px-6 py-16 text-center"><p role="alert" className="font-semibold text-red-700">Riwayat aktivitas gagal dimuat.</p><button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-[#43a956] px-4 py-2 text-sm font-semibold text-white">Coba Lagi</button></div>; }

function validateCreate(form: CreateForm): LaravelFieldErrors {
  const errors: LaravelFieldErrors = {};
  if (!form.activity_date) errors.activity_date = ["Tanggal wajib diisi."];
  if (!form.project_id) errors.project_id = ["Project wajib dipilih."];
  if (!form.project_task_id) errors.project_task_id = ["Task aktif wajib dipilih."];
  if (!form.title.trim()) errors.title = ["Judul aktivitas wajib diisi."];
  return errors;
}

async function getAllActiveTasks(): Promise<ProjectTask[]> {
  const first = await getProjectTasks({ status: "active", page: 1, perPage: 100 });
  if (first.meta.last_page <= 1) return first.data;
  const remaining = await Promise.all(Array.from({ length: first.meta.last_page - 1 }, (_, index) => getProjectTasks({ status: "active", page: index + 2, perPage: 100 })));
  return [first.data, ...remaining.map((response) => response.data)].flat();
}

function fieldDescriptionId(id: string, errors?: string[]) { return errors?.length ? `${id}-error` : undefined; }
function getErrorMessage(error: unknown, fallback: string) { if (!(error instanceof ApiError)) return "Tidak dapat terhubung ke server."; if (error.status === 403) return "Anda tidak memiliki akses atau assignment Project sudah tidak aktif."; if (error.status === 404) return "Data aktivitas tidak ditemukan."; if (error.status >= 500) return "Server sedang bermasalah. Silakan coba lagi."; return error.message || fallback; }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatDate(value: string) { const [year, month, day] = value.slice(0, 10).split("-").map(Number); return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(year, month - 1, day)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
