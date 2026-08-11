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

        // 2. Akun Supervisor
        User::factory()->create([
            'name' => 'Supervisor CSM',
            'email' => 'supervisor@csm.com',
            'role' => 'supervisor',
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
    }
}
