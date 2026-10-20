<?php

namespace App\Http\Requests;

use App\Enums\ProjectTaskStatus;
use App\Models\ProjectTask;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectTaskStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        $projectTask = $this->route('projectTask');

        return $projectTask instanceof ProjectTask
            && ($this->user()?->can('updateStatus', $projectTask) ?? false);
    }

    public function rules(): array
    {
        return [
            // Lifecycle final hanya dapat bergerak keluar dari active.
            'status' => ['required', Rule::in([
                ProjectTaskStatus::COMPLETED->value,
                ProjectTaskStatus::CANCELLED->value,
            ])],
        ];
    }
}
