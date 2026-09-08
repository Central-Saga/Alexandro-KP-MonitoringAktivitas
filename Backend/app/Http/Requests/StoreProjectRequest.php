<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_manager_id' => [
                Rule::requiredIf(fn () => $this->user()?->hasRole('admin')),
                'nullable',
                'integer',
                'exists:users,id',
                $this->validProjectManager(...),
            ],
            'name' => ['required', 'string', 'max:255'],
            'client_name' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            // Backend lama belum memiliki enum status Project. Nilai tetap
            // divalidasi sebagai teks sampai lifecycle formal ditetapkan.
            'status' => ['nullable', 'string', 'max:50'],
        ];
    }

    private function validProjectManager(string $attribute, mixed $value, \Closure $fail): void
    {
        if ($value === null) {
            return;
        }

        $candidate = User::query()->find($value);

        if (! $candidate?->is_active || ! $candidate->hasRole('project_manager')) {
            // Role dan lifecycle diperiksa backend agar request langsung tidak
            // dapat menunjuk Admin/Karyawan atau akun PM yang nonaktif.
            $fail('Project Manager harus merupakan user aktif dengan role project_manager.');
        }
    }
}
