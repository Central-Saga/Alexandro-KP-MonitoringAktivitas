<?php

namespace App\Repositories;

use App\Contracts\Repositories\DivisionRepositoryInterface;
use App\Models\Division;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DivisionRepository implements DivisionRepositoryInterface
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        // Head dan jumlah anggota dimuat dalam query list agar resource tidak
        // memicu N+1 saat halaman admin menampilkan banyak card divisi.
        $query = Division::query()->with('head')->withCount('members');

        if (! empty($filters['search'])) {
            $search = mb_strtolower($filters['search']);
            $query->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"]);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest()
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();
    }

    public function create(array $data): Division
    {
        return Division::create($data);
    }

    public function update(Division $division, array $data): Division
    {
        $division->update($data);

        return $division;
    }
}
