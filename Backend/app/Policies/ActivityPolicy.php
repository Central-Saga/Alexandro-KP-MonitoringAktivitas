<?php

namespace App\Policies;

use App\Models\Activity;
use App\Models\User;

class ActivityPolicy
{
    // Lihat daftar activity
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            'admin',
            'project_manager',
            'karyawan',
        ]);
    }

    // Lihat detail activity
    public function view(User $user, Activity $activity): bool
    {
        if (in_array($user->role, ['admin', 'project_manager'])) {
            return true;
        }

        return $user->role === 'karyawan'
            && $activity->user_id === $user->id;
    }

    // Buat activity
    public function create(User $user): bool
    {
        return in_array($user->role, [
            'admin',
            'project_manager',
            'karyawan',
        ]);
    }

    // Update activity
    public function update(User $user, Activity $activity): bool
    {
        if (in_array($user->role, ['admin', 'project_manager'])) {
            return true;
        }

        return $user->role === 'karyawan'
            && $activity->user_id === $user->id;
    }

    // Upload media activity
    public function uploadMedia(User $user, Activity $activity): bool
    {
        return $user->role === 'karyawan'
            && $activity->user_id === $user->id;
    }

    // Hapus activity
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