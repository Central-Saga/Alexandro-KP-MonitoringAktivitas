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

            'project_id' => $this->project_id,

            'project' => $this->whenLoaded('project', function () {
                return [
                    'id' => $this->project->id,
                    'name' => $this->project->name,
                    'client_name' => $this->project->client_name,
                ];
            }),

            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'activity_date' => $this->activity_date,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

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