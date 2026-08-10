<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Memproses login pengguna.
     *
     * Method ini menerima email dan password
     * dari frontend Next.js, kemudian memeriksa
     * data tersebut ke database PostgreSQL.
     */
    public function login(Request $request)
    {
        // Memvalidasi data yang dikirim oleh frontend.
        $credentials = $request->validate([
            // Email wajib diisi dan harus memiliki
            // format email yang valid.
            'email' => ['required', 'email'],

            // Password wajib diisi dan harus berupa string.
            'password' => ['required', 'string'],
        ]);

        // Mencari pengguna berdasarkan email.
        $user = User::where('email', $credentials['email'])->first();

        // Memeriksa apakah user ditemukan dan password
        // yang diberikan sesuai dengan password di database.
        if (
            !$user ||
            !Hash::check($credentials['password'], $user->password)
        ) {
            // Mengembalikan response error jika login gagal.
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah.',
            ], 401);
        }

        // Mengembalikan data user jika login berhasil.
        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',

            // Data ini nantinya akan digunakan
            // oleh Next.js untuk menentukan dashboard.
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }
}