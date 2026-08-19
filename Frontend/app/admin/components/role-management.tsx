"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoles } from "../../hooks/use-roles";
import { ApiError } from "../../lib/api-client";
import { firstFieldError, parseLaravelError } from "../../lib/validation";
import {
  createRole,
  deleteRole,
  getPermissions,
  getRole,
  updateRole,
  type Permission,
  type Role,
} from "../../services/role-service";
import { AdminIcon } from "./admin-icons";

// Role sistem menjadi bagian dari kontrak authorization aplikasi.
// UI tidak menawarkan rename/delete yang dapat merusak middleware RBAC.
const systemRoleNames = new Set(["admin", "project_manager", "karyawan"]);
type DialogState = { type: "create" } | { type: "view" | "edit" | "delete"; role: Role } | null;

export default function RoleManagement() {
  const { data: roles, isLoading, error, refetch } = useRoles();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [detail, setDetail] = useState<Role | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [permissionCatalog, setPermissionCatalog] = useState<Permission[]>([]);
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [permissionVersion, setPermissionVersion] = useState(0);

  useEffect(() => {
    let active = true;

    // Backend tetap menjadi source of truth. Kegagalan request tidak diganti
    // dengan daftar hardcoded karena dapat membuat assignment permission drift.
    void getPermissions()
      .then((permissions) => {
        if (active) setPermissionCatalog(permissions);
      })
      .catch((requestError) => {
        if (active) {
          setPermissionCatalog([]);
          setPermissionError(errorMessage(requestError, "Katalog permission gagal dimuat."));
        }
      })
      .finally(() => {
        if (active) setIsPermissionLoading(false);
      });

    return () => { active = false; };
  }, [permissionVersion]);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? roles.filter((role) => role.name.toLowerCase().includes(query))
      : roles;
  }, [roles, search]);

  const permissionCatalogReady = !isPermissionLoading && !permissionError && permissionCatalog.length > 0;

  function retryPermissionCatalog() {
    setIsPermissionLoading(true);
    setPermissionError("");
    setPermissionVersion((current) => current + 1);
  }

  async function openDetail(type: "view" | "edit", role: Role) {
    // Detail dimuat ulang sebelum view/edit agar form tidak memakai
    // snapshot list yang mungkin sudah berubah di server.
    setDialog({ type, role });
    setDetail(null);
    setActionMessage("");
    setIsDetailLoading(true);
    try {
      const response = await getRole(role.id);
      setDetail(response.data);
    } catch (requestError) {
      setActionMessage(errorMessage(requestError, "Detail role gagal dimuat."));
    } finally {
      setIsDetailLoading(false);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#172b4d]">Manajemen Role</h2>
          <p className="mt-1 text-sm text-[#71829a]">
            {isLoading ? "Memuat role..." : `${roles.length} role terdaftar`}
          </p>
        </div>
        <button type="button" disabled={!permissionCatalogReady} onClick={() => { setSuccessMessage(""); setDialog({ type: "create" }); }} title={!permissionCatalogReady ? "Katalog permission belum siap" : undefined} className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#18a84f] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto">
          <span className="text-xl leading-none">+</span> Tambah Role
        </button>
      </header>

      {isPermissionLoading && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Memuat katalog permission...</p>}
      {permissionError && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{permissionError}</span><button type="button" onClick={retryPermissionCatalog} className="self-start font-semibold underline sm:self-auto">Coba Lagi</button></div>}
      {!isPermissionLoading && !permissionError && permissionCatalog.length === 0 && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"><span>Katalog permission kosong. Pembuatan dan edit role belum dapat digunakan.</span><button type="button" onClick={retryPermissionCatalog} className="self-start font-semibold underline sm:self-auto">Muat Ulang</button></div>}
      {successMessage && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</p>}

      <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <div className="border-b border-[#e1e7ee] p-4 sm:p-6">
          <label htmlFor="role-search" className="relative block">
            <AdminIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b3]" />
            <input id="role-search" type="search" value={search} disabled={isLoading || Boolean(error)} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama role..." className="h-12 w-full rounded-xl border border-[#dce4ec] bg-white pl-12 pr-4 text-sm text-[#172b4d] outline-none placeholder:text-[#91a0b3] focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20 disabled:cursor-not-allowed disabled:bg-[#f8fafc]" />
          </label>
        </div>

        {error ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-red-700">Data role gagal dimuat.</p>
            <button type="button" onClick={refetch} className="mt-4 rounded-xl bg-[#18a84f] px-4 py-2 text-sm font-semibold text-white">Coba Lagi</button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-sm text-[#71829a]">Memuat data role...</div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 sm:p-6">
            {filteredRoles.map((role) => (
              <RoleCard key={role.id} role={role} permissionCatalogReady={permissionCatalogReady} onView={() => void openDetail("view", role)} onEdit={() => void openDetail("edit", role)} onDelete={() => { setActionMessage(""); setDialog({ type: "delete", role }); }} />
            ))}
            {filteredRoles.length === 0 && <p className="col-span-full py-12 text-center text-sm text-[#71829a]">Tidak ada role yang cocok dengan pencarian.</p>}
          </div>
        )}
      </section>

      {dialog?.type === "create" && <RoleFormDialog mode="create" role={null} permissions={permissionCatalog} isLoading={false} loadMessage="" onClose={() => setDialog(null)} onSaved={(message) => { setDialog(null); setSuccessMessage(message); refetch(); }} />}
      {dialog?.type === "view" && <ViewDialog role={detail} isLoading={isDetailLoading} message={actionMessage} onClose={() => setDialog(null)} />}
      {dialog?.type === "edit" && <RoleFormDialog key={detail?.id ?? "loading"} mode="edit" role={detail} permissions={permissionCatalog} isLoading={isDetailLoading} loadMessage={actionMessage} onClose={() => setDialog(null)} onSaved={(message) => { setDialog(null); setSuccessMessage(message); refetch(); }} />}
      {dialog?.type === "delete" && <DeleteDialog role={dialog.role} onClose={() => setDialog(null)} onDeleted={() => { setDialog(null); setSuccessMessage("Role berhasil dihapus."); refetch(); }} />}
    </main>
  );
}

function RoleCard({ role, permissionCatalogReady, onView, onEdit, onDelete }: { role: Role; permissionCatalogReady: boolean; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const system = systemRoleNames.has(role.name);
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-[#dce4ec] bg-[#f8fafc] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="truncate font-bold text-[#172b4d]">{formatRoleName(role.name)}</h3><p className="mt-1 text-xs text-[#71829a]">Guard: {role.guard_name}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${system ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{system ? "Sistem" : "Custom"}</span>
      </div>
      <p className="mt-5 text-sm font-semibold text-[#60738f]">{role.permissions.length} permission</p>
      <PermissionBadges permissions={role.permissions.slice(0, 5)} />
      {role.permissions.length > 5 && <p className="mt-2 text-xs text-[#71829a]">+{role.permissions.length - 5} permission lainnya</p>}
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button type="button" onClick={onView} className="rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-semibold text-[#60738f]">View</button>
        {/* Backend mengizinkan sinkronisasi permission role sistem, tetapi
            nama dan delete tetap dilindungi sebagai kontrak authorization. */}
        <button type="button" onClick={onEdit} disabled={!permissionCatalogReady} title={!permissionCatalogReady ? "Katalog permission belum siap" : undefined} className="rounded-lg border border-[#18a84f] bg-white px-3 py-2 text-xs font-semibold text-[#168c44] disabled:cursor-not-allowed disabled:opacity-50">Edit</button>
        <button type="button" onClick={onDelete} disabled={system} title={system ? "Role sistem tidak dapat dihapus" : undefined} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50">Delete</button>
      </div>
    </article>
  );
}

function PermissionBadges({ permissions }: { permissions: Permission[] }) {
  return <div className="mt-3 flex flex-wrap gap-2">{permissions.length ? permissions.map((permission) => <span key={permission.id} className="rounded-md bg-white px-2 py-1 text-xs text-[#60738f] ring-1 ring-[#dce4ec]">{permission.name}</span>) : <span className="text-xs text-[#91a0b3]">Belum memiliki permission</span>}</div>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title"><div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"><header className="flex items-center justify-between border-b border-[#e1e7ee] px-5 py-4"><h3 id="role-dialog-title" className="font-bold text-[#172b4d]">{title}</h3><button type="button" onClick={onClose} aria-label="Tutup dialog" className="rounded-lg p-2 text-[#71829a]"><AdminIcon name="x" className="h-5 w-5" /></button></header>{children}</div></div>;
}

function ViewDialog({ role, isLoading, message, onClose }: { role: Role | null; isLoading: boolean; message: string; onClose: () => void }) {
  return <Modal title="Detail Role" onClose={onClose}><div className="p-5 sm:p-6">{isLoading ? <p className="text-sm text-[#71829a]">Memuat detail...</p> : message ? <p role="alert" className="text-sm text-red-600">{message}</p> : role && <><h4 className="text-lg font-bold text-[#172b4d]">{formatRoleName(role.name)}</h4><p className="mt-1 text-sm text-[#71829a]">{role.permissions.length} permission</p><div className="mt-5 space-y-5">{groupPermissions(role.permissions).map(([group, permissions]) => <section key={group}><h5 className="text-sm font-semibold capitalize text-[#172b4d]">{group}</h5><PermissionBadges permissions={permissions} /></section>)}</div></>}</div></Modal>;
}

function RoleFormDialog({ mode, role, permissions, isLoading, loadMessage, onClose, onSaved }: { mode: "create" | "edit"; role: Role | null; permissions: Permission[]; isLoading: boolean; loadMessage: string; onClose: () => void; onSaved: (message: string) => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions.map((permission) => permission.name) ?? []);
  const [nameError, setNameError] = useState("");
  const [permissionError, setPermissionError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const compatiblePermissions = permissions.filter((permission) => permission.guard_name === (role?.guard_name ?? "web"));
  const system = mode === "edit" && role !== null && systemRoleNames.has(role.name);

  function togglePermission(permissionName: string) {
    setSelectedPermissions((current) => current.includes(permissionName)
      ? current.filter((name) => name !== permissionName)
      : [...current, permissionName]);
    setPermissionError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    setNameError("");
    setPermissionError("");
    setMessage("");

    if (!normalizedName) {
      setNameError("Nama role wajib diisi.");
      return;
    }

    if (mode === "edit" && !role) return;

    const currentPermissions = role?.permissions.map((permission) => permission.name).sort() ?? [];
    const nextPermissions = [...selectedPermissions].sort();
    if (mode === "edit" && role && normalizedName === role.name && arraysEqual(currentPermissions, nextPermissions)) {
      setMessage("Tidak ada perubahan untuk disimpan.");
      return;
    }

    setSaving(true);
    try {
      // Nama permission dikirim sesuai kontrak backend; ID hanya digunakan
      // sebagai key tampilan dan bukan sebagai sumber authorization.
      const response = mode === "create"
        ? await createRole({ name: normalizedName, permissions: selectedPermissions })
        : await updateRole(role!.id, { name: normalizedName, permissions: selectedPermissions });
      onSaved(response.message);
    } catch (requestError) {
      const validation = parseLaravelError(requestError instanceof ApiError ? requestError.data : null);
      setNameError(firstFieldError(validation.errors, "name"));
      setPermissionError(firstPermissionError(validation.errors));
      setMessage(errorMessage(requestError, mode === "create" ? "Role gagal dibuat." : "Role gagal diperbarui."));
    } finally {
      setSaving(false);
    }
  }

  return <Modal title={mode === "create" ? "Tambah Role" : system ? "Edit Permission Role Sistem" : "Edit Role Custom"} onClose={onClose}><div className="p-5 sm:p-6">{isLoading ? <p className="text-sm text-[#71829a]">Memuat detail...</p> : loadMessage ? <p role="alert" className="text-sm text-red-600">{loadMessage}</p> : (mode === "create" || role) && <form onSubmit={submit} className="space-y-5"><div><label htmlFor={`${mode}-role-name`} className="text-sm font-semibold text-[#172b4d]">Nama Role</label><input id={`${mode}-role-name`} name="name" autoFocus={!system} required readOnly={system} value={name} onChange={(event) => { setName(event.target.value); setNameError(""); }} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? `${mode}-role-name-error` : system ? `${mode}-role-name-help` : undefined} className="mt-2 h-11 w-full rounded-xl border border-[#dce4ec] px-4 outline-none read-only:cursor-not-allowed read-only:bg-[#f3f5f8] focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20" />{system && <p id={`${mode}-role-name-help`} className="mt-2 text-xs text-[#71829a]">Nama role sistem dikunci karena digunakan oleh middleware authorization.</p>}{nameError && <p id={`${mode}-role-name-error`} className="mt-2 text-sm text-red-600">{nameError}</p>}</div><PermissionSelector permissions={compatiblePermissions} selected={selectedPermissions} disabled={saving} error={permissionError} onToggle={togglePermission} />{message && <p role="alert" className="text-sm text-red-600">{message}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce4ec] px-4 py-2.5 text-sm font-semibold text-[#60738f]">Batal</button><button type="submit" disabled={saving} className="rounded-xl bg-[#18a84f] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Menyimpan..." : mode === "create" ? "Tambah Role" : "Simpan"}</button></div></form>}</div></Modal>;
}

function PermissionSelector({ permissions, selected, disabled, error, onToggle }: { permissions: Permission[]; selected: string[]; disabled: boolean; error: string; onToggle: (name: string) => void }) {
  return <fieldset disabled={disabled} aria-describedby={error ? "role-permissions-error" : undefined}><legend className="text-sm font-semibold text-[#172b4d]">Permissions</legend><p className="mt-1 text-xs text-[#71829a]">Pilih scope akses yang diperlukan role.</p>{permissions.length === 0 ? <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Tidak ada permission untuk guard role ini.</p> : <div className="mt-3 space-y-4">{groupPermissions(permissions).map(([group, groupItems]) => <section key={group} className="rounded-xl border border-[#dce4ec] p-4"><h4 className="text-sm font-semibold capitalize text-[#172b4d]">{group}</h4><div className="mt-3 grid gap-2 sm:grid-cols-2">{groupItems.map((permission) => <label key={permission.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-[#f8fafc] px-3 py-2.5 text-sm text-[#60738f]"><input type="checkbox" checked={selected.includes(permission.name)} onChange={() => onToggle(permission.name)} className="mt-0.5 h-4 w-4 accent-[#18a84f]" /><span className="min-w-0 break-all">{permission.name}</span></label>)}</div></section>)}</div>}{error && <p id="role-permissions-error" className="mt-2 text-sm text-red-600">{error}</p>}</fieldset>;
}

function DeleteDialog({ role, onClose, onDeleted }: { role: Role; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false); const [message, setMessage] = useState("");
  // Konfirmasi hanya tersedia untuk role custom. Backend tetap menjadi
  // pengaman terakhir bila role masih digunakan oleh user.
  async function remove() { setDeleting(true); setMessage(""); try { await deleteRole(role.id); onDeleted(); } catch (requestError) { setMessage(errorMessage(requestError, "Role gagal dihapus.")); } finally { setDeleting(false); } }
  return <Modal title="Hapus Role" onClose={onClose}><div className="p-5 sm:p-6"><p className="text-sm leading-6 text-[#60738f]">Hapus role custom <strong className="text-[#172b4d]">{formatRoleName(role.name)}</strong>? Backend akan menolak jika role masih digunakan user.</p>{message && <p role="alert" className="mt-3 text-sm text-red-600">{message}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce4ec] px-4 py-2.5 text-sm font-semibold text-[#60738f]">Batal</button><button type="button" onClick={() => void remove()} disabled={deleting} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{deleting ? "Menghapus..." : "Hapus"}</button></div></div></Modal>;
}

// Permission dikelompokkan berdasarkan prefix agar admin dapat memahami
// scope fitur tanpa frontend mengarang kategori atau permission baru.
function groupPermissions(permissions: Permission[]) { const groups = new Map<string, Permission[]>(); permissions.forEach((permission) => { const group = permission.name.split(".")[0] || "lainnya"; groups.set(group, [...(groups.get(group) ?? []), permission]); }); return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right)); }
function arraysEqual(left: string[], right: string[]) { return left.length === right.length && left.every((value, index) => value === right[index]); }
function firstPermissionError(errors: Record<string, string[]> | undefined) { if (!errors) return ""; const direct = firstFieldError(errors, "permissions"); if (direct) return direct; return Object.entries(errors).find(([field]) => field.startsWith("permissions."))?.[1]?.[0] ?? ""; }
function formatRoleName(name: string) { return name.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
// Pesan fallback dibedakan berdasarkan status supaya kegagalan authorization,
// data hilang, dan gangguan server tidak terlihat seperti validation error biasa.
function errorMessage(error: unknown, fallback: string) { if (!(error instanceof ApiError)) return "Tidak dapat terhubung ke server."; if (error.status === 401) return "Sesi tidak valid. Silakan login kembali."; if (error.status === 403) return "Anda tidak memiliki izin untuk melakukan tindakan ini."; if (error.status === 404) return "Role tidak ditemukan."; if (error.status >= 500) return "Server sedang bermasalah. Silakan coba lagi."; return error.message || fallback; }
