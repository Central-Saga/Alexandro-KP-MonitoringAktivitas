<?php

namespace App\Notifications;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ActivityResubmittedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Activity $activity, public User $employee) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'activity_id' => $this->activity->id,
            'title' => $this->activity->title,
            'message' => "{$this->employee->name} mengirim ulang aktivitas: {$this->activity->title}",
        ];
    }
}
