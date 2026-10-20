<?php

namespace App\Http\Requests;

use App\Enums\ActivityStatus;
use App\Models\Activity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Activity::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'project_task_id' => ['nullable', 'integer', 'exists:project_tasks,id'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in([
                ActivityStatus::PENDING->value,
                ActivityStatus::ONGOING->value,
                ActivityStatus::SELESAI->value,
            ])],
            'activity_date' => ['required', 'date'],
        ];
    }
}
