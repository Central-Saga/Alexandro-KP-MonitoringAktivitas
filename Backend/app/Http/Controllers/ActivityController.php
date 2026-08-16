<?php

namespace App\Http\Controllers;

use App\Events\ActivityCreated;
use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Services\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ActivityController extends Controller
{
    public function __construct(
        protected ActivityService $service
    ) {}

    /**
     * Menampilkan daftar activity sesuai hak akses user.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Activity::class);

        return ActivityResource::collection(
            $this->service->getAll($request->user())
        );
    }

    /**
     * Menampilkan detail activity.
     */
    public function show(int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return response()->json([
                'message' => 'Aktivitas tidak ditemukan',
            ], 404);
        }

        // Policy menentukan apakah user boleh melihat activity.
        Gate::authorize('view', $activity);

        return new ActivityResource($activity);
    }

    /**
     * Membuat activity baru.
     */
    public function store(Request $request)
    {
        Gate::authorize('create', Activity::class);

        $data = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|max:50',
            'activity_date' => 'required|date',
        ]);

        $user = $request->user();

        // Karyawan hanya dapat membuat activity untuk dirinya sendiri.
        if ($user->hasRole('karyawan')) {
            $data['user_id'] = $user->id;

            // Pastikan karyawan memang ditugaskan
            // secara aktif pada project tersebut.
            $assigned = ProjectAssignment::where('project_id', $data['project_id'])
                ->where('user_id', $user->id)
                ->where('status', 'aktif')
                ->exists();

            if (! $assigned) {
                return response()->json([
                    'message' => 'Anda tidak ditugaskan ke project ini.',
                ], 403);
            }
        }

        // Project Manager hanya dapat membuat activity
        // pada project yang dikelolanya sendiri.
        if ($user->hasRole('project_manager')) {
            $projectOwned = Project::where('id', $data['project_id'])
                ->where('project_manager_id', $user->id)
                ->exists();

            if (! $projectOwned) {
                return response()->json([
                    'message' => 'Anda bukan Project Manager dari project ini.',
                ], 403);
            }
        }

        $activity = $this->service->create($data);

        // Kirim event setelah activity berhasil dibuat.
        ActivityCreated::dispatch($activity);

        return response()->json([
            'message' => 'Aktivitas berhasil dibuat',
            'data' => new ActivityResource($activity),
        ], 201);
    }

    /**
     * Memperbarui activity.
     */
    public function update(Request $request, int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return response()->json([
                'message' => 'Aktivitas tidak ditemukan',
            ], 404);
        }

        // Policy memastikan user memiliki hak update.
        Gate::authorize('update', $activity);

        $data = $request->validate([
            'project_id' => 'sometimes|exists:projects,id',
            'user_id' => 'sometimes|exists:users,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string|max:50',
            'activity_date' => 'sometimes|date',
        ]);

        $user = $request->user();

        // Karyawan tidak boleh memindahkan activity
        // ke user atau project lain.
        if ($user->hasRole('karyawan')) {
            $data['user_id'] = $activity->user_id;
            $data['project_id'] = $activity->project_id;

            if ($activity->project_id) {
                $assigned = ProjectAssignment::where('project_id', $activity->project_id)
                    ->where('user_id', $user->id)
                    ->where('status', 'aktif')
                    ->exists();

                if (! $assigned) {
                    return response()->json([
                        'message' => 'Anda tidak lagi ditugaskan ke project ini.',
                    ], 403);
                }
            }
        }

        // Project Manager hanya boleh update activity
        // dari project yang dikelolanya.
        if ($user->hasRole('project_manager')) {
            $projectId = $data['project_id'] ?? $activity->project_id;

            $projectOwned = Project::where('id', $projectId)
                ->where('project_manager_id', $user->id)
                ->exists();

            if (! $projectOwned) {
                return response()->json([
                    'message' => 'Anda bukan Project Manager dari project ini.',
                ], 403);
            }
        }

        $activity = $this->service->update($activity, $data);

        return response()->json([
            'message' => 'Aktivitas berhasil diperbarui',
            'data' => new ActivityResource($activity),
        ]);
    }

    /**
     * Upload media sebagai bukti aktivitas.
     *
     * Hanya karyawan pemilik activity yang diperbolehkan.
     */
    public function uploadMedia(Request $request, int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return response()->json([
                'message' => 'Aktivitas tidak ditemukan',
            ], 404);
        }

        Gate::authorize('uploadMedia', $activity);

        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $media = $activity
            ->addMediaFromRequest('file')
            ->toMediaCollection('activity_files');

        return response()->json([
            'message' => 'File berhasil diupload',
            'data' => [
                'id' => $media->id,
                'name' => $media->name,
                'file_name' => $media->file_name,
                'mime_type' => $media->mime_type,
                'size' => $media->size,
                'url' => $media->getUrl(),
            ],
        ], 201);
    }

    /**
     * Menghapus activity.
     *
     * Hak akses ditentukan oleh ActivityPolicy.
     */
    public function destroy(int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return response()->json([
                'message' => 'Aktivitas tidak ditemukan',
            ], 404);
        }

        Gate::authorize('delete', $activity);

        $this->service->delete($activity);

        return response()->json([
            'message' => 'Aktivitas berhasil dihapus',
        ]);
    }
}