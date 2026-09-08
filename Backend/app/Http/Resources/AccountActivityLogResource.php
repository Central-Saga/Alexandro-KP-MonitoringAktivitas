<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $subjectType = $this->subject_type ? class_basename($this->subject_type) : null;
        $subjectName = $this->subjectName();
        $category = $this->category($subjectType);

        return [
            'id' => $this->id,
            'event' => $this->event,
            'category' => $category,
            'description' => $this->displayDescription($subjectType, $subjectName),
            'subject_type' => $subjectType,
            'subject_id' => $this->subject_id,
            'subject_name' => $subjectName,
            'created_at' => $this->created_at?->toISOString(),
            'created_at_human' => $this->created_at?->locale('id')->diffForHumans(),
        ];
    }

    private function displayDescription(?string $subjectType, ?string $subjectName): string
    {
        $description = trim((string) $this->description);
        $event = strtolower(trim((string) $this->event));
        $technicalDescriptions = ['', 'created', 'updated', 'deleted'];

        if (! in_array(strtolower($description), $technicalDescriptions, true)) {
            return $description;
        }

        $labels = [
            'User' => ['created' => 'Membuat pengguna', 'updated' => 'Mengubah data pengguna', 'deleted' => 'Menghapus pengguna'],
            'Division' => ['created' => 'Membuat divisi', 'updated' => 'Mengubah divisi', 'deleted' => 'Menghapus divisi'],
            'Project' => ['created' => 'Membuat proyek', 'updated' => 'Mengubah proyek', 'deleted' => 'Menghapus proyek'],
            'ProjectTask' => ['created' => 'Membuat tugas', 'updated' => 'Mengubah tugas', 'deleted' => 'Menghapus tugas'],
            'Activity' => ['created' => 'Membuat aktivitas', 'updated' => 'Mengubah aktivitas', 'deleted' => 'Menghapus aktivitas'],
            'Role' => ['created' => 'Membuat role', 'updated' => 'Mengubah hak akses', 'deleted' => 'Menghapus role'],
            'ProjectAssignment' => ['created' => 'Menambahkan anggota proyek', 'updated' => 'Mengubah penugasan proyek', 'deleted' => 'Menghapus penugasan proyek'],
        ];

        $prefix = $labels[$subjectType][$event] ?? null;

        if ($prefix) {
            return $subjectName ? "{$prefix} {$subjectName}" : $prefix;
        }

        return match ($event) {
            'created' => 'Membuat data baru',
            'deleted' => 'Menghapus data',
            default => 'Melakukan perubahan data',
        };
    }

    private function category(?string $subjectType): string
    {
        if (in_array($this->log_name, ['authentication', 'profile'], true)) {
            return $this->log_name;
        }

        return match ($subjectType) {
            'User' => 'user',
            'Division' => 'division',
            'Project' => 'project',
            'ProjectTask' => 'project_task',
            'Activity' => 'activity',
            'ProjectAssignment' => 'assignment',
            'Role' => 'role',
            default => in_array($this->log_name, [
                'user', 'division', 'project', 'project_task', 'activity',
                'assignment', 'role', 'system',
            ], true) ? $this->log_name : 'system',
        };
    }

    private function subjectName(): ?string
    {
        $subjectName = $this->properties?->get('subject_name');

        if (! $subjectName && $this->relationLoaded('subject')) {
            $subjectName = $this->subject?->name ?? $this->subject?->title;
        }

        foreach (['properties', 'attribute_changes'] as $source) {
            $values = $this->{$source}?->toArray() ?? [];
            $subjectName ??= data_get($values, 'attributes.name')
                ?? data_get($values, 'attributes.title')
                ?? data_get($values, 'old.name')
                ?? data_get($values, 'old.title');
        }

        return is_string($subjectName) && $subjectName !== '' ? $subjectName : null;
    }
}
