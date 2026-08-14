<?php

namespace App\Policies;

use App\Models\Activity;
use App\Models\User;

class ActivityPolicy
{
    /**
     * Admin dan Project Manager dapat melihat daftar activity.
     * Karyawan hanya dapat melihat activity miliknya.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            'admin',
            'project_manager',
            'karyawan',
        ]);
    }

    /**
     * Admin dan Project Manager dapat melihat semua activity.
     * Karyawan hanya dapat melihat activity miliknya.
     */
    public function view(User $user, Activity $activity): bool
    {
        if (in_array($user->role, ['admin', 'project_manager'])) {
            return true;
        }

        return $user->role === 'karyawan'
            && $activity->user_id === $user->id;
    }

    /**
     * Semua role yang sudah login dapat membuat activity.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [
            'admin',
            'project_manager',
            'karyawan',
        ]);
    }

    /**
     * Admin dan Project Manager dapat update semua activity.
     * Karyawan hanya dapat update activity miliknya.
     */
    public function update(User $user, Activity $activity): bool
    {
        if (in_array($user->role, ['admin', 'project_manager'])) {
            return true;
        }

        return $user->role === 'karyawan'
            && $activity->user_id === $user->id;
    }

    /**
     * Hanya Admin yang dapat menghapus activity.
     */
    public function delete(User $user, Activity $activity): bool
    {
        return $user->role === 'admin';
    }

    public function restore(User $user, Activity $activity): bool
    {
        return $user->role === 'admin';
    }

    public function forceDelete(User $user, Activity $activity): bool
    {
        return $user->role === 'admin';
    }
}