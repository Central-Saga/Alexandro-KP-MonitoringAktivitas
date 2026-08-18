<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Lifecycle aktif/nonaktif mempertahankan histori dan relasi user,
            // sehingga administrasi akun tidak memerlukan hard delete.
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('deactivated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
            $table->dropColumn(['is_active', 'deactivated_at']);
        });
    }
};
