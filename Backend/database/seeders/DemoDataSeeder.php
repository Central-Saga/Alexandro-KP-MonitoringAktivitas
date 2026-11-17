<?php

namespace Database\Seeders;

use App\Enums\ActivityStatus;
use App\Enums\ProjectTaskStatus;
use App\Models\Activity;
use App\Models\Division;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Data demo agar dashboard langsung bisa ditunjukkan setelah seeding:
 * divisi, project, penugasan, task, dan aktivitas pada semua status.
 *
 * Seeder ini idempoten — memakai firstOrCreate dengan kunci natural, jadi
 * `php artisan migrate --seed` boleh dijalankan berulang tanpa duplikat.
 */
class DemoDataSeeder extends Seeder
{
    /**
     * Jalankan seeder data demo.
     */
    public function run(): void
    {
        $projectManager = $this->ensureUser('project_manager@csm.com', 'Project_manager', 'project_manager');
        $karyawan = $this->ensureUser('karyawan@csm.com', 'Karyawan CSM', 'karyawan');

        $this->seedDivisions($projectManager);

        foreach ($this->seedProjects($projectManager) as $project) {
            $this->seedAssignments($project, [$karyawan, $projectManager]);
            $this->seedTasksAndActivities($project, $karyawan, $projectManager);
        }
    }

    /**
     * Pastikan akun demo tersedia walaupun seeder ini dijalankan sendiri.
     */
    private function ensureUser(string $email, string $name, string $role): User
    {
        return User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make('password123'),
                'role' => $role,
            ]
        );
    }

    /**
     * Divisi dasar organisasi.
     *
     * @return array<int, Division>
     */
    private function seedDivisions(User $head): array
    {
        $data = [
            ['name' => 'Operasional CSM', 'description' => 'Menjalankan operasional harian layanan CSM.'],
            ['name' => 'Customer Success', 'description' => 'Menjaga kepuasan dan retensi pelanggan.'],
            ['name' => 'Teknologi', 'description' => 'Pengembangan dan pemeliharaan sistem internal.'],
        ];

        $divisions = [];

        foreach ($data as $item) {
            $divisions[] = Division::firstOrCreate(
                ['name' => $item['name']],
                [
                    'description' => $item['description'],
                    'status' => 'active',
                    'head_user_id' => $head->id,
                ]
            );
        }

        return $divisions;
    }

    /**
     * Project contoh dengan status berbeda.
     *
     * @return array<int, Project>
     */
    private function seedProjects(User $manager): array
    {
        $data = [
            [
                'name' => 'Implementasi Monitoring Aktivitas CSM',
                'client_name' => 'PT Nusantara Digital',
                'start_date' => now()->subMonths(2)->toDateString(),
                'end_date' => now()->addMonths(2)->toDateString(),
                'status' => 'berlangsung',
            ],
            [
                'name' => 'Migrasi Dashboard Kinerja Karyawan',
                'client_name' => 'PT Sinar Abadi',
                'start_date' => now()->subMonth()->toDateString(),
                'end_date' => now()->addMonths(3)->toDateString(),
                'status' => 'berlangsung',
            ],
            [
                'name' => 'Audit Kepuasan Pelanggan 2026',
                'client_name' => 'PT Nusantara Digital',
                'start_date' => now()->subMonths(5)->toDateString(),
                'end_date' => now()->subMonth()->toDateString(),
                'status' => 'selesai',
            ],
        ];

        $projects = [];

        foreach ($data as $item) {
            $projects[] = Project::firstOrCreate(
                ['name' => $item['name']],
                [
                    'project_manager_id' => $manager->id,
                    'client_name' => $item['client_name'],
                    'start_date' => $item['start_date'],
                    'end_date' => $item['end_date'],
                    'status' => $item['status'],
                ]
            );
        }

        return $projects;
    }

    /**
     * Penugasan karyawan ke project.
     *
     * @param  array<int, User>  $users
     */
    private function seedAssignments(Project $project, array $users): void
    {
        foreach ($users as $index => $user) {
            ProjectAssignment::firstOrCreate(
                ['project_id' => $project->id, 'user_id' => $user->id],
                [
                    'project_role' => $index === 0 ? 'anggota' : 'project manager',
                    'start_date' => $project->start_date->toDateString(),
                    'status' => $project->status === 'selesai' ? 'selesai' : 'aktif',
                ]
            );
        }
    }

    /**
     * Task per project beserta aktivitas pada seluruh status.
     */
    private function seedTasksAndActivities(Project $project, User $karyawan, User $manager): void
    {
        $tasks = [
            ['title' => 'Analisis kebutuhan', 'status' => ProjectTaskStatus::COMPLETED],
            ['title' => 'Implementasi modul', 'status' => ProjectTaskStatus::ACTIVE],
        ];

        // Satu aktivitas untuk setiap status agar dashboard punya variasi.
        $statuses = [
            ActivityStatus::PENDING,
            ActivityStatus::ONGOING,
            ActivityStatus::SELESAI,
            ActivityStatus::APPROVED,
            ActivityStatus::REJECTED,
        ];

        foreach ($tasks as $taskData) {
            $task = ProjectTask::firstOrCreate(
                ['project_id' => $project->id, 'title' => $taskData['title']],
                [
                    'assigned_to' => $karyawan->id,
                    'created_by' => $manager->id,
                    'description' => 'Task demo untuk '.$project->name.'.',
                    'due_date' => now()->addWeeks(2)->toDateString(),
                    'status' => $taskData['status'],
                ]
            );

            foreach ($statuses as $status) {
                $attributes = [
                    'project_id' => $project->id,
                    'project_task_id' => $task->id,
                    'description' => 'Aktivitas demo berstatus '.$status->value.'.',
                    'status' => $status,
                    'activity_date' => now()->subDays(3)->toDateString(),
                ];

                if ($status === ActivityStatus::APPROVED) {
                    $attributes['approved_by'] = $manager->id;
                    $attributes['approved_at'] = now()->subDay();
                }

                if ($status === ActivityStatus::REJECTED) {
                    $attributes['rejected_by'] = $manager->id;
                    $attributes['rejected_at'] = now()->subDay();
                    $attributes['rejection_reason'] = 'Bukti aktivitas belum lengkap.';
                }

                Activity::firstOrCreate(
                    [
                        'user_id' => $karyawan->id,
                        'title' => $task->title.' — '.ucfirst($status->value),
                    ],
                    $attributes
                );
            }
        }
    }
}
