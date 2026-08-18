import PlaceholderDashboard from "../../components/placeholder-dashboard";
import RoleGuard from "../../components/role-guard";

export default function ProjectManagerDashboardPage() {
  return (
    <RoleGuard allowedRole="project_manager">
      <PlaceholderDashboard title="Dashboard Project Manager" />
    </RoleGuard>
  );
}
