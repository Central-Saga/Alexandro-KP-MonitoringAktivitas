<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\User;
use App\Repositories\ActivityRepository;
use App\Support\QueryCache;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ActivityService
{
    public function __construct(
        protected ActivityRepository $repository,
        protected QueryCache $cache,
    ) {}

    public function paginate(User $user, array $filters): LengthAwarePaginator
    {
        // Actor dan seluruh role masuk key karena repository menerapkan scope
        // berbeda untuk Admin, PM, dan Karyawan.
        return $this->cache->rememberPaginator(
            QueryCache::ACTIVITIES,
            [
                'actor_id' => $user->getKey(),
                'roles' => $user->getRoleNames()->sort()->values()->all(),
                'filters' => $this->listFilters($filters),
            ],
            fn () => $this->repository->paginate($user, $filters),
            fn (array $ids) => $this->repository->findManyForList($ids),
        );
    }

    public function getById(int $id): ?Activity
    {
        return $this->repository->findById($id);
    }

    public function create(array $data): Activity
    {
        $activity = $this->repository->create($data);
        $this->cache->invalidate(QueryCache::ACTIVITIES);

        return $activity;
    }

    public function update(Activity $activity, array $data): Activity
    {
        $activity = $this->repository->update($activity, $data);
        $this->cache->invalidate(QueryCache::ACTIVITIES);

        return $activity;
    }

    public function delete(Activity $activity): bool
    {
        $deleted = $this->repository->delete($activity);

        if ($deleted) {
            $this->cache->invalidate(QueryCache::ACTIVITIES);
        }

        return $deleted;
    }

    public function invalidateListCache(): void
    {
        $this->cache->invalidate(QueryCache::ACTIVITIES);
    }

    private function listFilters(array $filters): array
    {
        return [
            'search' => $filters['search'] ?? null,
            'user_id' => $filters['user_id'] ?? null,
            'project_id' => $filters['project_id'] ?? null,
            'status' => $filters['status'] ?? null,
            'date_from' => $filters['date_from'] ?? null,
            'date_to' => $filters['date_to'] ?? null,
            'page' => $filters['page'] ?? 1,
            'per_page' => $filters['per_page'] ?? 10,
            'sort' => 'activity_date:desc,id:desc',
        ];
    }
}
