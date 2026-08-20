<?php

namespace App\Http\Controllers;

use App\Enums\DivisionName;
use App\Http\Requests\IndexDivisionRequest;
use App\Http\Requests\StoreDivisionRequest;
use App\Http\Requests\UpdateDivisionRequest;
use App\Http\Requests\UpdateDivisionStatusRequest;
use App\Http\Resources\DivisionResource;
use App\Models\Division;
use App\Services\DivisionService;
use Illuminate\Support\Facades\Gate;

class DivisionController extends Controller
{
    public function __construct(protected DivisionService $service) {}

    public function index(IndexDivisionRequest $request)
    {
        Gate::authorize('viewAny', Division::class);

        return DivisionResource::collection(
            $this->service->paginate($request->validated())
        );
    }

    public function options()
    {
        Gate::authorize('viewAny', Division::class);

        return response()->json(['data' => DivisionName::options()]);
    }

    public function store(StoreDivisionRequest $request)
    {
        Gate::authorize('create', Division::class);

        $division = $this->service->create($request->validated());

        return response()->json([
            'message' => 'Divisi berhasil dibuat.',
            'data' => new DivisionResource($division),
        ], 201);
    }

    public function show(Division $division)
    {
        Gate::authorize('view', $division);

        return new DivisionResource($division->load('head')->loadCount('members'));
    }

    public function update(UpdateDivisionRequest $request, Division $division)
    {
        Gate::authorize('update', $division);

        $division = $this->service->update($division, $request->validated());

        return response()->json([
            'message' => 'Divisi berhasil diperbarui.',
            'data' => new DivisionResource($division),
        ]);
    }

    public function updateStatus(UpdateDivisionStatusRequest $request, Division $division)
    {
        Gate::authorize('updateStatus', $division);

        $division = $this->service->updateStatus($division, $request->validated('status'));

        return response()->json([
            'message' => $division->status === 'active'
                ? 'Divisi berhasil diaktifkan.'
                : 'Divisi berhasil dinonaktifkan.',
            'data' => new DivisionResource($division),
        ]);
    }
}
