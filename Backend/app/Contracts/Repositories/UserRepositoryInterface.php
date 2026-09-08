<?php

namespace App\Contracts\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface UserRepositoryInterface
{
    public function paginate(array $filters): LengthAwarePaginator;

    public function create(array $data): User;

    public function findManyForList(array $ids): Collection;

    public function findForUpdate(int $id): User;

    public function countActiveAdminsForUpdate(): int;

    public function updateStatus(User $user, bool $isActive): User;

    public function update(User $user, array $data): User;
}
