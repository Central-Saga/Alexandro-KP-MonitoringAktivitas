<?php

namespace App\Http\Requests;

use App\Enums\ActivityStatus;
use App\Models\Activity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        // ActivityPolicy checks ownership/role after the model is loaded so a
        // missing activity can keep the API's normal 404 response.
        $activity = Activity::query()->find($this->route('activity'));

        return $this->user() !== null
            && (! $activity || $this->user()->can('update', $activity));
    }

    public function rules(): array
    {
        return [
            'project_id' => ['sometimes', 'integer', 'exists:projects,id'],
            'project_task_id' => ['sometimes', 'nullable', 'integer', 'exists:project_tasks,id'],
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in([
                ActivityStatus::PENDING->value,
                ActivityStatus::ONGOING->value,
                ActivityStatus::SELESAI->value,
            ])],
            'activity_date' => ['sometimes', 'date'],
        ];
    }
}
