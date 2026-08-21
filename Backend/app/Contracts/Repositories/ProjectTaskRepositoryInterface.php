<?php

namespace App\Contracts\Repositories;

use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ProjectTaskRepositoryInterface
{
    public function paginate(User $user, array $filters): LengthAwarePaginator;

    public function find(int $id): ?ProjectTask;

    public function findForUpdate(int $id): ProjectTask;

    public function create(array $data): ProjectTask;

    public function update(ProjectTask $task, array $data): ProjectTask;
}
