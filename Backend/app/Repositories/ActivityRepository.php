<?php

namespace App\Repositories;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ActivityRepository
{
    /**
     * Mengambil daftar activity sesuai hak akses user.
     *
     * Karyawan hanya melihat activity miliknya.
     * Project Manager hanya melihat activity dari project
     * yang dikelolanya dan assignment karyawan masih aktif.
     * Admin dapat melihat seluruh activity.
     */
    public function getAll(User $user): Collection
    {
        $query = Activity::with([
            'user',
            'project',
        ])->latest('activity_date');

        // Karyawan hanya dapat melihat activity miliknya sendiri.
        if ($user->hasRole('karyawan')) {
            $query->where('user_id', $user->id);
        }

        // Project Manager hanya dapat melihat activity
        // dari project yang dikelolanya dan karyawan yang
        // masih memiliki assignment aktif.
        if ($user->hasRole('project_manager')) {
            $query->whereHas('project', function ($projectQuery) use ($user) {
                $projectQuery->where('project_manager_id', $user->id);
            })->whereHas('project.assignments', function ($assignmentQuery) {
                $assignmentQuery->whereColumn(
                    'project_assignments.user_id',
                    'activities.user_id'
                )->where('project_assignments.status', 'aktif');
            });
        }

        // Admin tidak membutuhkan filter tambahan.
        return $query->get();
    }

    /**
     * Mengambil detail activity berdasarkan ID.
     *
     * Relasi user dan project ikut dimuat agar
     * ActivityResource dapat menampilkan informasinya.
     */
    public function findById(int $id): ?Activity
    {
        return Activity::with([
            'user',
            'project',
        ])->find($id);
    }

    /**
     * Membuat activity baru.
     */
    public function create(array $data): Activity
    {
        return Activity::create($data);
    }

    /**
     * Memperbarui activity.
     */
    public function update(Activity $activity, array $data): Activity
    {
        $activity->update($data);

        return $activity->fresh([
            'user',
            'project',
        ]);
    }

    /**
     * Menghapus activity.
     */
    public function delete(Activity $activity): bool
    {
        return $activity->delete();
    }
}