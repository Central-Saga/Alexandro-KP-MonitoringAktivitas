<?php

namespace Tests\Feature;

use App\Models\Division;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProfileManagementTest extends TestCase
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

    public function test_profile_show_returns_authenticated_user_profile_with_division_and_joined_date(): void
    {
        $division = Division::create(['name' => 'Teknologi Informasi', 'status' => 'active']);
        $user = User::factory()->create([
            'name' => 'Alexandro Test',
            'email' => 'alex@example.com',
            'division_id' => $division->id,
            'role' => 'admin',
        ]);
        $user->syncRoles('admin');

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('data.name', 'Alexandro Test')
            ->assertJsonPath('data.email', 'alex@example.com')
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.division.name', 'Teknologi Informasi')
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'division' => ['id', 'name'],
                    'profile_photo',
                    'created_at',
                ],
            ]);

        $this->assertNotNull($response->json('data.created_at'));
    }

    public function test_profile_update_allows_updating_name_and_photo_without_changing_role_or_division(): void
    {
        Storage::fake('public');

        $division = Division::create(['name' => 'Teknologi Informasi', 'status' => 'active']);
        $user = User::factory()->create([
            'name' => 'Nama Lama',
            'email' => 'user@example.com',
            'division_id' => $division->id,
            'role' => 'karyawan',
        ]);
        $user->syncRoles('karyawan');

        Sanctum::actingAs($user);

        $file = UploadedFile::fake()->create('avatar.jpg', 100, 'image/jpeg');

        $response = $this->putJson('/api/profile', [
            'name' => 'Nama Baru',
            'profile_photo' => $file,
            'role' => 'admin', // Attempted role escalation
            'division_id' => null, // Attempted division modification
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru')
            ->assertJsonPath('data.role', 'karyawan')
            ->assertJsonPath('data.division.name', 'Teknologi Informasi');

        $this->assertNotNull($response->json('data.profile_photo'));

        $user->refresh();
        $this->assertSame('Nama Baru', $user->name);
        $this->assertSame('karyawan', $user->getRoleNames()->first());
        $this->assertSame($division->id, $user->division_id);
    }

    public function test_profile_password_update_validates_current_password_and_confirmation(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword123'),
            'role' => 'karyawan',
        ]);
        $user->syncRoles('karyawan');

        Sanctum::actingAs($user);

        // 1. Salah current_password
        $this->putJson('/api/profile/password', [
            'current_password' => 'wrongpassword',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        // 2. Password baru kurang dari 8 karakter
        $this->putJson('/api/profile/password', [
            'current_password' => 'oldpassword123',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        // 3. Konfirmasi password tidak cocok
        $this->putJson('/api/profile/password', [
            'current_password' => 'oldpassword123',
            'password' => 'newpassword123',
            'password_confirmation' => 'differentpassword',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        // 4. Sukses update password
        $this->putJson('/api/profile/password', [
            'current_password' => 'oldpassword123',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Password berhasil diperbarui');

        $user->refresh();
        $this->assertTrue(Hash::check('newpassword123', $user->password));
    }
}
