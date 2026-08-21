<?php

namespace App\Contracts\Services;

use App\Enums\ProjectTaskStatus;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ProjectTaskServiceInterface
{
    public function paginate(User $user, array $filters): LengthAwarePaginator;

    public function find(int $id): ?ProjectTask;

    public function create(User $actor, array $data): ProjectTask;

    public function update(User $actor, ProjectTask $task, array $data): ProjectTask;

    public function updateStatus(User $actor, ProjectTask $task, ProjectTaskStatus $status): ProjectTask;
}
