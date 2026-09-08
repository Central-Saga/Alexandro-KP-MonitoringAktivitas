"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoles } from "../../hooks/use-roles";
import { ApiError } from "../../lib/api-client";
import { firstFieldError, parseLaravelError } from "../../lib/validation";
import {
  deleteRole,
  getPermissions,
  getRole,
  updateRole,
  type Permission,
  type Role,
} from "../../services/role-service";
import { AdminIcon } from "./admin-icons";

// Role sistem menjadi bagian dari kontrak authorization aplikasi.
// UI mengunci nama dan menyembunyikan aksi hapus agar tidak merusak middleware RBAC.
const systemRoleNames = new Set(["admin", "project_manager", "karyawan"]);

export const permissionLabels: Record<string, string> = {
  // Aktivitas
  "activity.view": "Lihat Aktivitas",
  "activity.create": "Buat Aktivitas",
  "activity.update": "Ubah Aktivitas",
  "activity.delete": "Hapus Aktivitas",
  "activity.upload_media": "Unggah Bukti Aktivitas",
  "activity.approve": "Setujui Aktivitas",
  "activity.reject": "Minta Revisi Aktivitas",

  // Proyek
  "project.view": "Lihat Proyek",
  "project.create": "Buat Proyek",
  "project.update": "Ubah Proyek",
  "project.delete": "Hapus Proyek",

  // Penugasan Anggota (domain penugasan menggunakan aktif/nonaktif)
  "assignment.view": "Lihat Penugasan Anggota",
  "assignment.create": "Tambah Anggota Proyek",
  "assignment.update": "Ubah Status Penugasan",
  "assignment.delete": "Nonaktifkan Penugasan",

  // Tugas Proyek
  "project_task.view": "Lihat Tugas Proyek",
  "project_task.create": "Buat Tugas Proyek",
  "project_task.update": "Ubah Tugas Proyek",
  "project_task.status": "Perbarui Status Tugas",

  // Data User
  "user.view": "Lihat Data User",
  "user.create": "Tambah User",
  "user.update": "Ubah Data User",
  "user.deactivate": "Aktifkan / Nonaktifkan User",

  // Data Divisi
  "division.view": "Lihat Data Divisi",
  "division.create": "Tambah Divisi",
  "division.update": "Ubah Data Divisi",
  "division.deactivate": "Aktifkan / Nonaktifkan Divisi",

  // Manajemen Role
  "role.view": "Lihat Role & Hak Akses",
  "role.create": "Buat Role",
  "role.update": "Ubah Hak Akses Role",
  "role.delete": "Hapus Role",
};

export const permissionGroupLabels: Record<string, string> = {
  activity: "Modul Aktivitas",
  project: "Modul Proyek",
  assignment: "Modul Penugasan Anggota",
  project_task: "Modul Tugas Proyek",
  user: "Modul Data User",
  division: "Modul Data Divisi",
  role: "Modul Manajemen Role",
};

function getPermissionLabel(name: string): string {
  return permissionLabels[name] ?? name;
}

function getGroupLabel(groupKey: string): string {
  return permissionGroupLabels[groupKey] ?? groupKey;
}

