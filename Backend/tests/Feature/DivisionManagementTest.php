<?php

namespace Tests\Feature;

use App\Models\Division;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class DivisionManagementTest extends TestCase
{
    use RefreshDatabase;

    private array $divisionPermissions = [
        'division.view',
        'division.create',
        'division.update',
        'division.deactivate',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($this->divisionPermissions as $permission) {
            Permission::create(['name' => $permission, 'guard_name' => 'web']);
        }

        // Skenario integrasi UserResource melewati policy User, sehingga
        // fixture admin memerlukan permission view yang sama dengan produksi.
        Permission::create(['name' => 'user.view', 'guard_name' => 'web']);

        foreach (['admin', 'project_manager', 'karyawan'] as $role) {
            Role::create(['name' => $role, 'guard_name' => 'web']);
        }

        Role::findByName('admin')->syncPermissions([
            ...$this->divisionPermissions,
            'user.view',
        ]);
    }

    public function test_division_endpoints_require_authentication_and_admin_authorization(): void
    {
        $this->getJson('/api/divisions')->assertUnauthorized();

        foreach (['project_manager', 'karyawan'] as $role) {
            Sanctum::actingAs($this->makeUser($role));
            $this->getJson('/api/divisions')->assertForbidden();
        }

        Sanctum::actingAs($this->makeUser('admin'));
        $this->getJson('/api/divisions')->assertOk();
    }

    public function test_list_supports_pagination_search_and_status_filter(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        Division::query()->create([
            'name' => 'Engineering Platform',
            'description' => 'Platform team',
            'status' => 'active',
        ]);
        Division::query()->create([
            'name' => 'Legacy Operations',
            'status' => 'inactive',
        ]);

        for ($index = 1; $index <= 10; $index++) {
            Division::query()->create(['name' => "Division {$index}"]);
        }

        $this->getJson('/api/divisions?per_page=5')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.per_page', 5);

        $this->getJson('/api/divisions?search=engineering&status=active')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Engineering Platform');

        $this->getJson('/api/divisions?status=inactive')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Legacy Operations');

        $this->getJson('/api/divisions?status=deleted')->assertJsonValidationErrors('status');
        $this->getJson('/api/divisions?per_page=101')->assertJsonValidationErrors('per_page');
    }

    public function test_catalog_options_are_admin_only_and_contain_official_names(): void
    {
        $this->getJson('/api/divisions/options')->assertUnauthorized();
        Sanctum::actingAs($this->makeUser('karyawan'));
        $this->getJson('/api/divisions/options')->assertForbidden();

        Sanctum::actingAs($this->makeUser('admin'));
        $this->getJson('/api/divisions/options')->assertOk()->assertExactJson([
            'data' => collect([
                'UI/UX', 'Frontend', 'Backend', 'Digital Marketing',
                'Content Creator', 'Project Management', 'Human Resource', 'Finance',
            ])->map(fn ($name) => ['value' => $name, 'label' => $name])->all(),
        ]);
    }

    public function test_admin_can_create_division_and_active_head_becomes_member(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $head = $this->makeUser('karyawan');

        $response = $this->postJson('/api/divisions', [
            'name' => 'Frontend',
            'description' => 'Membangun produk',
            'head_user_id' => $head->id,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.head.id', $head->id)
            ->assertJsonPath('data.member_count', 1);

        $division = Division::query()->where('name', 'Frontend')->firstOrFail();
        $this->assertSame($division->id, $head->fresh()->division_id);
        $this->assertSensitiveFieldsAbsent($response->json('data.head'));
    }

    public function test_create_rejects_duplicate_name_invalid_or_inactive_head(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        Division::query()->create(['name' => 'Backend']);

        $this->postJson('/api/divisions', ['name' => 'Backend'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
        $this->postJson('/api/divisions', ['name' => 'Divisi Sembarangan'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->postJson('/api/divisions', [
            'name' => 'Digital Marketing',
            'head_user_id' => 999999,
        ])->assertUnprocessable()->assertJsonValidationErrors('head_user_id');

        $inactiveHead = $this->makeUser('karyawan', ['is_active' => false]);
        $this->postJson('/api/divisions', [
            'name' => 'Content Creator',
            'head_user_id' => $inactiveHead->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('head_user_id');
    }

    public function test_create_rejects_case_insensitive_duplicates(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        Division::query()->create(['name' => 'ui/ux']);
        Division::query()->create(['name' => 'Frontend']);

        $this->postJson('/api/divisions', ['name' => 'UI/UX'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        // Lowercase non-canonical juga harus ditolak; Rule::enum dan unique
        // case-insensitive tetap menjadi lapisan validasi yang independen.
        $this->postJson('/api/divisions', ['name' => 'frontend'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_show_returns_head_and_correct_member_count_without_sensitive_data(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $division = Division::query()->create(['name' => 'Quality']);
        $head = $this->makeUser('project_manager', ['division_id' => $division->id]);
        $division->update(['head_user_id' => $head->id]);
        $this->makeUser('karyawan', ['division_id' => $division->id]);

        $response = $this->getJson("/api/divisions/{$division->id}")
            ->assertOk()
            ->assertJsonPath('data.member_count', 2)
            ->assertJsonPath('data.head.name', $head->name);

        $this->assertSensitiveFieldsAbsent($response->json('data.head'));
    }

    public function test_admin_can_update_fields_and_unchanged_name_is_valid(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $division = Division::query()->create(['name' => 'ui/ux']);
        Division::query()->create(['name' => 'Frontend']);
        $head = $this->makeUser('project_manager');

        $this->putJson("/api/divisions/{$division->id}", [
            'name' => 'UI/UX',
            'description' => 'Eksperimen produk',
            'head_user_id' => $head->id,
        ])->assertOk()
            ->assertJsonPath('data.name', 'UI/UX')
            ->assertJsonPath('data.description', 'Eksperimen produk')
            ->assertJsonPath('data.head.id', $head->id);

        $this->assertSame($division->id, $head->fresh()->division_id);

        $this->putJson("/api/divisions/{$division->id}", [
            'name' => 'Frontend',
            'description' => null,
            'head_user_id' => $head->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->putJson("/api/divisions/{$division->id}", [
            'name' => 'Divisi Sembarangan',
            'description' => null,
            'head_user_id' => $head->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('name');
    }

    public function test_admin_can_deactivate_and_reactivate_without_removing_relations(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $division = Division::query()->create(['name' => 'Support']);
        $head = $this->makeUser('project_manager', ['division_id' => $division->id]);
        $member = $this->makeUser('karyawan', ['division_id' => $division->id]);
        $division->update(['head_user_id' => $head->id]);

        $this->patchJson("/api/divisions/{$division->id}/status", ['status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive')
            ->assertJsonPath('data.member_count', 2);

        $this->assertSame($division->id, $head->fresh()->division_id);
        $this->assertSame($division->id, $member->fresh()->division_id);

        $this->patchJson("/api/divisions/{$division->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');
    }

    public function test_user_management_resource_adds_division_but_auth_contract_stays_minimal(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);
        $division = Division::query()->create(['name' => 'People']);
        $target = $this->makeUser('karyawan', ['division_id' => $division->id]);

        $this->getJson("/api/users/{$target->id}")
            ->assertOk()
            ->assertJsonPath('data.division.id', $division->id)
            ->assertJsonPath('data.division.name', 'People');

        $this->getJson('/api/user')->assertExactJson([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'admin',
        ]);
    }

    private function makeUser(string $role, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->syncRoles($role);

        return $user;
    }

    private function assertSensitiveFieldsAbsent(array $payload): void
    {
        foreach (['password', 'remember_token', 'token', 'tokens', 'role', 'roles', 'pivot'] as $field) {
            $this->assertArrayNotHasKey($field, $payload);
        }
    }
}
