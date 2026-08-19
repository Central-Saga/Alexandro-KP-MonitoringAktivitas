<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PermissionCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(PermissionSeeder::class);
    }

    public function test_permission_catalog_requires_authentication_and_admin_role(): void
    {
        $this->getJson('/api/permissions')->assertUnauthorized();

        foreach (['project_manager', 'karyawan'] as $role) {
            Sanctum::actingAs($this->makeUser($role));
            $this->getJson('/api/permissions')->assertForbidden();
        }

        Sanctum::actingAs($this->makeUser('admin'));
        $this->getJson('/api/permissions')->assertOk();
    }

    public function test_admin_receives_stable_safe_catalog_from_permission_seeder(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        $response = $this->getJson('/api/permissions')->assertOk();
        $catalog = $response->json('data');
        $expected = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name', 'guard_name'])
            ->toArray();

        $this->assertSame($expected, $catalog);
        $this->assertContains('activity.view', array_column($catalog, 'name'));
        $this->assertContains('user.view', array_column($catalog, 'name'));

        foreach ($catalog as $permission) {
            $this->assertSame(['id', 'name', 'guard_name'], array_keys($permission));
        }
    }

    public function test_admin_can_create_and_update_custom_role_with_catalog_permissions(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        $created = $this->postJson('/api/roles', [
            'name' => 'auditor',
            'permissions' => ['activity.view', 'project.view'],
        ])->assertCreated()
            ->assertJsonPath('data.name', 'auditor');

        $roleId = $created->json('data.id');
        $this->assertEqualsCanonicalizing(
            ['activity.view', 'project.view'],
            $created->json('data.permissions.*.name')
        );

        $this->putJson("/api/roles/{$roleId}", [
            'name' => 'auditor',
            'permissions' => ['user.view'],
        ])->assertOk()
            ->assertJsonPath('data.permissions.0.name', 'user.view')
            ->assertJsonCount(1, 'data.permissions');

        $this->postJson('/api/roles', [
            'name' => 'invalid_permission_role',
            'permissions' => ['permission.does-not-exist'],
        ])->assertUnprocessable()->assertJsonValidationErrors('permissions.0');
    }

    public function test_system_role_rename_and_delete_protection_remain_active(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $systemRole = Role::findByName('project_manager', 'web');

        $this->putJson("/api/roles/{$systemRole->id}", [
            'name' => 'renamed_manager',
            'permissions' => ['project.view'],
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Nama role bawaan sistem tidak dapat diubah.');

        // Permission role sistem boleh disinkronkan selama nama immutable-nya
        // tetap sama; ini adalah kontrak update Role existing.
        $this->putJson("/api/roles/{$systemRole->id}", [
            'name' => 'project_manager',
            'permissions' => ['project.view'],
        ])->assertOk()
            ->assertJsonPath('data.name', 'project_manager')
            ->assertJsonPath('data.permissions.0.name', 'project.view');

        $this->deleteJson("/api/roles/{$systemRole->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Role bawaan sistem tidak dapat dihapus.');
    }

    private function makeUser(string $role): User
    {
        $user = User::factory()->create();
        $user->syncRoles($role);

        return $user;
    }
}
