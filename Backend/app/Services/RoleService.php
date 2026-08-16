<?php

namespace App\Services;

use App\Contracts\RoleRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Spatie\Permission\Models\Role;

class RoleService
{
    public function __construct(
        protected RoleRepositoryInterface $repository
    ) {}

    /**
     * Mengambil seluruh role beserta permission yang dimilikinya.
     */
    public function getAll(): Collection
    {
        return $this->repository->getAll();
    }

    /**
     * Mengambil detail role berdasarkan ID.
     *
     * Jika role tidak ditemukan, hasilnya null.
     */
    public function getById(int $id): ?Role
    {
        return $this->repository->findById($id);
    }

    /**
     * Membuat role baru.
     */
    public function create(array $data): Role
    {
        $role = $this->repository->create($data);

        // Jika permission diberikan saat membuat role,
        // langsung hubungkan permission tersebut ke role.
        if (! empty($data['permissions'])) {
            $this->repository->syncPermissions(
                $role,
                $data['permissions']
            );
        }

        return $role->fresh('permissions');
    }

    /**
     * Memperbarui role dan permission-nya.
     */
    public function update(Role $role, array $data): Role
    {
        $role = $this->repository->update($role, $data);

        // Jika field permissions dikirim,
        // sinkronkan permission dengan daftar terbaru.
        if (array_key_exists('permissions', $data)) {
            $role = $this->repository->syncPermissions(
                $role,
                $data['permissions'] ?? []
            );
        }

        return $role->fresh('permissions');
    }

    /**
     * Menghapus role.
     */
    public function delete(Role $role): bool
    {
        return $this->repository->delete($role);
    }
}
