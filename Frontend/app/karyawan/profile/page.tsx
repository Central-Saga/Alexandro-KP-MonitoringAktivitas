import AdminProfile from "../../admin/components/admin-profile";

// Profile API bersifat current-user sehingga UI dapat dipakai ulang tanpa
// membuat kontrak profil khusus untuk role Karyawan.
export default function KaryawanProfilePage() {
  return <AdminProfile />;
}
