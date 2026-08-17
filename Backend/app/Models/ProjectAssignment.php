<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'project_id',
    'user_id',
    'project_role',
    'start_date',
    'status',
])]
class ProjectAssignment extends Model
{
    /**
     * Mendefinisikan casting atribut penugasan.
     *
     * start_date otomatis dikonversi menjadi
     * instance date oleh Laravel.
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
        ];
    }

    /**
     * Relasi penugasan dengan project.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Relasi penugasan dengan user/karyawan.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}