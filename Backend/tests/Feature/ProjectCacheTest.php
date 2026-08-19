<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProjectCacheTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['admin', 'project_manager', 'karyawan'] as $role) {
            Role::create(['name' => $role, 'guard_name' => 'web']);
        }
    }

    public function test_project_cache_is_actor_scoped_and_invalidated_after_update(): void
    {
        $admin = $this->makeUser('admin');
        $managerA = $this->makeUser('project_manager');
        $managerB = $this->makeUser('project_manager');
        $projectA = $this->makeProject($managerA, 'Project A');
        $projectB = $this->makeProject($managerB, 'Project B');

        Sanctum::actingAs($managerA);
        $this->getJson('/api/projects')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $projectA->id);
        $this->getJson('/api/projects')->assertOk()->assertJsonPath('data.0.id', $projectA->id);

        Sanctum::actingAs($managerB);
        $this->getJson('/api/projects')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $projectB->id);

        Sanctum::actingAs($admin);
        $this->getJson('/api/projects')->assertOk()->assertJsonCount(2, 'data');

        Sanctum::actingAs($managerA);
        $this->putJson("/api/projects/{$projectA->id}", ['name' => 'Project A Updated'])
            ->assertOk();
        $this->getJson('/api/projects')->assertOk()
            ->assertJsonPath('data.0.name', 'Project A Updated');
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
            'start_date' => '2026-01-01',
            'status' => 'berlangsung',
        ]);
    }
}
