<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

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

    public function update(User $user, array $data): User
    {
        $user->update($data);

        return $user;
    }
}
