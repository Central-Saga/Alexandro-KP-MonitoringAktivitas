<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LazyLoadingPreventionTest extends TestCase
{
    use RefreshDatabase;

    public function test_testing_environment_rejects_unloaded_relations(): void
    {
        $manager = User::factory()->create();

        foreach (['Project Satu', 'Project Dua'] as $name) {
            Project::query()->create([
                'project_manager_id' => $manager->id,
                'name' => $name,
                'client_name' => 'Klien Uji',
                'start_date' => '2026-10-01',
                'status' => 'berlangsung',
            ]);
        }

        $projects = Project::query()->get();

        $this->assertTrue(Model::preventsLazyLoading());
        $this->expectException(LazyLoadingViolationException::class);

        $projects->first()->projectManager;
    }
}
