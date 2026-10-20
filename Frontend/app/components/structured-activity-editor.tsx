"use client";

import { useState } from "react";

export interface StructuredDescriptionData {
  isStructured: boolean;
  results: string;
  blockers: string;
  nextSteps: string;
  raw: string;
}

export function parseStructuredDescription(text: string): StructuredDescriptionData {
  if (!text) {
    return { isStructured: false, results: "", blockers: "", nextSteps: "", raw: "" };
  }

  const hasHeaders =
    text.includes("[HASIL PEKERJAAN]") ||
    text.includes("[KENDALA") ||
    text.includes("[RENCANA");

  if (!hasHeaders) {
    return { isStructured: false, results: text, blockers: "", nextSteps: "", raw: text };
  }

  let results = "";
  let blockers = "";
  let nextSteps = "";

  const resultsMatch = text.match(/\[HASIL PEKERJAAN\]\s*([\s\S]*?)(?=(\[KENDALA|\[RENCANA|$))/i);
  if (resultsMatch) results = resultsMatch[1].trim();

  const blockersMatch = text.match(/\[KENDALA(?:\s*&\s*HAMBATAN|\s*HAMBATAN|\s*BLOCKER)?\]\s*([\s\S]*?)(?=(\[HASIL|\[RENCANA|$))/i);
  if (blockersMatch) blockers = blockersMatch[1].trim();

  const nextStepsMatch = text.match(/\[RENCANA(?:\s*SELANJUTNYA|\s*BERIKUTNYA)?\]\s*([\s\S]*?)(?=(\[HASIL|\[KENDALA|$))/i);
  if (nextStepsMatch) nextSteps = nextStepsMatch[1].trim();

  return {
    isStructured: true,
    results: results || (resultsMatch ? "" : text),
    blockers,
    nextSteps,
    raw: text,
  };
}

export function compileStructuredDescription(
  results: string,
  blockers: string,
  nextSteps: string,
): string {
  const parts: string[] = [];
  if (results.trim()) {
    parts.push(`[HASIL PEKERJAAN]\n${results.trim()}`);
  }
  if (blockers.trim()) {
    parts.push(`[KENDALA & HAMBATAN]\n${blockers.trim()}`);
  }
  if (nextSteps.trim()) {
    parts.push(`[RENCANA SELANJUTNYA]\n${nextSteps.trim()}`);
  }
  return parts.join("\n\n");
}

interface StructuredActivityEditorProps {
  idPrefix: string;
  value: string;
  onChange: (compiledValue: string) => void;
  error?: string;
  required?: boolean;
}

export function StructuredActivityEditor({
  idPrefix,
  value,
  onChange,
  error,
  required = false,
}: StructuredActivityEditorProps) {
  const initialValue = parseStructuredDescription(value);
  const [mode, setMode] = useState<"structured" | "freeform">("structured");
  const [results, setResults] = useState(initialValue.results);
  const [blockers, setBlockers] = useState(initialValue.blockers);
  const [nextSteps, setNextSteps] = useState(initialValue.nextSteps);
  const [freeformText, setFreeformText] = useState(value);

  function updateStructured(
    nextResults: string,
    nextBlockers: string,
    nextStepsValue: string,
  ) {
    setResults(nextResults);
    setBlockers(nextBlockers);
    setNextSteps(nextStepsValue);
    const compiled = compileStructuredDescription(
      nextResults,
      nextBlockers,
      nextStepsValue,
    );
    setFreeformText(compiled);
    onChange(compiled);
  }

  function handleFreeformChange(text: string) {
    setFreeformText(text);
    onChange(text);
    const parsed = parseStructuredDescription(text);
    setResults(parsed.results);
    setBlockers(parsed.blockers);
    setNextSteps(parsed.nextSteps);
  }

  function switchMode(newMode: "structured" | "freeform") {
    if (newMode === mode) return;
    if (newMode === "freeform") {
      const compiled = compileStructuredDescription(results, blockers, nextSteps);
      setFreeformText(compiled || freeformText);
      onChange(compiled || freeformText);
    } else {
      const parsed = parseStructuredDescription(freeformText);
      setResults(parsed.results);
      setBlockers(parsed.blockers);
      setNextSteps(parsed.nextSteps);
      const compiled = compileStructuredDescription(
        parsed.results,
        parsed.blockers,
        parsed.nextSteps,
      );
      onChange(compiled || freeformText);
    }
    setMode(newMode);
  }

  function appendToResults(snippet: string) {
    const next = results ? `${results.trimEnd()}\n${snippet}` : snippet;
    updateStructured(next, blockers, nextSteps);
  }

  function applyFullTemplate() {
    updateStructured(
      "- Menyelesaikan pekerjaan utama sesuai penugasan\n- Melakukan pengecekan dan validasi hasil kerja",
      "Tidak ada kendala yang menghambat pekerjaan.",
      "Melanjutkan pengerjaan tahap berikutnya sesuai rencana proyek.",
    );
  }

  return (
    <div className="space-y-3">
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e1e7ee] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#172b4d]">
            Deskripsi Laporan Kerja
          </span>
          {required && (
            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
              Wajib
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-xl bg-[#f0f4f8] p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => switchMode("structured")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                mode === "structured"
                  ? "bg-white text-[#18a84f] shadow-xs font-bold"
                  : "text-[#60738f] hover:text-[#172b4d]"
              }`}
            >
              <span>🎯</span>
              <span>Terstruktur</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("freeform")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                mode === "freeform"
                  ? "bg-white text-[#172b4d] shadow-xs font-bold"
                  : "text-[#60738f] hover:text-[#172b4d]"
              }`}
            >
              <span>📝</span>
              <span>Teks Bebas</span>
            </button>
          </div>

          <button
            type="button"
            onClick={applyFullTemplate}
            title="Gunakan template standar pelaporan aktivitas"
            className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[#dce4ec] bg-white px-2 py-1 text-[11px] font-medium text-[#52657f] transition-colors hover:border-[#18a84f] hover:text-[#18a84f]"
          >
            <span>📋</span>
            <span>Template Standar</span>
          </button>
        </div>
      </div>

      {mode === "structured" ? (
        <div className="space-y-3.5">
          {/* Section 1: Hasil Pekerjaan */}
          <div className="rounded-xl border border-[#dce4ec] bg-[#fafbfc] p-3 transition-colors focus-within:border-[#18a84f] focus-within:bg-white">
            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2">
              <label
                htmlFor={`${idPrefix}-results`}
                className="flex items-center gap-1.5 text-xs font-bold text-[#172b4d]"
              >
                <span className="text-emerald-600">🎯</span>
                <span>1. Hasil Pekerjaan (Output Utama)</span>
                <span className="text-[10px] text-rose-500 font-normal">*wajib</span>
              </label>
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => appendToResults("- ")}
                  className="rounded-md border border-[#dce4ec] bg-white px-1.5 py-0.5 font-medium text-[#52657f] hover:bg-slate-50"
                >
                  + Poin
                </button>
                <button
                  type="button"
                  onClick={() => appendToResults("- [x] Selesai: ")}
                  className="rounded-md border border-[#dce4ec] bg-white px-1.5 py-0.5 font-medium text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100"
                >
                  + Checklist Selesai
                </button>
                <button
                  type="button"
                  onClick={() =>
                    appendToResults("- Memperbaiki bug pada ")
                  }
                  className="rounded-md border border-[#dce4ec] bg-white px-1.5 py-0.5 font-medium text-[#52657f] hover:bg-slate-50"
                >
                  + Bugfix
                </button>
              </div>
            </div>
            <textarea
              id={`${idPrefix}-results`}
              rows={3}
              value={results}
              onChange={(e) =>
                updateStructured(e.target.value, blockers, nextSteps)
              }
              placeholder="Contoh:&#10;• Menyelesaikan implementasi halaman dashboard&#10;• Integrasi API monitoring aktivitas karyawan&#10;• Menguji validasi form input"
              className="w-full rounded-lg border border-[#e1e7ee] bg-white p-2.5 text-xs outline-none placeholder:text-[#91a0b3] focus:border-[#18a84f] focus:ring-1 focus:ring-[#18a84f]"
            />
          </div>

          {/* Section 2: Kendala & Hambatan */}
          <div className="rounded-xl border border-[#dce4ec] bg-[#fafbfc] p-3 transition-colors focus-within:border-[#18a84f] focus-within:bg-white">
            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2">
              <label
                htmlFor={`${idPrefix}-blockers`}
                className="flex items-center gap-1.5 text-xs font-bold text-[#172b4d]"
              >
                <span className="text-amber-500">🚧</span>
                <span>2. Kendala & Hambatan (Blocker)</span>
                <span className="text-[10px] text-[#71829a] font-normal">
                  (opsional)
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() =>
                    updateStructured(
                      results,
                      "Tidak ada kendala yang menghambat pekerjaan.",
                      nextSteps,
                    )
                  }
                  className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100"
                >
                  ✓ Tidak Ada Kendala
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateStructured(
                      results,
                      "Menunggu approval atau konfirmasi Project Manager.",
                      nextSteps,
                    )
                  }
                  className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100"
                >
                  ⚠️ Menunggu Approval
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateStructured(
                      results,
                      "Membutuhkan akses kredensial/server tambahan.",
                      nextSteps,
                    )
                  }
                  className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-200"
                >
                  🔑 Butuh Akses
                </button>
              </div>
            </div>
            <textarea
              id={`${idPrefix}-blockers`}
              rows={2}
              value={blockers}
              onChange={(e) =>
                updateStructured(results, e.target.value, nextSteps)
              }
              placeholder="Tuliskan kendala bila ada (atau klik tombol 'Tidak Ada Kendala' di atas)."
              className="w-full rounded-lg border border-[#e1e7ee] bg-white p-2.5 text-xs outline-none placeholder:text-[#91a0b3] focus:border-[#18a84f] focus:ring-1 focus:ring-[#18a84f]"
            />
          </div>

          {/* Section 3: Rencana Selanjutnya */}
          <div className="rounded-xl border border-[#dce4ec] bg-[#fafbfc] p-3 transition-colors focus-within:border-[#18a84f] focus-within:bg-white">
            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2">
              <label
                htmlFor={`${idPrefix}-next-steps`}
                className="flex items-center gap-1.5 text-xs font-bold text-[#172b4d]"
              >
                <span className="text-sky-600">⏭️</span>
                <span>3. Rencana Selanjutnya (Next Step)</span>
                <span className="text-[10px] text-[#71829a] font-normal">
                  (opsional)
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() =>
                    updateStructured(
                      results,
                      blockers,
                      "Melanjutkan sisa pengerjaan dan pengujian tugas ini.",
                    )
                  }
                  className="rounded-md bg-sky-50 px-2 py-0.5 font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 hover:bg-sky-100"
                >
                  + Lanjutkan Tugas Ini
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateStructured(
                      results,
                      blockers,
                      "Persiapan deployment dan verifikasi staging.",
                    )
                  }
                  className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-200"
                >
                  + Persiapan Deploy
                </button>
              </div>
            </div>
            <textarea
              id={`${idPrefix}-next-steps`}
              rows={2}
              value={nextSteps}
              onChange={(e) =>
                updateStructured(results, blockers, e.target.value)
              }
              placeholder="Contoh: Melanjutkan pengerjaan integrasi test dan koordinasi review kode."
              className="w-full rounded-lg border border-[#e1e7ee] bg-white p-2.5 text-xs outline-none placeholder:text-[#91a0b3] focus:border-[#18a84f] focus:ring-1 focus:ring-[#18a84f]"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-xs text-[#71829a]">Bantuan format:</span>
            <button
              type="button"
              onClick={() =>
                handleFreeformChange(
                  freeformText
                    ? `${freeformText}\n\n[HASIL PEKERJAAN]\n- `
                    : "[HASIL PEKERJAAN]\n- ",
                )
              }
              className="rounded-md border border-[#dce4ec] bg-white px-2 py-0.5 text-[#52657f] hover:bg-slate-50"
            >
              + [HASIL PEKERJAAN]
            </button>
            <button
              type="button"
              onClick={() =>
                handleFreeformChange(
                  `${freeformText}\n\n[KENDALA & HAMBATAN]\nTidak ada kendala yang menghambat pekerjaan.`,
                )
              }
              className="rounded-md border border-[#dce4ec] bg-white px-2 py-0.5 text-[#52657f] hover:bg-slate-50"
            >
              + [KENDALA]
            </button>
            <button
              type="button"
              onClick={() =>
                handleFreeformChange(
                  `${freeformText}\n\n[RENCANA SELANJUTNYA]\n- Melanjutkan tugas berikutnya`,
                )
              }
              className="rounded-md border border-[#dce4ec] bg-white px-2 py-0.5 text-[#52657f] hover:bg-slate-50"
            >
              + [RENCANA]
            </button>
          </div>
          <textarea
            id={`${idPrefix}-freeform`}
            rows={7}
            value={freeformText}
            onChange={(e) => handleFreeformChange(e.target.value)}
            placeholder="Tuliskan deskripsi aktivitas secara bebas, atau gunakan tombol bantuan format di atas."
            className="w-full rounded-xl border border-[#dce4ec] p-3 text-xs outline-none placeholder:text-[#91a0b3] focus:border-[#18a84f] focus:ring-2 focus:ring-[#18a84f]/20 font-mono text-[11.5px]"
          />
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function FormattedActivityDescription({
  description,
  compact = false,
}: {
  description: string | null | undefined;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!description) {
    return (
      <span className="text-[11px] italic text-[#91a0b3]">
        Tanpa deskripsi
      </span>
    );
  }

  const parsed = parseStructuredDescription(description);

  if (!parsed.isStructured) {
    return (
      <div className="text-xs text-[#52657f]">
        <p
          className={`whitespace-pre-line leading-relaxed ${
            compact && !expanded ? "line-clamp-2 max-w-sm" : ""
          }`}
        >
          {description}
        </p>
        {compact && description.length > 90 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 text-[10px] font-semibold text-[#18a84f] hover:underline"
          >
            {expanded ? "Sembunyikan" : "Lihat Selengkapnya"}
          </button>
        )}
      </div>
    );
  }

  if (compact) {
    const hasBlockers =
      parsed.blockers &&
      !parsed.blockers.toLowerCase().includes("tidak ada kendala");

    return (
      <div className="space-y-1 text-xs max-w-sm">
        <p className="font-medium text-[#172b4d] line-clamp-1">
          <span className="font-bold text-emerald-600">🎯 Hasil: </span>
          {parsed.results || "—"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {hasBlockers ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 max-w-[170px] truncate">
              <span>🚧 Kendala:</span>
              <span className="truncate">{parsed.blockers}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              ✓ Lancar
            </span>
          )}
          {parsed.nextSteps && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 max-w-[150px] truncate">
              <span>⏭️</span>
              <span className="truncate">{parsed.nextSteps}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-bold text-[#18a84f] hover:underline ml-1"
          >
            {expanded ? "Tutup" : "Rincian"}
          </button>
        </div>

        {expanded && (
          <div className="mt-2 space-y-2 rounded-xl border border-[#dce4ec] bg-[#fafbfc] p-3 text-[11px] shadow-xs">
            {parsed.results && (
              <div>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span>🎯</span> Hasil Pekerjaan
                </span>
                <p className="mt-0.5 whitespace-pre-line text-[#52657f] pl-4">
                  {parsed.results}
                </p>
              </div>
            )}
            {parsed.blockers && (
              <div className="border-t border-[#e1e7ee] pt-1.5">
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <span>🚧</span> Kendala & Hambatan
                </span>
                <p className="mt-0.5 whitespace-pre-line text-[#52657f] pl-4">
                  {parsed.blockers}
                </p>
              </div>
            )}
            {parsed.nextSteps && (
              <div className="border-t border-[#e1e7ee] pt-1.5">
                <span className="font-bold text-sky-700 flex items-center gap-1">
                  <span>⏭️</span> Rencana Selanjutnya
                </span>
                <p className="mt-0.5 whitespace-pre-line text-[#52657f] pl-4">
                  {parsed.nextSteps}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full detailed display
  return (
    <div className="space-y-2.5 rounded-xl border border-[#e1e7ee] bg-[#fafbfc] p-3.5 text-xs">
      {parsed.results && (
        <div>
          <span className="font-bold text-[#172b4d] flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-700">
            <span>🎯</span> Hasil Pekerjaan (Output)
          </span>
          <p className="mt-1 whitespace-pre-line text-[#52657f] leading-relaxed pl-5">
            {parsed.results}
          </p>
        </div>
      )}
      {parsed.blockers && (
        <div className="border-t border-[#e1e7ee]/80 pt-2">
          <span className="font-bold text-[#172b4d] flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-700">
            <span>🚧</span> Kendala & Hambatan
          </span>
          <p className="mt-1 whitespace-pre-line text-[#52657f] leading-relaxed pl-5">
            {parsed.blockers}
          </p>
        </div>
      )}
      {parsed.nextSteps && (
        <div className="border-t border-[#e1e7ee]/80 pt-2">
          <span className="font-bold text-[#172b4d] flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-sky-700">
            <span>⏭️</span> Rencana Selanjutnya
          </span>
          <p className="mt-1 whitespace-pre-line text-[#52657f] leading-relaxed pl-5">
            {parsed.nextSteps}
          </p>
        </div>
      )}
    </div>
  );
}
