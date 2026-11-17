<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'project_manager_id',
    'name',
    'client_name',
    'start_date',
    'end_date',
    'status',
])]
class Project extends Model
{
    use HasFactory, SoftDeletes;
    /**
     * Mendefinisikan casting atribut project.
     *
     * Tanggal project otomatis dikonversi
     * menjadi instance date oleh Laravel.
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    /**
     * Relasi project dengan Project Manager
     * yang bertanggung jawab atas project.
     */
    public function projectManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_manager_id');
    }

    /**
     * Relasi project dengan daftar penugasan
     * karyawan yang terlibat dalam project.
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(ProjectAssignment::class);
    }

    public function activeAssignments(): HasMany
    {
        return $this->assignments()->where('status', 'aktif');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class);
    }
}
