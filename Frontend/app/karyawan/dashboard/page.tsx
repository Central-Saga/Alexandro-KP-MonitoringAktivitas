import PlaceholderDashboard from "../../components/placeholder-dashboard";
import RoleGuard from "../../components/role-guard";

export default function KaryawanDashboardPage() {
  return (
    <RoleGuard allowedRole="karyawan">
      <PlaceholderDashboard title="Dashboard Karyawan" />
    </RoleGuard>
  );
}
