<?php

namespace App\Http\Controllers;

use App\Http\Resources\AccountActivityLogResource;
use App\Support\QueryCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Spatie\Activitylog\Models\Activity as ActivityLog;

class ProfileController extends Controller
{
    public function __construct(protected QueryCache $cache) {}

    /**
     * Menampilkan profile user yang sedang login.
     */
    public function show(Request $request)
    {
        $user = $request->user()->loadMissing('division');

        return response()->json([
            'message' => 'Profile berhasil diambil',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleNames()->first(),
                'division' => $user->division ? [
                    'id' => $user->division->id,
                    'name' => $user->division->name,
                ] : null,
                'profile_photo' => $user->profile_photo
                    ? Storage::url($user->profile_photo)
                    : null,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    public function activityLogs(Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);
        $user = $request->user();

        $logs = ActivityLog::query()
            ->with('subject')
            ->where('causer_type', $user->getMorphClass())
            ->where('causer_id', $user->getKey())
            ->latest('created_at')
            ->latest('id')
            ->paginate($validated['per_page'] ?? 10);

        return AccountActivityLogResource::collection($logs);
    }

    /**
     * Mengupdate profile user yang sedang login.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'profile_photo' => 'sometimes|nullable|image|max:5120',
        ]);

        if ($request->hasFile('profile_photo')) {
            // Hapus foto lama jika ada.
            if ($user->profile_photo) {
                Storage::disk('public')->delete($user->profile_photo);
            }

            $data['profile_photo'] = $request
                ->file('profile_photo')
                ->store('profile-photos', 'public');
        }

        // Hanya izinkan pembaruan name dan profile_photo untuk mencegah manipulasi role, division, dll.
        $allowedFields = ['name'];
        if (array_key_exists('profile_photo', $data)) {
            $allowedFields[] = 'profile_photo';
        }
        $updates = array_intersect_key($data, array_flip($allowedFields));
        $nameChanged = array_key_exists('name', $updates) && $updates['name'] !== $user->name;
        $photoChanged = array_key_exists('profile_photo', $updates);
        $user->update($updates);

        if ($nameChanged || $photoChanged) {
            activity('profile')
                ->causedBy($user)
                ->performedOn($user)
                ->event('updated')
                ->withProperty('subject_name', $user->name)
                ->log($photoChanged && ! $nameChanged
                    ? 'Mengubah foto profil'
                    : 'Mengubah data profil');
        }

        // Nama/foto user dapat muncul pada list user dan ringkasan activity.
        $this->cache->invalidate(
            QueryCache::USERS,
            QueryCache::ACTIVITIES,
            QueryCache::PROJECTS,
        );

        $user->refresh()->loadMissing('division');

        return response()->json([
            'message' => 'Profile berhasil diperbarui',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleNames()->first(),
                'division' => $user->division ? [
                    'id' => $user->division->id,
                    'name' => $user->division->name,
                ] : null,
                'profile_photo' => $user->profile_photo
                    ? Storage::url($user->profile_photo)
                    : null,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    /**
     * Mengupdate password user yang sedang login.
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        activity('profile')
            ->causedBy($user)
            ->performedOn($user)
            ->event('password_updated')
            ->withProperty('subject_name', $user->name)
            ->log('Mengubah password akun');

        return response()->json([
            'message' => 'Password berhasil diperbarui',
        ]);
    }
}
