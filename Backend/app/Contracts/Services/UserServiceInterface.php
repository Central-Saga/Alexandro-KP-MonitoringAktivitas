<?php

namespace App\Contracts\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface UserServiceInterface
{
    public function paginate(User $actor, array $filters): LengthAwarePaginator;

    public function create(array $data): User;

    public function update(User $user, array $data): User;

    public function updateStatus(User $actor, User $target, bool $isActive): User;
}
