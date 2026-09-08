<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DivisionController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectAssignmentController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectTaskController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\Route;

// Login
// Membatasi percobaan login untuk mengurangi risiko brute-force.
// Maksimal 5 percobaan dalam periode 1 menit.
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

// Semua route di bawah wajib login
Route::middleware('auth:sanctum')->group(function () {

    // User yang sedang login
    Route::get('/user', function () {
        return (new UserResource(request()->user()))->resolve(request());
    });

    // Logout
    Route::post('/logout', [AuthController::class, 'logout']);

    // Profile
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::get('/profile/activity-logs', [ProfileController::class, 'activityLogs']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);

    // Activities
    // Route kustom approve/reject/media diletakkan sebelum resource CRUD standar
    Route::get('/activities/summary/today', [ActivityController::class, 'todaySummary']);
    Route::post('/activities/{activity}/approve', [ActivityController::class, 'approve']);
    Route::post('/activities/{activity}/reject', [ActivityController::class, 'reject']);
    Route::post('/activities/{id}/media', [ActivityController::class, 'uploadMedia']);
    Route::apiResource('activities', ActivityController::class);

    // Project
    Route::apiResource('projects', ProjectController::class);

    // Project Assignments
    Route::get('/projects/{projectId}/assignment-candidates', [ProjectAssignmentController::class, 'candidates']);
    Route::get('/projects/{projectId}/assignments', [ProjectAssignmentController::class, 'index']);
    Route::post('/projects/{projectId}/assignments', [ProjectAssignmentController::class, 'store']);
    Route::put('/projects/{projectId}/assignments/{assignmentId}', [ProjectAssignmentController::class, 'update']);

    // Project Tasks
    // Project Task memakai status lifecycle tanpa endpoint hard delete.
    Route::patch('/project-tasks/{projectTask}/status', [ProjectTaskController::class, 'updateStatus']);
    Route::apiResource('project-tasks', ProjectTaskController::class)->except(['destroy']);

    // Role Management
    // Hanya Admin yang diperbolehkan mengelola role.
    Route::middleware('role:admin')->group(function () {
        // User memakai lifecycle aktif/nonaktif; hard delete sengaja tidak
        // disediakan agar histori dan relasi bisnis tetap terjaga.
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::apiResource('users', UserController::class)->only(['index', 'store', 'show', 'update']);

        // Division options diletakkan sebelum resource agar tidak tertangkap sebagai parameter ID.
        Route::get('/divisions/options', [DivisionController::class, 'options']);
        Route::patch('/divisions/{division}/status', [DivisionController::class, 'updateStatus']);
        Route::apiResource('divisions', DivisionController::class)->except(['destroy']);

        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::apiResource('roles', RoleController::class);
    });
});
