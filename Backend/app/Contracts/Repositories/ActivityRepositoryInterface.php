<?php

namespace App\Contracts\Repositories;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface ActivityRepositoryInterface
{
    public function paginate(User $user, array $filters): LengthAwarePaginator;

    public function findById(int $id): ?Activity;

    public function findForUpdate(int $id): Activity;

    public function findManyForList(array $ids): Collection;

    public function create(array $data): Activity;

    public function update(Activity $activity, array $data): Activity;

    public function delete(Activity $activity): bool;
}
