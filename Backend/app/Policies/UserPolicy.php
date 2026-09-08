<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin') && $user->can('user.view');
    }

    public function view(User $user, User $target): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') && $user->can('user.create');
    }

    public function update(User $user, User $target): bool
    {
        return $user->hasRole('admin') && $user->can('user.update');
    }

    public function updateStatus(User $user, User $target): bool
    {
        return $user->hasRole('admin') && $user->can('user.deactivate');
    }
}
