<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function __construct(protected UserRepository $repository) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        return $this->repository->paginate($filters);
    }

    public function create(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $role = $data['role'];

            $user = $this->repository->create($data);

            // User dan role Spatie harus tersimpan sebagai satu unit agar
            // akun tidak pernah tercipta tanpa authorization yang lengkap.
            // Kolom legacy ikut diselaraskan hanya untuk compatibility;
            // authorization dan response tetap membaca role dari Spatie.
            $user->syncRoles($role);

            return $user->load('roles');
        });
    }

    public function update(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            $role = $data['role'];

            $this->repository->update($user, $data);

            // Spatie tetap menjadi source of truth saat role diganti.
            $user->syncRoles($role);

            return $user->fresh('roles');
        });
    }

    public function updateStatus(User $actor, User $target, bool $isActive): User
    {
        return DB::transaction(function () use ($actor, $target, $isActive) {
            $target = User::query()->with('roles')->lockForUpdate()->findOrFail($target->id);

            if (! $isActive && $actor->is($target)) {
                // Self-deactivation dapat memutus akses Admin yang sedang
                // melakukan pemulihan atau administrasi akun lain.
                throw ValidationException::withMessages([
                    'is_active' => ['Admin tidak dapat menonaktifkan dirinya sendiri.'],
                ]);
            }

            if (! $isActive && $target->hasRole('admin')) {
                $activeAdmins = User::query()
                    ->where('is_active', true)
                    ->whereHas('roles', fn ($roles) => $roles->where('name', 'admin'))
                    ->lockForUpdate()
                    ->count();

                // Minimal satu Admin aktif harus tersisa agar sistem tidak
                // kehilangan jalur pengelolaan RBAC dan lifecycle user.
                if ($activeAdmins <= 1) {
                    throw ValidationException::withMessages([
                        'is_active' => ['Admin aktif terakhir tidak dapat dinonaktifkan.'],
                    ]);
                }
            }

            $target->forceFill([
                'is_active' => $isActive,
                'deactivated_at' => $isActive ? null : now(),
            ])->save();

            if (! $isActive) {
                // Seluruh token dicabut agar akun nonaktif langsung kehilangan
                // akses API, bukan hanya gagal pada login berikutnya.
                $target->tokens()->delete();
            }

            return $target->fresh('roles');
        });
    }
}
