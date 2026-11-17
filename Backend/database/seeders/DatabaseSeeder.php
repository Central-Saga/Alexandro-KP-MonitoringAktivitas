<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Role harus tersedia sebelum user dihubungkan ke RBAC Spatie.
        $this->call(PermissionSeeder::class);

        // 1. Akun Admin Utama
        $admin = User::factory()->create([
            'name' => 'Admin CSM',
            'email' => 'admin@csm.com',
            'role' => 'admin',
            'password' => Hash::make('password123'),
        ]);
        $admin->syncRoles('admin');

        // 2. Akun Project Manager
        $projectManager = User::factory()->create([
            'name' => 'Project_manager',
            'email' => 'project_manager@csm.com',
            'role' => 'project_manager',
            'password' => Hash::make('password123'),
        ]);
        $projectManager->syncRoles('project_manager');

        // 3. Akun Karyawan
        $karyawan = User::factory()->create([
            'name' => 'Karyawan CSM',
            'email' => 'karyawan@csm.com',
            'role' => 'karyawan',
            'password' => Hash::make('password123'),
        ]);
        $karyawan->syncRoles('karyawan');

        // 4. Generate 10 Karyawan Dummy Tambahan via Factory
        User::factory(10)->create()->each(
            fn (User $user) => $user->syncRoles('karyawan')
        );

        // 5. Data demo (divisi, project, penugasan, task, aktivitas).
        //    Idempoten: aman dijalankan berulang kali.
        $this->call(DemoDataSeeder::class);
    }
}
