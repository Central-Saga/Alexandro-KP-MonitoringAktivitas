<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (
            ! $user
            || ! $user->is_active
            || ! Hash::check($request->password, $user->password)
        ) {
            // Akun nonaktif memakai respons kredensial yang sama agar status
            // internal akun tidak dapat ditebak dari endpoint publik.
            throw ValidationException::withMessages([
                'email' => ['Kredensial yang diberikan salah.'],
            ]);
        }

        // Buat token Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        activity('authentication')
            ->causedBy($user)
            ->event('login')
            ->log('Login ke sistem');

        return response()->json([
            'message' => 'Login berhasil',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => (new UserResource($user))->resolve($request),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        activity('authentication')
            ->causedBy($user)
            ->event('logout')
            ->log('Logout dari sistem');

        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil'
        ]);
    }
}
