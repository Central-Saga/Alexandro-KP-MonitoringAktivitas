<?php

namespace App\Http\Controllers;

use App\Contracts\Services\ProjectTaskServiceInterface;
use App\Enums\ProjectTaskStatus;
use App\Http\Requests\IndexProjectTaskRequest;
use App\Http\Requests\StoreProjectTaskRequest;
use App\Http\Requests\UpdateProjectTaskRequest;
use App\Http\Requests\UpdateProjectTaskStatusRequest;
use App\Http\Resources\ProjectTaskResource;
use App\Models\ProjectTask;
use Illuminate\Support\Facades\Gate;

class ProjectTaskController extends Controller
{
    public function __construct(protected ProjectTaskServiceInterface $service) {}

    public function index(IndexProjectTaskRequest $request)
    {
        Gate::authorize('viewAny', ProjectTask::class);

        return ProjectTaskResource::collection(
            $this->service->paginate($request->user(), $request->validated())
        );
    }

    public function store(StoreProjectTaskRequest $request)
    {
        Gate::authorize('create', ProjectTask::class);
        $task = $this->service->create($request->user(), $request->validated());
        activity('project_task')->causedBy($request->user())->performedOn($task)->event('created')
            ->withProperty('subject_name', $task->title)->log("Membuat tugas {$task->title}");

        return response()->json([
            'message' => 'Task berhasil diberikan.',
            'data' => new ProjectTaskResource($task),
        ], 201);
    }

    public function show(ProjectTask $projectTask)
    {
        $projectTask->load(['project', 'assignee.division', 'creator']);
        Gate::authorize('view', $projectTask);

        return new ProjectTaskResource($projectTask);
    }

    public function update(UpdateProjectTaskRequest $request, ProjectTask $projectTask)
    {
        $projectTask->load('project');
        Gate::authorize('update', $projectTask);
        $task = $this->service->update($request->user(), $projectTask, $request->validated());
        activity('project_task')->causedBy($request->user())->performedOn($task)->event('updated')
            ->withProperty('subject_name', $task->title)->log("Mengubah tugas {$task->title}");

        return response()->json([
            'message' => 'Task berhasil diperbarui.',
            'data' => new ProjectTaskResource($task),
        ]);
    }

    public function updateStatus(UpdateProjectTaskStatusRequest $request, ProjectTask $projectTask)
    {
        $projectTask->load('project');
        Gate::authorize('updateStatus', $projectTask);
        $task = $this->service->updateStatus(
            $request->user(),
            $projectTask,
            ProjectTaskStatus::from($request->validated('status')),
        );
        $statusLabel = $task->status === ProjectTaskStatus::COMPLETED ? 'Menyelesaikan' : 'Membatalkan';
        activity('project_task')->causedBy($request->user())->performedOn($task)->event('status_updated')
            ->withProperty('subject_name', $task->title)->log("{$statusLabel} tugas {$task->title}");

        return response()->json([
            'message' => 'Status Task berhasil diperbarui.',
            'data' => new ProjectTaskResource($task),
        ]);
    }
}
