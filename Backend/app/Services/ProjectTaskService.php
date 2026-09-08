<?php

namespace App\Services;

use App\Contracts\Repositories\ProjectTaskRepositoryInterface;
use App\Contracts\Services\ProjectTaskServiceInterface;
use App\Enums\ProjectTaskStatus;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\ProjectTask;
use App\Models\User;
use App\Support\QueryCache;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectTaskService implements ProjectTaskServiceInterface
{
    public function __construct(
        protected ProjectTaskRepositoryInterface $repository,
        protected QueryCache $cache,
    ) {}

    public function paginate(User $user, array $filters): LengthAwarePaginator
    {
        // Task belum dicache pada MVP; scope role selalu dievaluasi langsung
        // oleh query agar lifecycle dan assignment segera terlihat.
        return $this->repository->paginate($user, $filters);
    }

    public function find(int $id): ?ProjectTask
    {
        return $this->repository->find($id);
    }

    public function create(User $actor, array $data): ProjectTask
    {
        $project = Project::query()->findOrFail($data['project_id']);
        $this->ensureManagedProject($actor, $project);
        $this->ensureValidAssignee($project, (int) $data['assigned_to']);

        return $this->repository->create([
            ...$data,
            'created_by' => $actor->id,
            'status' => ProjectTaskStatus::ACTIVE,
        ]);
    }

    public function update(User $actor, ProjectTask $task, array $data): ProjectTask
    {
        $updated = DB::transaction(function () use ($actor, $task, $data) {
            $locked = $this->repository->findForUpdate($task->id);
            $this->ensureActive($locked, 'diubah');

            $project = Project::query()->findOrFail($data['project_id'] ?? $locked->project_id);
            $assignedTo = (int) ($data['assigned_to'] ?? $locked->assigned_to);
            $this->ensureManagedProject($actor, $project);
            $this->ensureValidAssignee($project, $assignedTo);

            return $this->repository->update($locked, $data);
        });

        // Title Task ikut berada pada ActivityResource, sehingga descriptor
        // Activity harus dihydrate ulang setelah detail Task berubah.
        $this->cache->invalidate(QueryCache::ACTIVITIES);

        return $updated;
    }

    public function updateStatus(User $actor, ProjectTask $task, ProjectTaskStatus $status): ProjectTask
    {
        $updated = DB::transaction(function () use ($actor, $task, $status) {
            $locked = $this->repository->findForUpdate($task->id);
            $this->ensureManagedProject($actor, $locked->project()->firstOrFail());
            $this->ensureActive($locked, 'diubah statusnya');

            // Completed/cancelled menyimpan histori dan bersifat final; API
            // tidak menyediakan reopen maupun hard delete.
            return $this->repository->update($locked, ['status' => $status]);
        });

        $this->cache->invalidate(QueryCache::ACTIVITIES);

        return $updated;
    }

    private function ensureManagedProject(User $actor, Project $project): void
    {
        if ($actor->hasRole('admin')) {
            return;
        }

        if (! $actor->hasRole('project_manager') || $project->project_manager_id !== $actor->id) {
            throw new AuthorizationException('Anda tidak mengelola project ini.');
        }
    }

    private function ensureValidAssignee(Project $project, int $assignedTo): void
    {
        $user = User::query()->with('roles')->find($assignedTo);

        if (! $user || ! $user->is_active || ! $user->hasRole('karyawan')) {
            throw ValidationException::withMessages([
                'assigned_to' => ['Penerima tugas harus merupakan Karyawan aktif.'],
            ]);
        }

        // ProjectAssignment menyatakan membership; Task baru hanya boleh
        // diberikan setelah membership aktif tersebut benar-benar ada.
        $assigned = ProjectAssignment::query()
            ->where('project_id', $project->id)
            ->where('user_id', $assignedTo)
            ->where('status', 'aktif')
            ->exists();

        if (! $assigned) {
            throw ValidationException::withMessages([
                'assigned_to' => ['Karyawan harus memiliki assignment aktif pada project ini.'],
            ]);
        }
    }

    private function ensureActive(ProjectTask $task, string $action): void
    {
        if ($task->status !== ProjectTaskStatus::ACTIVE) {
            throw ValidationException::withMessages([
                'status' => ["Task {$task->status->value} bersifat final dan tidak dapat {$action}."],
            ]);
        }
    }
}
