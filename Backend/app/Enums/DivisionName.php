<?php

namespace App\Enums;

enum DivisionName: string
{
    case UI_UX = 'UI/UX';
    case FRONTEND = 'Frontend';
    case BACKEND = 'Backend';
    case DIGITAL_MARKETING = 'Digital Marketing';
    case CONTENT_CREATOR = 'Content Creator';
    case PROJECT_MANAGEMENT = 'Project Management';
    case HUMAN_RESOURCE = 'Human Resource';
    case FINANCE = 'Finance';

    public static function options(): array
    {
        // Enum menjadi source of truth tunggal untuk validasi dan pilihan UI.
        return array_map(
            fn (self $division) => ['value' => $division->value, 'label' => $division->value],
            self::cases()
        );
    }
}
