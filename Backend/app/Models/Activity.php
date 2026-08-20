<?php

namespace App\Models;

use App\Enums\ActivityStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

#[Fillable([
    'user_id',
    'project_id',
    'project_task_id',
    'title',
    'description',
    'status',
    'activity_date',
    'approved_by',
    'approved_at',
    'rejected_by',
    'rejected_at',
    'rejection_reason',
])]
class Activity extends Model implements HasMedia
{
    use InteractsWithMedia, LogsActivity;

    /**
     * Mendefinisikan casting atribut model.
     *
     * activity_date dikonversi menjadi date,
     * sedangkan status dikonversi menjadi ActivityStatus.
     */
    protected function casts(): array
    {
        return [
            'activity_date' => 'date',
            'status' => ActivityStatus::class,
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    /**
     * Relasi activity dengan user yang membuat activity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relasi activity dengan project.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function projectTask(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    /**
     * Mendefinisikan collection untuk file/bukti activity.
     *
     * File disimpan menggunakan disk "public".
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('activity_files')
            ->useDisk('public');
    }

    /**
     * Mengatur konfigurasi activity log.
     *
     * Hanya perubahan atribut yang relevan dengan activity
     * yang akan dicatat oleh Spatie Activity Log.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'user_id',
                'project_id',
                'project_task_id',
                'title',
                'description',
                'status',
                'activity_date',
            ])
            ->logOnlyDirty()
            ->useLogName('activity');
    }
}
