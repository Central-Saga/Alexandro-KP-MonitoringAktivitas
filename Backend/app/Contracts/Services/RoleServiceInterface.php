<?php

namespace App\Contracts\Services;

use Illuminate\Database\Eloquent\Collection;
use Spatie\Permission\Models\Role;

interface RoleServiceInterface
{
    public function getAll(): Collection;

    public function getById(int $id): ?Role;

    public function create(array $data): Role;

    public function update(Role $role, array $data): Role;

    public function delete(Role $role): bool;
}
