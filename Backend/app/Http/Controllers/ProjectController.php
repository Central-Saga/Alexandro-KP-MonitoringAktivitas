<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Support\QueryCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ProjectController extends Controller
{
    public function __construct(protected QueryCache $cache) {}

    public function index(Request $request)
    {
        Gate::authorize('viewAny', Project::class);

        $user = $request->user();
        $query = Project::query();

        if ($user->hasRole('project_manager')) {
            $query->where('project_manager_id', $user->id);
        }
        if ($user->hasRole('karyawan')) {
            // Project selector Karyawan bersumber dari scope backend, bukan
            // mengambil seluruh project lalu menyembunyikannya di frontend.
            $query->whereHas('assignments', fn ($assignments) => $assignments
                ->where('user_id', $user->id)
                ->where('status', 'aktif'));
        }

        // Cache hanya menyimpan ID yang sudah terscope. Model dan relasinya
        // selalu di-hydrate ulang agar response aman melalui ProjectResource.
        $ids = $this->cache->remember(
            QueryCache::PROJECTS,
            [
                'actor_id' => $user->getKey(),
                'roles' => $user->getRoleNames()->sort()->values()->all(),
                'sort' => 'created_at:desc,id:desc',
            ],
            fn () => $query->latest()->latest('id')->pluck('id')->all(),
        );

        $projects = Project::query()
            ->with('projectManager.roles')
            ->withCount('activeAssignments')
            ->whereKey($ids)
            ->get()
            ->sortBy(fn (Project $project) => array_search($project->id, $ids, true))
            ->values();

        return ProjectResource::collection($projects);
    }

    public function show(Request $request, int $id)
    {
        $project = Project::query()->find($id);

        abort_if(! $project, 404, 'Project tidak ditemukan.');
        Gate::authorize('view', $project);

        $assignmentScope = fn ($assignments) => $request->user()->hasRole('karyawan')
            ? $assignments->where('user_id', $request->user()->id)
            : $assignments;

        // Karyawan hanya menerima assignment miliknya pada detail project;
        // Admin/PM tetap memperoleh daftar tim sesuai kontrak management.
        $project->load([
            'projectManager.roles',
            'assignments' => $assignmentScope,
            'assignments.user.roles',
            'assignments.user.division',
        ])->loadCount('activeAssignments');

        return new ProjectResource($project);
    }

    public function store(StoreProjectRequest $request)
    {
        Gate::authorize('create', Project::class);

        $data = $request->validated();
        $data['status'] ??= 'berlangsung';
        $project = Project::query()->create($data);
        activity('project')->causedBy($request->user())->performedOn($project)->event('created')
            ->withProperty('subject_name', $project->name)->log("Membuat proyek {$project->name}");
        $this->cache->invalidate(QueryCache::PROJECTS);

        return response()->json([
            'message' => 'Project berhasil dibuat.',
            'data' => new ProjectResource($project->load('projectManager.roles')->loadCount('activeAssignments')),
        ], 201);
    }

    public function update(UpdateProjectRequest $request, int $id)
    {
        $project = Project::query()->find($id);
        abort_if(! $project, 404, 'Project tidak ditemukan.');
        Gate::authorize('update', $project);

        $data = $request->validated();

        if ($request->user()->hasRole('project_manager')) {
            unset($data['project_manager_id']);
        }

        $project->update($data);
        activity('project')->causedBy($request->user())->performedOn($project)->event('updated')
            ->withProperty('subject_name', $project->name)->log("Mengubah proyek {$project->name}");

        // Pergantian PM langsung mengubah scope list dan Activity, sehingga
        // kedua cache harus dibuang dalam mutation yang sama.
        $this->cache->invalidate(QueryCache::PROJECTS, QueryCache::ACTIVITIES);

        return response()->json([
            'message' => 'Project berhasil diperbarui.',
            'data' => new ProjectResource($project->fresh()->load('projectManager.roles')->loadCount('activeAssignments')),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $project = Project::query()->find($id);
        abort_if(! $project, 404, 'Project tidak ditemukan.');
        Gate::authorize('delete', $project);

        $project->delete();
        $this->cache->invalidate(QueryCache::PROJECTS, QueryCache::ACTIVITIES);

        return response()->json(['message' => 'Project berhasil dihapus.']);
    }
}
