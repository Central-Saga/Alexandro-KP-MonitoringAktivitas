import packageJson from "../../../package.json";
import AdminSettings from "../components/admin-settings";

export default function AdminSettingsPage() {
  return <AdminSettings appVersion={packageJson.version} />;
}
