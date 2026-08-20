<?php

namespace App\Repositories;

use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ProjectTaskRepository
{
    public function paginate(User $user, array $filters): LengthAwarePaginator
    {
        $query = ProjectTask::query()->with($this->relations());

        if ($user->hasRole('project_manager')) {
            $query->whereHas('project', fn ($projects) => $projects
                ->where('project_manager_id', $user->id));
        }

        if ($user->hasRole('karyawan')) {
            $query->where('assigned_to', $user->id);
        }

        foreach (['project_id', 'assigned_to', 'status'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        if (! empty($filters['search'])) {
            $search = mb_strtolower($filters['search']);
            $query->where(function ($builder) use ($search) {
                $builder->whereRaw('LOWER(title) LIKE ?', ["%{$search}%"])
                    ->orWhereHas('assignee', fn ($users) => $users
                        ->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"]));
            });
        }

        return $query->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('due_date')
            ->latest('id')
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();
    }

    public function find(int $id): ?ProjectTask
    {
        return ProjectTask::query()->with($this->relations())->find($id);
    }

    public function findForUpdate(int $id): ProjectTask
    {
        return ProjectTask::query()->lockForUpdate()->findOrFail($id);
    }

    public function create(array $data): ProjectTask
    {
        return ProjectTask::query()->create($data)->load($this->relations());
    }

    public function update(ProjectTask $task, array $data): ProjectTask
    {
        $task->update($data);

        return $task->fresh($this->relations());
    }

    private function relations(): array
    {
        return ['project', 'assignee.division', 'creator'];
    }
}
