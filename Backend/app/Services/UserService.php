<?php

namespace App\Services;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Contracts\Services\UserServiceInterface;
use App\Models\Division;
use App\Models\User;
use App\Support\QueryCache;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserService implements UserServiceInterface
{
    public function __construct(
        protected UserRepositoryInterface $repository,
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

            $this->ensureDivisionIsAssignable($data['division_id'] ?? null);

            $user = $this->repository->create($data);

            // User dan role Spatie harus tersimpan sebagai satu unit agar
            // akun tidak pernah tercipta tanpa authorization yang lengkap.
            // Kolom legacy ikut diselaraskan hanya untuk compatibility;
            // authorization dan response tetap membaca role dari Spatie.
            $user->syncRoles($role);

            return $user->load(['roles', 'division']);
        });

        $this->cache->invalidate(QueryCache::USERS);

        return $user;
    }

    public function update(User $user, array $data): User
    {
        $user = DB::transaction(function () use ($user, $data) {
            $role = $data['role'];

            if (array_key_exists('division_id', $data)) {
                $this->ensureDivisionIsAssignable($data['division_id'], $user);
                $this->ensureHeadRemainsInOwnDivision($user, $data['division_id']);
            }

            $this->repository->update($user, $data);

            // Spatie tetap menjadi source of truth saat role diganti.
            $user->syncRoles($role);

            return $user->fresh(['roles', 'division']);
        });

        // Nama/divisi user ikut tertanam dalam ActivityResource, sehingga
        // kedua namespace perlu diganti setelah update profile organisasi.
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
                // Self-deactivation dapat memutus akses Admin yang sedang
                // melakukan pemulihan atau administrasi akun lain.
                throw ValidationException::withMessages([
                    'is_active' => ['Admin tidak dapat menonaktifkan dirinya sendiri.'],
                ]);
            }

            if (! $isActive && $target->hasRole('admin')) {
                $activeAdmins = $this->repository->countActiveAdminsForUpdate();

                // Minimal satu Admin aktif harus tersisa agar sistem tidak
                // kehilangan jalur pengelolaan RBAC dan lifecycle user.
                if ($activeAdmins <= 1) {
                    throw ValidationException::withMessages([
                        'is_active' => ['Admin aktif terakhir tidak dapat dinonaktifkan.'],
                    ]);
                }
            }

            // Repository menyimpan status dan mencabut token saat deaktivasi;
            // guard bisnis tetap berada di service sebelum mutation terjadi.
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
            'division_id' => $filters['division_id'] ?? null,
            'page' => $filters['page'] ?? 1,
            'per_page' => $filters['per_page'] ?? 10,
            'sort' => 'created_at:desc',
        ];
    }

    private function ensureDivisionIsAssignable(?int $divisionId, ?User $user = null): void
    {
        if ($divisionId === null || $user?->division_id === $divisionId) {
            return;
        }

        $isActive = Division::query()
            ->whereKey($divisionId)
            ->where('status', 'active')
            ->lockForUpdate()
            ->exists();

        // Divisi nonaktif tetap menyimpan member lama untuk histori, tetapi
        // tidak boleh menerima assignment baru atau perpindahan user.
        if (! $isActive) {
            throw ValidationException::withMessages([
                'division_id' => ['Divisi yang dipilih harus aktif.'],
            ]);
        }
    }

    private function ensureHeadRemainsInOwnDivision(User $user, ?int $divisionId): void
    {
        $headedDivision = Division::query()
            ->where('head_user_id', $user->id)
            ->lockForUpdate()
            ->first();

        if ($headedDivision !== null && $headedDivision->id !== $divisionId) {
            // Kepala tidak boleh dipindahkan diam-diam karena akan membuat
            // invariant head dan membership berbeda divisi.
            throw ValidationException::withMessages([
                'division_id' => ['Ganti atau lepaskan posisi kepala divisi sebelum memindahkan user ini.'],
            ]);
        }
    }
}
