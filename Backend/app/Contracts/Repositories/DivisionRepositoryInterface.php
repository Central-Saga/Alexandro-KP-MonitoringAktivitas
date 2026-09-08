<?php

namespace App\Contracts\Repositories;

use App\Models\Division;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface DivisionRepositoryInterface
{
    public function paginate(array $filters): LengthAwarePaginator;

    public function create(array $data): Division;

    public function update(Division $division, array $data): Division;
}
