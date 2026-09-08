<?php

namespace App\Models;

use App\Enums\ProjectTaskStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'project_id',
    'assigned_to',
    'created_by',
    'title',
    'description',
    'due_date',
    'status',
])]
class ProjectTask extends Model
{
    use SoftDeletes;
    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'status' => ProjectTaskStatus::class,
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}
