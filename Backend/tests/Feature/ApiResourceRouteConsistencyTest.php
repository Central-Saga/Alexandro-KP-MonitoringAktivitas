<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Models\Activity;
use App\Models\Division;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiResourceRouteConsistencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_standard_and_custom_activity_routes_work_properly(): void
    {
        $admin = $this->makeUser('admin');
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        $this->assign($project, $employee);

        Sanctum::actingAs($employee);

        // POST /api/activities (store)
        $storeResponse = $this->postJson('/api/activities', [
            'project_id' => $project->id,
            'user_id' => $employee->id,
            'title' => 'Aktivitas Baru',
            'description' => 'Deskripsi Aktivitas',
            'activity_date' => '2026-08-20',
        ])->assertCreated();

        $activityId = $storeResponse->json('data.id');

        // GET /api/activities (index)
        $this->getJson('/api/activities')->assertOk()->assertJsonCount(1, 'data');

        // GET /api/activities/{id} (show)
        $this->getJson("/api/activities/{$activityId}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Aktivitas Baru');

        // Activity yang sedang menunggu validasi bersifat read-only untuk Karyawan.
        $this->putJson("/api/activities/{$activityId}", [
            'title' => 'Aktivitas Diperbarui',
        ])->assertForbidden();

        // POST /api/activities/{id}/media (custom action)
        $this->postJson("/api/activities/{$activityId}/media", [
            'file' => UploadedFile::fake()->create('bukti.jpg', 100, 'image/jpeg'),
        ])->assertCreated();

        // Ajukan aktivitas untuk direview
        Activity::query()->where('id', $activityId)->update(['status' => ActivityStatus::SELESAI]);

        // Custom action reject oleh PM
        Sanctum::actingAs($manager);
        $this->postJson("/api/activities/{$activityId}/reject", [
            'rejection_reason' => 'Perlu penyesuaian laporan.',
        ])->assertOk()->assertJsonPath('data.status', 'rejected');

        // PUT /api/activities/{id}: perbaiki dan kirim ulang setelah rejected.
        Sanctum::actingAs($employee);
        $this->putJson("/api/activities/{$activityId}", [
            'title' => 'Aktivitas Diperbarui',
        ])->assertOk()
            ->assertJsonPath('data.title', 'Aktivitas Diperbarui')
            ->assertJsonPath('data.status', 'selesai');

        // Approve setelah aktivitas benar-benar dikirim ulang.
        Sanctum::actingAs($manager);
        $this->postJson("/api/activities/{$activityId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        // DELETE /api/activities/{id} (destroy oleh Admin)
        Sanctum::actingAs($admin);
        $this->deleteJson("/api/activities/{$activityId}")->assertOk();
        $this->assertDatabaseMissing('activities', ['id' => $activityId]);
    }

    public function test_standard_project_routes_work_properly(): void
    {
        $admin = $this->makeUser('admin');
        $manager = $this->makeUser('project_manager');
        Sanctum::actingAs($admin);

        // POST /api/projects
        $createResponse = $this->postJson('/api/projects', [
            'name' => 'Proyek Alpha',
            'client_name' => 'PT Klien',
            'project_manager_id' => $manager->id,
            'start_date' => '2026-08-01',
        ])->assertCreated();

        $projectId = $createResponse->json('data.id');

        // GET /api/projects
        $this->getJson('/api/projects')->assertOk()->assertJsonCount(1, 'data');

        // GET /api/projects/{id}
        $this->getJson("/api/projects/{$projectId}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Proyek Alpha');

        // PUT /api/projects/{id}
        $this->putJson("/api/projects/{$projectId}", [
            'name' => 'Proyek Alpha Reborn',
        ])->assertOk()->assertJsonPath('data.name', 'Proyek Alpha Reborn');

        // DELETE /api/projects/{id}
        $this->deleteJson("/api/projects/{$projectId}")->assertOk();
        $this->assertDatabaseMissing('projects', ['id' => $projectId]);
    }

    public function test_standard_and_custom_project_task_routes_work_properly(): void
    {
        $admin = $this->makeUser('admin');
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        $this->assign($project, $employee);

        Sanctum::actingAs($manager);

        // POST /api/project-tasks
        $createResponse = $this->postJson('/api/project-tasks', [
            'project_id' => $project->id,
            'assigned_to' => $employee->id,
            'title' => 'Tugas 1',
            'description' => 'Deskripsi tugas',
        ])->assertCreated();

        $taskId = $createResponse->json('data.id');

        // GET /api/project-tasks
        $this->getJson('/api/project-tasks')->assertOk()->assertJsonCount(1, 'data');

        // GET /api/project-tasks/{id}
        $this->getJson("/api/project-tasks/{$taskId}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Tugas 1');

        // PUT /api/project-tasks/{id}
        $this->putJson("/api/project-tasks/{$taskId}", [
            'title' => 'Tugas 1 Revisi',
        ])->assertOk()->assertJsonPath('data.title', 'Tugas 1 Revisi');

        // PATCH /api/project-tasks/{id}/status (custom action)
        $this->patchJson("/api/project-tasks/{$taskId}/status", [
            'status' => 'completed',
        ])->assertOk()->assertJsonPath('data.status', 'completed');

        // DELETE /api/project-tasks/{id} harus 405 (tidak diekspos)
        Sanctum::actingAs($admin);
        $this->deleteJson("/api/project-tasks/{$taskId}")->assertStatus(405);
    }

    public function test_user_and_division_routes_enforce_supported_actions(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        // User CRUD + status
        $userResponse = $this->postJson('/api/users', [
            'name' => 'Budi Santoso',
            'email' => 'budi@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'karyawan',
        ])->assertCreated();

        $userId = $userResponse->json('data.id');
        $this->getJson('/api/users')->assertOk();
        $this->getJson("/api/users/{$userId}")->assertOk()->assertJsonPath('data.name', 'Budi Santoso');
        $this->putJson("/api/users/{$userId}", [
            'name' => 'Budi Diperbarui',
            'email' => 'budi@example.com',
            'role' => 'karyawan',
        ])->assertOk()->assertJsonPath('data.name', 'Budi Diperbarui');
        $this->patchJson("/api/users/{$userId}/status", [
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.is_active', false);
        $this->deleteJson("/api/users/{$userId}")->assertStatus(405);

        // Division CRUD + options + status
        $this->getJson('/api/divisions/options')->assertOk()->assertJsonStructure(['data']);
        $divResponse = $this->postJson('/api/divisions', [
            'name' => 'Frontend',
            'description' => 'Divisi Rekayasa',
        ])->assertCreated();

        $divisionId = $divResponse->json('data.id');
        $this->getJson('/api/divisions')->assertOk();
        $this->getJson("/api/divisions/{$divisionId}")->assertOk()->assertJsonPath('data.name', 'Frontend');
        $this->putJson("/api/divisions/{$divisionId}", [
            'name' => 'Frontend',
            'description' => 'Divisi Rekayasa Software',
        ])->assertOk()->assertJsonPath('data.description', 'Divisi Rekayasa Software');
        $this->patchJson("/api/divisions/{$divisionId}/status", [
            'status' => 'inactive',
        ])->assertOk()->assertJsonPath('data.status', 'inactive');
        $this->deleteJson("/api/divisions/{$divisionId}")->assertStatus(405);
    }

    public function test_project_assignment_delete_is_not_allowed_and_deactivation_uses_put(): void
    {
        $admin = $this->makeUser('admin');
        $managerA = $this->makeUser('project_manager');
        $managerB = $this->makeUser('project_manager');
        $employeeA = $this->makeUser('karyawan');
        $employeeB = $this->makeUser('karyawan');

        $projectA = $this->makeProject($managerA);
        $projectB = $this->makeProject($managerB);

        $assignmentA = ProjectAssignment::create([
            'project_id' => $projectA->id,
            'user_id' => $employeeA->id,
            'project_role' => 'Frontend Dev',
            'start_date' => '2026-08-01',
            'status' => 'aktif',
        ]);

        $assignmentB = ProjectAssignment::create([
            'project_id' => $projectB->id,
            'user_id' => $employeeB->id,
            'project_role' => 'Backend Dev',
            'start_date' => '2026-08-01',
            'status' => 'aktif',
        ]);

        // 1. DELETE endpoint untuk assignment sengaja tidak diekspos (405 Method Not Allowed)
        Sanctum::actingAs($admin);
        $this->deleteJson("/api/projects/{$projectA->id}/assignments/{$assignmentA->id}")
            ->assertStatus(405);

        Sanctum::actingAs($managerA);
        $this->deleteJson("/api/projects/{$projectA->id}/assignments/{$assignmentA->id}")
            ->assertStatus(405);

        Sanctum::actingAs($employeeA);
        $this->deleteJson("/api/projects/{$projectA->id}/assignments/{$assignmentA->id}")
            ->assertStatus(405);

        // 2. Karyawan tidak diizinkan mengubah status assignment (403)
        $this->putJson("/api/projects/{$projectA->id}/assignments/{$assignmentA->id}", [
            'status' => 'nonaktif',
        ])->assertForbidden();

        // 3. PM yang tidak mengelola project terkait menerima 403 Forbidden
        Sanctum::actingAs($managerB);
        $this->putJson("/api/projects/{$projectA->id}/assignments/{$assignmentA->id}", [
            'status' => 'nonaktif',
        ])->assertForbidden();

        // 4. Owning PM dapat menonaktifkan assignment pada project miliknya via PUT
        Sanctum::actingAs($managerA);
        $this->putJson("/api/projects/{$projectA->id}/assignments/{$assignmentA->id}", [
            'status' => 'nonaktif',
        ])->assertOk()->assertJsonPath('data.status', 'nonaktif');

        $this->assertDatabaseHas('project_assignments', [
            'id' => $assignmentA->id,
            'status' => 'nonaktif',
        ]);

        // 5. Admin dapat menonaktifkan assignment pada project apapun via PUT
        Sanctum::actingAs($admin);
        $this->putJson("/api/projects/{$projectB->id}/assignments/{$assignmentB->id}", [
            'status' => 'nonaktif',
        ])->assertOk()->assertJsonPath('data.status', 'nonaktif');

        $this->assertDatabaseHas('project_assignments', [
            'id' => $assignmentB->id,
            'status' => 'nonaktif',
        ]);
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
            'name' => 'Proyek Uji '.uniqid(),
            'client_name' => 'Klien Uji',
            'start_date' => '2026-01-01',
            'status' => 'berlangsung',
        ]);
    }

    private function assign(Project $project, User $user): ProjectAssignment
    {
        return ProjectAssignment::query()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'project_role' => 'Member',
            'start_date' => '2026-01-01',
            'status' => 'aktif',
        ]);
    }
}
