<?php

namespace Tests\Feature;

use App\Models\Division;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private array $userPermissions = [
        'user.view',
        'user.create',
        'user.update',
        'user.deactivate',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($this->userPermissions as $permission) {
            Permission::create(['name' => $permission, 'guard_name' => 'web']);
        }

        foreach (['admin', 'project_manager', 'karyawan'] as $name) {
            Role::create(['name' => $name, 'guard_name' => 'web']);
        }

        Role::findByName('admin')->syncPermissions($this->userPermissions);
    }

    public function test_user_endpoints_require_authentication_and_admin_authorization(): void
    {
        $this->getJson('/api/users')->assertUnauthorized();

        foreach (['project_manager', 'karyawan'] as $role) {
            $user = $this->makeUser($role);
            Sanctum::actingAs($user);
            $this->getJson('/api/users')->assertForbidden();
        }

        Sanctum::actingAs($this->makeUser('admin'));
        $this->getJson('/api/users')->assertOk();
    }

    public function test_list_is_paginated_and_per_page_is_bounded(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        User::factory(14)->create()->each(fn (User $user) => $user->syncRoles('karyawan'));

        $this->getJson('/api/users?page=1&per_page=10')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.per_page', 10);

        $this->getJson('/api/users?per_page=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
    }

    public function test_search_role_status_and_combined_filters_use_database_query(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $matching = User::factory()->create([
            'name' => 'Sinta Backend',
            'email' => 'sinta@example.com',
            'role' => 'admin',
            'is_active' => false,
            'deactivated_at' => now(),
        ]);
        $matching->syncRoles('karyawan');

        $other = User::factory()->create([
            'name' => 'Budi Frontend',
            'email' => 'budi@example.com',
        ]);
        $other->syncRoles('project_manager');

        $this->getJson('/api/users?search=Sinta')->assertJsonCount(1, 'data');
        $this->getJson('/api/users?search=budi@example.com')->assertJsonCount(1, 'data');
        $this->getJson('/api/users?role=project_manager')->assertJsonPath('data.0.id', $other->id);
        $this->getJson('/api/users?status=inactive')->assertJsonPath('data.0.id', $matching->id);
        $this->getJson('/api/users?search=Sinta&role=karyawan&status=inactive')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.role', 'karyawan');
    }

    public function test_invalid_role_and_status_filters_are_rejected(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        $this->getJson('/api/users?role=owner')->assertJsonValidationErrors('role');
        $this->getJson('/api/users?status=deleted')->assertJsonValidationErrors('status');
    }

    public function test_role_drift_uses_spatie_for_filter_and_response(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $user = User::factory()->create(['role' => 'admin']);
        $user->syncRoles('karyawan');

        $this->getJson('/api/users?role=karyawan&search='.$user->email)
            ->assertOk()
            ->assertJsonPath('data.0.role', 'karyawan');

        $this->getJson('/api/users?role=admin&search='.$user->email)
            ->assertJsonCount(0, 'data');
    }

    public function test_admin_can_create_user_with_hashed_password_and_spatie_role(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        $response = $this->postJson('/api/users', [
            'name' => 'User Baru',
            'email' => 'baru@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'project_manager',
        ])->assertCreated()->assertJsonPath('data.role', 'project_manager');

        $user = User::whereEmail('baru@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('password123', $user->password));
        $this->assertTrue($user->hasRole('project_manager'));
        $this->assertSame('project_manager', $user->role);
        $this->assertSensitiveFieldsAbsent($response->json('data'));
    }

    public function test_create_validation_rejects_duplicate_email_invalid_role_and_confirmation(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $existing = User::factory()->create();

        $base = [
            'name' => 'User Baru',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'karyawan',
        ];

        $this->postJson('/api/users', [...$base, 'email' => $existing->email])
            ->assertJsonValidationErrors('email');
        $this->postJson('/api/users', [...$base, 'role' => 'superadmin'])
            ->assertJsonValidationErrors('role');
        $this->postJson('/api/users', [...$base, 'password_confirmation' => 'different'])
            ->assertJsonValidationErrors('password');
    }

    public function test_admin_can_show_user_without_sensitive_fields(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $target = $this->makeUser('karyawan');

        $response = $this->getJson("/api/users/{$target->id}")
            ->assertOk()
            ->assertJsonPath('data.role', 'karyawan')
            ->assertJsonStructure(['data' => ['id', 'name', 'email', 'role', 'is_active', 'deactivated_at', 'created_at']]);

        $this->assertSensitiveFieldsAbsent($response->json('data'));
    }

    public function test_admin_can_update_user_and_replace_spatie_role(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $target = $this->makeUser('karyawan');

        $this->putJson("/api/users/{$target->id}", [
            'name' => 'Nama Diperbarui',
            'email' => $target->email,
            'role' => 'project_manager',
        ])->assertOk()->assertJsonPath('data.role', 'project_manager');

        $target->refresh();
        $this->assertSame('Nama Diperbarui', $target->name);
        $this->assertTrue($target->hasRole('project_manager'));
        $this->assertFalse($target->hasRole('karyawan'));
        $this->assertSame('project_manager', $target->role);
    }

    public function test_non_admin_cannot_update_user(): void
    {
        Sanctum::actingAs($this->makeUser('project_manager'));
        $target = $this->makeUser('karyawan');

        $this->putJson("/api/users/{$target->id}", [
            'name' => $target->name,
            'email' => $target->email,
            'role' => 'karyawan',
        ])->assertForbidden();
    }

    public function test_deactivate_revokes_tokens_and_reactivate_restores_login(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $target = $this->makeUser('karyawan', [
            'email' => 'lifecycle@example.com',
            'password' => Hash::make('password123'),
        ]);
        $target->createToken('existing');

        $this->patchJson("/api/users/{$target->id}/status", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $target->refresh();
        $this->assertNotNull($target->deactivated_at);
        $this->assertCount(0, $target->tokens);
        $this->postJson('/api/login', ['email' => $target->email, 'password' => 'password123'])
            ->assertUnprocessable()
            ->assertJsonMissing(['access_token']);

        $this->patchJson("/api/users/{$target->id}/status", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('data.deactivated_at', null);
        $this->postJson('/api/login', ['email' => $target->email, 'password' => 'password123'])
            ->assertOk()
            ->assertJsonStructure(['access_token']);
    }

    public function test_admin_cannot_deactivate_itself(): void
    {
        $admin = $this->makeUser('admin');
        Sanctum::actingAs($admin);

        $this->patchJson("/api/users/{$admin->id}/status", ['is_active' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_active');
        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_last_active_admin_is_protected_by_service(): void
    {
        $actor = $this->makeUser('admin', ['is_active' => false]);
        $lastActiveAdmin = $this->makeUser('admin');

        $this->expectException(ValidationException::class);

        app(UserService::class)->updateStatus($actor, $lastActiveAdmin, false);
    }

    public function test_auth_resource_contract_remains_minimal(): void
    {
        $user = $this->makeUser('admin');
        Sanctum::actingAs($user);

        $this->getJson('/api/user')->assertExactJson([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'admin',
        ]);
    }

    public function test_create_user_supports_active_or_null_division(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $division = Division::query()->create(['name' => 'Engineering']);

        $this->postJson('/api/users', [
            'name' => 'Assigned User',
            'email' => 'assigned@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'karyawan',
            'division_id' => $division->id,
        ])->assertCreated()
            ->assertJsonPath('data.division.id', $division->id)
            ->assertJsonPath('data.division.name', 'Engineering');

        $this->postJson('/api/users', [
            'name' => 'Unassigned User',
            'email' => 'unassigned@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'karyawan',
            'division_id' => null,
        ])->assertCreated()->assertJsonPath('data.division', null);
    }

    public function test_create_rejects_inactive_or_invalid_division(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $inactive = Division::query()->create(['name' => 'Legacy', 'status' => 'inactive']);
        $payload = [
            'name' => 'Invalid Assignment',
            'email' => 'invalid-division@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'karyawan',
        ];

        $this->postJson('/api/users', [...$payload, 'division_id' => $inactive->id])
            ->assertUnprocessable()->assertJsonValidationErrors('division_id');
        $this->postJson('/api/users', [...$payload, 'division_id' => 999999])
            ->assertUnprocessable()->assertJsonValidationErrors('division_id');
    }

    public function test_update_can_move_or_remove_division_and_role_change_preserves_it(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $first = Division::query()->create(['name' => 'First']);
        $second = Division::query()->create(['name' => 'Second']);
        $target = $this->makeUser('karyawan', ['division_id' => $first->id]);

        $this->putJson("/api/users/{$target->id}", [
            'name' => $target->name,
            'email' => $target->email,
            'role' => 'project_manager',
        ])->assertOk()->assertJsonPath('data.division.id', $first->id);

        $this->putJson("/api/users/{$target->id}", [
            'name' => $target->name,
            'email' => $target->email,
            'role' => 'project_manager',
            'division_id' => $second->id,
        ])->assertOk()->assertJsonPath('data.division.id', $second->id);

        $this->putJson("/api/users/{$target->id}", [
            'name' => $target->name,
            'email' => $target->email,
            'role' => 'project_manager',
            'division_id' => null,
        ])->assertOk()->assertJsonPath('data.division', null);
    }

    public function test_existing_inactive_division_is_preserved_but_new_assignment_is_rejected(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $inactive = Division::query()->create(['name' => 'Historical', 'status' => 'inactive']);
        $existing = $this->makeUser('karyawan', ['division_id' => $inactive->id]);
        $other = $this->makeUser('karyawan');

        $this->putJson("/api/users/{$existing->id}", [
            'name' => 'Updated Historical User',
            'email' => $existing->email,
            'role' => 'project_manager',
            'division_id' => $inactive->id,
        ])->assertOk()->assertJsonPath('data.division.id', $inactive->id);

        $this->putJson("/api/users/{$other->id}", [
            'name' => $other->name,
            'email' => $other->email,
            'role' => 'karyawan',
            'division_id' => $inactive->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('division_id');
    }

    public function test_division_head_cannot_be_moved_until_head_position_is_released(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $first = Division::query()->create(['name' => 'Head Division']);
        $second = Division::query()->create(['name' => 'Destination']);
        $head = $this->makeUser('project_manager', ['division_id' => $first->id]);
        $first->update(['head_user_id' => $head->id]);

        $this->putJson("/api/users/{$head->id}", [
            'name' => $head->name,
            'email' => $head->email,
            'role' => 'project_manager',
            'division_id' => $second->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('division_id');

        $this->assertSame($first->id, $head->fresh()->division_id);
    }

    public function test_user_list_eager_loads_roles_and_divisions_without_n_plus_one(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $division = Division::query()->create(['name' => 'Shared Division']);
        User::factory(8)->create(['division_id' => $division->id])
            ->each(fn (User $user) => $user->syncRoles('karyawan'));

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->getJson('/api/users?per_page=10')->assertOk();

        $divisionNames = collect($response->json('data'))
            ->pluck('division.name')
            ->filter();
        $this->assertTrue($divisionNames->contains('Shared Division'));

        // Query count tetap konstan karena roles dan division eager-loaded,
        // bukan bertambah satu query untuk setiap baris user.
        $this->assertLessThanOrEqual(8, count(DB::getQueryLog()));
        DB::disableQueryLog();
    }

    private function makeUser(string $role, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->syncRoles($role);

        return $user;
    }

    private function assertSensitiveFieldsAbsent(array $payload): void
    {
        foreach (['password', 'remember_token', 'token', 'tokens', 'role_id', 'pivot'] as $field) {
            $this->assertArrayNotHasKey($field, $payload);
        }
    }
}
