<?php

return [
    'query_cache_store' => env('APP_QUERY_CACHE_STORE', env('CACHE_STORE', 'redis')),
    'query_cache_ttl' => (int) env('APP_QUERY_CACHE_TTL', 60),
];