type DialogState =
  | { type: "view" | "edit" | "delete"; role: Role }
  | null;

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

    // Backend tetap menjadi source of truth untuk katalog hak akses.
    void getPermissions()
      .then((permissions) => {
        if (active) setPermissionCatalog(permissions);
      })
      .catch((requestError) => {
        if (active) {
          setPermissionCatalog([]);
          setPermissionError(
            errorMessage(requestError, "Katalog hak akses gagal dimuat."),
          );
        }
      })
      .finally(() => {
        if (active) setIsPermissionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [permissionVersion]);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? roles.filter(
          (role) =>
            role.name.toLowerCase().includes(query) ||
            formatRoleName(role.name).toLowerCase().includes(query),
        )
      : roles;
  }, [roles, search]);

  const permissionCatalogReady =
    !isPermissionLoading && !permissionError && permissionCatalog.length > 0;

  function retryPermissionCatalog() {
    setIsPermissionLoading(true);
    setPermissionError("");
    setPermissionVersion((current) => current + 1);
  }

  async function openDetail(type: "view" | "edit", role: Role) {
    setDialog({ type, role });
    setDetail(null);
    setActionMessage("");
    setIsDetailLoading(true);
    try {
      const response = await getRole(role.id);
      setDetail(response.data);
    } catch (requestError) {
      setActionMessage(
        errorMessage(requestError, "Detail role gagal dimuat."),
      );
    } finally {
      setIsDetailLoading(false);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#030303]">Manajemen Role</h1>
          <p className="mt-1 text-sm text-[#5a737e]">
            {isLoading
              ? "Memuat data role..."
              : `${roles.length} role terdaftar`}
          </p>
        </div>
      </header>

      {isPermissionLoading && (
        <p
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
        >
          Memuat katalog hak akses...
        </p>
      )}
      {permissionError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{permissionError}</span>
          <button
            type="button"
            onClick={retryPermissionCatalog}
            className="self-start font-semibold underline sm:self-auto"
          >
            Coba Lagi
          </button>
        </div>
      )}
      {!isPermissionLoading &&
        !permissionError &&
        permissionCatalog.length === 0 && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              Katalog hak akses kosong. Penyesuaian hak akses role belum dapat
              digunakan.
            </span>
            <button
              type="button"
              onClick={retryPermissionCatalog}
              className="self-start font-semibold underline sm:self-auto"
            >
              Muat Ulang
            </button>
          </div>
        )}
      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#d0e6ed] p-4 sm:p-6">
          <label htmlFor="role-search" className="relative block">
            <AdminIcon
              name="search"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8399a2]"
            />
            <input
              id="role-search"
              type="search"
              value={search}
              disabled={isLoading || Boolean(error)}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama role..."
              className="h-12 w-full rounded-xl border border-[#c8dfe8] bg-white pl-12 pr-4 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:cursor-not-allowed disabled:bg-[#fcfdfe]"
            />
          </label>
        </div>

        {error ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-red-700">
              Data role gagal dimuat.
            </p>
            <button
              type="button"
              onClick={refetch}
              className="mt-4 rounded-xl bg-[#016273] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#014d5a]"
            >
              Coba Lagi
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-sm text-[#5a737e]">
            Memuat data role...
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 sm:p-6">
            {filteredRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                permissionCatalogReady={permissionCatalogReady}
                onView={() => void openDetail("view", role)}
                onEdit={() => void openDetail("edit", role)}
                onDelete={() => {
                  setActionMessage("");
                  setDialog({ type: "delete", role });
                }}
              />
            ))}
            {filteredRoles.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-[#5a737e]">
                Tidak ada role yang cocok dengan pencarian.
              </p>
            )}
          </div>
        )}
      </section>

      {dialog?.type === "view" && (
        <ViewDialog
          role={detail}
          isLoading={isDetailLoading}
          message={actionMessage}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "edit" && (
        <RoleFormDialog
          key={detail?.id ?? "loading"}
          role={detail}
          permissions={permissionCatalog}
          isLoading={isDetailLoading}
          loadMessage={actionMessage}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            setSuccessMessage(message);
            refetch();
          }}
        />
      )}
      {dialog?.type === "delete" && (
        <DeleteDialog
          role={dialog.role}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            setDialog(null);
            setSuccessMessage("Role berhasil dihapus.");
            refetch();
          }}
        />
      )}
    </main>
  );
}

