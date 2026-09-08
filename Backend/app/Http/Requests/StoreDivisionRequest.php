<?php

namespace App\Http\Requests;

use App\Enums\DivisionName;
use App\Rules\UniqueDivisionName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDivisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', Rule::enum(DivisionName::class), new UniqueDivisionName],
            'description' => ['nullable', 'string'],
            'head_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}
