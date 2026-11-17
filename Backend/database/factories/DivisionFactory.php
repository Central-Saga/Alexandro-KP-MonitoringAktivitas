<?php

namespace Database\Factories;

use App\Models\Division;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Division>
 */
class DivisionFactory extends Factory
{
    protected $model = Division::class;

    /**
     * Definisi default divisi.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Divisi '.fake()->unique()->words(2, true),
            'description' => fake()->sentence(12),
            'status' => 'active',
            'head_user_id' => null,
        ];
    }

    /**
     * Divisi yang sudah tidak aktif (lifecycle, bukan hard delete).
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }
}
