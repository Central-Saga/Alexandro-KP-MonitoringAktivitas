import type { ReactNode } from "react";
import RoleGuard from "../components/role-guard";
import ProjectManagerShell from "./components/project-manager-shell";

export default function ProjectManagerLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRole="project_manager"><ProjectManagerShell>{children}</ProjectManagerShell></RoleGuard>;
}
