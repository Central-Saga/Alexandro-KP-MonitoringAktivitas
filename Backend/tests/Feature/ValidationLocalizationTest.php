<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ValidationLocalizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['activity.approve', 'activity.reject', 'project_task.create'] as $permission) {
            Permission::create(['name' => $permission, 'guard_name' => 'web']);
        }
        foreach (['admin', 'project_manager', 'karyawan'] as $role) {
            Role::create(['name' => $role, 'guard_name' => 'web']);
        }
        Role::findByName('admin')->syncPermissions([
            'activity.approve',
            'activity.reject',
            'project_task.create',
        ]);
        Role::findByName('project_manager')->syncPermissions(['activity.approve', 'activity.reject']);
    }

    public function test_application_locale_is_configured_to_indonesian(): void
    {
        $this->assertSame('id', app()->getLocale());
    }

    public function test_store_project_task_validation_returns_indonesian_messages_and_human_readable_attributes(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/project-tasks', [
            'project_id' => 999999,
            'assigned_to' => 999999,
            'title' => '',
            'due_date' => 'bukan-tanggal',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['title', 'project_id', 'assigned_to', 'due_date']);
        $response->assertJsonPath('success', false)
            ->assertJsonPath('data', null)
            ->assertJsonStructure(['success', 'message', 'data', 'errors']);

        $errors = $response->json('errors');
        $this->assertSame('judul wajib diisi.', $errors['title'][0]);
        $this->assertSame('proyek yang dipilih tidak valid.', $errors['project_id'][0]);
        $this->assertSame('karyawan yang ditugaskan yang dipilih tidak valid.', $errors['assigned_to'][0]);
        $this->assertSame('tanggal tenggat bukan tanggal yang valid.', $errors['due_date'][0]);
    }

    public function test_user_creation_validation_returns_indonesian_error_messages(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/users', [
            'name' => '',
            'email' => 'format-email-salah',
            'password' => '123',
            'password_confirmation' => 'berbeda',
            'role' => 'superadmin_tidak_ada',
            'division_id' => 999999,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['name', 'email', 'password', 'role', 'division_id']);

        $errors = $response->json('errors');
        $this->assertSame('nama wajib diisi.', $errors['name'][0]);
        $this->assertSame('email harus berupa alamat email yang valid.', $errors['email'][0]);
        $this->assertSame('Konfirmasi kata sandi tidak cocok.', $errors['password'][0]);
        $this->assertSame('kata sandi minimal berisi 8 karakter.', $errors['password'][1]);
        $this->assertSame('role yang dipilih tidak valid.', $errors['role'][0]);
        $this->assertSame('divisi yang dipilih tidak valid.', $errors['division_id'][0]);
    }

    public function test_project_validation_returns_indonesian_date_and_attribute_messages(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/projects', [
            'name' => '',
            'client_name' => '',
            'project_manager_id' => 999999,
            'start_date' => '2026-08-20',
            'end_date' => '2026-08-10',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['name', 'client_name', 'project_manager_id', 'end_date']);

        $errors = $response->json('errors');
        $this->assertSame('nama wajib diisi.', $errors['name'][0]);
        $this->assertSame('nama klien wajib diisi.', $errors['client_name'][0]);
        $this->assertSame('project manager yang dipilih tidak valid.', $errors['project_manager_id'][0]);
        $this->assertSame('tanggal selesai harus berupa tanggal setelah atau sama dengan tanggal mulai.', $errors['end_date'][0]);
    }

    public function test_division_validation_returns_indonesian_messages(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/divisions', [
            'name' => 'Divisi Yang Tidak Ada di Enum',
            'head_user_id' => 999999,
            'status' => 'status_invalid',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['name', 'head_user_id', 'status']);

        $errors = $response->json('errors');
        $this->assertSame('nama yang dipilih tidak valid.', $errors['name'][0]);
        $this->assertSame('kepala divisi yang dipilih tidak valid.', $errors['head_user_id'][0]);
        $this->assertSame('status yang dipilih tidak valid.', $errors['status'][0]);
    }

    public function test_activity_inline_validation_in_controller_uses_global_localization(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        // Uji inline validation pada store activity
        $storeResponse = $this->postJson('/api/activities', [
            'project_id' => 999999,
            'user_id' => 999999,
            'title' => '',
            'activity_date' => 'bukan-tanggal',
            'status' => 'status_salah',
        ]);

        $storeResponse->assertUnprocessable();
        $storeResponse->assertJsonValidationErrors(['title', 'project_id', 'user_id', 'activity_date', 'status']);

        $storeErrors = $storeResponse->json('errors');
        $this->assertSame('judul wajib diisi.', $storeErrors['title'][0]);
        $this->assertSame('proyek yang dipilih tidak valid.', $storeErrors['project_id'][0]);
        $this->assertSame('karyawan yang dipilih tidak valid.', $storeErrors['user_id'][0]);
        $this->assertSame('tanggal aktivitas bukan tanggal yang valid.', $storeErrors['activity_date'][0]);
        $this->assertSame('status yang dipilih tidak valid.', $storeErrors['status'][0]);

        // Uji inline validation pada reject activity (rejection_reason required)
        $manager = $this->makeUser('project_manager');
        $employee = $this->makeUser('karyawan');
        $project = $this->makeProject($manager);
        $this->assign($project, $employee);
        $activity = $this->makeActivity($employee, $project, ActivityStatus::SELESAI);

        $rejectResponse = $this->postJson("/api/activities/{$activity->id}/reject", [
            'rejection_reason' => '',
        ]);

        $rejectResponse->assertUnprocessable();
        $rejectResponse->assertJsonValidationErrors(['rejection_reason']);
        $this->assertSame('alasan revisi wajib diisi.', $rejectResponse->json('errors.rejection_reason.0'));

        // Uji inline validation pada upload media (file required oleh pemilik activity)
        Sanctum::actingAs($employee);
        $mediaResponse = $this->postJson("/api/activities/{$activity->id}/media", []);
        $mediaResponse->assertUnprocessable();
        $mediaResponse->assertJsonValidationErrors(['file']);
        $this->assertSame('berkas wajib diisi.', $mediaResponse->json('errors.file.0'));
    }

    public function test_index_query_request_validation_returns_indonesian_messages(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/activities?per_page=101&date_from=2026-08-20&date_to=2026-08-10&page=0');

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['per_page', 'date_to', 'page']);

        $errors = $response->json('errors');
        $this->assertSame('jumlah per halaman tidak boleh lebih dari 100.', $errors['per_page'][0]);
        $this->assertSame('halaman minimal bernilai 1.', $errors['page'][0]);
        $this->assertSame('tanggal akhir harus berupa tanggal setelah atau sama dengan tanggal mulai.', $errors['date_to'][0]);
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
            'name' => 'Proyek Uji',
            'client_name' => 'Klien Uji',
            'start_date' => '2026-01-01',
            'status' => 'berlangsung',
        ]);
    }

    private function assign(Project $project, User $user): void
    {
        ProjectAssignment::query()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'project_role' => 'Member',
            'start_date' => '2026-01-01',
            'status' => 'aktif',
        ]);
    }

    private function makeActivity(User $user, Project $project, ActivityStatus $status, array $attributes = []): Activity
    {
        return Activity::query()->create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'title' => 'Aktivitas Uji',
            'description' => null,
            'status' => $status,
            'activity_date' => '2026-08-15',
            ...$attributes,
        ]);
    }
}
