<?php

namespace App\Services;

use App\Models\Activity;
use App\Repositories\ActivityRepository;
use Illuminate\Database\Eloquent\Collection;

class ActivityService
{
    public function __construct(
        protected ActivityRepository $repository
    ) {}

    public function getAll(): Collection
    {
        return $this->repository->getAll();
    }

    public function getById(int $id): ?Activity
    {
        return $this->repository->findById($id);
    }

    public function create(array $data): Activity
    {
        return $this->repository->create($data);
    }

    public function update(Activity $activity, array $data): Activity
    {
        return $this->repository->update($activity, $data);
    }

    public function delete(Activity $activity): bool
    {
        return $this->repository->delete($activity);
    }
}
