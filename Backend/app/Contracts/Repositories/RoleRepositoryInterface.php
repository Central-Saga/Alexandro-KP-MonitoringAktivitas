<?php

namespace App\Contracts\Repositories;

use Illuminate\Database\Eloquent\Collection;
use Spatie\Permission\Models\Role;

interface RoleRepositoryInterface
{
    public function getAll(): Collection;

    public function findById(int $id): ?Role;

    public function create(array $data): Role;

    public function update(Role $role, array $data): Role;

    public function delete(Role $role): bool;

    public function syncPermissions(Role $role, array $permissions): Role;
}
