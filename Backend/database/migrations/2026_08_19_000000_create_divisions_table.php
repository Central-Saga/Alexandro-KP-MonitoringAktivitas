<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('divisions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            // Lifecycle menjaga histori organisasi tanpa hard delete.
            $table->string('status')->default('active')->index();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            // nullOnDelete mempertahankan user jika data divisi dihapus lewat
            // maintenance di luar API, tanpa menyisakan foreign key invalid.
            $table->foreignId('division_id')
                ->nullable()
                ->after('id')
                ->constrained('divisions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('division_id');
        });

        Schema::dropIfExists('divisions');
    }
};
