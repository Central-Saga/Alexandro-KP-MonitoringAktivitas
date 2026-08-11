<?php

namespace App\Repositories;

use App\Models\Activity;
use Illuminate\Database\Eloquent\Collection;

class ActivityRepository
{
    public function getAll(): Collection
    {
        return Activity::with('user')
            ->latest('activity_date')
            ->get();
    }

    public function findById(int $id): ?Activity
    {
        return Activity::with('user')->find($id);
    }

    public function create(array $data): Activity
    {
        return Activity::create($data);
    }

    public function update(Activity $activity, array $data): Activity
    {
        $activity->update($data);

        return $activity->fresh('user');
    }

    public function delete(Activity $activity): bool
    {
        return $activity->delete();
    }
}  
