import { Suspense } from "react";
import EmployeeActivities from "../components/employee-activities";

export default function KaryawanActivitiesPage() {
  return (
    <Suspense
      fallback={
        <main className="p-7 text-sm text-[#5a737e]">
          Memuat Aktivitas Saya...
        </main>
      }
    >
      <EmployeeActivities />
    </Suspense>
  );
}
