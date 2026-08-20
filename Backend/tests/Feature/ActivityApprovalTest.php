<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Models\Activity;
use App\Models\Division;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ActivityApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        foreach (['activity.approve', 'activity.reject'] as $permission) {
            Permission::create(['name' => $permission, 'guard_name' => 'web']);
        }
        foreach (['admin', 'project_manager', 'karyawan'] as $role) {
            Role::create(['name' => $role, 'guard_name' => 'web']);
        }
        Role::findByName('admin')->syncPermissions(['activity.approve', 'activity.reject']);
        Role::findByName('project_manager')->syncPermissions(['activity.approve', 'activity.reject']);
    }

    public function test_employee_cannot_self_approve_reject_or_bypass_with_update(): void
    {
        $employee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $project = $this->makeProject($manager);
        $this->assign($project, $employee);
        $activity = $this->makeActivity($employee, $project, ActivityStatus::SELESAI);
        Sanctum::actingAs($employee);

        $this->postJson("/api/activities/{$activity->id}/approve")->assertForbidden();
        $this->postJson("/api/activities/{$activity->id}/reject", ['rejection_reason' => 'Tidak sesuai'])
            ->assertForbidden();
        $this->putJson("/api/activities/{$activity->id}", ['status' => 'approved'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->postJson('/api/activities', [
            'project_id' => $project->id,
            'user_id' => $employee->id,
            'title' => 'Bypass Create',
            'status' => 'approved',
            'activity_date' => '2026-08-15',
        ])->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_admin_can_approve_and_reject_with_correct_metadata(): void
    {
        $admin = $this->makeUser('admin');
        $employee = $this->makeUser('karyawan');
        $manager = $this->makeUser('project_manager');
        $activity = $this->makeActivity($employee, $this->makeProject($manager), ActivityStatus::SELESAI);
        Sanctum::actingAs($admin);

        $this->postJson("/api/activities/{$activity->id}/approve")
            ->assertOk()->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.approved_by.id', $admin->id);
        $this->assertNotNull($activity->fresh()->approved_at);

        $this->postJson("/api/activities/{$activity->id}/reject", ['rejection_reason' => 'Bukti kurang jelas'])
            ->assertOk()->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejected_by.id', $admin->id)
            ->assertJsonPath('data.rejection_reason', 'Bukti kurang jelas');
        $activity->refresh();
        $this->assertNull($activity->approved_by);
        $this->assertNull($activity->approved_at);
        $this->assertNotNull($activity->rejected_at);

        $this->postJson("/api/activities/{$activity->id}/approve")
            ->assertOk()->assertJsonPath('data.rejection_reason', null);
    }

    public function test_transition_and_rejection_reason_are_validated(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $pending = $this->makeActivity($employee, $this->makeProject($manager), ActivityStatus::PENDING);

        $this->postJson("/api/activities/{$pending->id}/approve")
            ->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->postJson("/api/activities/{$pending->id}/reject", [])
            ->assertUnprocessable()->assertJsonValidationErrors('rejection_reason');
    }

    public function test_project_manager_can_review_only_managed_project(): void
    {
        $manager = $this->makeUser('project_manager');
        $otherManager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $managed = $this->makeProject($manager);
        $foreign = $this->makeProject($otherManager);
        $this->assign($managed, $employee);
        $this->assign($foreign, $employee);
        $managedActivity = $this->makeActivity($employee, $managed, ActivityStatus::SELESAI);
        $foreignActivity = $this->makeActivity($employee, $foreign, ActivityStatus::SELESAI);
        Sanctum::actingAs($manager);

        $this->postJson("/api/activities/{$managedActivity->id}/approve")->assertOk();
        $this->postJson("/api/activities/{$foreignActivity->id}/approve")->assertForbidden();
    }

    public function test_resource_contains_safe_user_division_and_review_summaries(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);
        $division = Division::query()->create(['name' => 'Engineering']);
        $employee = $this->makeUser('karyawan', ['division_id' => $division->id]);
        $manager = $this->makeUser('project_manager');
        $activity = $this->makeActivity($employee, $this->makeProject($manager), ActivityStatus::SELESAI);
        $this->postJson("/api/activities/{$activity->id}/approve")->assertOk();

        $data = $this->getJson("/api/activities/{$activity->id}")
            ->assertOk()->assertJsonPath('data.user.division.name', 'Engineering')
            ->json('data');
        foreach (['password', 'remember_token', 'tokens', 'roles', 'pivot'] as $field) {
            $this->assertArrayNotHasKey($field, $data['user']);
            $this->assertArrayNotHasKey($field, $data['approved_by']);
        }
    }

    public function test_list_supports_filters_pagination_and_role_scope(): void
    {
        $admin = $this->makeUser('admin');
        $manager = $this->makeUser('project_manager');
        $otherManager = $this->makeUser('project_manager');
        $division = Division::query()->create(['name' => 'Quality']);
        $employee = $this->makeUser('karyawan', ['name' => 'Sinta Filter', 'division_id' => $division->id]);
        $managed = $this->makeProject($manager);
        $foreign = $this->makeProject($otherManager);
        $this->assign($managed, $employee);
        $target = $this->makeActivity($employee, $managed, ActivityStatus::APPROVED, ['title' => 'Audit Dashboard', 'activity_date' => '2026-08-10']);
        $this->makeActivity($employee, $foreign, ActivityStatus::PENDING, ['title' => 'Other Work', 'activity_date' => '2026-07-01']);

        Sanctum::actingAs($admin);
        $url = "/api/activities?search=Sinta&user_id={$employee->id}&project_id={$managed->id}&status=approved&division_id={$division->id}&date_from=2026-08-01&date_to=2026-08-31&per_page=1";
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id)->assertJsonPath('meta.per_page', 1);

        Sanctum::actingAs($manager);
        $this->getJson('/api/activities?per_page=100')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.project_id', $managed->id);
        Sanctum::actingAs($employee);
        $this->getJson('/api/activities?per_page=100')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_activity_list_eager_loading_has_constant_query_count(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        foreach (range(1, 8) as $index) {
            $this->makeActivity($employee, $project, ActivityStatus::SELESAI, ['title' => "Activity {$index}"]);
        }
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/activities?per_page=10')->assertOk()->assertJsonCount(8, 'data');
        $this->assertLessThanOrEqual(10, count(DB::getQueryLog()));
        DB::disableQueryLog();
    }

    public function test_cached_list_keeps_actor_scope_and_refreshes_after_approval(): void
    {
        $admin = $this->makeUser('admin');
        $managerA = $this->makeUser('project_manager');
        $managerB = $this->makeUser('project_manager');
        $employeeA = $this->makeUser('karyawan');
        $employeeB = $this->makeUser('karyawan');
        $projectA = $this->makeProject($managerA);
        $projectB = $this->makeProject($managerB);
        $this->assign($projectA, $employeeA);
        $this->assign($projectB, $employeeB);
        $activityA = $this->makeActivity($employeeA, $projectA, ActivityStatus::SELESAI);
        $activityB = $this->makeActivity($employeeB, $projectB, ActivityStatus::SELESAI);
        $url = '/api/activities?per_page=100';

        Sanctum::actingAs($managerA);
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activityA->id);
        // Request identik kedua melewati cache descriptor actor yang sama.
        $this->getJson($url)->assertOk()->assertJsonPath('data.0.id', $activityA->id);

        Sanctum::actingAs($managerB);
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activityB->id);

        Sanctum::actingAs($employeeA);
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activityA->id);

        Sanctum::actingAs($admin);
        $this->getJson($url)->assertOk()->assertJsonCount(2, 'data');
        $this->postJson("/api/activities/{$activityA->id}/approve")->assertOk();

        $activities = collect($this->getJson($url)->assertOk()->json('data'));
        $this->assertSame('approved', $activities->firstWhere('id', $activityA->id)['status']);
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
            'project_manager_id' => $manager->id, 'name' => fake()->unique()->words(2, true),
            'client_name' => 'Client', 'start_date' => '2026-01-01', 'status' => 'berlangsung',
        ]);
    }

    private function assign(Project $project, User $user): void
    {
        ProjectAssignment::query()->create([
            'project_id' => $project->id, 'user_id' => $user->id,
            'project_role' => 'Member', 'start_date' => '2026-01-01', 'status' => 'aktif',
        ]);
    }

    private function makeActivity(User $user, Project $project, ActivityStatus $status, array $attributes = []): Activity
    {
        return Activity::query()->create([
            'user_id' => $user->id, 'project_id' => $project->id,
            'title' => 'Test Activity', 'description' => null,
            'status' => $status, 'activity_date' => '2026-08-15', ...$attributes,
        ]);
    }
}
