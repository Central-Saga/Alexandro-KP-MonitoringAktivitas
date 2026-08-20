<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($this->route('user')),
            ],
            'role' => ['required', Rule::in(['admin', 'project_manager', 'karyawan'])],
            'division_id' => [
                'nullable',
                Rule::exists('divisions', 'id')->where(function ($query) {
                    $query->where('status', 'active');

                    $routeUser = $this->route('user');
                    $currentDivisionId = $routeUser instanceof User
                        ? $routeUser->division_id
                        : null;
                    if ($currentDivisionId !== null) {
                        // Relasi existing ke divisi nonaktif tetap valid agar
                        // edit role/nama tidak menghapus histori organisasi.
                        $query->orWhere('id', $currentDivisionId);
                    }
                }),
            ],
        ];
    }
}
