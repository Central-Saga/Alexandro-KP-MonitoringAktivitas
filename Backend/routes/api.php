<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectAssignmentController;
use App\Http\Controllers\RoleController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Login
Route::post('/login', [AuthController::class, 'login']);

// Semua route di bawah wajib login
Route::middleware('auth:sanctum')->group(function () {

    // User yang sedang login
    Route::get('/user', function (Request $request) {
        return $request->user();
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
        Route::get('/roles', [RoleController::class, 'index']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::get('/roles/{id}', [RoleController::class, 'show']);
        Route::put('/roles/{id}', [RoleController::class, 'update']);
        Route::delete('/roles/{id}', [RoleController::class, 'destroy']);
    });
    
    // Upload bukti aktivitas
    Route::post('/activities/{id}/media', [ActivityController::class, 'uploadMedia']);
});