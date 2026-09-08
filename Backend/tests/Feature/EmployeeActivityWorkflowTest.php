<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use App\Notifications\ActivityResubmittedNotification;
use App\Notifications\ActivityRevisionRequestedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity as ActivityLog;
use Spatie\Permission\Models\Permission;
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

        foreach (['activity.approve', 'activity.reject'] as $permission) {
            Permission::query()->create(['name' => $permission, 'guard_name' => 'web']);
        }

        foreach (['admin', 'project_manager', 'karyawan'] as $role) {
            Role::query()->create(['name' => $role, 'guard_name' => 'web']);
        }

        Role::findByName('admin')->syncPermissions(['activity.approve', 'activity.reject']);
        Role::findByName('project_manager')->syncPermissions(['activity.approve', 'activity.reject']);
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
                'status' => 'pending',
            ]
        ))->assertCreated()
            ->assertJsonPath('data.user_id', $employee->id)
            ->assertJsonPath('data.status', 'selesai');

        $this->assertDatabaseHas('activities', [
            'id' => $response->json('data.id'),
            'user_id' => $employee->id,
            'project_id' => $activeProject->id,
            'status' => 'selesai',
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
                ->assertForbidden();
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

    public function test_employee_today_summary_counts_only_own_activities_for_requested_date(): void
    {
        $employee = $this->makeUser('karyawan');
        $otherEmployee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager, 'Summary');

        foreach ([
            ActivityStatus::SELESAI,
            ActivityStatus::SELESAI,
            ActivityStatus::APPROVED,
            ActivityStatus::REJECTED,
        ] as $status) {
            $this->makeActivity($employee, $project, $status)
                ->update(['activity_date' => '2026-08-31']);
        }

        $this->makeActivity($employee, $project, ActivityStatus::APPROVED);
        $this->makeActivity($otherEmployee, $project, ActivityStatus::REJECTED)
            ->update(['activity_date' => '2026-08-31']);

        Sanctum::actingAs($employee);

        $this->getJson('/api/activities/summary/today?date=2026-08-31')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'total' => 4,
                    'waiting_validation' => 2,
                    'approved' => 1,
                    'needs_revision' => 1,
                ],
            ]);

        $this->getJson('/api/activities/summary/today?date=2026-09-01')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'total' => 0,
                    'waiting_validation' => 0,
                    'approved' => 0,
                    'needs_revision' => 0,
                ],
            ]);
    }

    public function test_employee_actionable_revisions_are_scoped_unbounded_by_date_and_disappear_after_resubmit(): void
    {
        $employee = $this->makeUser('karyawan');
        $otherEmployee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager, 'Actionable Dashboard');
        $this->assign($project, $employee, 'aktif');

        $rejected = $this->makeActivity($employee, $project, ActivityStatus::REJECTED);
        $rejected->update([
            'activity_date' => '2026-08-20',
            'rejection_reason' => 'Tambahkan screenshot hasil testing.',
            'rejected_by' => $manager->id,
            'rejected_at' => '2026-08-31 07:42:00',
        ]);
        $rejected->reviews()->create([
            'actor_id' => $manager->id,
            'action' => 'revision_requested',
            'note' => 'Tambahkan screenshot hasil testing.',
        ]);

        $this->makeActivity($otherEmployee, $project, ActivityStatus::REJECTED);
        $this->makeActivity($employee, $project, ActivityStatus::SELESAI);
        $this->makeActivity($employee, $project, ActivityStatus::APPROVED);

        Sanctum::actingAs($employee);

        $this->getJson('/api/activities?status=rejected&page=1&per_page=3')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $rejected->id)
            ->assertJsonPath('data.0.activity_date', '2026-08-20T00:00:00.000000Z')
            ->assertJsonPath('data.0.review_history.0.action', 'revision_requested')
            ->assertJsonPath('data.0.review_history.0.note', 'Tambahkan screenshot hasil testing.')
            ->assertJsonPath('data.0.review_history.0.actor.name', $manager->name);

        $this->putJson("/api/activities/{$rejected->id}", [
            'title' => 'Aktivitas sudah diperbaiki',
        ])->assertOk()->assertJsonPath('data.status', 'selesai');

        $this->getJson('/api/activities?status=rejected&page=1&per_page=3')
            ->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonCount(0, 'data');
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
        ])->assertOk()->assertJsonPath('data.status', 'selesai');

        $this->putJson("/api/activities/{$approved->id}", ['title' => 'Tidak boleh berubah'])
            ->assertForbidden();
    }

    public function test_karyawan_activity_lifecycle_create_pm_review_revision_and_resubmit(): void
    {
        $employee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager, 'Workflow Project');
        $this->assign($project, $employee, 'aktif');

        // 1. Karyawan creates Activity -> status is selesai (Menunggu Validasi)
        Sanctum::actingAs($employee);
        $createResponse = $this->postJson('/api/activities', [
            'project_id' => $project->id,
            'user_id' => $employee->id,
            'title' => 'Daily Task Submission',
            'description' => 'Mengerjakan fitur validasi',
            'activity_date' => '2026-08-21',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'selesai')
            ->assertJsonPath('data.user_id', $employee->id);

        $activityId = $createResponse->json('data.id');

        // 2. PM managing that project retrieves it in validation queue (status=selesai)
        Sanctum::actingAs($manager);
        $this->getJson('/api/activities?status=selesai')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activityId)
            ->assertJsonPath('data.0.status', 'selesai');

        // 3. PM requests revision -> status is rejected with reason
        $this->postJson("/api/activities/{$activityId}/reject", [
            'rejection_reason' => 'Mohon sertakan rincian langkah kerja.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'Mohon sertakan rincian langkah kerja.')
            ->assertJsonPath('data.rejected_by.id', $manager->id);

        // 4. Karyawan edits rejected Activity and resubmits -> status returns to selesai
        Sanctum::actingAs($employee);
        $this->putJson("/api/activities/{$activityId}", [
            'title' => 'Daily Task Submission (Revisi)',
            'description' => 'Mengerjakan fitur validasi dengan rincian lengkap',
        ])->assertOk()
            ->assertJsonPath('data.status', 'selesai')
            ->assertJsonPath('data.title', 'Daily Task Submission (Revisi)');

        // 5. Activity returns to PM validation queue
        Sanctum::actingAs($manager);
        $this->getJson('/api/activities?status=selesai')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activityId)
            ->assertJsonPath('data.0.status', 'selesai');

        // 6. PM approves -> status is approved
        $this->postJson("/api/activities/{$activityId}/approve")->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.approved_by.id', $manager->id)
            ->assertJsonPath('data.rejection_reason', null);

        // 7. Approved Activity cannot be edited by employee
        Sanctum::actingAs($employee);
        $this->putJson("/api/activities/{$activityId}", [
            'title' => 'Mencoba ubah aktivitas yang sudah disetujui',
        ])->assertForbidden();
    }

    public function test_multiple_revision_cycles_preserve_history_notifications_and_account_audit(): void
    {
        Notification::fake();
        $employee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager, 'Multi Revision');
        $this->assign($project, $employee, 'aktif');

        Sanctum::actingAs($employee);
        $activityId = $this->postJson('/api/activities', $this->activityPayload($project, [
            'user_id' => $employee->id,
            'title' => 'Implementasi Login',
        ]))->assertCreated()->json('data.id');

        Sanctum::actingAs($manager);
        $this->postJson("/api/activities/{$activityId}/reject", [
            'rejection_reason' => 'Tambahkan screenshot hasil testing.',
        ])->assertOk()->assertJsonPath('data.review_history.1.action', 'revision_requested');

        Sanctum::actingAs($employee);
        $this->putJson("/api/activities/{$activityId}", ['description' => 'Testing dan screenshot ditambahkan.'])
            ->assertOk()->assertJsonPath('data.status', 'selesai');

        Sanctum::actingAs($manager);
        $this->postJson("/api/activities/{$activityId}/reject", [
            'rejection_reason' => 'Cantumkan juga hasil testing API.',
        ])->assertOk()->assertJsonPath('data.revision_count', 2);

        Sanctum::actingAs($employee);
        $this->putJson("/api/activities/{$activityId}", ['description' => 'Seluruh hasil testing sudah dicantumkan.'])
            ->assertOk()->assertJsonPath('data.status', 'selesai');

        Sanctum::actingAs($manager);
        $response = $this->postJson("/api/activities/{$activityId}/approve")
            ->assertOk()->assertJsonPath('data.status', 'approved');

        $this->assertSame(
            ['submitted', 'revision_requested', 'resubmitted', 'revision_requested', 'resubmitted', 'approved'],
            collect($response->json('data.review_history'))->pluck('action')->all(),
        );
        $this->assertDatabaseHas('activity_reviews', ['activity_id' => $activityId, 'note' => 'Tambahkan screenshot hasil testing.']);
        $this->assertDatabaseHas('activity_reviews', ['activity_id' => $activityId, 'note' => 'Cantumkan juga hasil testing API.']);

        Notification::assertSentTo($employee, ActivityRevisionRequestedNotification::class, 2);
        Notification::assertSentTo($manager, ActivityResubmittedNotification::class, 2);
        $this->assertSame(2, ActivityLog::query()->where('causer_id', $manager->id)->where('event', 'revision_requested')->count());
        $this->assertSame(2, ActivityLog::query()->where('causer_id', $employee->id)->where('event', 'resubmitted')->count());
        $this->assertSame(1, ActivityLog::query()->where('causer_id', $manager->id)->where('event', 'approved')->count());
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
