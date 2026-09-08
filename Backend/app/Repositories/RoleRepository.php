<?php

namespace App\Repositories;

use App\Contracts\Repositories\RoleRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Spatie\Permission\Models\Role;

class RoleRepository implements RoleRepositoryInterface
{
    /**
     * Mengambil seluruh role beserta permission-nya.
     */
    public function getAll(): Collection
    {
        return Role::with('permissions')
            ->orderBy('name')
            ->get();
    }

    /**
     * Mengambil role berdasarkan ID.
     *
     * Permission ikut dimuat agar detail role
     * langsung menampilkan permission yang dimiliki.
     */
    public function findById(int $id): ?Role
    {
        return Role::with('permissions')->find($id);
    }

    /**
     * Membuat role baru.
     */
    public function create(array $data): Role
    {
        return Role::create([
            'name' => $data['name'],
            'guard_name' => $data['guard_name'] ?? 'web',
        ]);
    }

    /**
     * Memperbarui data role.
     */
    public function update(Role $role, array $data): Role
    {
        $role->update([
            'name' => $data['name'] ?? $role->name,
        ]);

        return $role->fresh('permissions');
    }

    /**
     * Menghapus role.
     */
    public function delete(Role $role): bool
    {
        return $role->delete();
    }

    /**
     * Mengganti seluruh permission role.
     *
     * syncPermissions akan menghapus permission lama
     * yang tidak lagi dikirim dan memasukkan permission baru.
     */
    public function syncPermissions(
        Role $role,
        array $permissions
    ): Role {
        $role->syncPermissions($permissions);

        return $role->fresh('permissions');
    }
}
