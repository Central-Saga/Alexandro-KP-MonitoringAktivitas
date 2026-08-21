<?php

namespace App\Services;

use App\Contracts\Repositories\ActivityRepositoryInterface;
use App\Contracts\Services\ActivityServiceInterface;
use App\Enums\ActivityStatus;
use App\Enums\ProjectTaskStatus;
use App\Models\Activity;
use App\Models\ProjectAssignment;
use App\Models\ProjectTask;
use App\Models\User;
use App\Support\QueryCache;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ActivityService implements ActivityServiceInterface
{
    public function __construct(
        protected ActivityRepositoryInterface $repository,
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
        $this->ensureValidTaskLink($data);
        $activity = $this->repository->create($data);
        $this->cache->invalidate(QueryCache::ACTIVITIES);

        return $activity;
    }

    public function update(Activity $activity, array $data): Activity
    {
        $this->ensureValidTaskLink($data, $activity);
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

    public function approve(Activity $activity, User $actor): Activity
    {
        $activity = DB::transaction(function () use ($activity, $actor) {
            $activity = $this->repository->findForUpdate($activity->id);
            $this->ensureTransition($activity, [ActivityStatus::SELESAI, ActivityStatus::REJECTED], 'disetujui');

            // Metadata rejection dibersihkan saat hasil review diperbaiki dan
            // disetujui kembali melalui endpoint audit khusus.
            return $this->repository->update($activity, [
                'status' => ActivityStatus::APPROVED,
                'approved_by' => $actor->id,
                'approved_at' => now(),
                'rejected_by' => null,
                'rejected_at' => null,
                'rejection_reason' => null,
            ]);
        });

        $this->cache->invalidate(QueryCache::ACTIVITIES);

        return $activity;
    }

    public function reject(Activity $activity, User $actor, string $reason): Activity
    {
        $activity = DB::transaction(function () use ($activity, $actor, $reason) {
            $activity = $this->repository->findForUpdate($activity->id);
            $this->ensureTransition($activity, [ActivityStatus::SELESAI, ActivityStatus::APPROVED], 'ditolak');

            return $this->repository->update($activity, [
                'status' => ActivityStatus::REJECTED,
                'approved_by' => null,
                'approved_at' => null,
                'rejected_by' => $actor->id,
                'rejected_at' => now(),
                'rejection_reason' => $reason,
            ]);
        });

        $this->cache->invalidate(QueryCache::ACTIVITIES);

        return $activity;
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
            'division_id' => $filters['division_id'] ?? null,
            'date_from' => $filters['date_from'] ?? null,
            'date_to' => $filters['date_to'] ?? null,
            'page' => $filters['page'] ?? 1,
            'per_page' => $filters['per_page'] ?? 10,
            'sort' => 'activity_date:desc,id:desc',
        ];
    }

    private function ensureTransition(Activity $activity, array $allowedFrom, string $action): void
    {
        if (! in_array($activity->status, $allowedFrom, true)) {
            // Transition eksplisit mencegah pending/ongoing melewati proses
            // penyelesaian operasional sebelum review.
            throw ValidationException::withMessages([
                'status' => ["Aktivitas berstatus {$activity->status->value} tidak dapat {$action}."],
            ]);
        }
    }

    private function ensureValidTaskLink(array $data, ?Activity $activity = null): void
    {
        $taskId = array_key_exists('project_task_id', $data)
            ? $data['project_task_id']
            : $activity?->project_task_id;

        if ($taskId === null) {
            return;
        }

        $task = ProjectTask::query()->find($taskId);
        $userId = (int) ($data['user_id'] ?? $activity?->user_id);
        $projectId = (int) ($data['project_id'] ?? $activity?->project_id);
        $isNewLink = ! $activity || $activity->project_task_id !== $task?->id;

        if (! $task) {
            throw ValidationException::withMessages([
                'project_task_id' => ['Task tidak ditemukan.'],
            ]);
        }

        if ($isNewLink && $task->status !== ProjectTaskStatus::ACTIVE) {
            throw ValidationException::withMessages([
                'project_task_id' => ['Hanya Task active yang dapat digunakan untuk Activity baru.'],
            ]);
        }

        // Task, Activity, dan assignee harus berada pada user/project yang
        // sama agar ID Task tidak dapat dipakai lintas assignment.
        if ($task->assigned_to !== $userId || $task->project_id !== $projectId) {
            throw ValidationException::withMessages([
                'project_task_id' => ['Task tidak sesuai dengan Karyawan atau project Activity.'],
            ]);
        }

        $assigned = ProjectAssignment::query()
            ->where('project_id', $projectId)
            ->where('user_id', $userId)
            ->where('status', 'aktif')
            ->exists();

        if (! $assigned) {
            throw ValidationException::withMessages([
                'project_task_id' => ['Assignment Karyawan pada project sudah tidak aktif.'],
            ]);
        }
    }
}
