<?php

namespace App\Notifications;

use App\Models\Activity;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ActivityCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Activity $activity
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'activity_id' => $this->activity->id,
            'title' => $this->activity->title,
            'description' => $this->activity->description,
            'status' => $this->activity->status,
            'activity_date' => $this->activity->activity_date?->toDateString(),
            'message' => 'Aktivitas baru telah dibuat.',
        ];
    }
}