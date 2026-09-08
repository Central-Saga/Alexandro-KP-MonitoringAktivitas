<?php

namespace App\Http\Controllers;

use App\Http\Resources\PermissionResource;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        // Middleware route sudah membatasi Admin; pemeriksaan ini menjaga
        // authorization tetap eksplisit bila controller dipakai dari route lain.
        abort_unless(
            $request->user()->hasRole('admin'),
            403,
            'Hanya Admin yang dapat mengelola role.'
        );

        return PermissionResource::collection(
            Permission::query()->orderBy('name')->get()
        );
    }
}
