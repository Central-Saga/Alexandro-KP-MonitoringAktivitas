"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { useUsers } from "../../hooks/use-users";
import { ApiError } from "../../lib/api-client";
import type { UserRole } from "../../lib/auth";
import { firstFieldError, parseLaravelError, type LaravelFieldErrors } from "../../lib/validation";
import { createUser, getUser, updateUser, updateUserStatus, type CreateUserPayload, type ManagedUser, type PaginationMeta, type UpdateUserPayload } from "../../services/user-service";
import AdminDialog from "./admin-dialog";
import { AdminIcon } from "./admin-icons";

type RoleFilter = UserRole | "";
type StatusFilter = "active" | "inactive" | "";
type DialogState = { type: "create" } | { type: "view" | "edit" | "status"; user: ManagedUser } | null;

const roleLabels: Record<UserRole, string> = { admin: "Admin", project_manager: "Project Manager", karyawan: "Karyawan" };

export default function UserManagement() {
  const { user: authenticatedUser } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  // Filter UI dikirim ke server agar hasil dan pagination mewakili seluruh
  // dataset, bukan hanya data yang kebetulan ada pada halaman saat ini.
  const usersState = useUsers({ search: search || undefined, role: role || undefined, status: status || undefined, page, perPage: 10 });
  const hasFilters = Boolean(searchInput || role || status);
  const resetFilters = () => { setSearchInput(""); setSearch(""); setRole(""); setStatus(""); setPage(1); };
  const mutationSucceeded = (message: string) => { setDialog(null); setSuccessMessage(message); usersState.refetch(); };

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-2xl font-bold text-[#172b4d]">Data User</h2><p className="mt-1 text-sm text-[#71829a]">{usersState.meta ? `${usersState.meta.total} total pengguna` : usersState.isLoading ? "Memuat pengguna..." : "Jumlah pengguna tidak tersedia"}</p></div>
        <button type="button" onClick={() => { setSuccessMessage(""); setDialog({ type: "create" }); }} className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#43a956] px-5 text-sm font-semibold text-white sm:self-auto"><span className="text-xl leading-none">+</span> Tambah User</button>
      </header>
      {successMessage && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</p>}

      <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <div className="space-y-5 border-b border-[#e1e7ee] p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="user-search" className="relative min-w-0 flex-1"><AdminIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b3]" /><input id="user-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari nama atau email..." className="h-12 w-full rounded-xl border border-[#dce4ec] bg-white pl-12 pr-4 text-sm text-[#172b4d] outline-none placeholder:text-[#91a0b3] focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/20" /></label>
            <button type="button" disabled={!hasFilters} onClick={resetFilters} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dce4ec] bg-white px-5 text-sm font-semibold text-[#60738f] disabled:cursor-not-allowed disabled:opacity-50"><AdminIcon name="filter" className="h-5 w-5" /> {hasFilters ? "Reset Filter" : "Filter"}</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter cepat user">
            <FilterButton active={!searchInput && !role && !status} onClick={resetFilters}>Semua</FilterButton>
            <FilterButton active={role === "admin"} onClick={() => { setRole("admin"); setPage(1); }}>Admin</FilterButton>
            <FilterButton active={role === "project_manager"} onClick={() => { setRole("project_manager"); setPage(1); }}>Project Manager</FilterButton>
            <FilterButton active={role === "karyawan"} onClick={() => { setRole("karyawan"); setPage(1); }}>Karyawan</FilterButton>
            <FilterButton active={status === "active"} onClick={() => { setStatus("active"); setPage(1); }}>Aktif</FilterButton>
            <FilterButton active={status === "inactive"} onClick={() => { setStatus("inactive"); setPage(1); }}>Nonaktif</FilterButton>
          </div>
        </div>

        {usersState.error ? <ErrorState onRetry={usersState.refetch} /> : <UserTable users={usersState.data} isLoading={usersState.isLoading} startNumber={usersState.meta?.from ?? 1} currentUserId={authenticatedUser?.id} onView={(user) => setDialog({ type: "view", user })} onEdit={(user) => setDialog({ type: "edit", user })} onStatus={(user) => setDialog({ type: "status", user })} />}
        <Pagination meta={usersState.meta} disabled={usersState.isLoading} onPage={setPage} />
      </section>

      {dialog?.type === "create" && <UserFormDialog mode="create" onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
      {dialog?.type === "view" && <UserDetailDialog userId={dialog.user.id} onClose={() => setDialog(null)} />}
      {dialog?.type === "edit" && <UserFormDialog key={dialog.user.id} mode="edit" userId={dialog.user.id} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
      {dialog?.type === "status" && <StatusDialog user={dialog.user} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
    </main>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} aria-pressed={active} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-[#e5f7e9] text-[#2f9e44]" : "bg-[#f3f5f8] text-[#71829a]"}`}>{children}</button>; }

function UserTable({ users, isLoading, startNumber, currentUserId, onView, onEdit, onStatus }: { users: ManagedUser[]; isLoading: boolean; startNumber: number; currentUserId?: number; onView: (user: ManagedUser) => void; onEdit: (user: ManagedUser) => void; onStatus: (user: ManagedUser) => void }) {
  return <div className="max-w-full overflow-x-auto px-4 pt-4 sm:px-6 sm:pt-6"><table className="w-full min-w-[920px] border-collapse text-left text-sm"><thead className="bg-[#f1f4f8] text-[#60738f]"><tr><th className="w-14 px-4 py-3 font-semibold">#</th><th className="px-4 py-3 font-semibold">Nama</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Role</th><th className="px-4 py-3 font-semibold">Divisi</th><th className="px-4 py-3 font-semibold">Status</th><th className="w-40 px-4 py-3 text-center font-semibold">Aksi</th></tr></thead><tbody>
    {isLoading ? <TableMessage message="Memuat data user..." /> : users.length === 0 ? <TableMessage message="Tidak ada user yang cocok dengan pencarian atau filter." /> : users.map((user, index) => { const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); /* ID sesi berasal dari AuthProvider, bukan ID Admin hardcoded. Backend tetap menjadi pengaman final. */ const isSelf = user.id === currentUserId; return <tr key={user.id} className="border-b border-[#e1e7ee] last:border-0"><td className="px-4 py-4 text-[#71829a]">{startNumber + index}</td><td className="px-4 py-4"><span className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#43a956] text-xs font-bold text-white">{initials || "U"}</span><span className="font-medium text-[#172b4d]">{user.name}</span></span></td><td className="px-4 py-4 text-[#60738f]">{user.email}</td><td className="px-4 py-4"><RoleBadge role={user.role} /></td><td className="px-4 py-4 text-[#71829a]">—</td><td className="px-4 py-4"><StatusBadge active={user.is_active} /></td><td className="px-4 py-4"><div className="flex justify-center gap-2"><ActionButton label="Lihat" icon="eye" onClick={() => onView(user)} /><ActionButton label="Edit" icon="edit" onClick={() => onEdit(user)} /><ActionButton label={user.is_active ? "Nonaktifkan" : "Aktifkan"} icon="power" disabled={isSelf && user.is_active} title={isSelf && user.is_active ? "Admin tidak dapat menonaktifkan dirinya sendiri" : undefined} danger={user.is_active} onClick={() => onStatus(user)} /></div></td></tr>; })}
  </tbody></table></div>;
}

function TableMessage({ message }: { message: string }) { return <tr><td colSpan={7} className="px-6 py-16 text-center text-[#71829a]">{message}</td></tr>; }
function RoleBadge({ role }: { role: UserRole }) { const tones: Record<UserRole, string> = { admin: "bg-purple-100 text-purple-700", project_manager: "bg-blue-100 text-blue-700", karyawan: "bg-green-100 text-green-700" }; return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[role]}`}>{roleLabels[role]}</span>; }
function StatusBadge({ active }: { active: boolean }) { return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{active ? "Aktif" : "Nonaktif"}</span>; }
function ActionButton({ label, icon, onClick, disabled = false, title, danger = false }: { label: string; icon: "eye" | "edit" | "power"; onClick: () => void; disabled?: boolean; title?: string; danger?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} title={title ?? label} aria-label={label} className={`rounded-lg border p-2 disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "border-red-200 text-red-600" : "border-[#dce4ec] text-[#60738f]"}`}><AdminIcon name={icon} className="h-4 w-4" /></button>; }

// Tombol halaman menggunakan metadata Laravel; frontend tidak menghitung
// pagination sendiri dari potongan data yang diterima.
function Pagination({ meta, disabled, onPage }: { meta: PaginationMeta | null; disabled: boolean; onPage: (page: number) => void }) { if (!meta) return <footer className="border-t border-[#e1e7ee] px-6 py-4 text-sm text-[#71829a]">Pagination tidak tersedia.</footer>; return <footer className="flex flex-col gap-3 border-t border-[#e1e7ee] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-sm text-[#71829a]">Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} data</p><div className="flex items-center gap-2" aria-label="Pagination"><button type="button" disabled={disabled || meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} className="h-9 rounded-lg border border-[#dce4ec] px-3 text-sm disabled:opacity-40">Sebelumnya</button><span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#43a956] px-3 text-sm font-semibold text-white">{meta.current_page} / {meta.last_page}</span><button type="button" disabled={disabled || meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} className="h-9 rounded-lg border border-[#dce4ec] px-3 text-sm disabled:opacity-40">Berikutnya</button></div></footer>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="px-6 py-16 text-center"><p className="font-semibold text-red-700">Data user gagal dimuat.</p><button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-[#43a956] px-4 py-2 text-sm font-semibold text-white">Coba Lagi</button></div>; }

function UserDetailDialog({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [user, setUser] = useState<ManagedUser | null>(null); const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  useEffect(() => { let active = true; void getUser(userId).then((response) => { if (active) setUser(response.data); }).catch((error) => { if (active) setMessage(getErrorMessage(error, "Detail user gagal dimuat.")); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [userId]);
  return <AdminDialog title="Detail User" onClose={onClose}><div className="p-5 sm:p-6">{loading ? <p className="text-sm text-[#71829a]">Memuat detail user...</p> : message ? <p role="alert" className="text-sm text-red-600">{message}</p> : user && <dl className="grid gap-5 sm:grid-cols-2"><Detail label="Nama" value={user.name} /><Detail label="Email" value={user.email} /><Detail label="Role" value={roleLabels[user.role]} /><Detail label="Status" value={user.is_active ? "Aktif" : "Nonaktif"} /><Detail label="Divisi" value="—" /><Detail label="Dibuat" value={formatDate(user.created_at)} />{user.deactivated_at && <Detail label="Dinonaktifkan" value={formatDate(user.deactivated_at)} />}</dl>}</div></AdminDialog>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-[#71829a]">{label}</dt><dd className="mt-1 font-medium text-[#172b4d]">{value}</dd></div>; }

function UserFormDialog({ mode, userId, onClose, onSuccess }: { mode: "create" | "edit"; userId?: number; onClose: () => void; onSuccess: (message: string) => void }) {
  const [form, setForm] = useState<CreateUserPayload>({ name: "", email: "", password: "", password_confirmation: "", role: "karyawan" });
  const [loading, setLoading] = useState(mode === "edit"); const [saving, setSaving] = useState(false); const [errors, setErrors] = useState<LaravelFieldErrors>({}); const [message, setMessage] = useState("");
  useEffect(() => { if (mode !== "edit" || !userId) return; let active = true; void getUser(userId).then((response) => { if (active) setForm((current) => ({ ...current, name: response.data.name, email: response.data.email, role: response.data.role })); }).catch((error) => { if (active) setMessage(getErrorMessage(error, "User gagal dimuat.")); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [mode, userId]);
  const change = (field: keyof CreateUserPayload, value: string) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: [] })); };
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setErrors({}); setMessage(""); const clientErrors = validateUserForm(form, mode); if (Object.keys(clientErrors).length) { setErrors(clientErrors); return; } setSaving(true); try { const response = mode === "create" ? await createUser({ ...form, name: form.name.trim(), email: form.email.trim() }) : await updateUser(userId!, { name: form.name.trim(), email: form.email.trim(), role: form.role } satisfies UpdateUserPayload); /* Refetch menjaga tabel dan metadata kembali sinkron dengan backend. */ onSuccess(response.message); } catch (error) { /* Laravel 422 dipetakan ke field agar koreksi tidak bergantung pada pesan umum. */ const validation = parseLaravelError(error instanceof ApiError ? error.data : null); setErrors(validation.errors ?? {}); setMessage(getErrorMessage(error, "User gagal disimpan.")); } finally { setSaving(false); } }
  if (loading) return <AdminDialog title="Edit User" onClose={onClose}><div className="p-6 text-sm text-[#71829a]">Memuat user...</div></AdminDialog>;
  if (mode === "edit" && message && !form.email) return <AdminDialog title="Edit User" onClose={onClose}><p role="alert" className="p-6 text-sm text-red-600">{message}</p></AdminDialog>;
  const roleError = firstFieldError(errors, "role");
  return <AdminDialog title={mode === "create" ? "Tambah User" : "Edit User"} onClose={onClose}><form onSubmit={submit} className="space-y-4 p-5 sm:p-6"><FormField id="user-name" label="Nama" value={form.name} error={firstFieldError(errors, "name")} onChange={(value) => change("name", value)} /><FormField id="user-email" label="Email" type="email" value={form.email} error={firstFieldError(errors, "email")} onChange={(value) => change("email", value)} />{mode === "create" && <><FormField id="user-password" label="Password" type="password" value={form.password} error={firstFieldError(errors, "password")} onChange={(value) => change("password", value)} /><FormField id="user-password-confirmation" label="Konfirmasi Password" type="password" value={form.password_confirmation} error={firstFieldError(errors, "password_confirmation")} onChange={(value) => change("password_confirmation", value)} /></>}<label htmlFor="user-role" className="block text-sm font-semibold text-[#172b4d]">Role<select id="user-role" name="role" required value={form.role} aria-invalid={Boolean(roleError)} aria-describedby={roleError ? "user-role-error" : undefined} onChange={(event) => change("role", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-4 font-normal outline-none focus:border-[#43a956]"><option value="admin">Admin</option><option value="project_manager">Project Manager</option><option value="karyawan">Karyawan</option></select>{roleError && <span id="user-role-error" className="mt-1 block text-xs font-normal text-red-600">{roleError}</span>}</label>{message && <p role="alert" className="text-sm text-red-600">{message}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce4ec] px-4 py-2.5 text-sm font-semibold text-[#60738f]">Batal</button><button type="submit" disabled={saving} className="rounded-xl bg-[#43a956] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan"}</button></div></form></AdminDialog>;
}

function FormField({ id, label, value, onChange, error, type = "text" }: { id: string; label: string; value: string; onChange: (value: string) => void; error: string; type?: string }) { return <label htmlFor={id} className="block text-sm font-semibold text-[#172b4d]">{label}<input id={id} name={id.replace("user-", "")} type={type} required value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="mt-2 h-11 w-full rounded-xl border border-[#dce4ec] px-4 font-normal outline-none focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/20" />{error && <span id={`${id}-error`} className="mt-1 block text-xs font-normal text-red-600">{error}</span>}</label>; }

// User diaktifkan/nonaktifkan alih-alih dihapus agar histori dan relasi bisnis
// tetap utuh; backend juga mencabut token saat proses deactivation.
function StatusDialog({ user, onClose, onSuccess }: { user: ManagedUser; onClose: () => void; onSuccess: (message: string) => void }) { const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const nextActive = !user.is_active; async function submit() { setSaving(true); setMessage(""); try { const response = await updateUserStatus(user.id, nextActive); onSuccess(response.message); } catch (error) { setMessage(getErrorMessage(error, "Status user gagal diperbarui.")); } finally { setSaving(false); } } return <AdminDialog title={nextActive ? "Aktifkan User" : "Nonaktifkan User"} onClose={onClose}><div className="p-5 sm:p-6"><p className="text-sm leading-6 text-[#60738f]">{nextActive ? "Aktifkan kembali" : "Nonaktifkan"} akun <strong className="text-[#172b4d]">{user.name}</strong>?</p>{!nextActive && <p className="mt-2 text-xs text-[#71829a]">Akses token user akan dicabut backend. Data dan histori dipertahankan karena sistem menggunakan lifecycle, bukan hard delete.</p>}{message && <p role="alert" className="mt-3 text-sm text-red-600">{message}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce4ec] px-4 py-2.5 text-sm font-semibold text-[#60738f]">Batal</button><button type="button" onClick={() => void submit()} disabled={saving} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${nextActive ? "bg-[#43a956]" : "bg-red-600"}`}>{saving ? "Memproses..." : nextActive ? "Aktifkan" : "Nonaktifkan"}</button></div></div></AdminDialog>; }

function validateUserForm(form: CreateUserPayload, mode: "create" | "edit"): LaravelFieldErrors { const errors: LaravelFieldErrors = {}; if (!form.name.trim()) errors.name = ["Nama wajib diisi."]; if (!form.email.trim()) errors.email = ["Email wajib diisi."]; else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = ["Format email tidak valid."]; if (mode === "create") { if (form.password.length < 8) errors.password = ["Password minimal 8 karakter."]; if (form.password_confirmation !== form.password) errors.password_confirmation = ["Konfirmasi password tidak cocok."]; } return errors; }
function getErrorMessage(error: unknown, fallback: string) { if (!(error instanceof ApiError)) return "Tidak dapat terhubung ke server."; if (error.status === 403) return "Anda tidak memiliki izin untuk melakukan tindakan ini."; if (error.status === 404) return "User tidak ditemukan."; if (error.status >= 500) return "Server sedang bermasalah. Silakan coba lagi."; return error.message || fallback; }
function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
