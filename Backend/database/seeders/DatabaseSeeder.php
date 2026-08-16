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
        // 1. Akun Admin Utama
        User::factory()->create([
            'name' => 'Admin CSM',
            'email' => 'admin@csm.com',
            'role' => 'admin',
            'password' => Hash::make('password123'),
        ]);

        // 2. Akun Project Manager
        User::factory()->create([
            'name' => 'Project_manager',
            'email' => 'project_manager@csm.com',
            'role' => 'project_manager',
            'password' => Hash::make('password123'),
        ]);

        // 3. Akun Karyawan
        User::factory()->create([
            'name' => 'Karyawan CSM',
            'email' => 'karyawan@csm.com',
            'role' => 'karyawan',
            'password' => Hash::make('password123'),
        ]);

        // 4. Generate 10 Karyawan Dummy Tambahan via Factory
        User::factory(10)->create();

        // Menyiapkan permission sistem dan menghubungkannya
        // dengan role Admin, Project Manager, dan Karyawan.
        $this->call(PermissionSeeder::class);
    }
}
