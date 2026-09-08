<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_manager_id' => $this->project_manager_id,
            'name' => $this->name,
            'client_name' => $this->client_name,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'status' => $this->status,
            'project_manager' => $this->whenLoaded('projectManager', fn () => [
                'id' => $this->projectManager->id,
                'name' => $this->projectManager->name,
                'role' => $this->projectManager->getRoleNames()->first(),
                'is_active' => (bool) $this->projectManager->is_active,
            ]),
            'active_assignments_count' => $this->whenCounted('activeAssignments'),
            'assignments' => ProjectAssignmentResource::collection(
                $this->whenLoaded('assignments')
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
