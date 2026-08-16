<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    /**
     * Menentukan apakah user yang sedang login
     * diperbolehkan mengubah role.
     *
     * Hanya Admin yang dapat mengelola role.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin') ?? false;
    }

    /**
     * Aturan validasi saat role diperbarui.
     */
    public function rules(): array
    {
        // Mengambil ID role dari parameter route:
        // /api/roles/{role}
        $roleId = $this->route('role');

        return [
            // Nama role wajib diisi dan harus unik.
            // Role yang sedang diedit tidak dianggap duplikat.
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->ignore($roleId),
            ],

            // Permission dikirim hanya jika ingin
            // mengubah daftar permission role.
            'permissions' => [
                'sometimes',
                'array',
            ],

            // Semua permission harus sudah tersedia
            // di tabel permissions.
            'permissions.*' => [
                'string',
                'exists:permissions,name',
            ],
        ];
    }
}
