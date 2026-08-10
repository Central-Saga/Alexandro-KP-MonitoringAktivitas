<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menambahkan kolom role ke tabel users.
     *
     * Kolom ini digunakan untuk menentukan
     * hak akses dan dashboard pengguna.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Menyimpan role pengguna.
            // Default "karyawan" digunakan agar
            // user baru otomatis memiliki role karyawan.
            $table->string('role')
                ->default('karyawan')
                ->after('password');
        });
    }

    /**
     * Membatalkan perubahan migration.
     *
     * Method ini dijalankan ketika kita melakukan
     * rollback terhadap migration ini.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Menghapus kolom role dari tabel users.
            $table->dropColumn('role');
        });
    }
};