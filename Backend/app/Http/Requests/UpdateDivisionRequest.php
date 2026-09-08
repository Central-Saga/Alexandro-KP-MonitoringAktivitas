<?php

namespace App\Http\Requests;

use App\Enums\DivisionName;
use App\Models\Division;
use App\Rules\UniqueDivisionName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDivisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $division = $this->route('division');
        $divisionId = $division instanceof Division ? $division->getKey() : null;

        return [
            'name' => [
                'required',
                Rule::enum(DivisionName::class),
                new UniqueDivisionName($divisionId),
            ],
            'description' => ['nullable', 'string'],
            'head_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}
