<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UserRbacContractTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['admin', 'project_manager', 'karyawan'] as $role) {
            Role::create([
                'name' => $role,
                'guard_name' => 'web',
            ]);
        }
    }

    public function test_unauthenticated_user_endpoint_returns_401(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_authenticated_user_response_uses_spatie_role_and_hides_sensitive_fields(): void
    {
        $user = User::factory()->create([
            'role' => 'karyawan',
            'remember_token' => 'sensitive-remember-token',
        ]);
        $user->syncRoles('admin');
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/user')
            ->assertOk()
            ->assertExactJson([
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'admin',
            ]);

        $payload = $response->json();
        $this->assertArrayNotHasKey('password', $payload);
        $this->assertArrayNotHasKey('remember_token', $payload);
        $this->assertArrayNotHasKey('tokens', $payload);
    }

    public function test_login_response_uses_spatie_role_when_legacy_role_has_drifted(): void
    {
        $user = User::factory()->create([
            'email' => 'drift@example.com',
            'password' => Hash::make('password123'),
            'role' => 'karyawan',
        ]);
        $user->syncRoles('admin');

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonStructure([
                'message',
                'access_token',
                'token_type',
                'user' => ['id', 'name', 'email', 'role'],
            ]);
    }

    public function test_profile_response_uses_spatie_role_when_legacy_role_has_drifted(): void
    {
        $user = User::factory()->create(['role' => 'karyawan']);
        $user->syncRoles('admin');
        Sanctum::actingAs($user);

        $this->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('data.role', 'admin');
    }

    public function test_system_role_cannot_be_renamed(): void
    {
        $admin = $this->actingAsAdmin();
        $systemRole = Role::findByName('project_manager', 'web');

        $this->actingAs($admin)
            ->putJson("/api/roles/{$systemRole->id}", [
                'name' => 'manager_baru',
            ])
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Nama role bawaan sistem tidak dapat diubah.'
            );

        $this->assertDatabaseHas('roles', [
            'id' => $systemRole->id,
            'name' => 'project_manager',
        ]);
    }

    public function test_custom_role_can_be_updated_with_its_existing_name(): void
    {
        $admin = $this->actingAsAdmin();
        $customRole = Role::create([
            'name' => 'auditor',
            'guard_name' => 'web',
        ]);

        $this->actingAs($admin)
            ->putJson("/api/roles/{$customRole->id}", [
                'name' => 'auditor',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'auditor');
    }

    public function test_custom_role_cannot_be_renamed_to_an_existing_role(): void
    {
        $admin = $this->actingAsAdmin();
        $customRole = Role::create([
            'name' => 'auditor',
            'guard_name' => 'web',
        ]);

        $this->actingAs($admin)
            ->putJson("/api/roles/{$customRole->id}", [
                'name' => 'karyawan',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->create(['role' => 'karyawan']);
        $admin->syncRoles('admin');

        return $admin;
    }
}
