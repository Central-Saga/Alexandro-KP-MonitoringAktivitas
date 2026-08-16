<?php

namespace App\Contracts;

use Spatie\Permission\Models\Role;
use Illuminate\Database\Eloquent\Collection;

interface RoleRepositoryInterface
{
    /**
     * Mengambil seluruh role yang tersedia.
     */
    public function getAll(): Collection;

    /**
     * Mengambil satu role berdasarkan ID
     * beserta permission yang dimilikinya.
     */
    public function findById(int $id): ?Role;

    /**
     * Membuat role baru.
     *
     * $data minimal berisi name dan guard_name.
     */
    public function create(array $data): Role;

    /**
     * Memperbarui data role.
     */
    public function update(Role $role, array $data): Role;

    /**
     * Menghapus role.
     */
    public function delete(Role $role): bool;

    /**
     * Mengatur ulang permission yang dimiliki role.
     */
    public function syncPermissions(Role $role, array $permissions): Role;
}
