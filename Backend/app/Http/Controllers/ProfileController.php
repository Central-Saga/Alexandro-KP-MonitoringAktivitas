<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
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
                'role' => $user->role,
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

        return response()->json([
            'message' => 'Profile berhasil diperbarui',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'profile_photo' => $user->profile_photo
                    ? Storage::url($user->profile_photo)
                    : null,
            ],
        ]);
    }
}