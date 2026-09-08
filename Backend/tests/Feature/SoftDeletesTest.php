<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Enums\ProjectTaskStatus;
use App\Models\Activity;
use App\Models\Division;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SoftDeletesTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_six_models_use_soft_deletes_trait(): void
    {
        $models = [
            User::class,
            Division::class,
            Project::class,
            ProjectAssignment::class,
            ProjectTask::class,
            Activity::class,
        ];

        foreach ($models as $modelClass) {
            $traits = class_uses_recursive($modelClass);
            $this->assertArrayHasKey(
                SoftDeletes::class,
                $traits,
                "Model [{$modelClass}] must use the SoftDeletes trait."
            );
        }
    }

    public function test_user_model_supports_soft_deletes(): void
    {
        $user = User::factory()->create();

        $user->delete();

        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertNull(User::query()->find($user->id));
        $this->assertNotNull(User::withTrashed()->find($user->id));

        $user->restore();

        $this->assertNotSoftDeleted('users', ['id' => $user->id]);
        $this->assertNotNull(User::query()->find($user->id));
    }

    public function test_division_model_supports_soft_deletes(): void
    {
        $head = User::factory()->create();
        $division = Division::create([
            'name' => 'IT Engineering',
            'description' => 'Software and Infrastructure team',
            'status' => 'aktif',
            'head_user_id' => $head->id,
        ]);

        $division->delete();

        $this->assertSoftDeleted('divisions', ['id' => $division->id]);
        $this->assertNull(Division::query()->find($division->id));
        $this->assertNotNull(Division::withTrashed()->find($division->id));

        $division->restore();

        $this->assertNotSoftDeleted('divisions', ['id' => $division->id]);
        $this->assertNotNull(Division::query()->find($division->id));
    }

    public function test_project_model_supports_soft_deletes(): void
    {
        $pm = User::factory()->create();
        $project = Project::create([
            'project_manager_id' => $pm->id,
            'name' => 'CSM Core System',
            'client_name' => 'Internal CSM',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $project->delete();

        $this->assertSoftDeleted('projects', ['id' => $project->id]);
        $this->assertNull(Project::query()->find($project->id));
        $this->assertNotNull(Project::withTrashed()->find($project->id));

        $project->restore();

        $this->assertNotSoftDeleted('projects', ['id' => $project->id]);
        $this->assertNotNull(Project::query()->find($project->id));
    }

    public function test_project_assignment_model_supports_soft_deletes(): void
    {
        $pm = User::factory()->create();
        $user = User::factory()->create();
        $project = Project::create([
            'project_manager_id' => $pm->id,
            'name' => 'CSM Core System',
            'client_name' => 'Internal CSM',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $assignment = ProjectAssignment::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'project_role' => 'Fullstack Developer',
            'start_date' => '2026-09-01',
            'status' => 'aktif',
        ]);

        $assignment->delete();

        $this->assertSoftDeleted('project_assignments', ['id' => $assignment->id]);
        $this->assertNull(ProjectAssignment::query()->find($assignment->id));
        $this->assertNotNull(ProjectAssignment::withTrashed()->find($assignment->id));

        $assignment->restore();

        $this->assertNotSoftDeleted('project_assignments', ['id' => $assignment->id]);
        $this->assertNotNull(ProjectAssignment::query()->find($assignment->id));
    }

    public function test_project_task_model_supports_soft_deletes(): void
    {
        $pm = User::factory()->create();
        $user = User::factory()->create();
        $project = Project::create([
            'project_manager_id' => $pm->id,
            'name' => 'CSM Core System',
            'client_name' => 'Internal CSM',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $task = ProjectTask::create([
            'project_id' => $project->id,
            'assigned_to' => $user->id,
            'created_by' => $pm->id,
            'title' => 'Setup CI/CD Pipeline',
            'description' => 'Configure GitHub Actions for automated deployment',
            'due_date' => '2026-09-15',
            'status' => ProjectTaskStatus::ACTIVE,
        ]);

        $task->delete();

        $this->assertSoftDeleted('project_tasks', ['id' => $task->id]);
        $this->assertNull(ProjectTask::query()->find($task->id));
        $this->assertNotNull(ProjectTask::withTrashed()->find($task->id));

        $task->restore();

        $this->assertNotSoftDeleted('project_tasks', ['id' => $task->id]);
        $this->assertNotNull(ProjectTask::query()->find($task->id));
    }

    public function test_activity_model_supports_soft_deletes(): void
    {
        $user = User::factory()->create();
        $project = Project::create([
            'project_manager_id' => $user->id,
            'name' => 'CSM Core System',
            'client_name' => 'Internal CSM',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $activity = Activity::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Daily Monitoring Update',
            'description' => 'Checking service uptime and status metrics',
            'status' => ActivityStatus::PENDING,
            'activity_date' => '2026-09-08',
        ]);

        $activity->delete();

        $this->assertSoftDeleted('activities', ['id' => $activity->id]);
        $this->assertNull(Activity::query()->find($activity->id));
        $this->assertNotNull(Activity::withTrashed()->find($activity->id));

        $activity->restore();

        $this->assertNotSoftDeleted('activities', ['id' => $activity->id]);
        $this->assertNotNull(Activity::query()->find($activity->id));
    }
}
