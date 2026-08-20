import type { ReactNode } from "react";
import RoleGuard from "../components/role-guard";
import EmployeeShell from "./components/employee-shell";

export default function KaryawanLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRole="karyawan"><EmployeeShell>{children}</EmployeeShell></RoleGuard>;
}
