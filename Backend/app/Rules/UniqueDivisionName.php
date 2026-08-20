<?php

namespace App\Rules;

use App\Models\Division;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class UniqueDivisionName implements ValidationRule
{
    public function __construct(private readonly ?int $ignoreId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        // LOWER tersedia di SQLite dan PostgreSQL. Binding parameter menjaga
        // pengecekan lintas casing tetap aman untuk input API langsung.
        $query = Division::query()
            ->whereRaw('LOWER(name) = LOWER(?)', [$value]);

        // Record sendiri dikecualikan agar data legacy seperti ui/ux dapat
        // dinormalisasi menjadi UI/UX melalui form edit.
        if ($this->ignoreId !== null) {
            $query->whereKeyNot($this->ignoreId);
        }

        if ($query->exists()) {
            $fail('Nama divisi sudah digunakan.');
        }
    }
}
