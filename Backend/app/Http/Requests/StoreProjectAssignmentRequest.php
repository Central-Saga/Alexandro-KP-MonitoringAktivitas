<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id', $this->validEmployee(...)],
            'project_role' => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date'],
            'status' => ['nullable', Rule::in(['aktif', 'nonaktif'])],
        ];
    }

    private function validEmployee(string $attribute, mixed $value, \Closure $fail): void
    {
        $candidate = User::query()->find($value);

        if (! $candidate?->is_active || ! $candidate->hasRole('karyawan')) {
            // Assignment hanya menerima Karyawan aktif; Admin dan PM tidak
            // boleh menjadi member melalui manipulasi payload API.
            $fail('Anggota project harus merupakan user aktif dengan role karyawan.');
        }
    }
}
