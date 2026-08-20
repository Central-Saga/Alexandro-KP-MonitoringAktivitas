<?php

namespace App\Policies;

use App\Models\Division;
use App\Models\User;

class DivisionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin') && $user->can('division.view');
    }

    public function view(User $user, Division $division): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') && $user->can('division.create');
    }

    public function update(User $user, Division $division): bool
    {
        return $user->hasRole('admin') && $user->can('division.update');
    }

    public function updateStatus(User $user, Division $division): bool
    {
        return $user->hasRole('admin') && $user->can('division.deactivate');
    }
}
