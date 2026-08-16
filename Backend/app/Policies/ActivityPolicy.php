<?php

namespace App\Policies;

use App\Models\Activity;
use App\Models\User;

class ActivityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([
            'admin',
            'project_manager',
            'karyawan',
        ]);
    }

    public function view(User $user, Activity $activity): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('karyawan')) {
            return $activity->user_id === $user->id;
        }

        if ($user->hasRole('project_manager')) {
            return $this->isManagedProjectActivity($user, $activity);
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole([
            'admin',
            'project_manager',
            'karyawan',
        ]);
    }

    public function update(User $user, Activity $activity): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('karyawan')) {
            return $activity->user_id === $user->id;
        }

        if ($user->hasRole('project_manager')) {
            return $this->isManagedProjectActivity($user, $activity);
        }

        return false;
    }

    public function uploadMedia(User $user, Activity $activity): bool
    {
        return $user->hasRole('karyawan')
            && $activity->user_id === $user->id;
    }

    public function delete(User $user, Activity $activity): bool
    {
        return $user->hasRole('admin');
    }

    public function restore(User $user, Activity $activity): bool
    {
        return $user->hasRole('admin');
    }

    public function forceDelete(User $user, Activity $activity): bool
    {
        return $user->hasRole('admin');
    }

    private function isManagedProjectActivity(
        User $user,
        Activity $activity
    ): bool {
        if (! $activity->project_id) {
            return false;
        }

        return $activity->project
            && $activity->project->project_manager_id === $user->id
            && $activity->project->assignments()
                ->where('user_id', $activity->user_id)
                ->where('status', 'aktif')
                ->exists();
    }
}