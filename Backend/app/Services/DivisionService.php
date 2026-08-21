<?php

namespace App\Services;

use App\Contracts\Repositories\DivisionRepositoryInterface;
use App\Contracts\Services\DivisionServiceInterface;
use App\Models\Division;
use App\Models\User;
use App\Support\QueryCache;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DivisionService implements DivisionServiceInterface
{
    public function __construct(
        protected DivisionRepositoryInterface $repository,
        protected QueryCache $cache,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        return $this->repository->paginate($filters);
    }

    public function create(array $data): Division
    {
        $division = DB::transaction(function () use ($data) {
            $head = $this->resolveActiveHead($data['head_user_id'] ?? null);
            $division = $this->repository->create($data);

            // Kepala harus menjadi anggota divisi yang dipimpinnya. Perubahan
            // keduanya berada dalam transaction agar tidak pernah berbeda state.
            $this->assignHeadMembership($division, $head);

            return $this->freshForResponse($division);
        });

        $this->cache->invalidate(
            QueryCache::USERS,
            QueryCache::ACTIVITIES,
            QueryCache::PROJECTS,
        );

        return $division;
    }

    public function update(Division $division, array $data): Division
    {
        $division = DB::transaction(function () use ($division, $data) {
            $head = $this->resolveActiveHead($data['head_user_id'] ?? null);
            $this->repository->update($division, $data);
            $this->assignHeadMembership($division, $head);

            return $this->freshForResponse($division);
        });

        // Perubahan nama/head divisi memengaruhi ringkasan user dan filter
        // activity berdasarkan division_id.
        $this->cache->invalidate(
            QueryCache::USERS,
            QueryCache::ACTIVITIES,
            QueryCache::PROJECTS,
        );

        return $division;
    }

    public function updateStatus(Division $division, string $status): Division
    {
        return DB::transaction(function () use ($division, $status) {
            // Menonaktifkan divisi tidak melepas member/head agar histori
            // organisasi tetap utuh dan dapat dipulihkan saat reaktivasi.
            $this->repository->update($division, ['status' => $status]);

            return $this->freshForResponse($division);
        });
    }

    private function resolveActiveHead(?int $headUserId): ?User
    {
        if ($headUserId === null) {
            return null;
        }

        $head = User::query()->findOrFail($headUserId);

        if (! $head->is_active) {
            throw ValidationException::withMessages([
                'head_user_id' => ['Kepala divisi harus merupakan user aktif.'],
            ]);
        }

        return $head;
    }

    private function assignHeadMembership(Division $division, ?User $head): void
    {
        if ($head !== null && $head->division_id !== $division->id) {
            $head->update(['division_id' => $division->id]);
        }
    }

    private function freshForResponse(Division $division): Division
    {
        return $division->fresh(['head'])->loadCount('members');
    }
}