function RoleCard({
  role,
  permissionCatalogReady,
  onView,
  onEdit,
  onDelete,
}: {
  role: Role;
  permissionCatalogReady: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const system = systemRoleNames.has(role.name);

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-[#d0e6ed] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-[#030303]">
            {formatRoleName(role.name)}
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#5a737e]">
            {role.permissions.length} hak akses
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            system
              ? "bg-[#EAF7FB] text-[#016273] ring-1 ring-inset ring-[#016273]/20"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
          }`}
        >
          {system ? "Sistem" : "Custom"}
        </span>
      </div>

      <div className="mt-4 flex-1">
        <PermissionBadges permissions={role.permissions.slice(0, 5)} />
        {role.permissions.length > 5 && (
          <p className="mt-2 text-xs font-medium text-[#5a737e]">
            +{role.permissions.length - 5} hak akses lainnya
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#d0e6ed] pt-4">
        <button
          type="button"
          onClick={onView}
          className="rounded-xl border border-[#d0e6ed] bg-white px-3 py-2 text-xs font-semibold text-[#5a737e] transition-colors hover:bg-[#EAF7FB] hover:text-[#016273]"
        >
          Lihat
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={!permissionCatalogReady}
          title={
            !permissionCatalogReady
              ? "Katalog hak akses belum siap"
              : undefined
          }
          className="rounded-xl border border-[#016273] bg-white px-3 py-2 text-xs font-semibold text-[#016273] transition-colors hover:bg-[#EAF7FB] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ubah Hak Akses
        </button>
        {/* Tombol Hapus hanya dirender untuk role custom (non-sistem) */}
        {!system && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
          >
            Hapus
          </button>
        )}
      </div>
    </article>
  );
}

function PermissionBadges({ permissions }: { permissions: Permission[] }) {
  if (!permissions.length) {
    return (
      <span className="text-xs text-[#8399a2]">
        Belum memiliki hak akses
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {permissions.map((permission) => (
        <span
          key={permission.id}
          className="rounded-lg bg-[#EAF7FB] px-2.5 py-1 text-xs font-medium text-[#016273] ring-1 ring-inset ring-[#016273]/20"
        >
          {getPermissionLabel(permission.name)}
        </span>
      ))}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-dialog-title"
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-[#d0e6ed] px-5 py-4">
          <h2 id="role-dialog-title" className="text-base font-bold text-[#030303]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded-lg p-2 text-[#5a737e] hover:bg-[#EAF7FB]"
          >
            <AdminIcon name="x" className="h-5 w-5" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ViewDialog({
  role,
  isLoading,
  message,
  onClose,
}: {
  role: Role | null;
  isLoading: boolean;
  message: string;
  onClose: () => void;
}) {
  const system = role ? systemRoleNames.has(role.name) : false;

  return (
    <Modal title="Detail Role & Hak Akses" onClose={onClose}>
      <div className="p-5 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-[#5a737e]">Memuat detail role...</p>
        ) : message ? (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        ) : (
          role && (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[#d0e6ed] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#030303]">
                    {formatRoleName(role.name)}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#5a737e]">
                    {role.permissions.length} hak akses aktif
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    system
                      ? "bg-[#EAF7FB] text-[#016273] ring-1 ring-inset ring-[#016273]/20"
                      : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                  }`}
                >
                  {system ? "Sistem" : "Custom"}
                </span>
              </div>

              <div className="mt-5 space-y-5">
                {groupPermissions(role.permissions).map(
                  ([group, permissions]) => (
                    <section key={group}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#5a737e]">
                        {getGroupLabel(group)}
                      </h4>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {permissions.map((permission) => (
                          <span
                            key={permission.id}
                            className="rounded-lg bg-[#EAF7FB] px-3 py-1.5 text-xs font-medium text-[#016273] ring-1 ring-inset ring-[#016273]/20"
                          >
                            {getPermissionLabel(permission.name)}
                          </span>
                        ))}
                      </div>
                    </section>
                  ),
                )}
                {role.permissions.length === 0 && (
                  <p className="text-sm text-[#5a737e]">
                    Role ini belum memiliki hak akses.
                  </p>
                )}
              </div>
            </>
          )
        )}
      </div>
    </Modal>
  );
}

