<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Support\QueryCache;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function __construct(protected QueryCache $cache) {}

    /**
     * Menampilkan daftar project.
     *
     * Admin dapat melihat seluruh project.
     * Project Manager hanya dapat melihat project
     * yang dia kelola sendiri.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Hanya Admin dan Project Manager yang boleh
        // mengakses daftar project.
        if (! $user->hasAnyRole(['admin', 'project_manager'])) {
            return response()->json([
                'message' => 'Tidak memiliki akses.',
            ], 403);
        }

        $query = Project::with('projectManager');

        // Project Manager hanya melihat project
        // yang memiliki dirinya sebagai project manager.
        if ($user->hasRole('project_manager')) {
            $query->where('project_manager_id', $user->id);
        }

        $projects = $this->cache->remember(
            QueryCache::PROJECTS,
            [
                'actor_id' => $user->getKey(),
                'roles' => $user->getRoleNames()->sort()->values()->all(),
                'sort' => 'created_at:desc',
            ],
            // Project belum memiliki service/repository. Cache menyimpan array
            // scalar agar contract JSON tetap sama dan aman untuk Redis.
            fn () => $query->latest()->get()->toArray(),
        );

        return response()->json(['data' => $projects]);
    }

    /**
     * Menampilkan detail sebuah project.
     */
    public function show(Request $request, int $id)
    {
        $user = $request->user();

        $project = Project::with([
            'projectManager',
            'assignments.user',
        ])->find($id);

        if (! $project) {
            return response()->json([
                'message' => 'Project tidak ditemukan.',
            ], 404);
        }

        // Project Manager hanya boleh melihat detail
        // project yang memang dia kelola.
        if (
            $user->hasRole('project_manager') &&
            $project->project_manager_id !== $user->id
        ) {
            return response()->json([
                'message' => 'Tidak memiliki akses ke project ini.',
            ], 403);
        }

        return response()->json([
            'data' => $project,
        ]);
    }

    /**
     * Membuat project baru.
     *
     * Hanya Project Manager yang diperbolehkan
     * membuat project.
     */
    public function store(Request $request)
    {
        // Pemeriksaan role sekarang menggunakan Spatie.
        if (! $request->user()->hasRole('project_manager')) {
            return response()->json([
                'message' => 'Hanya Project Manager yang dapat membuat project.',
            ], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'client_name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'nullable|string|max:50',
        ]);

        // Project otomatis menjadi milik PM yang sedang login.
        $data['project_manager_id'] = $request->user()->id;

        // Jika status tidak diberikan, gunakan status default.
        $data['status'] ??= 'berlangsung';

        $project = Project::create($data);
        $this->cache->invalidate(QueryCache::PROJECTS);

        return response()->json([
            'message' => 'Project berhasil dibuat.',
            'data' => $project,
        ], 201);
    }

    /**
     * Mengubah data project.
     */
    public function update(Request $request, int $id)
    {
        $project = Project::find($id);

        if (! $project) {
            return response()->json([
                'message' => 'Project tidak ditemukan.',
            ], 404);
        }

        $user = $request->user();

        // Project Manager hanya boleh mengubah project
        // yang memang dia kelola.
        if (
            $user->hasRole('project_manager') &&
            $project->project_manager_id !== $user->id
        ) {
            return response()->json([
                'message' => 'Tidak memiliki akses ke project ini.',
            ], 403);
        }

        // Hanya Admin dan Project Manager yang boleh
        // melakukan update project.
        if (! $user->hasAnyRole(['admin', 'project_manager'])) {
            return response()->json([
                'message' => 'Tidak memiliki akses.',
            ], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'client_name' => 'sometimes|string|max:255',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'sometimes|string|max:50',
        ]);

        $project->update($data);
        $this->cache->invalidate(QueryCache::PROJECTS, QueryCache::ACTIVITIES);

        return response()->json([
            'message' => 'Project berhasil diperbarui.',
            'data' => $project->fresh(),
        ]);
    }

    /**
     * Menghapus project.
     *
     * Saat ini hanya Admin yang diperbolehkan
     * menghapus project.
     */
    public function destroy(Request $request, int $id)
    {
        $project = Project::find($id);

        if (! $project) {
            return response()->json([
                'message' => 'Project tidak ditemukan.',
            ], 404);
        }

        // Hanya Admin yang dapat menghapus project.
        if (! $request->user()->hasRole('admin')) {
            return response()->json([
                'message' => 'Hanya Admin yang dapat menghapus project.',
            ], 403);
        }

        $project->delete();
        $this->cache->invalidate(QueryCache::PROJECTS, QueryCache::ACTIVITIES);

        return response()->json([
            'message' => 'Project berhasil dihapus.',
        ]);
    }
}
