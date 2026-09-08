<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_role' => ['sometimes', 'string', 'max:100'],
            'start_date' => ['sometimes', 'date'],
            // Nonaktif mempertahankan histori assignment dan langsung
            // mencabut scope Activity tanpa menghapus record relasi.
            'status' => ['sometimes', Rule::in(['aktif', 'nonaktif'])],
        ];
    }
}
