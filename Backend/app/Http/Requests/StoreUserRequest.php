<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
            // Assignment user dibatasi pada role aplikasi resmi. Custom role
            // tidak otomatis menjadi role operasional tanpa requirement baru.
            'role' => ['required', Rule::in(['admin', 'project_manager', 'karyawan'])],
        ];
    }
}
