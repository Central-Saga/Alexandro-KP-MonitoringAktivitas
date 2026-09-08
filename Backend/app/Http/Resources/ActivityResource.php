<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,

            'user_id' => $this->user_id,

            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'profile_photo' => $this->user->profile_photo,
                'division' => $this->user->relationLoaded('division') && $this->user->division
                    ? ['id' => $this->user->division->id, 'name' => $this->user->division->name]
                    : null,
            ]),

            'project_id' => $this->project_id,

            'project' => $this->whenLoaded('project', function () {
                return [
                    'id' => $this->project->id,
                    'name' => $this->project->name,
                    'client_name' => $this->project->client_name,
                ];
            }),

            'task' => $this->whenLoaded('projectTask', fn () => $this->projectTask
                ? [
                    'id' => $this->projectTask->id,
                    'title' => $this->projectTask->title,
                    'status' => $this->projectTask->status->value,
                ]
                : null),

            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'activity_date' => $this->activity_date,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // Summary reviewer dibatasi ke identitas aman; credential dan
            // relasi authorization user tidak pernah ikut response.
            'approved_by' => $this->whenLoaded('approver', fn () => $this->approver
                ? ['id' => $this->approver->id, 'name' => $this->approver->name]
                : null),
            'approved_at' => $this->approved_at,
            'rejected_by' => $this->whenLoaded('rejector', fn () => $this->rejector
                ? ['id' => $this->rejector->id, 'name' => $this->rejector->name]
                : null),
            'rejected_at' => $this->rejected_at,
            'rejection_reason' => $this->rejection_reason,
            'revision_count' => $this->whenLoaded('reviews', fn () => $this->reviews
                ->where('action', 'revision_requested')->count()),
            'review_history' => $this->whenLoaded('reviews', fn () => $this->reviews->map(fn ($review) => [
                'action' => $review->action,
                'note' => $review->note,
                'actor' => $review->actor
                    ? ['name' => $review->actor->name]
                    : null,
                'created_at' => $review->created_at,
            ])->values()),

            'media' => $this->getMedia('activity_files')->map(function ($media) {
                return [
                    'id' => $media->id,
                    'name' => $media->name,
                    'file_name' => $media->file_name,
                    'mime_type' => $media->mime_type,
                    'size' => $media->size,
                    'url' => $media->getUrl(),
                ];
            }),
        ];
    }
}
