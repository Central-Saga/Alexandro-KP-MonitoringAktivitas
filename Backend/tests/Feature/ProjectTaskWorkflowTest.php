<?php

namespace Tests\Feature;

use App\Enums\ProjectTaskStatus;
use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\ProjectTask;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProjectTaskWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(PermissionSeeder::class);
    }

    public function test_project_task_routes_require_authentication_and_have_no_delete_contract(): void
    {
        $this->getJson('/api/project-tasks')->assertUnauthorized();
        $this->postJson('/api/project-tasks', [])->assertUnauthorized();

        $admin = $this->makeUser('admin');
        $task = $this->makeTask($this->makeProject($this->makeUser('project_manager')), $this->makeUser('karyawan'), $admin);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/project-tasks/{$task->id}")->assertStatus(405);
        $this->assertDatabaseHas('project_tasks', ['id' => $task->id]);
    }

    public function test_role_scope_and_object_policy_are_enforced(): void
    {
        $admin = $this->makeUser('admin');
        $managerA = $this->makeUser('project_manager');
        $managerB = $this->makeUser('project_manager');
        $employeeA = $this->makeUser('karyawan');
        $employeeB = $this->makeUser('karyawan');
        $projectA = $this->makeProject($managerA, 'Project A');
        $projectB = $this->makeProject($managerB, 'Project B');
        $this->assign($projectA, $employeeA);
        $this->assign($projectB, $employeeB);
        $taskA = $this->makeTask($projectA, $employeeA, $managerA, 'Task A');
        $taskB = $this->makeTask($projectB, $employeeB, $managerB, 'Task B');

        Sanctum::actingAs($managerA);
        $this->getJson('/api/project-tasks')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $taskA->id);
        $this->getJson("/api/project-tasks/{$taskB->id}")->assertForbidden();
        $this->postJson('/api/project-tasks', $this->taskPayload($projectB, $employeeB))->assertForbidden();

        Sanctum::actingAs($employeeA);
        $this->getJson('/api/project-tasks')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $taskA->id);
        $this->getJson("/api/project-tasks/{$taskB->id}")->assertForbidden();
        $this->postJson('/api/project-tasks', $this->taskPayload($projectA, $employeeA))->assertForbidden();
        $this->putJson("/api/project-tasks/{$taskA->id}", ['title' => 'Tidak boleh'])->assertForbidden();
        $this->patchJson("/api/project-tasks/{$taskA->id}/status", ['status' => 'completed'])->assertForbidden();

        // Policy dijalankan sebelum validasi agar payload invalid tetap menghasilkan 403.
        $this->postJson('/api/project-tasks', [])->assertForbidden();
        $this->putJson("/api/project-tasks/{$taskA->id}", ['title' => ['invalid']])->assertForbidden();
        $this->patchJson("/api/project-tasks/{$taskA->id}/status", [])->assertForbidden();

        Sanctum::actingAs($admin);
        $this->getJson('/api/project-tasks')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_task_can_only_be_assigned_to_active_employee_with_active_project_membership(): void
    {
        $manager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager);
        $valid = $this->makeUser('karyawan');
        $inactiveUser = $this->makeUser('karyawan', ['is_active' => false]);
        $wrongRole = $this->makeUser('project_manager');
        $inactiveAssignment = $this->makeUser('karyawan');
        $foreignMember = $this->makeUser('karyawan');
        $otherProject = $this->makeProject($manager, 'Project Lain');
        $this->assign($project, $valid);
        $this->assign($project, $inactiveUser);
        $this->assign($project, $wrongRole);
        $this->assign($project, $inactiveAssignment, 'nonaktif');
        $this->assign($otherProject, $foreignMember);
        Sanctum::actingAs($manager);

        $response = $this->postJson('/api/project-tasks', $this->taskPayload($project, $valid))
            ->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.project.id', $project->id)
            ->assertJsonPath('data.assignee.email', $valid->email)
            ->assertJsonMissingPath('data.assignee.password');

        $this->assertDatabaseHas('project_tasks', [
            'id' => $response->json('data.id'),
            'assigned_to' => $valid->id,
            'created_by' => $manager->id,
            'status' => 'active',
        ]);

        foreach ([$inactiveUser, $wrongRole, $inactiveAssignment, $foreignMember] as $invalid) {
            $this->postJson('/api/project-tasks', $this->taskPayload($project, $invalid))
                ->assertUnprocessable()->assertJsonValidationErrors('assigned_to');
        }
    }

    public function test_active_task_can_be_updated_then_completed_or_cancelled_as_final_history(): void
    {
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        $this->assign($project, $employee);
        $task = $this->makeTask($project, $employee, $manager);
        $cancelled = $this->makeTask($project, $employee, $manager, 'Cancel Me');
        Sanctum::actingAs($manager);

        $this->putJson("/api/project-tasks/{$task->id}", [
            'title' => 'Task Diperbarui',
            'description' => 'Detail baru',
            'due_date' => '2026-09-01',
        ])->assertOk()->assertJsonPath('data.title', 'Task Diperbarui');

        $this->patchJson("/api/project-tasks/{$task->id}/status", ['status' => 'completed'])
            ->assertOk()->assertJsonPath('data.status', 'completed');
        $this->putJson("/api/project-tasks/{$task->id}", ['title' => 'Reopen'])->assertUnprocessable();
        $this->patchJson("/api/project-tasks/{$task->id}/status", ['status' => 'cancelled'])->assertUnprocessable();
        $this->patchJson("/api/project-tasks/{$task->id}/status", ['status' => 'active'])->assertUnprocessable();

        $this->patchJson("/api/project-tasks/{$cancelled->id}/status", ['status' => 'cancelled'])
            ->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertDatabaseCount('project_tasks', 2);
    }

    public function test_activity_task_link_requires_matching_active_task_and_assignment(): void
    {
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $otherEmployee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        $otherProject = $this->makeProject($manager, 'Project Lain');
        $assignment = $this->assign($project, $employee);
        $this->assign($project, $otherEmployee);
        $this->assign($otherProject, $employee);
        $validTask = $this->makeTask($project, $employee, $manager, 'Task Valid');
        $foreignTask = $this->makeTask($project, $otherEmployee, $manager, 'Task User Lain');
        $otherProjectTask = $this->makeTask($otherProject, $employee, $manager, 'Task Project Lain');
        $completedTask = $this->makeTask($project, $employee, $manager, 'Task Selesai', ProjectTaskStatus::COMPLETED);
        $cancelledTask = $this->makeTask($project, $employee, $manager, 'Task Batal', ProjectTaskStatus::CANCELLED);
        Sanctum::actingAs($employee);

        $response = $this->postJson('/api/activities', $this->activityPayload($project, $employee, $validTask))
            ->assertCreated()
            ->assertJsonPath('data.task.id', $validTask->id)
            ->assertJsonPath('data.task.title', 'Task Valid')
            ->assertJsonPath('data.task.status', 'active');
        $this->assertDatabaseHas('activities', [
            'id' => $response->json('data.id'),
            'project_task_id' => $validTask->id,
        ]);

        foreach ([$foreignTask, $otherProjectTask, $completedTask, $cancelledTask] as $invalidTask) {
            $this->postJson('/api/activities', $this->activityPayload($project, $employee, $invalidTask))
                ->assertUnprocessable()->assertJsonValidationErrors('project_task_id');
        }

        $assignment->update(['status' => 'nonaktif']);
        $this->postJson('/api/activities', $this->activityPayload($project, $employee, $validTask))
            ->assertForbidden();

        // Activity lama tanpa Task tetap valid dan tidak dipaksa bermigrasi.
        $legacy = Activity::query()->create([
            'user_id' => $employee->id,
            'project_id' => $project->id,
            'project_task_id' => null,
            'title' => 'Activity lama',
            'status' => 'pending',
            'activity_date' => '2026-08-20',
        ]);
        $this->assertNull($legacy->project_task_id);
    }

    public function test_task_mutation_refreshes_cached_activity_task_summary(): void
    {
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        $this->assign($project, $employee);
        $task = $this->makeTask($project, $employee, $manager, 'Judul Lama');
        Activity::query()->create([
            'user_id' => $employee->id,
            'project_id' => $project->id,
            'project_task_id' => $task->id,
            'title' => 'Activity',
            'status' => 'pending',
            'activity_date' => '2026-08-20',
        ]);
        Sanctum::actingAs($manager);

        $this->getJson('/api/activities')->assertOk()->assertJsonPath('data.0.task.title', 'Judul Lama');
        $this->putJson("/api/project-tasks/{$task->id}", ['title' => 'Judul Baru'])->assertOk();
        $this->getJson('/api/activities')->assertOk()->assertJsonPath('data.0.task.title', 'Judul Baru');
    }

    public function test_task_list_eager_loads_safe_relations_without_n_plus_one(): void
    {
        $admin = $this->makeUser('admin');
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        $this->assign($project, $employee);

        foreach (range(1, 8) as $index) {
            $this->makeTask($project, $employee, $manager, "Task {$index}");
        }

        Sanctum::actingAs($admin);
        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->getJson('/api/project-tasks?per_page=10')
            ->assertOk()
            ->assertJsonCount(8, 'data')
            ->assertJsonPath('data.0.assignee.email', $employee->email)
            ->assertJsonMissingPath('data.0.assignee.password');

        // Project, assignee/division, dan creator dimuat per collection,
        // sehingga jumlah query tidak bertambah untuk setiap baris Task.
        $this->assertLessThanOrEqual(10, count(DB::getQueryLog()));
        DB::disableQueryLog();
    }

    public function test_custom_role_with_task_view_permission_cannot_bypass_role_scope(): void
    {
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        $this->assign($project, $employee);
        $this->makeTask($project, $employee, $manager);

        $auditorRole = Role::create(['name' => 'auditor', 'guard_name' => 'web']);
        $auditorRole->givePermissionTo('project_task.view');
        $auditor = User::factory()->create();
        $auditor->syncRoles('auditor');
        Sanctum::actingAs($auditor);

        $this->getJson('/api/project-tasks')->assertForbidden();
    }

    private function makeUser(string $role, array $overrides = []): User
    {
        $user = User::factory()->create(['is_active' => true, ...$overrides]);
        $user->syncRoles($role);

        return $user;
    }

    private function makeProject(User $manager, string $name = 'Project Task'): Project
    {
        return Project::query()->create([
            'project_manager_id' => $manager->id,
            'name' => $name,
            'client_name' => 'Client',
            'start_date' => '2026-08-01',
            'status' => 'berlangsung',
        ]);
    }

    private function assign(Project $project, User $employee, string $status = 'aktif'): ProjectAssignment
    {
        return ProjectAssignment::query()->create([
            'project_id' => $project->id,
            'user_id' => $employee->id,
            'project_role' => 'Member',
            'start_date' => '2026-08-01',
            'status' => $status,
        ]);
    }

    private function makeTask(Project $project, User $employee, User $creator, string $title = 'Task', ProjectTaskStatus $status = ProjectTaskStatus::ACTIVE): ProjectTask
    {
        return ProjectTask::query()->create([
            'project_id' => $project->id,
            'assigned_to' => $employee->id,
            'created_by' => $creator->id,
            'title' => $title,
            'status' => $status,
        ]);
    }

    private function taskPayload(Project $project, User $employee): array
    {
        return [
            'project_id' => $project->id,
            'assigned_to' => $employee->id,
            'title' => 'Implementasi fitur',
            'description' => 'Detail Task',
            'due_date' => '2026-09-01',
        ];
    }

    private function activityPayload(Project $project, User $employee, ProjectTask $task): array
    {
        return [
            'project_id' => $project->id,
            'project_task_id' => $task->id,
            'user_id' => $employee->id,
            'title' => 'Catatan Activity',
            'description' => 'Progress harian',
            'status' => 'pending',
            'activity_date' => '2026-08-20',
        ];
    }
}
