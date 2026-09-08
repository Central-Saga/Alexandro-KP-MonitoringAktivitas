<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity as ActivityLog;
use Tests\TestCase;

class AccountActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_only_reads_their_own_logs_newest_first(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        activity('project')->causedBy($user)->event('created')->log('Log lama');
        $old = ActivityLog::query()->latest('id')->firstOrFail();
        $old->update(['created_at' => now()->subHour()]);
        activity('user')->causedBy($other)->event('updated')->log('Log user lain');
        activity('authentication')->causedBy($user)->event('login')->log('Log terbaru');

        Sanctum::actingAs($user);

        $this->getJson('/api/profile/activity-logs')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.description', 'Log terbaru')
            ->assertJsonPath('data.1.description', 'Log lama')
            ->assertJsonMissing(['description' => 'Log user lain']);
    }

    public function test_activity_logs_require_authentication(): void
    {
        $this->getJson('/api/profile/activity-logs')->assertUnauthorized();
    }

    public function test_activity_logs_are_paginated_and_per_page_is_capped(): void
    {
        $user = User::factory()->create();
        foreach (range(1, 12) as $index) {
            activity('test')->causedBy($user)->event('created')->log("Log {$index}");
        }
        Sanctum::actingAs($user);

        $this->getJson('/api/profile/activity-logs?per_page=5')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.total', 12);

        $this->getJson('/api/profile/activity-logs?per_page=51')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
    }

    public function test_successful_login_is_logged_without_sensitive_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'audit@example.com',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
        ]);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
        ])->assertOk();

        $log = ActivityLog::query()->where('event', 'login')->firstOrFail();
        $serialized = $log->properties->toJson();

        $this->assertSame($user->id, $log->causer_id);
        $this->assertSame('Login ke sistem', $log->description);
        $this->assertStringNotContainsString('secret-password', $serialized);
        $this->assertStringNotContainsString('access_token', $serialized);
    }

    public function test_historical_raw_model_events_are_transformed_but_explicit_description_is_preserved(): void
    {
        $actor = User::factory()->create();
        $target = User::factory()->create(['name' => 'Budi Santoso']);
        $project = Project::query()->create([
            'project_manager_id' => $actor->id,
            'name' => 'Website CSM',
            'client_name' => 'CSM',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => 'berlangsung',
        ]);

        activity()->causedBy($actor)->performedOn($target)->event('created')->log('created');
        activity()->causedBy($actor)->performedOn($project)->event('updated')->log('updated');
        activity('authentication')->causedBy($actor)->event('login')->log('Login ke sistem');

        Sanctum::actingAs($actor);

        $response = $this->getJson('/api/profile/activity-logs')->assertOk();
        $descriptions = collect($response->json('data'))->pluck('description');

        $this->assertContains('Membuat pengguna Budi Santoso', $descriptions);
        $this->assertContains('Mengubah proyek Website CSM', $descriptions);
        $this->assertContains('Login ke sistem', $descriptions);
        $this->assertNotContains('created', $descriptions);
        $this->assertNotContains('updated', $descriptions);
        $response->assertJsonFragment(['category' => 'user'])
            ->assertJsonFragment(['category' => 'project'])
            ->assertJsonFragment(['category' => 'authentication']);
    }
}
