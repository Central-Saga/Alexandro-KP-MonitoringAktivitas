<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    /**
     * Daftar permission yang digunakan oleh sistem.
     *
     * Permission dipisahkan berdasarkan fitur utama:
     * Activity, Project, Assignment, dan Role Management.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['admin', 'project_manager', 'karyawan'] as $role) {
            Role::firstOrCreate([
                'name' => $role,
                'guard_name' => 'web',
            ]);
        }

        $permissions = [
            // Activity
            'activity.view',
            'activity.create',
            'activity.update',
            'activity.delete',
            'activity.upload_media',
            'activity.approve',
            'activity.reject',

            // Project
            'project.view',
            'project.create',
            'project.update',
            'project.delete',

            // Project Assignment
            'assignment.view',
            'assignment.create',
            'assignment.update',
            'assignment.delete',

            // Project Task
            'project_task.view',
            'project_task.create',
            'project_task.update',
            'project_task.status',

            // Role Management
            'role.view',
            'role.create',
            'role.update',
            'role.delete',

            // User Management
            'user.view',
            'user.create',
            'user.update',
            'user.deactivate',

            // Division Management
            'division.view',
            'division.create',
            'division.update',
            'division.deactivate',
        ];

        /**
         * Membuat permission jika belum tersedia.
         *
         * firstOrCreate membuat seeder aman dijalankan
         * berkali-kali tanpa membuat data duplikat.
         */
        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        /**
         * Permission untuk Admin.
         *
         * Admin mendapatkan seluruh permission sistem.
         */
        $admin = Role::findByName('admin', 'web');

        $admin->syncPermissions($permissions);

        /**
         * Permission untuk Project Manager.
         *
         * PM dapat mengelola project dan assignment,
         * serta mengelola activity sesuai kebutuhan project.
         *
         * PM tidak mendapatkan permission role management.
         */
        $projectManager = Role::findByName(
            'project_manager',
            'web'
        );

        $projectManager->syncPermissions([
            'activity.view',
            'activity.create',
            'activity.update',
            'activity.upload_media',
            'activity.approve',
            'activity.reject',

            'project.view',
            'project.create',
            'project.update',

            'assignment.view',
            'assignment.create',
            'assignment.update',
            'assignment.delete',

            'project_task.view',
            'project_task.create',
            'project_task.update',
            'project_task.status',
        ]);

        /**
         * Permission untuk Karyawan.
         *
         * Karyawan hanya mendapatkan permission
         * yang berhubungan dengan aktivitas miliknya.
         *
         * Pembatasan terhadap activity milik sendiri
         * tetap dilakukan oleh Policy/authorization.
         */
        $karyawan = Role::findByName('karyawan', 'web');

        $karyawan->syncPermissions([
            'activity.view',
            'activity.create',
            'activity.update',
            'activity.upload_media',
            'project_task.view',
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
