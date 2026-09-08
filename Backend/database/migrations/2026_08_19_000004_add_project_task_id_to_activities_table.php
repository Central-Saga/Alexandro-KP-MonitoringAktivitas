<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            // Nullable menjaga seluruh Activity lama tetap valid tanpa Task.
            $table->foreignId('project_task_id')
                ->nullable()
                ->after('project_id')
                ->constrained('project_tasks')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_task_id');
        });
    }
};
