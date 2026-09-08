<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_manager_id' => ['sometimes', 'integer', 'exists:users,id', $this->validProjectManager(...)],
            'name' => ['sometimes', 'string', 'max:255'],
            'client_name' => ['sometimes', 'string', 'max:255'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'string', 'max:50'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $routeProject = $this->route('project') ?? $this->route('id');
            $project = $routeProject instanceof Project ? $routeProject : Project::query()->find($routeProject);
            $startDate = $this->input('start_date', $project?->start_date?->toDateString());
            $endDate = $this->input('end_date', $project?->end_date?->toDateString());

            if ($startDate && $endDate && Carbon::parse($endDate)->lt(Carbon::parse($startDate))) {
                $validator->errors()->add('end_date', 'Tanggal selesai harus setelah atau sama dengan tanggal mulai.');
            }
        }];
    }

    private function validProjectManager(string $attribute, mixed $value, \Closure $fail): void
    {
        $candidate = User::query()->find($value);

        if (! $candidate?->is_active || ! $candidate->hasRole('project_manager')) {
            $fail('Project Manager harus merupakan user aktif dengan role project_manager.');
        }
    }
}
