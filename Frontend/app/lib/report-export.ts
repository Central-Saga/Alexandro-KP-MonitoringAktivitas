import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { EmployeeReportRow } from "../admin/components/employee-report-table";
import type { ProjectReportRow } from "../admin/components/project-report-table";

export type ReportType = "employees" | "projects";

export interface ReportFilterSummary {
  employeeName?: string;
  projectName?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReportKpiSummary {
  totalActivities: number;
  awaitingValidation: number;
  approved: number;
  needsRevision: number;
}

/**
 * Generate a safe, sanitized filename for report exports.
 * Format: laporan-[karyawan|proyek]-[startDate]_[endDate].[ext]
 */
export function generateReportFilename(
  type: ReportType,
  startDate?: string,
  endDate?: string,
  extension: "xlsx" | "pdf" = "xlsx",
): string {
  const typeSlug = type === "employees" ? "karyawan" : "proyek";
  let datePart = "semua-periode";

  if (startDate && endDate) {
    datePart = `${startDate}_${endDate}`;
  } else if (startDate) {
    datePart = `mulai-${startDate}`;
  } else if (endDate) {
    datePart = `sampai-${endDate}`;
  }

  const baseName = `laporan-${typeSlug}-${datePart}`;
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${sanitized}.${extension}`;
}

/**
 * Export active report data to Excel (.xlsx).
 */
export function exportReportToExcel({
  type,
  employeeRows,
  projectRows,
  startDate,
  endDate,
}: {
  type: ReportType;
  employeeRows: EmployeeReportRow[];
  projectRows: ProjectReportRow[];
  startDate?: string;
  endDate?: string;
}): void {
  const filename = generateReportFilename(type, startDate, endDate, "xlsx");
  const workbook = XLSX.utils.book_new();

  if (type === "employees") {
    const data = employeeRows.map((row) => ({
      Karyawan: row.name,
      Divisi: row.division || "—",
      "Jumlah Aktivitas": row.total,
      "Menunggu Validasi": row.awaitingValidation,
      Disetujui: row.approved,
      "Perlu Revisi": row.needsRevision,
    }));

    const worksheet = XLSX.utils.json_to_sheet(
      data.length > 0
        ? data
        : [
            {
              Karyawan: "",
              Divisi: "",
              "Jumlah Aktivitas": 0,
              "Menunggu Validasi": 0,
              Disetujui: 0,
              "Perlu Revisi": 0,
            },
          ],
    );

    // Auto calculate column widths
    worksheet["!cols"] = [
      { wch: 28 }, // Karyawan
      { wch: 22 }, // Divisi
      { wch: 18 }, // Jumlah Aktivitas
      { wch: 20 }, // Menunggu Validasi
      { wch: 16 }, // Disetujui
      { wch: 16 }, // Perlu Revisi
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Karyawan");
  } else {
    const data = projectRows.map((row) => ({
      "Nama Proyek": row.name,
      "Nama Klien": row.client_name || "—",
      "Project Manager": row.project_manager_name || "—",
      "Tanggal Mulai": row.start_date ? row.start_date.slice(0, 10) : "—",
      "Tanggal Selesai": row.end_date ? row.end_date.slice(0, 10) : "—",
      Status: formatStatus(row.status),
      "Total Aktivitas": row.activityCount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(
      data.length > 0
        ? data
        : [
            {
              "Nama Proyek": "",
              "Nama Klien": "",
              "Project Manager": "",
              "Tanggal Mulai": "",
              "Tanggal Selesai": "",
              Status: "",
              "Total Aktivitas": 0,
            },
          ],
    );

    // Auto calculate column widths
    worksheet["!cols"] = [
      { wch: 28 }, // Nama Proyek
      { wch: 24 }, // Nama Klien
      { wch: 24 }, // Project Manager
      { wch: 16 }, // Tanggal Mulai
      { wch: 16 }, // Tanggal Selesai
      { wch: 16 }, // Status
      { wch: 16 }, // Total Aktivitas
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Proyek");
  }

  XLSX.writeFile(workbook, filename);
}

/**
 * Export active report data to structured PDF (.pdf) using jsPDF & autoTable.
 */
export function exportReportToPdf({
  type,
  employeeRows,
  projectRows,
  filters,
  kpi,
  generatedAt = new Date(),
}: {
  type: ReportType;
  employeeRows: EmployeeReportRow[];
  projectRows: ProjectReportRow[];
  filters: ReportFilterSummary;
  kpi: ReportKpiSummary;
  generatedAt?: Date;
}): void {
  const filename = generateReportFilename(
    type,
    filters.startDate,
    filters.endDate,
    "pdf",
  );

  const isProject = type === "projects";
  // Landscape orientation fits project columns nicely, portrait for employee
  const orientation = isProject ? "landscape" : "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Banner / Title
  doc.setFillColor(32, 90, 53); // #205a35 WorkTrack brand green
  doc.rect(margin, 12, pageWidth - margin * 2, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("Laporan Aktivitas", margin + 6, 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(230, 245, 235);
  const reportTypeSubtitle =
    type === "employees"
      ? "Laporan Aktivitas Karyawan"
      : "Laporan Aktivitas Proyek";
  doc.text(
    `WorkTrack — ${reportTypeSubtitle}`,
    margin + 6,
    28,
  );

  // Metadata / Date info on the right
  const dateFormatted = formatDateTimeDisplay(generatedAt);
  doc.setFontSize(8.5);
  doc.setTextColor(220, 235, 225);
  doc.text(`Tanggal Cetak: ${dateFormatted}`, pageWidth - margin - 6, 25, {
    align: "right",
  });

  let currentY = 40;

  // Active Filter Summary Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(220, 228, 236); // #dce4ec
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(23, 43, 77); // #172b4d
  doc.text("Filter Aktif:", margin + 4, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(96, 115, 143); // #60738f
  const periodeText = formatDateRange(filters.startDate, filters.endDate);
  const karyawanText = filters.employeeName || "Semua Karyawan";
  const proyekText = filters.projectName || "Semua Proyek";

  if (orientation === "landscape") {
    doc.text(`Periode: ${periodeText}`, margin + 28, currentY + 6);
    doc.text(`Karyawan: ${karyawanText}`, margin + 110, currentY + 6);
    doc.text(`Proyek: ${proyekText}`, margin + 190, currentY + 6);
  } else {
    doc.text(`Periode: ${periodeText}`, margin + 28, currentY + 6);
    doc.text(
      `Karyawan: ${karyawanText}    |    Proyek: ${proyekText}`,
      margin + 4,
      currentY + 12,
    );
  }

  currentY += 21;

  // KPI Summary Boxes
  const kpiBoxWidth = (pageWidth - margin * 2 - 9) / 4;
  const kpiBoxes = [
    {
      title: "Total Aktivitas",
      val: kpi.totalActivities.toString(),
      color: [37, 99, 235], // blue-600
      bg: [239, 246, 255], // blue-50
    },
    {
      title: "Menunggu Validasi",
      val: kpi.awaitingValidation.toString(),
      color: [217, 119, 6], // amber-600
      bg: [254, 252, 232], // yellow-50
    },
    {
      title: "Disetujui",
      val: kpi.approved.toString(),
      color: [22, 163, 74], // green-600
      bg: [240, 253, 244], // green-50
    },
    {
      title: "Perlu Revisi",
      val: kpi.needsRevision.toString(),
      color: [225, 29, 72], // rose-600
      bg: [255, 241, 242], // rose-50
    },
  ];

  kpiBoxes.forEach((box, index) => {
    const boxX = margin + index * (kpiBoxWidth + 3);
    doc.setFillColor(box.bg[0], box.bg[1], box.bg[2]);
    doc.setDrawColor(220, 228, 236);
    doc.roundedRect(boxX, currentY, kpiBoxWidth, 14, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(113, 130, 154);
    doc.text(box.title, boxX + 3, currentY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(box.color[0], box.color[1], box.color[2]);
    doc.text(box.val, boxX + 3, currentY + 11);
  });

  currentY += 19;

  // Render Table via jsPDF-AutoTable
  if (type === "employees") {
    const tableHeaders = [
      "Karyawan",
      "Divisi",
      "Jumlah Aktivitas",
      "Menunggu Validasi",
      "Disetujui",
      "Perlu Revisi",
    ];

    const tableRows =
      employeeRows.length > 0
        ? employeeRows.map((r) => [
            r.name,
            r.division || "—",
            r.total.toString(),
            r.awaitingValidation.toString(),
            r.approved.toString(),
            r.needsRevision.toString(),
          ])
        : [["Tidak ada data aktivitas karyawan", "", "", "", "", ""]];

    autoTable(doc, {
      startY: currentY,
      head: [tableHeaders],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [32, 90, 53],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "left",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [23, 43, 77],
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
      },
      margin: { left: margin, right: margin, bottom: 16 },
      didDrawPage: (data) => {
        // Footer page numbering
        const pageNumber = doc.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(150, 160, 175);
        doc.text(
          `WorkTrack — Halaman ${data.pageNumber} dari ${pageNumber}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" },
        );
      },
    });
  } else {
    const tableHeaders = [
      "Nama Proyek",
      "Nama Klien",
      "Project Manager",
      "Tanggal Mulai",
      "Tanggal Selesai",
      "Status",
      "Total Aktivitas",
    ];

    const tableRows =
      projectRows.length > 0
        ? projectRows.map((r) => [
            r.name,
            r.client_name || "—",
            r.project_manager_name || "—",
            r.start_date ? r.start_date.slice(0, 10) : "—",
            r.end_date ? r.end_date.slice(0, 10) : "—",
            formatStatus(r.status),
            r.activityCount.toString(),
          ])
        : [["Tidak ada data proyek", "", "", "", "", "", ""]];

    autoTable(doc, {
      startY: currentY,
      head: [tableHeaders],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [32, 90, 53],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "left",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [23, 43, 77],
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 42 },
        2: { cellWidth: 42 },
        3: { halign: "center", cellWidth: 26 },
        4: { halign: "center", cellWidth: 26 },
        5: { halign: "center", cellWidth: 28 },
        6: { halign: "center", cellWidth: 28 },
      },
      margin: { left: margin, right: margin, bottom: 16 },
      didDrawPage: (data) => {
        const pageNumber = doc.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(150, 160, 175);
        doc.text(
          `WorkTrack — Halaman ${data.pageNumber} dari ${pageNumber}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" },
        );
      },
    });
  }

  doc.save(filename);
}

function formatStatus(status: string): string {
  if (!status) return "—";
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return "Semua Tanggal";
  if (startDate && !endDate) return `Mulai ${formatDateDisplay(startDate)}`;
  if (!startDate && endDate) return `Sampai ${formatDateDisplay(endDate)}`;
  return `${formatDateDisplay(startDate!)} – ${formatDateDisplay(endDate!)}`;
}

function formatDateDisplay(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatDateTimeDisplay(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
