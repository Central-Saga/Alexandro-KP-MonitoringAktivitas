<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'user_id' => $this->user_id,
            'project_role' => $this->project_role,
            'start_date' => $this->start_date?->toDateString(),
            'status' => $this->status,
            'user' => $this->whenLoaded('user', fn () => [
                // Summary eksplisit mencegah password, token, atau field User
                // internal ikut bocor dari serialisasi model mentah.
                'id' => $this->user->id,
                'name' => $this->user->name,
                'role' => $this->user->getRoleNames()->first(),
                'is_active' => (bool) $this->user->is_active,
                'division' => $this->user->relationLoaded('division') && $this->user->division ? [
                    'id' => $this->user->division->id,
                    'name' => $this->user->division->name,
                ] : null,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
