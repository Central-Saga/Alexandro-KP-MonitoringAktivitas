<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    /**
     * Definisi default project beserta Project Manager-nya.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-3 months', 'now');

        return [
            'project_manager_id' => User::factory()->state(['role' => 'project_manager']),
            'name' => 'Proyek '.fake()->unique()->words(3, true),
            'client_name' => fake()->company(),
            'start_date' => $start,
            'end_date' => fake()->dateTimeBetween($start, '+4 months'),
            'status' => 'berlangsung',
        ];
    }

    /**
     * Project yang sudah selesai.
     */
    public function selesai(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'selesai',
        ]);
    }

    /**
     * Tentukan Project Manager secara eksplisit.
     */
    public function forManager(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'project_manager_id' => $user->id,
        ]);
    }
}
