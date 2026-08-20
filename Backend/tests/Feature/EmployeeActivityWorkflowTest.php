<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class EmployeeActivityWorkflowTest extends TestCase
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

    public function test_employee_project_list_and_detail_only_include_active_assignments(): void
    {
        $employee = $this->makeUser('karyawan');
        $otherEmployee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $activeProject = $this->makeProject($manager, 'Active Assignment');
        $inactiveProject = $this->makeProject($manager, 'Inactive Assignment');
        $foreignProject = $this->makeProject($manager, 'Foreign Assignment');
        $this->assign($activeProject, $employee, 'aktif');
        $this->assign($activeProject, $otherEmployee, 'aktif');
        $this->assign($inactiveProject, $employee, 'nonaktif');
        $this->assign($foreignProject, $otherEmployee, 'aktif');
        Sanctum::actingAs($employee);

        $this->getJson('/api/projects')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activeProject->id);

        $this->getJson("/api/projects/{$activeProject->id}")->assertOk()
            ->assertJsonCount(1, 'data.assignments')
            ->assertJsonPath('data.assignments.0.user_id', $employee->id);
        $this->getJson("/api/projects/{$inactiveProject->id}")->assertForbidden();
        $this->getJson("/api/projects/{$foreignProject->id}")->assertForbidden();
    }

    public function test_employee_create_requires_active_assignment_and_forces_session_user(): void
    {
        $employee = $this->makeUser('karyawan');
        $otherEmployee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $activeProject = $this->makeProject($manager, 'Active');
        $inactiveProject = $this->makeProject($manager, 'Inactive');
        $foreignProject = $this->makeProject($manager, 'Foreign');
        $this->assign($activeProject, $employee, 'aktif');
        $this->assign($inactiveProject, $employee, 'nonaktif');
        Sanctum::actingAs($employee);

        $response = $this->postJson('/api/activities', $this->activityPayload(
            $activeProject,
            [
                'user_id' => $otherEmployee->id,
                'status' => 'selesai',
            ]
        ))->assertCreated()
            ->assertJsonPath('data.user_id', $employee->id)
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('activities', [
            'id' => $response->json('data.id'),
            'user_id' => $employee->id,
            'project_id' => $activeProject->id,
            'status' => 'pending',
        ]);

        foreach ([$inactiveProject, $foreignProject] as $project) {
            $this->postJson('/api/activities', $this->activityPayload($project, ['user_id' => $employee->id]))
                ->assertForbidden();
        }
    }

    public function test_employee_cannot_set_review_status_or_edit_another_users_activity(): void
    {
        $employee = $this->makeUser('karyawan');
        $otherEmployee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager, 'Scoped');
        $this->assign($project, $employee, 'aktif');
        $this->assign($project, $otherEmployee, 'aktif');
        $own = $this->makeActivity($employee, $project, ActivityStatus::ONGOING);
        $other = $this->makeActivity($otherEmployee, $project, ActivityStatus::ONGOING);
        Sanctum::actingAs($employee);

        $this->getJson('/api/activities?date_to=2026-08-31&per_page=100')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);

        foreach (['approved', 'rejected'] as $status) {
            $this->putJson("/api/activities/{$own->id}", ['status' => $status])
                ->assertUnprocessable()->assertJsonValidationErrors('status');
            $this->postJson('/api/activities', $this->activityPayload($project, [
                'user_id' => $employee->id,
                'status' => $status,
            ]))
                ->assertUnprocessable()->assertJsonValidationErrors('status');
        }

        $this->putJson("/api/activities/{$other->id}", ['title' => 'Unauthorized'])
            ->assertForbidden();
        $this->postJson("/api/activities/{$own->id}/approve")->assertForbidden();
        $this->postJson("/api/activities/{$own->id}/reject", ['rejection_reason' => 'Self review'])
            ->assertForbidden();
    }

    public function test_rejected_activity_can_be_revised_but_approved_activity_is_final_for_employee(): void
    {
        $employee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager, 'Review');
        $this->assign($project, $employee, 'aktif');
        $rejected = $this->makeActivity($employee, $project, ActivityStatus::REJECTED);
        $approved = $this->makeActivity($employee, $project, ActivityStatus::APPROVED);
        Sanctum::actingAs($employee);

        $this->putJson("/api/activities/{$rejected->id}", [
            'title' => 'Bukti diperbaiki',
            'status' => 'selesai',
        ])->assertOk()->assertJsonPath('data.status', 'selesai');

        $this->putJson("/api/activities/{$approved->id}", ['title' => 'Tidak boleh berubah'])
            ->assertForbidden();
    }

    public function test_employee_owner_can_upload_media_with_size_validation(): void
    {
        Storage::fake('public');
        $employee = $this->makeUser('karyawan');
        $otherEmployee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager, 'Media');
        $activity = $this->makeActivity($employee, $project, ActivityStatus::ONGOING);
        $otherActivity = $this->makeActivity($otherEmployee, $project, ActivityStatus::ONGOING);
        Sanctum::actingAs($employee);

        $this->post("/api/activities/{$activity->id}/media", [
            'file' => UploadedFile::fake()->create('evidence.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json'])->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'file_name', 'mime_type', 'size', 'url']]);

        $this->post("/api/activities/{$activity->id}/media", [
            'file' => UploadedFile::fake()->create('oversize.pdf', 10241, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->post("/api/activities/{$otherActivity->id}/media", [
            'file' => UploadedFile::fake()->create('foreign.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json'])->assertForbidden();
    }

    private function makeUser(string $role): User
    {
        $user = User::factory()->create();
        $user->syncRoles($role);

        return $user;
    }

    private function makeProject(User $manager, string $name): Project
    {
        return Project::query()->create([
            'project_manager_id' => $manager->id,
            'name' => $name,
            'client_name' => 'Client',
            'start_date' => '2026-08-01',
            'status' => 'berlangsung',
        ]);
    }

    private function assign(Project $project, User $employee, string $status): ProjectAssignment
    {
        return ProjectAssignment::query()->create([
            'project_id' => $project->id,
            'user_id' => $employee->id,
            'project_role' => 'Member',
            'start_date' => '2026-08-01',
            'status' => $status,
        ]);
    }

    private function makeActivity(User $employee, Project $project, ActivityStatus $status): Activity
    {
        return Activity::query()->create([
            'user_id' => $employee->id,
            'project_id' => $project->id,
            'title' => fake()->unique()->sentence(3),
            'status' => $status,
            'activity_date' => '2026-08-19',
        ]);
    }

    private function activityPayload(Project $project, array $overrides = []): array
    {
        return [
            'project_id' => $project->id,
            'user_id' => $overrides['user_id'] ?? 999999,
            'title' => 'Aktivitas Karyawan',
            'description' => 'Deskripsi aktivitas',
            'status' => 'pending',
            'activity_date' => '2026-08-19',
            ...$overrides,
        ];
    }
}
