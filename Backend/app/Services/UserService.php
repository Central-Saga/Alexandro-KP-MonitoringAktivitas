<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use App\Support\QueryCache;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function __construct(
        protected UserRepository $repository,
        protected QueryCache $cache,
    ) {}

    public function paginate(User $actor, array $filters): LengthAwarePaginator
    {
        // Endpoint saat ini Admin-only, tetapi actor dan role tetap menjadi
        // bagian key agar perubahan authorization tidak membocorkan cache.
        return $this->cache->rememberPaginator(
            QueryCache::USERS,
            [
                'actor_id' => $actor->getKey(),
                'roles' => $actor->getRoleNames()->sort()->values()->all(),
                'filters' => $this->listFilters($filters),
            ],
            fn () => $this->repository->paginate($filters),
            fn (array $ids) => $this->repository->findManyForList($ids),
        );
    }

    public function create(array $data): User
    {
        $user = DB::transaction(function () use ($data) {
            $role = $data['role'];
            $user = $this->repository->create($data);

            // Spatie tetap menjadi source of truth untuk authorization.
            $user->syncRoles($role);

            return $user->load('roles');
        });

        $this->cache->invalidate(QueryCache::USERS);

        return $user;
    }

    public function update(User $user, array $data): User
    {
        $user = DB::transaction(function () use ($user, $data) {
            $role = $data['role'];
            $this->repository->update($user, $data);
            $user->syncRoles($role);

            return $user->fresh('roles');
        });

        // Nama atau role user ikut memengaruhi ringkasan resource dan scope
        // lain, sehingga namespace terkait harus diganti bersama.
        $this->cache->invalidate(
            QueryCache::USERS,
            QueryCache::ACTIVITIES,
            QueryCache::PROJECTS,
        );

        return $user;
    }

    public function updateStatus(User $actor, User $target, bool $isActive): User
    {
        $target = DB::transaction(function () use ($actor, $target, $isActive) {
            $target = $this->repository->findForUpdate($target->id);

            if (! $isActive && $actor->is($target)) {
                throw ValidationException::withMessages([
                    'is_active' => ['Admin tidak dapat menonaktifkan dirinya sendiri.'],
                ]);
            }

            if (! $isActive && $target->hasRole('admin')) {
                $activeAdmins = $this->repository->countActiveAdminsForUpdate();

                if ($activeAdmins <= 1) {
                    throw ValidationException::withMessages([
                        'is_active' => ['Admin aktif terakhir tidak dapat dinonaktifkan.'],
                    ]);
                }
            }

            // Repository menyimpan status dan mencabut token setelah seluruh
            // guard bisnis lulus.
            return $this->repository->updateStatus($target, $isActive);
        });

        $this->cache->invalidate(
            QueryCache::USERS,
            QueryCache::ACTIVITIES,
            QueryCache::PROJECTS,
        );

        return $target;
    }

    private function listFilters(array $filters): array
    {
        return [
            'search' => $filters['search'] ?? null,
            'role' => $filters['role'] ?? null,
            'status' => $filters['status'] ?? null,
            'page' => $filters['page'] ?? 1,
            'per_page' => $filters['per_page'] ?? 10,
            'sort' => 'created_at:desc',
        ];
    }
}
