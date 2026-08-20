<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectAssignmentRequest;
use App\Http\Requests\UpdateProjectAssignmentRequest;
use App\Http\Resources\ProjectAssignmentResource;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use App\Support\QueryCache;
use Illuminate\Support\Facades\Gate;

class ProjectAssignmentController extends Controller
{
    public function __construct(protected QueryCache $cache) {}

    public function index(int $projectId)
    {
        $project = $this->project($projectId);
        Gate::authorize('manageAssignments', $project);

        $assignments = ProjectAssignment::query()
            ->with(['user.roles', 'user.division'])
            ->where('project_id', $project->id)
            ->latest()
            ->get();

        return ProjectAssignmentResource::collection($assignments);
    }

    public function candidates(int $projectId)
    {
        $project = $this->project($projectId);
        Gate::authorize('manageAssignments', $project);

        $users = User::query()
            ->with('division')
            ->where('is_active', true)
            ->whereHas('roles', fn ($roles) => $roles->where('name', 'karyawan'))
            ->whereDoesntHave('projectAssignments', fn ($assignments) => $assignments
                ->where('project_id', $project->id))
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $users->map(fn (User $user) => [
                // Endpoint kandidat hanya mengekspos identitas yang diperlukan
                // selector assignment, tanpa role internal atau credential.
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'division' => $user->division ? [
                    'id' => $user->division->id,
                    'name' => $user->division->name,
                ] : null,
            ]),
        ]);
    }

    public function store(StoreProjectAssignmentRequest $request, int $projectId)
    {
        $project = $this->project($projectId);
        Gate::authorize('manageAssignments', $project);

        $data = $request->validated();
        $exists = ProjectAssignment::query()
            ->where('project_id', $project->id)
            ->where('user_id', $data['user_id'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Karyawan sudah memiliki histori penugasan pada project ini. Aktifkan kembali assignment yang ada.',
                'errors' => ['user_id' => ['Karyawan sudah ditugaskan ke project ini.']],
            ], 422);
        }

        $data['project_id'] = $project->id;
        $data['status'] ??= 'aktif';
        $assignment = ProjectAssignment::query()->create($data);
        $this->invalidateScopeCaches();

        return response()->json([
            'message' => 'Karyawan berhasil ditugaskan.',
            'data' => new ProjectAssignmentResource(
                $assignment->load(['user.roles', 'user.division'])
            ),
        ], 201);
    }

    public function update(
        UpdateProjectAssignmentRequest $request,
        int $projectId,
        int $assignmentId
    ) {
        $project = $this->project($projectId);
        Gate::authorize('manageAssignments', $project);

        $assignment = ProjectAssignment::query()
            ->where('project_id', $project->id)
            ->find($assignmentId);

        abort_if(! $assignment, 404, 'Penugasan tidak ditemukan.');
        $data = $request->validated();

        if (($data['status'] ?? null) === 'aktif') {
            $employee = $assignment->user()->with('roles')->first();

            if (! $employee?->is_active || ! $employee->hasRole('karyawan')) {
                // Reactivation juga divalidasi backend karena status/role user
                // dapat berubah setelah assignment pertama kali dibuat.
                return response()->json([
                    'message' => 'Assignment hanya dapat diaktifkan untuk Karyawan aktif.',
                    'errors' => ['status' => ['Karyawan harus aktif sebelum assignment diaktifkan.']],
                ], 422);
            }
        }

        $assignment->update($data);
        $this->invalidateScopeCaches();

        return response()->json([
            'message' => 'Penugasan berhasil diperbarui.',
            'data' => new ProjectAssignmentResource(
                $assignment->fresh()->load(['user.roles', 'user.division'])
            ),
        ]);
    }

    private function project(int $id): Project
    {
        $project = Project::query()->find($id);
        abort_if(! $project, 404, 'Project tidak ditemukan.');

        return $project;
    }

    private function invalidateScopeCaches(): void
    {
        // Assignment aktif menentukan akses Activity karyawan/PM. Invalidasi
        // mencegah hasil cache lama bocor setelah assignment berubah.
        $this->cache->invalidate(QueryCache::PROJECTS, QueryCache::ACTIVITIES);
    }
}
