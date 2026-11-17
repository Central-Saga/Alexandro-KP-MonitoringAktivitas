<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectAssignment>
 */
class ProjectAssignmentFactory extends Factory
{
    protected $model = ProjectAssignment::class;

    /**
     * Definisi default penugasan karyawan ke project.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'project_role' => fake()->randomElement(['developer', 'quality assurance', 'analis', 'desainer']),
            'start_date' => fake()->dateTimeBetween('-2 months', 'now'),
            'status' => 'aktif',
        ];
    }

    /**
     * Penugasan yang sudah berakhir.
     */
    public function selesai(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'selesai',
        ]);
    }
}
