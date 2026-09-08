<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DivisionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            // Summary sengaja dibatasi agar credential dan atribut lifecycle
            // user tidak bocor melalui relasi kepala divisi.
            'head' => $this->whenLoaded('head', fn () => $this->head ? [
                'id' => $this->head->id,
                'name' => $this->head->name,
                'email' => $this->head->email,
            ] : null),
            'member_count' => $this->whenCounted('members'),
            'created_at' => $this->created_at,
        ];
    }
}
