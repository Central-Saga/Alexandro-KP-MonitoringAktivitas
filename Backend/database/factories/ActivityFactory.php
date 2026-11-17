<?php

namespace Database\Factories;

use App\Enums\ActivityStatus;
use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Activity>
 */
class ActivityFactory extends Factory
{
    protected $model = Activity::class;

    /**
     * Definisi default activity berstatus pending.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'project_id' => null,
            'project_task_id' => null,
            'title' => 'Aktivitas '.fake()->words(4, true),
            'description' => fake()->paragraph(),
            'status' => ActivityStatus::PENDING,
            'activity_date' => fake()->dateTimeBetween('-2 weeks', 'now'),
        ];
    }

    /**
     * Aktivitas yang sedang dikerjakan.
     */
    public function ongoing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ActivityStatus::ONGOING,
        ]);
    }

    /**
     * Aktivitas yang sudah selesai dikerjakan.
     */
    public function selesai(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ActivityStatus::SELESAI,
        ]);
    }

    /**
     * Aktivitas yang sudah disetujui.
     */
    public function approved(?User $approver = null): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ActivityStatus::APPROVED,
            'approved_by' => $approver?->id,
            'approved_at' => now(),
        ]);
    }

    /**
     * Aktivitas yang ditolak beserta alasannya.
     */
    public function rejected(?User $rejector = null, string $reason = 'Bukti aktivitas belum lengkap.'): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ActivityStatus::REJECTED,
            'rejected_by' => $rejector?->id,
            'rejected_at' => now(),
            'rejection_reason' => $reason,
        ]);
    }

    /**
     * Kaitkan aktivitas ke project dan task tertentu.
     */
    public function forTask(ProjectTask $task): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => $task->project_id,
            'project_task_id' => $task->id,
        ]);
    }
}
