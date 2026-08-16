<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Illuminate\Http\Request;

class ProjectAssignmentController extends Controller
{
    /**
     * Menampilkan daftar karyawan yang ditugaskan
     * pada sebuah project.
     *
     * Admin dapat melihat seluruh project.
     * Project Manager hanya dapat melihat assignment
     * dari project yang dia kelola.
     */
    public function index(Request $request, int $projectId)
    {
        $project = Project::find($projectId);

        if (! $project) {
            return response()->json([
                'message' => 'Project tidak ditemukan.',
            ], 404);
        }

        $user = $request->user();

        // Project Manager hanya boleh melihat assignment
        // dari project yang dia kelola sendiri.
        if (
            $user->hasRole('project_manager') &&
            $project->project_manager_id !== $user->id
        ) {
            return response()->json([
                'message' => 'Tidak memiliki akses ke project ini.',
            ], 403);
        }

        // Hanya Admin dan Project Manager yang dapat
        // melihat daftar assignment.
        if (! $user->hasAnyRole(['admin', 'project_manager'])) {
            return response()->json([
                'message' => 'Tidak memiliki akses.',
            ], 403);
        }

        $assignments = ProjectAssignment::with('user')
            ->where('project_id', $project->id)
            ->latest()
            ->get();

        return response()->json([
            'data' => $assignments,
        ]);
    }

    /**
     * Menugaskan seorang karyawan ke project.
     *
     * Hanya Project Manager pemilik project
     * yang dapat membuat assignment.
     */
    public function store(Request $request, int $projectId)
    {
        $project = Project::find($projectId);

        if (! $project) {
            return response()->json([
                'message' => 'Project tidak ditemukan.',
            ], 404);
        }

        $user = $request->user();

        // Hanya Project Manager yang dapat membuat assignment.
        if (! $user->hasRole('project_manager')) {
            return response()->json([
                'message' => 'Hanya Project Manager yang dapat membuat penugasan.',
            ], 403);
        }

        // Pastikan PM memang pemilik project tersebut.
        if ($project->project_manager_id !== $user->id) {
            return response()->json([
                'message' => 'Anda bukan Project Manager dari project ini.',
            ], 403);
        }

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'project_role' => 'required|string|max:100',
            'start_date' => 'required|date',
            'status' => 'nullable|string|max:50',
        ]);

        $employee = User::find($data['user_id']);

        // Hanya user dengan role Karyawan yang boleh
        // dimasukkan sebagai anggota project.
        if (! $employee->hasRole('karyawan')) {
            return response()->json([
                'message' => 'Hanya user dengan role karyawan yang dapat ditugaskan.',
            ], 422);
        }

        // Cegah karyawan yang sama ditugaskan dua kali
        // pada project yang sama.
        $exists = ProjectAssignment::where('project_id', $project->id)
            ->where('user_id', $employee->id)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Karyawan sudah ditugaskan ke project ini.',
            ], 422);
        }

        // Hubungkan assignment dengan project yang dipilih.
        $data['project_id'] = $project->id;

        // Jika status tidak diberikan, assignment
        // otomatis dianggap aktif.
        $data['status'] ??= 'aktif';

        $assignment = ProjectAssignment::create($data);

        return response()->json([
            'message' => 'Karyawan berhasil ditugaskan.',
            'data' => $assignment->load('user'),
        ], 201);
    }

    /**
     * Mengubah data assignment.
     *
     * Hanya Project Manager pemilik project
     * yang dapat mengubah assignment.
     */
    public function update(
        Request $request,
        int $projectId,
        int $assignmentId
    ) {
        $project = Project::find($projectId);

        if (! $project) {
            return response()->json([
                'message' => 'Project tidak ditemukan.',
            ], 404);
        }

        $user = $request->user();

        // Hanya Project Manager yang dapat mengubah assignment.
        if (! $user->hasRole('project_manager')) {
            return response()->json([
                'message' => 'Hanya Project Manager yang dapat mengubah penugasan.',
            ], 403);
        }

        // PM hanya boleh mengubah assignment
        // dari project yang dia kelola.
        if ($project->project_manager_id !== $user->id) {
            return response()->json([
                'message' => 'Anda bukan Project Manager dari project ini.',
            ], 403);
        }

        $assignment = ProjectAssignment::where('project_id', $project->id)
            ->find($assignmentId);

        if (! $assignment) {
            return response()->json([
                'message' => 'Penugasan tidak ditemukan.',
            ], 404);
        }

        $data = $request->validate([
            'project_role' => 'sometimes|string|max:100',
            'start_date' => 'sometimes|date',
            'status' => 'sometimes|string|max:50',
        ]);

        $assignment->update($data);

        return response()->json([
            'message' => 'Penugasan berhasil diperbarui.',
            'data' => $assignment->fresh()->load('user'),
        ]);
    }

    /**
     * Menghapus assignment dari project.
     *
     * Penghapusan assignment tidak menghapus akun karyawan.
     * Hanya hubungan karyawan dengan project yang dihapus.
     */
    public function destroy(
        Request $request,
        int $projectId,
        int $assignmentId
    ) {
        $project = Project::find($projectId);

        if (! $project) {
            return response()->json([
                'message' => 'Project tidak ditemukan.',
            ], 404);
        }

        $user = $request->user();

        // Hanya Project Manager yang dapat menghapus assignment.
        if (! $user->hasRole('project_manager')) {
            return response()->json([
                'message' => 'Hanya Project Manager yang dapat menghapus penugasan.',
            ], 403);
        }

        // PM hanya boleh menghapus assignment
        // dari project yang dia kelola.
        if ($project->project_manager_id !== $user->id) {
            return response()->json([
                'message' => 'Anda bukan Project Manager dari project ini.',
            ], 403);
        }

        $assignment = ProjectAssignment::where('project_id', $project->id)
            ->find($assignmentId);

        if (! $assignment) {
            return response()->json([
                'message' => 'Penugasan tidak ditemukan.',
            ], 404);
        }

        // Yang dihapus hanya assignment,
        // bukan data user/karyawan.
        $assignment->delete();

        return response()->json([
            'message' => 'Penugasan berhasil dihapus.',
        ]);
    }
}