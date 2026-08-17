<?php

namespace App\Enums;

/**
 * Daftar status resmi untuk Activity.
 *
 * Enum ini digunakan agar status activity
 * tidak dapat diisi dengan nilai sembarangan.
 */
enum ActivityStatus: string
{
    // Activity baru dibuat tetapi belum berjalan.
    case PENDING = 'pending';

    // Activity sedang dikerjakan.
    case ONGOING = 'ongoing';

    // Activity sudah selesai dikerjakan.
    case SELESAI = 'selesai';

    // Activity sudah mendapatkan persetujuan.
    case APPROVED = 'approved';
}