function RoleFormDialog({
  role,
  permissions,
  isLoading,
  loadMessage,
  onClose,
  onSaved,
}: {
  role: Role | null;
  permissions: Permission[];
  isLoading: boolean;
  loadMessage: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.permissions.map((permission) => permission.name) ?? [],
  );
  const [nameError, setNameError] = useState("");
  const [permissionError, setPermissionError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const compatiblePermissions = permissions.filter(
    (permission) => permission.guard_name === (role?.guard_name ?? "web"),
  );
  const system = role !== null && systemRoleNames.has(role.name);

  function togglePermission(permissionName: string) {
    setSelectedPermissions((current) =>
      current.includes(permissionName)
        ? current.filter((item) => item !== permissionName)
        : [...current, permissionName],
    );
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

    if (!role) return;

    const currentPermissions =
      role.permissions.map((permission) => permission.name).sort() ?? [];
    const nextPermissions = [...selectedPermissions].sort();

    if (
      normalizedName === role.name &&
      arraysEqual(currentPermissions, nextPermissions)
    ) {
      setMessage("Tidak ada perubahan untuk disimpan.");
      return;
    }

    setSaving(true);
    try {
      const response = await updateRole(role.id, {
        name: normalizedName,
        permissions: selectedPermissions,
      });
      onSaved(response.message);
    } catch (requestError) {
      const validation = parseLaravelError(
        requestError instanceof ApiError ? requestError.data : null,
      );
      setNameError(firstFieldError(validation.errors, "name"));
      setPermissionError(firstPermissionError(validation.errors));
      setMessage(
        errorMessage(requestError, "Hak akses role gagal diperbarui."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={
        system
          ? "Ubah Hak Akses Role Sistem"
          : "Ubah Hak Akses Role Custom"
      }
      onClose={onClose}
    >
      <div className="p-5 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-[#5a737e]">Memuat detail role...</p>
        ) : loadMessage ? (
          <p role="alert" className="text-sm text-red-600">
            {loadMessage}
          </p>
        ) : (
          role && (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label
                  htmlFor="role-name-input"
                  className="text-xs font-semibold text-[#030303]"
                >
                  Nama Role
                </label>
                <input
                  id="role-name-input"
                  name="name"
                  required
                  readOnly={system}
                  value={system ? formatRoleName(name) : name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameError("");
                  }}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={
                    nameError
                      ? "role-name-error"
                      : system
                        ? "role-name-help"
                        : undefined
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#c8dfe8] px-4 text-xs text-[#030303] outline-none read-only:cursor-default read-only:bg-[#fcfdfe] read-only:text-[#5a737e] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
                />
                {system && (
                  <p
                    id="role-name-help"
                    className="mt-1.5 text-[11px] text-[#5a737e]"
                  >
                    Nama role sistem tidak dapat diubah.
                  </p>
                )}
                {nameError && (
                  <p
                    id="role-name-error"
                    className="mt-1.5 text-xs text-red-600"
                  >
                    {nameError}
                  </p>
                )}
              </div>

              <PermissionSelector
                permissions={compatiblePermissions}
                selected={selectedPermissions}
                disabled={saving}
                error={permissionError}
                onToggle={togglePermission}
              />

              {message && (
                <p role="alert" className="text-xs text-red-600">
                  {message}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-[#d0e6ed] pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#d0e6ed] px-4 py-2.5 text-xs font-semibold text-[#5a737e] hover:bg-[#EAF7FB]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#016273] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </Modal>
  );
}

function PermissionSelector({
  permissions,
  selected,
  disabled,
  error,
  onToggle,
}: {
  permissions: Permission[];
  selected: string[];
  disabled: boolean;
  error: string;
  onToggle: (name: string) => void;
}) {
  return (
    <fieldset
      disabled={disabled}
      aria-describedby={error ? "role-permissions-error" : undefined}
      className="space-y-3"
    >
      <div>
        <legend className="text-xs font-semibold text-[#030303]">
          Daftar Hak Akses
        </legend>
        <p className="mt-0.5 text-[11px] text-[#5a737e]">
          Pilih cakupan hak akses yang diberikan untuk role ini.
        </p>
      </div>

      {permissions.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Tidak ada hak akses yang tersedia.
        </p>
      ) : (
        <div className="max-h-72 space-y-3.5 overflow-y-auto pr-1">
          {groupPermissions(permissions).map(([group, groupItems]) => (
            <section
              key={group}
              className="rounded-xl border border-[#d0e6ed] bg-white p-3.5"
            >
              <h4 className="text-xs font-bold text-[#030303]">
                {getGroupLabel(group)}
              </h4>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {groupItems.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#d0e6ed] bg-[#fcfdfe] px-3 py-2 text-xs text-[#030303] transition-colors hover:bg-[#EAF7FB]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(permission.name)}
                      onChange={() => onToggle(permission.name)}
                      className="h-4 w-4 rounded text-[#016273] accent-[#016273]"
                    />
                    <span className="min-w-0 font-medium">
                      {getPermissionLabel(permission.name)}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {error && (
        <p id="role-permissions-error" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function DeleteDialog({
  role,
  onClose,
  onDeleted,
}: {
  role: Role;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    setDeleting(true);
    setMessage("");
    try {
      await deleteRole(role.id);
      onDeleted();
    } catch (requestError) {
      setMessage(
        errorMessage(requestError, "Role custom gagal dihapus."),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title="Hapus Role Custom" onClose={onClose}>
      <div className="p-5 sm:p-6">
        <p className="text-xs leading-relaxed text-[#5a737e] sm:text-sm">
          Apakah Anda yakin ingin menghapus role custom{" "}
          <strong className="text-[#030303]">
            {formatRoleName(role.name)}
          </strong>
          ? Sistem akan menolak jika role ini masih digunakan oleh pengguna
          aktif.
        </p>
        {message && (
          <p role="alert" className="mt-3 text-xs text-red-600">
            {message}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2 border-t border-[#d0e6ed] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#d0e6ed] px-4 py-2 text-xs font-semibold text-[#5a737e] hover:bg-[#EAF7FB]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={deleting}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            {deleting ? "Menghapus..." : "Hapus Role"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function groupPermissions(permissions: Permission[]) {
  const groups = new Map<string, Permission[]>();
  permissions.forEach((permission) => {
    const group = permission.name.split(".")[0] || "lainnya";
    groups.set(group, [...(groups.get(group) ?? []), permission]);
  });
  return Array.from(groups.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function arraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function firstPermissionError(errors: Record<string, string[]> | undefined) {
  if (!errors) return "";
  const direct = firstFieldError(errors, "permissions");
  if (direct) return direct;
  return (
    Object.entries(errors).find(([field]) =>
      field.startsWith("permissions."),
    )?.[1]?.[0] ?? ""
  );
}

function formatRoleName(name: string) {
  if (name === "admin") return "Administrator";
  if (name === "project_manager") return "Project Manager";
  if (name === "karyawan") return "Karyawan";
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError))
    return "Tidak dapat terhubung ke server.";
  if (error.status === 401)
    return "Sesi tidak valid. Silakan login kembali.";
  if (error.status === 403)
    return "Anda tidak memiliki izin untuk melakukan tindakan ini.";
  if (error.status === 404) return "Role tidak ditemukan.";
  if (error.status >= 500)
    return "Server sedang bermasalah. Silakan coba lagi.";
  return error.message || fallback;
}
