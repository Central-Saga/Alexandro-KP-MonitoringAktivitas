<?php

namespace App\Repositories;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class ActivityRepository
{
    public function paginate(User $user, array $filters): LengthAwarePaginator
    {
        $query = Activity::query()->with($this->relations());

        if ($user->hasRole('karyawan')) {
            $query->where('user_id', $user->id);
        }

        if ($user->hasRole('project_manager')) {
            $query->whereHas('project', function ($projectQuery) use ($user) {
                $projectQuery->where('project_manager_id', $user->id);
            })->whereHas('project.assignments', function ($assignmentQuery) {
                $assignmentQuery->whereColumn(
                    'project_assignments.user_id',
                    'activities.user_id'
                )->where('project_assignments.status', 'aktif');
            });
        }

        if (! empty($filters['search'])) {
            $search = mb_strtolower($filters['search']);
            $query->where(function ($builder) use ($search) {
                $builder->whereRaw('LOWER(title) LIKE ?', ["%{$search}%"])
                    ->orWhereHas('user', fn ($users) => $users
                        ->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"]));
            });
        }

        foreach (['user_id', 'project_id', 'status'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('activity_date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('activity_date', '<=', $filters['date_to']);
        }

        return $query->latest('activity_date')->latest('id')
            ->paginate($filters['per_page'] ?? 10)->withQueryString();
    }

    public function findById(int $id): ?Activity
    {
        return Activity::with($this->relations())->find($id);
    }

    public function findManyForList(array $ids): Collection
    {
        if ($ids === []) {
            return new Collection;
        }

        $activities = Activity::query()
            ->with($this->relations())
            ->whereKey($ids)
            ->get()
            ->keyBy('id');

        // Urutan ID mengikuti descriptor cache agar pagination dan sorting
        // tetap identik dengan query list awal.
        return new Collection(array_values(array_filter(
            array_map(fn ($id) => $activities->get($id), $ids)
        )));
    }

    public function create(array $data): Activity
    {
        return Activity::create($data);
    }

    public function update(Activity $activity, array $data): Activity
    {
        $activity->update($data);

        return $activity->fresh($this->relations());
    }

    public function delete(Activity $activity): bool
    {
        return $activity->delete();
    }

    private function relations(): array
    {
        return ['user', 'project', 'media'];
    }
}
