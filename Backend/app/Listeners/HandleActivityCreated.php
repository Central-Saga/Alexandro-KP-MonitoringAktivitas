<?php

namespace App\Listeners;

use App\Events\ActivityCreated;
use App\Notifications\ActivityCreatedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class HandleActivityCreated implements ShouldQueue
{
    public function __construct()
    {
        //
    }

    public function handle(ActivityCreated $event): void
    {
        $activity = $event->activity;

        $activity->user->notify(
            new ActivityCreatedNotification($activity)
        );

        Log::info('ActivityCreated berhasil diproses oleh Listener.', [
            'activity_id' => $activity->id,
            'title' => $activity->title,
            'user_id' => $activity->user_id,
            'time' => now()->toDateTimeString(),
        ]);
    }
}