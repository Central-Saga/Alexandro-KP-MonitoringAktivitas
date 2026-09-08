<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoleRequest extends FormRequest
{
    /**
     * Menentukan apakah user yang sedang login
     * diperbolehkan membuat role baru.
     *
     * Fitur manajemen role hanya boleh digunakan Admin.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin') ?? false;
    }

    /**
     * Aturan validasi saat membuat role baru.
     */
    public function rules(): array
    {
        return [
            // Nama role wajib diisi dan tidak boleh sama
            // dengan role yang sudah terdaftar.
            'name' => [
                'required',
                'string',
                'max:255',
                'unique:roles,name',
            ],

            // Guard default aplikasi menggunakan "web".
            'guard_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            // Permission bersifat opsional saat membuat role.
            'permissions' => [
                'nullable',
                'array',
            ],

            // Setiap permission harus sudah terdaftar
            // di tabel permissions.
            'permissions.*' => [
                'string',
                'exists:permissions,name',
            ],
        ];
    }
}