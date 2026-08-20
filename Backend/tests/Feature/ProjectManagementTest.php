<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProjectManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['admin', 'project_manager', 'karyawan'] as $role) {
            Role::query()->create(['name' => $role, 'guard_name' => 'web']);
        }
    }

    public function test_project_routes_require_authentication_and_employee_list_is_safely_scoped(): void
    {
        $this->getJson('/api/projects')->assertUnauthorized();

        Sanctum::actingAs($this->makeUser('karyawan'));
        $this->getJson('/api/projects')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/projects', $this->projectPayload($this->makeUser('project_manager')))
            ->assertForbidden();
    }

    public function test_admin_can_create_and_update_project_with_active_project_manager(): void
    {
        $admin = $this->makeUser('admin');
        $managerA = $this->makeUser('project_manager');
        $managerB = $this->makeUser('project_manager');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/projects', $this->projectPayload($managerA))
            ->assertCreated()
            ->assertJsonPath('data.project_manager.id', $managerA->id)
            ->assertJsonPath('data.active_assignments_count', 0);

        $projectId = $response->json('data.id');

        $this->putJson("/api/projects/{$projectId}", [
            'name' => 'Project Revisi',
            'project_manager_id' => $managerB->id,
            'status' => 'selesai',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Project Revisi')
            ->assertJsonPath('data.project_manager.id', $managerB->id)
            ->assertJsonPath('data.status', 'selesai');
    }

    public function test_invalid_or_inactive_project_manager_is_rejected(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        foreach ([
            $this->makeUser('karyawan'),
            $this->makeUser('project_manager', ['is_active' => false]),
        ] as $candidate) {
            $this->postJson('/api/projects', $this->projectPayload($candidate))
                ->assertUnprocessable()
                ->assertJsonValidationErrors('project_manager_id');
        }
    }

    public function test_admin_manages_assignment_lifecycle_for_active_employee_only(): void
    {
        $admin = $this->makeUser('admin');
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/projects/{$project->id}/assignments", [
            'user_id' => $employee->id,
            'project_role' => 'Developer',
            'start_date' => '2026-08-01',
        ])->assertCreated()
            ->assertJsonPath('data.user.name', $employee->name)
            ->assertJsonPath('data.user.role', 'karyawan')
            ->assertJsonMissingPath('data.user.email')
            ->assertJsonMissingPath('data.user.password');

        $assignmentId = $response->json('data.id');

        $duplicatePayload = [
            'user_id' => $employee->id,
            'project_role' => 'Developer',
            'start_date' => '2026-08-01',
        ];
        $this->postJson("/api/projects/{$project->id}/assignments", $duplicatePayload)
            ->assertUnprocessable()->assertJsonValidationErrors('user_id');

        $this->putJson("/api/projects/{$project->id}/assignments/{$assignmentId}", [
            'status' => 'nonaktif',
        ])->assertOk()->assertJsonPath('data.status', 'nonaktif');

        $this->assertDatabaseHas('project_assignments', [
            'id' => $assignmentId,
            'status' => 'nonaktif',
        ]);
        $this->postJson("/api/projects/{$project->id}/assignments", $duplicatePayload)
            ->assertUnprocessable()->assertJsonValidationErrors('user_id');

        // Lifecycle assignment tidak menyediakan hard delete karena histori
        // aktivitas bergantung pada relasi ini.
        $this->deleteJson("/api/projects/{$project->id}/assignments/{$assignmentId}")
            ->assertStatus(405);
        $this->assertDatabaseHas('project_assignments', ['id' => $assignmentId]);

        $employee->update(['is_active' => false]);
        $this->putJson("/api/projects/{$project->id}/assignments/{$assignmentId}", [
            'status' => 'aktif',
        ])->assertUnprocessable()->assertJsonValidationErrors('status');

        foreach ([
            $this->makeUser('admin'),
            $this->makeUser('project_manager'),
            $this->makeUser('karyawan', ['is_active' => false]),
        ] as $invalidMember) {
            $this->postJson("/api/projects/{$project->id}/assignments", [
                'user_id' => $invalidMember->id,
                'project_role' => 'Member',
                'start_date' => '2026-08-01',
            ])->assertUnprocessable()->assertJsonValidationErrors('user_id');
        }
    }

    public function test_project_manager_cannot_manage_another_managers_project(): void
    {
        $manager = $this->makeUser('project_manager');
        $otherManager = $this->makeUser('project_manager');
        $project = $this->makeProject($otherManager);
        $employee = $this->makeUser('karyawan');
        Sanctum::actingAs($manager);

        $this->getJson("/api/projects/{$project->id}")->assertForbidden();
        $this->postJson("/api/projects/{$project->id}/assignments", [
            'user_id' => $employee->id,
            'project_role' => 'Member',
            'start_date' => '2026-08-01',
        ])->assertForbidden();
    }

    public function test_project_manager_can_update_own_project_but_cannot_create_delete_or_reassign_it(): void
    {
        $manager = $this->makeUser('project_manager');
        $otherManager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager);
        Sanctum::actingAs($manager);

        $this->postJson('/api/projects', $this->projectPayload($manager))
            ->assertForbidden();

        $this->putJson("/api/projects/{$project->id}", [
            'name' => 'Project Diperbarui PM',
            'project_manager_id' => $otherManager->id,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Project Diperbarui PM')
            ->assertJsonPath('data.project_manager.id', $manager->id);

        $this->deleteJson("/api/projects/{$project->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'project_manager_id' => $manager->id,
        ]);
    }

    public function test_assigned_employee_cannot_update_project(): void
    {
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        ProjectAssignment::query()->create([
            'project_id' => $project->id,
            'user_id' => $employee->id,
            'project_role' => 'Member',
            'start_date' => '2026-08-01',
            'status' => 'aktif',
        ]);
        Sanctum::actingAs($employee);

        $this->putJson("/api/projects/{$project->id}", [
            'name' => 'Tidak Boleh Berubah',
        ])->assertForbidden();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => 'Project Audit',
        ]);
    }

    public function test_assignment_candidates_are_active_unassigned_employees_in_managed_project(): void
    {
        $manager = $this->makeUser('project_manager');
        $otherManager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager);
        $foreignProject = $this->makeProject($otherManager);
        $candidate = $this->makeUser('karyawan');
        $assigned = $this->makeUser('karyawan');
        $inactive = $this->makeUser('karyawan', ['is_active' => false]);
        $admin = $this->makeUser('admin');
        ProjectAssignment::query()->create([
            'project_id' => $project->id,
            'user_id' => $assigned->id,
            'project_role' => 'Member',
            'start_date' => '2026-08-01',
            'status' => 'aktif',
        ]);
        Sanctum::actingAs($manager);

        $response = $this->getJson("/api/projects/{$project->id}/assignment-candidates")
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $candidate->id)
            ->assertJsonPath('data.0.email', $candidate->email);

        foreach (['password', 'role', 'is_active'] as $field) {
            $response->assertJsonMissingPath("data.0.{$field}");
        }
        $this->assertNotSame($inactive->id, $response->json('data.0.id'));
        $this->assertNotSame($admin->id, $response->json('data.0.id'));
        $this->getJson("/api/projects/{$foreignProject->id}/assignment-candidates")
            ->assertForbidden();

        Sanctum::actingAs($assigned);
        $this->getJson("/api/projects/{$project->id}/assignment-candidates")
            ->assertForbidden();
    }

    public function test_project_manager_scope_changes_immediately_after_reassignment(): void
    {
        $admin = $this->makeUser('admin');
        $managerA = $this->makeUser('project_manager');
        $managerB = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($managerA);
        $assignment = ProjectAssignment::query()->create([
            'project_id' => $project->id,
            'user_id' => $employee->id,
            'project_role' => 'Member',
            'start_date' => '2026-08-01',
            'status' => 'aktif',
        ]);
        Activity::query()->create([
            'project_id' => $project->id,
            'user_id' => $employee->id,
            'title' => 'Scoped activity',
            'activity_date' => '2026-08-02',
            'status' => 'selesai',
        ]);

        Sanctum::actingAs($managerA);
        $this->getJson('/api/projects')->assertJsonCount(1, 'data');
        $this->getJson('/api/activities')->assertJsonCount(1, 'data');

        Sanctum::actingAs($admin);
        $this->putJson("/api/projects/{$project->id}", [
            'project_manager_id' => $managerB->id,
        ])->assertOk();

        Sanctum::actingAs($managerA);
        $this->getJson('/api/projects')->assertJsonCount(0, 'data');
        $this->getJson('/api/activities')->assertJsonCount(0, 'data');

        Sanctum::actingAs($managerB);
        $this->getJson('/api/projects')->assertJsonCount(1, 'data');
        $this->getJson('/api/activities')->assertJsonCount(1, 'data');

        Sanctum::actingAs($admin);
        $this->putJson("/api/projects/{$project->id}/assignments/{$assignment->id}", [
            'status' => 'nonaktif',
        ])->assertOk();

        Sanctum::actingAs($managerB);
        $this->getJson('/api/activities')->assertJsonCount(0, 'data');

        Sanctum::actingAs($admin);
        $this->putJson("/api/projects/{$project->id}/assignments/{$assignment->id}", [
            'status' => 'aktif',
        ])->assertOk();

        Sanctum::actingAs($managerB);
        $this->getJson('/api/activities')->assertJsonCount(1, 'data');
    }

    private function makeUser(string $role, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->syncRoles($role);

        return $user;
    }

    private function makeProject(User $manager): Project
    {
        return Project::query()->create([
            'project_manager_id' => $manager->id,
            'name' => 'Project Audit',
            'client_name' => 'Client',
            'start_date' => '2026-08-01',
            'status' => 'berlangsung',
        ]);
    }

    private function projectPayload(User $manager): array
    {
        return [
            'project_manager_id' => $manager->id,
            'name' => 'Project Baru',
            'client_name' => 'Client Baru',
            'start_date' => '2026-08-01',
            'end_date' => '2026-12-31',
            'status' => 'berlangsung',
        ];
    }
}
