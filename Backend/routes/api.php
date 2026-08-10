<?php

use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Route untuk mendapatkan data user yang sedang login.
// Route ini menggunakan Laravel Sanctum.
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Route untuk proses login.
// Frontend Next.js akan mengirim email dan password
// ke endpoint POST /api/login.
Route::post('/login', [AuthController::class, 'login']);