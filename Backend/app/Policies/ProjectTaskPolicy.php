<?php

namespace App\Policies;

use App\Models\ProjectTask;
use App\Models\User;

class ProjectTaskPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('project_task.view');
    }

    public function view(User $user, ProjectTask $task): bool
    {
        if (! $user->can('project_task.view')) {
            return false;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('project_manager')) {
            return $task->project?->project_manager_id === $user->id;
        }

        return $user->hasRole('karyawan') && $task->assigned_to === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->can('project_task.create')
            && $user->hasAnyRole(['admin', 'project_manager']);
    }

    public function update(User $user, ProjectTask $task): bool
    {
        return $user->can('project_task.update')
            && ($user->hasRole('admin')
                || ($user->hasRole('project_manager')
                    && $task->project?->project_manager_id === $user->id));
    }

    public function updateStatus(User $user, ProjectTask $task): bool
    {
        return $user->can('project_task.status')
            && ($user->hasRole('admin')
                || ($user->hasRole('project_manager')
                    && $task->project?->project_manager_id === $user->id));
    }
}
