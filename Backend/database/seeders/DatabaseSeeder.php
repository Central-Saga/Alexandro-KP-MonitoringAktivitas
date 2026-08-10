<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Menjalankan seluruh seeder aplikasi.
     */
    public function run(): void
    {
        // Menjalankan AdminUserSeeder untuk membuat
        // akun Admin pertama.
        $this->call([
            AdminUserSeeder::class,
        ]);
    }
}