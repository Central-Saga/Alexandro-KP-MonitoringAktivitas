<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectAssignmentController;
use App\Http\Controllers\ProjectController;
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
    Route::put('/profile', [ProfileController::class, 'update']);

    // Activities
    Route::get('/activities', [ActivityController::class, 'index']);
    Route::get('/activities/{id}', [ActivityController::class, 'show']);
    Route::post('/activities', [ActivityController::class, 'store']);
    Route::put('/activities/{id}', [ActivityController::class, 'update']);
    Route::delete('/activities/{id}', [ActivityController::class, 'destroy']);

        // Project
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{id}', [ProjectController::class, 'update']);
    Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);

    // Project Assignments
    Route::get('/projects/{projectId}/assignments', [ProjectAssignmentController::class, 'index']);
    Route::post('/projects/{projectId}/assignments', [ProjectAssignmentController::class, 'store']);
    Route::put('/projects/{projectId}/assignments/{assignmentId}', [ProjectAssignmentController::class, 'update']);
    Route::delete('/projects/{projectId}/assignments/{assignmentId}', [ProjectAssignmentController::class, 'destroy']);

        // Role Management
    // Hanya Admin yang diperbolehkan mengelola role.
    Route::middleware('role:admin')->group(function () {
        // User memakai lifecycle aktif/nonaktif; hard delete sengaja tidak
        // disediakan agar histori dan relasi bisnis tetap terjaga.
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);

        Route::get('/roles', [RoleController::class, 'index']);
        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::get('/roles/{id}', [RoleController::class, 'show']);
        Route::put('/roles/{id}', [RoleController::class, 'update']);
        Route::delete('/roles/{id}', [RoleController::class, 'destroy']);
    });
    
    // Upload bukti aktivitas
    Route::post('/activities/{id}/media', [ActivityController::class, 'uploadMedia']);
});
