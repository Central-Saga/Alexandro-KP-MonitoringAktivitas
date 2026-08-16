<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    /**
     * Mengubah data Role menjadi format JSON
     * yang digunakan oleh API.
     */
    public function toArray(Request $request): array
    {
        return [
            // ID unik role.
            'id' => $this->id,

            // Nama role, contoh:
            // admin, project_manager, karyawan.
            'name' => $this->name,

            // Guard yang digunakan oleh Spatie.
            'guard_name' => $this->guard_name,

            // Daftar permission yang dimiliki role.
            'permissions' => $this->whenLoaded('permissions', function () {
                return $this->permissions->map(function ($permission) {
                    return [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'guard_name' => $permission->guard_name,
                    ];
                });
            }),

            // Timestamp dibuat dan diperbarui.
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}