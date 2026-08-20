<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Kontrak user terautentikasi yang aman untuk frontend.
     *
     * Role selalu berasal dari Spatie Permission. Kolom users.role hanya
     * dipertahankan sementara sebagai compatibility data dan tidak menjadi
     * sumber authorization maupun response API baru.
     */
    public function toArray(Request $request): array
    {
        $managementFields = $request->is('api/users', 'api/users/*');

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->getRoleNames()->first(),

            // Field lifecycle hanya ditambahkan pada User Management agar
            // kontrak minimal /api/login dan /api/user tetap kompatibel.
            $this->mergeWhen($managementFields, [
                'is_active' => (bool) $this->is_active,
                'deactivated_at' => $this->deactivated_at,
                'division' => $this->whenLoaded('division', fn () => $this->division ? [
                    'id' => $this->division->id,
                    'name' => $this->division->name,
                ] : null),
                'created_at' => $this->created_at,
            ]),
        ];
    }
}
