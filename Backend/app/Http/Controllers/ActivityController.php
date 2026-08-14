<?php

namespace App\Http\Controllers;

use App\Events\ActivityCreated;
use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use App\Services\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ActivityController extends Controller
{
    public function __construct(
        protected ActivityService $service
    ) {}

    public function index()
    {
        Gate::authorize('viewAny', Activity::class);

        return ActivityResource::collection(
            $this->service->getAll()
        );
    }

    public function show(int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return response()->json([
                'message' => 'Aktivitas tidak ditemukan',
            ], 404);
        }

        Gate::authorize('view', $activity);

        return new ActivityResource($activity);
    }

    public function store(Request $request)
    {
        Gate::authorize('create', Activity::class);

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|max:50',
            'activity_date' => 'required|date',
        ]);

        // Karyawan hanya boleh membuat activity untuk dirinya sendiri.
        if ($request->user()->role === 'karyawan') {
            $data['user_id'] = $request->user()->id;
        }

        $activity = $this->service->create($data);

        ActivityCreated::dispatch($activity);

        return response()->json([
            'message' => 'Aktivitas berhasil dibuat',
            'data' => new ActivityResource($activity),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return response()->json([
                'message' => 'Aktivitas tidak ditemukan',
            ], 404);
        }

        Gate::authorize('update', $activity);

        $data = $request->validate([
            'user_id' => 'sometimes|exists:users,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string|max:50',
            'activity_date' => 'sometimes|date',
        ]);

        // Karyawan tidak boleh memindahkan activity ke user lain.
        if ($request->user()->role === 'karyawan') {
            $data['user_id'] = $activity->user_id;
        }

        $activity = $this->service->update($activity, $data);

        return response()->json([
            'message' => 'Aktivitas berhasil diperbarui',
            'data' => new ActivityResource($activity),
        ]);
    }

    public function uploadMedia(Request $request, int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return response()->json([
                'message' => 'Aktivitas tidak ditemukan',
            ], 404);
        }

        Gate::authorize('update', $activity);

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