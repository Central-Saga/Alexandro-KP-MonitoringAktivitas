<?php

namespace App\Http\Requests;

use App\Enums\ActivityStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'status' => ['nullable', Rule::enum(ActivityStatus::class)],
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => [
                'nullable',
                'date',
                // Tanggal akhir dapat dipakai sendiri. Perbandingan rentang
                // baru diperlukan ketika tanggal awal juga diberikan.
                Rule::when($this->filled('date_from'), 'after_or_equal:date_from'),
            ],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
