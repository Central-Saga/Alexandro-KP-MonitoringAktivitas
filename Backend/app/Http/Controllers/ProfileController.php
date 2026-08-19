<?php

namespace App\Http\Controllers;

use App\Support\QueryCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function __construct(protected QueryCache $cache) {}

    /**
     * Menampilkan profile user yang sedang login.
     */
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'message' => 'Profile berhasil diambil',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleNames()->first(),
                'profile_photo' => $user->profile_photo
                    ? Storage::url($user->profile_photo)
                    : null,
            ],
        ]);
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

        $user->update($data);

        // Nama/foto user dapat muncul pada list user dan ringkasan activity.
        $this->cache->invalidate(
            QueryCache::USERS,
            QueryCache::ACTIVITIES,
            QueryCache::PROJECTS,
        );

        return response()->json([
            'message' => 'Profile berhasil diperbarui',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleNames()->first(),
                'profile_photo' => $user->profile_photo
                    ? Storage::url($user->profile_photo)
                    : null,
            ],
        ]);
    }
}
