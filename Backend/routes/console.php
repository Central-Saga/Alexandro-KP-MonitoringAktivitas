<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('queue:test-dispatch', function () {
    dispatch(function () {
        Log::info('Redis Queue Worker Test Job Processed Successfully!');
    });
    $this->info('Test job dispatched to Redis queue!');
})->purpose('Dispatch a test job to the Redis queue');
