<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class UserRepository
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        // Roles selalu eager-loaded agar UserResource tidak memicu query N+1.
        $query = User::query()->with('roles');

        if (! empty($filters['search'])) {
            $search = mb_strtolower($filters['search']);
            $query->where(function ($builder) use ($search) {
                // LOWER menjaga pencarian nama/email tetap konsisten dan
                // case-insensitive pada SQLite test maupun PostgreSQL.
                $builder->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(email) LIKE ?', ["%{$search}%"]);
            });
        }

        if (! empty($filters['role'])) {
            // Filter memakai relasi Spatie, bukan kolom legacy users.role.
            $query->whereHas('roles', fn ($roles) => $roles->where('name', $filters['role']));
        }

        if (! empty($filters['status'])) {
            $query->where('is_active', $filters['status'] === 'active');
        }

        return $query->latest()
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();
    }

    public function create(array $data): User
    {
        return User::create($data);
    }

    public function findManyForList(array $ids): Collection
    {
        if ($ids === []) {
            return new Collection;
        }

        $users = User::query()
            ->with('roles')
            ->whereKey($ids)
            ->get()
            ->keyBy('id');

        return new Collection(array_values(array_filter(
            array_map(fn ($id) => $users->get($id), $ids)
        )));
    }

    public function findForUpdate(int $id): User
    {
        return User::query()->with('roles')->lockForUpdate()->findOrFail($id);
    }

    public function countActiveAdminsForUpdate(): int
    {
        return User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($roles) => $roles->where('name', 'admin'))
            ->lockForUpdate()
            ->count();
    }

    public function updateStatus(User $user, bool $isActive): User
    {
        $user->forceFill([
            'is_active' => $isActive,
            'deactivated_at' => $isActive ? null : now(),
        ])->save();

        if (! $isActive) {
            $user->tokens()->delete();
        }

        return $user->fresh('roles');
    }

    public function update(User $user, array $data): User
    {
        $user->update($data);

        return $user;
    }
}
