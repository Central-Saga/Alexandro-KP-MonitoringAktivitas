<?php

namespace App\Contracts\Services;

use App\Models\Division;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface DivisionServiceInterface
{
    public function paginate(array $filters): LengthAwarePaginator;

    public function create(array $data): Division;

    public function update(Division $division, array $data): Division;

    public function updateStatus(Division $division, string $status): Division;
}
