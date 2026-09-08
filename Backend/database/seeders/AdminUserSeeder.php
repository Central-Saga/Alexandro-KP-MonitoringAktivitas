<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AdminUserSeeder extends Seeder
{
    /**
     * Membuat akun Admin pertama untuk sistem.
     */
    public function run(): void
    {
        // Membuat akun berdasarkan email.
        //
        // updateOrCreate digunakan supaya jika seeder
        // dijalankan berkali-kali, akun Admin tidak
        // dibuat menjadi duplikat.
        Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        $admin = User::updateOrCreate(
            [
                // Email yang digunakan Admin untuk login.
                'email' => 'admin@csm.com',
            ],
            [
                // Nama yang akan ditampilkan pada sistem.
                'name' => 'Administrator',

                // Password diubah menjadi hash sebelum
                // disimpan ke database.
                'password' => Hash::make('Admin123!'),

                // Menentukan bahwa akun ini memiliki
                // hak akses sebagai Admin.
                'role' => 'admin',
            ]
        );

        $admin->syncRoles('admin');
    }
}
