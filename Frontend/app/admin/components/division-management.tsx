"use client";

import { useEffect, useState } from "react";
import { useDivisions } from "../../hooks/use-divisions";
import { ApiError } from "../../lib/api-client";
import { firstFieldError, parseLaravelError, type LaravelFieldErrors } from "../../lib/validation";
import { createDivision, getDivision, getDivisionOptions, updateDivision, updateDivisionStatus, type Division, type DivisionOption, type DivisionPayload, type DivisionStatus } from "../../services/division-service";
import { getUsers, type ManagedUser, type PaginationMeta } from "../../services/user-service";
import AdminDialog from "./admin-dialog";
import { AdminIcon } from "./admin-icons";

type DialogState = { type: "create" } | { type: "view" | "edit" | "status"; division: Division } | null;

export default function DivisionManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DivisionStatus | "">("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  // Filter dikirim ke backend agar pagination mewakili seluruh dataset,
  // bukan hanya card pada halaman yang sedang terlihat.
  const divisionsState = useDivisions({ search: search || undefined, status: status || undefined, page, perPage: 9 });
  const hasFilters = Boolean(searchInput || status);
  const resetFilters = () => { setSearchInput(""); setSearch(""); setStatus(""); setPage(1); };
  const mutationSucceeded = (message: string) => {
    setDialog(null); setSuccessMessage(message);
    // Refetch menyinkronkan card dan metadata setelah mutation berhasil.
    divisionsState.refetch();
  };

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#030303]">Data Divisi</h2>
          <p className="mt-1 text-sm text-[#5a737e]">
            {divisionsState.meta ? `${divisionsState.meta.total} total divisi` : divisionsState.isLoading ? "Memuat divisi..." : "Jumlah divisi tidak tersedia"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setSuccessMessage(""); setDialog({ type: "create" }); }}
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#016273] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] sm:self-auto"
        >
          <span className="text-xl leading-none">+</span> Tambah Divisi
        </button>
      </header>
      {successMessage && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="division-search" className="relative min-w-0 flex-1">
            <AdminIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8399a2]" />
            <input
              id="division-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari nama divisi..."
              className="h-12 w-full rounded-xl border border-[#c8dfe8] bg-white pl-12 pr-4 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            />
          </label>
          <button
            type="button"
            disabled={!hasFilters}
            onClick={resetFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d0e6ed] bg-white px-5 text-sm font-semibold text-[#5a737e] transition-colors hover:bg-[#EAF7FB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AdminIcon name="filter" className="h-5 w-5" />
            {hasFilters ? "Reset Filter" : "Filter"}
          </button>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filter status divisi">
          <FilterButton active={!status} onClick={() => { setStatus(""); setPage(1); }}>Semua</FilterButton>
          <FilterButton active={status === "active"} onClick={() => { setStatus("active"); setPage(1); }}>Aktif</FilterButton>
          <FilterButton active={status === "inactive"} onClick={() => { setStatus("inactive"); setPage(1); }}>Nonaktif</FilterButton>
        </div>

        {divisionsState.error ? (
          <ErrorState onRetry={divisionsState.refetch} />
        ) : divisionsState.isLoading ? (
          <EmptyState title="Memuat data divisi..." description="Mohon tunggu sementara data terbaru diambil dari server." />
        ) : divisionsState.data.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Divisi tidak ditemukan" : "Belum ada data divisi"}
            description={hasFilters ? "Ubah pencarian atau reset filter untuk melihat data lain." : "Gunakan tombol Tambah Divisi untuk membuat data pertama."}
          />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {divisionsState.data.map((division) => (
              <DivisionCard
                key={division.id}
                division={division}
                onView={() => setDialog({ type: "view", division })}
                onEdit={() => setDialog({ type: "edit", division })}
                onStatus={() => setDialog({ type: "status", division })}
              />
            ))}
          </div>
        )}
        <Pagination meta={divisionsState.meta} disabled={divisionsState.isLoading} onPage={setPage} />
      </section>

      {dialog?.type === "create" && <DivisionFormDialog mode="create" onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
      {dialog?.type === "view" && <DivisionDetailDialog divisionId={dialog.division.id} onClose={() => setDialog(null)} />}
      {dialog?.type === "edit" && <DivisionFormDialog key={dialog.division.id} mode="edit" divisionId={dialog.division.id} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
      {dialog?.type === "status" && <DivisionStatusDialog division={dialog.division} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
    </main>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-[#016273] text-white shadow-sm"
          : "bg-[#EAF7FB] text-[#016273] hover:bg-[#d5eff7]"
      }`}
    >
      {children}
    </button>
  );
}

function DivisionCard({ division, onView, onEdit, onStatus }: { division: Division; onView: () => void; onEdit: () => void; onStatus: () => void }) {
  const active = division.status === "active";
  return (
    <article className="flex min-h-64 flex-col rounded-xl border border-[#d0e6ed] bg-[#fcfdfe] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF7FB] text-[#016273]">
          <AdminIcon name="building" className="h-6 w-6" />
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20" : "bg-slate-100 text-slate-600"}`}>
          {active ? "Aktif" : "Nonaktif"}
        </span>
      </div>
      <h3 className="mt-3 font-bold text-[#030303]">{division.name}</h3>
      <p className="mt-1 min-h-10 text-sm leading-5 text-[#5a737e]">{division.description || "—"}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#d0e6ed] pt-3 text-sm">
        <div>
          <p className="text-xs text-[#5a737e]">Kepala Divisi</p>
          <p className="mt-1 truncate font-medium text-[#030303]">{division.head?.name ?? "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#5a737e]">Anggota</p>
          <p className="mt-1 font-bold text-[#016273]">{division.member_count}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <ActionButton label="Lihat" icon="eye" onClick={onView} />
        <ActionButton label="Edit" icon="edit" onClick={onEdit} />
        <ActionButton label={active ? "Nonaktifkan" : "Aktifkan"} icon="power" danger={active} onClick={onStatus} />
      </div>
    </article>
  );
}

function ActionButton({ label, icon, onClick, danger = false }: { label: string; icon: "eye" | "edit" | "power"; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-[#d0e6ed] text-[#5a737e] hover:bg-[#EAF7FB] hover:text-[#016273]"
      }`}
    >
      <AdminIcon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-5 grid min-h-80 place-items-center rounded-xl border border-dashed border-[#d0e6ed] bg-[#EAF7FB]/30 p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF7FB] text-[#016273]">
          <AdminIcon name="building" className="h-8 w-8" />
        </div>
        <h3 className="mt-5 text-lg font-bold text-[#030303]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#5a737e]">{description}</p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center">
      <p className="font-semibold text-red-700">Data divisi gagal dimuat.</p>
      <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-[#016273] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#014d5a]">
        Coba Lagi
      </button>
    </div>
  );
}

function Pagination({ meta, disabled, onPage }: { meta: PaginationMeta | null; disabled: boolean; onPage: (page: number) => void }) {
  if (!meta) return null;
  return (
    <footer className="mt-5 flex flex-col gap-3 border-t border-[#d0e6ed] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#5a737e]">Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} data</p>
      <div className="flex items-center gap-2" aria-label="Pagination divisi">
        <button
          type="button"
          disabled={disabled || meta.current_page <= 1}
          onClick={() => onPage(meta.current_page - 1)}
          className="h-9 rounded-lg border border-[#d0e6ed] px-3 text-sm text-[#030303] hover:bg-[#EAF7FB] disabled:opacity-40"
        >
          Sebelumnya
        </button>
        <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#016273] px-3 text-sm font-semibold text-white">
          {meta.current_page} / {meta.last_page}
        </span>
        <button
          type="button"
          disabled={disabled || meta.current_page >= meta.last_page}
          onClick={() => onPage(meta.current_page + 1)}
          className="h-9 rounded-lg border border-[#d0e6ed] px-3 text-sm text-[#030303] hover:bg-[#EAF7FB] disabled:opacity-40"
        >
          Berikutnya
        </button>
      </div>
    </footer>
  );
}

function DivisionDetailDialog({ divisionId, onClose }: { divisionId: number; onClose: () => void }) {
  const [division, setDivision] = useState<Division | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void getDivision(divisionId).then((response) => {
      if (active) setDivision(response.data);
    }).catch((error) => {
      if (active) setMessage(getErrorMessage(error, "Detail divisi gagal dimuat."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [divisionId]);

  return (
    <AdminDialog title="Detail Divisi" onClose={onClose}>
      <div className="p-5 sm:p-6">
        {loading ? (
          <p className="text-sm text-[#5a737e]">Memuat detail divisi...</p>
        ) : message ? (
          <p role="alert" className="text-sm text-red-600">{message}</p>
        ) : division && (
          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="Nama" value={division.name} />
            <Detail label="Status" value={division.status === "active" ? "Aktif" : "Nonaktif"} />
            <Detail label="Deskripsi" value={division.description || "—"} />
            <Detail label="Kepala Divisi" value={division.head ? `${division.head.name} (${division.head.email})` : "—"} />
            <Detail label="Jumlah Anggota" value={String(division.member_count)} />
            <Detail label="Dibuat" value={formatDate(division.created_at)} />
          </dl>
        )}
      </div>
    </AdminDialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[#5a737e]">{label}</dt>
      <dd className="mt-1 font-medium text-[#030303]">{value}</dd>
    </div>
  );
}

function DivisionFormDialog({ mode, divisionId, onClose, onSuccess }: { mode: "create" | "edit"; divisionId?: number; onClose: () => void; onSuccess: (message: string) => void }) {
  const [form, setForm] = useState<DivisionPayload>({ name: "", description: null, head_user_id: null, status: "active" });
  const [candidates, setCandidates] = useState<ManagedUser[]>([]);
  const [options, setOptions] = useState<DivisionOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getDivisionOptions().then((response) => {
      if (active) setOptions(response.data);
    }).catch(() => {
      if (active) { setOptions([]); setCatalogError("Katalog nama divisi tidak dapat dimuat."); }
    }).finally(() => {
      if (active) setCatalogLoading(false);
    });
    return () => { active = false; };
  }, [catalogVersion]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [usersResponse, divisionResponse] = await Promise.all([
          getUsers({ status: "active", page: 1, perPage: 100 }),
          mode === "edit" && divisionId ? getDivision(divisionId) : Promise.resolve(null)
        ]);
        if (!active) return;
        setCandidates(usersResponse.data);
        if (divisionResponse) {
          const division = divisionResponse.data;
          setForm({
            name: division.name,
            description: division.description,
            head_user_id: division.head?.id ?? null,
            status: division.status
          });
        }
      } catch (error) {
        if (active) setMessage(getErrorMessage(error, "Form divisi gagal dimuat."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [divisionId, mode]);

  function change<K extends keyof DivisionPayload>(field: K, value: DivisionPayload[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: [] }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    const clientErrors = validateDivisionForm(form);
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); return; }
    setSaving(true);
    try {
      const payload = { ...form, name: canonicalDivisionName(form.name, options), description: form.description?.trim() || null };
      const response = mode === "create" ? await createDivision(payload) : await updateDivision(divisionId!, payload);
      onSuccess(response.message);
    } catch (error) {
      const validation = parseLaravelError(error instanceof ApiError ? error.data : null);
      setErrors(validation.errors ?? {});
      setMessage(getErrorMessage(error, "Divisi gagal disimpan."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminDialog title={mode === "create" ? "Tambah Divisi" : "Edit Divisi"} onClose={onClose}><div className="p-6 text-sm text-[#5a737e]">Memuat form divisi...</div></AdminDialog>;
  const nameError = firstFieldError(errors, "name");
  const descriptionError = firstFieldError(errors, "description");
  const headError = firstFieldError(errors, "head_user_id");
  const statusError = firstFieldError(errors, "status");
  const selectedName = canonicalDivisionName(form.name, options);

  return (
    <AdminDialog title={mode === "create" ? "Tambah Divisi" : "Edit Divisi"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <label htmlFor="division-name" className="block text-sm font-semibold text-[#030303]">
          Nama Divisi
          <select
            id="division-name"
            name="name"
            required
            disabled={catalogLoading || Boolean(catalogError)}
            value={selectedName}
            onChange={(event) => change("name", event.target.value)}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "division-name-error" : catalogError ? "division-catalog-error" : undefined}
            className="mt-2 h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-4 font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">{catalogLoading ? "Memuat pilihan..." : "Pilih Divisi"}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {nameError && <span id="division-name-error" className="mt-1 block text-xs font-normal text-red-600">{nameError}</span>}
          {catalogError && (
            <span id="division-catalog-error" className="mt-1 block text-xs font-normal text-red-600">
              {catalogError} Frontend tidak menggunakan fallback hardcoded.{" "}
              <button type="button" onClick={() => { setCatalogLoading(true); setCatalogError(""); setCatalogVersion((value) => value + 1); }} className="font-semibold underline">
                Coba lagi
              </button>
            </span>
          )}
        </label>
        <label htmlFor="division-description" className="block text-sm font-semibold text-[#030303]">
          Deskripsi
          <textarea
            id="division-description"
            name="description"
            rows={3}
            value={form.description ?? ""}
            onChange={(event) => change("description", event.target.value)}
            aria-invalid={Boolean(descriptionError)}
            aria-describedby={descriptionError ? "division-description-error" : undefined}
            className="mt-2 w-full rounded-xl border border-[#c8dfe8] px-4 py-3 font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
          {descriptionError && <span id="division-description-error" className="mt-1 block text-xs font-normal text-red-600">{descriptionError}</span>}
        </label>
        <label htmlFor="division-head" className="block text-sm font-semibold text-[#030303]">
          Kepala Divisi
          <select
            id="division-head"
            name="head_user_id"
            value={form.head_user_id ?? ""}
            onChange={(event) => change("head_user_id", event.target.value ? Number(event.target.value) : null)}
            aria-invalid={Boolean(headError)}
            aria-describedby={headError ? "division-head-error" : "division-head-help"}
            className="mt-2 h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-4 font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          >
            <option value="">Tanpa kepala divisi</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.name} — {candidate.email}</option>
            ))}
          </select>
          <span id="division-head-help" className="mt-1 block text-xs font-normal text-[#5a737e]">Hanya user aktif dari backend yang ditampilkan.</span>
          {headError && <span id="division-head-error" className="mt-1 block text-xs font-normal text-red-600">{headError}</span>}
        </label>
        <label htmlFor="division-status" className="block text-sm font-semibold text-[#030303]">
          Status
          <select
            id="division-status"
            name="status"
            value={form.status}
            onChange={(event) => change("status", event.target.value as DivisionStatus)}
            aria-invalid={Boolean(statusError)}
            aria-describedby={statusError ? "division-status-error" : undefined}
            className="mt-2 h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-4 font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          {statusError && <span id="division-status-error" className="mt-1 block text-xs font-normal text-red-600">{statusError}</span>}
        </label>
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#d0e6ed] px-4 py-2.5 text-sm font-semibold text-[#5a737e] hover:bg-[#EAF7FB]">Batal</button>
          <button type="submit" disabled={saving || catalogLoading || Boolean(catalogError)} className="rounded-xl bg-[#016273] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] disabled:opacity-60">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function DivisionStatusDialog({ division, onClose, onSuccess }: { division: Division; onClose: () => void; onSuccess: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const nextStatus: DivisionStatus = division.status === "active" ? "inactive" : "active";
  async function submit() {
    setSaving(true);
    setMessage("");
    try {
      const response = await updateDivisionStatus(division.id, nextStatus);
      onSuccess(response.message);
    } catch (error) {
      setMessage(getErrorMessage(error, "Status divisi gagal diperbarui."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <AdminDialog title={nextStatus === "active" ? "Aktifkan Divisi" : "Nonaktifkan Divisi"} onClose={onClose}>
      <div className="p-5 sm:p-6">
        <p className="text-sm leading-6 text-[#5a737e]">
          {nextStatus === "active" ? "Aktifkan kembali" : "Nonaktifkan"} divisi <strong className="text-[#030303]">{division.name}</strong>?
        </p>
        {nextStatus === "inactive" && <p className="mt-2 text-xs leading-5 text-[#5a737e]">User, kepala divisi, dan histori tidak akan dihapus.</p>}
        {message && <p role="alert" className="mt-3 text-sm text-red-600">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#d0e6ed] px-4 py-2.5 text-sm font-semibold text-[#5a737e] hover:bg-[#EAF7FB]">Batal</button>
          <button type="button" onClick={() => void submit()} disabled={saving} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${nextStatus === "active" ? "bg-[#016273] hover:bg-[#014d5a]" : "bg-red-600 hover:bg-red-700"}`}>
            {saving ? "Memproses..." : nextStatus === "active" ? "Aktifkan" : "Nonaktifkan"}
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}

function validateDivisionForm(form: DivisionPayload): LaravelFieldErrors {
  const errors: LaravelFieldErrors = {};
  if (!form.name.trim()) errors.name = ["Nama divisi wajib diisi."];
  if (form.name.trim().length > 255) errors.name = ["Nama divisi maksimal 255 karakter."];
  return errors;
}

function canonicalDivisionName(name: string, options: DivisionOption[]) {
  return options.find((option) => option.value.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID"))?.value ?? name;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return "Tidak dapat terhubung ke server.";
  if (error.status === 403) return "Anda tidak memiliki izin untuk melakukan tindakan ini.";
  if (error.status === 404) return "Divisi tidak ditemukan.";
  if (error.status >= 500) return "Server sedang bermasalah. Silakan coba lagi.";
  return error.message || fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
