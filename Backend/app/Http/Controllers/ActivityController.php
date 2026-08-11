<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Services\ActivityService;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function __construct(
        protected ActivityService $service
    ) {}

    public function index()
    {
        return response()->json([
            'data' => $this->service->getAll(),
        ]);
    }

    public function show(int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return response()->json([
                'message' => 'Aktivitas tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'data' => $activity,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|max:50',
            'activity_date' => 'required|date',
        ]);

        $activity = $this->service->create($data);

        return response()->json([
            'message' => 'Aktivitas berhasil dibuat',
            'data' => $activity,
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

        $data = $request->validate([
            'user_id' => 'sometimes|exists:users,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string|max:50',
            'activity_date' => 'sometimes|date',
        ]);

        $activity = $this->service->update($activity, $data);

        return response()->json([
            'message' => 'Aktivitas berhasil diperbarui',
            'data' => $activity,
        ]);
    }

    public function destroy(int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return response()->json([
                'message' => 'Aktivitas tidak ditemukan',
            ], 404);
        }

        $this->service->delete($activity);

        return response()->json([
            'message' => 'Aktivitas berhasil dihapus',
        ]);
    }
}