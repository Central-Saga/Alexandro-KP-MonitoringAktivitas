<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'project_manager', 'karyawan']);
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('project_manager')) {
            return $project->project_manager_id === $user->id;
        }

        // Karyawan hanya dapat membuka project ketika assignment miliknya
        // masih aktif; keberadaan project saja tidak memberikan akses.
        return $user->hasRole('karyawan')
            && $project->assignments()
                ->where('user_id', $user->id)
                ->where('status', 'aktif')
                ->exists();
    }

    public function create(User $user): bool
    {
        // Pembuatan dan penetapan Project Manager merupakan tanggung jawab
        // administratif; PM hanya mengelola project yang ditetapkan kepadanya.
        return $user->hasRole('admin');
    }

    public function update(User $user, Project $project): bool
    {
        return $user->hasRole('admin')
            || ($user->hasRole('project_manager')
                && $project->project_manager_id === $user->id);
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->hasRole('admin');
    }

    public function manageAssignments(User $user, Project $project): bool
    {
        // Admin mengelola seluruh project, sedangkan PM tetap dibatasi pada
        // project miliknya agar assignment tidak memperluas scope Activity.
        return $user->hasRole('admin')
            || ($user->hasRole('project_manager')
                && $project->project_manager_id === $user->id);
    }
}
