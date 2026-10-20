<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Tests\TestCase;

class ApiResponseContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_authentication_errors_use_the_common_api_schema(): void
    {
        $this->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null)
            ->assertJsonPath('errors', [])
            ->assertJsonStructure(['success', 'message', 'data', 'errors']);
    }

    public function test_validation_errors_keep_field_errors_in_the_common_schema(): void
    {
        $this->postJson('/api/login', [])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null)
            ->assertJsonStructure(['success', 'message', 'data', 'errors' => ['email', 'password']]);
    }

    public function test_api_server_errors_do_not_expose_exception_details_in_production(): void
    {
        config(['app.debug' => false]);
        Route::get('/api/testing/server-error', function () {
            throw new \RuntimeException('private exception detail');
        });

        $this->getJson('/api/testing/server-error')
            ->assertInternalServerError()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Terjadi kesalahan server.')
            ->assertJsonPath('data', null)
            ->assertJsonPath('errors', [])
            ->assertJsonStructure(['success', 'message', 'data', 'errors'])
            ->assertDontSee('private exception detail');
    }

    public function test_cors_preflight_allows_the_configured_frontend_origin(): void
    {
        $this->withHeaders([
            'Origin' => 'http://localhost:3002',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type',
        ])->options('/api/login')
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3002');
    }

    public function test_paginated_api_resources_expose_the_shared_pagination_metadata(): void
    {
        $this->seed(PermissionSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles('admin');
        Sanctum::actingAs($admin);

        $this->getJson('/api/users?per_page=5')
            ->assertOk()
            ->assertJsonStructure([
                'data',
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.per_page', 5);
    }
}
