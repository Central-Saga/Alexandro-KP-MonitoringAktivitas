<?php

namespace Database\Factories;

use App\Enums\ProjectTaskStatus;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectTask>
 */
class ProjectTaskFactory extends Factory
{
    protected $model = ProjectTask::class;

    /**
     * Definisi default task project.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'assigned_to' => User::factory(),
            'created_by' => User::factory()->state(['role' => 'project_manager']),
            'title' => 'Task '.fake()->words(3, true),
            'description' => fake()->sentence(10),
            'due_date' => fake()->dateTimeBetween('now', '+1 month'),
            'status' => ProjectTaskStatus::ACTIVE,
        ];
    }

    /**
     * Task yang sudah selesai.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProjectTaskStatus::COMPLETED,
        ]);
    }

    /**
     * Task yang dibatalkan.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProjectTaskStatus::CANCELLED,
        ]);
    }
}
