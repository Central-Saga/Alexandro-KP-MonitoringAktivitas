<?php

namespace App\Contracts\Services;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ActivityServiceInterface
{
    public function paginate(User $user, array $filters): LengthAwarePaginator;

    public function todaySummary(User $user, string $date): array;

    public function getById(int $id): ?Activity;

    public function create(array $data): Activity;

    public function update(Activity $activity, array $data, ?User $actor = null): Activity;

    public function delete(Activity $activity): bool;

    public function approve(Activity $activity, User $actor): Activity;

    public function reject(Activity $activity, User $actor, string $reason): Activity;

    public function invalidateListCache(): void;
}
