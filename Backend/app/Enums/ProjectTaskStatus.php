<?php

namespace App\Enums;

enum ProjectTaskStatus: string
{
    case ACTIVE = 'active';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';
}
