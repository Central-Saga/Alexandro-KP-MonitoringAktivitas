<?php

declare(strict_types=1);

require dirname(__DIR__).'/vendor/autoload.php';

$cachedConfig = dirname(__DIR__).'/bootstrap/cache/config.php';

if (is_file($cachedConfig)) {
    throw new RuntimeException(
        'Laravel configuration is cached. Tests were stopped before application boot to prevent cached development database settings from reaching RefreshDatabase. Run php artisan config:clear first.'
    );
}

$requiredEnvironment = [
    'APP_ENV' => 'testing',
    'DB_CONNECTION' => 'sqlite',
    'DB_DATABASE' => ':memory:',
    'CACHE_STORE' => 'array',
    'SESSION_DRIVER' => 'array',
    'QUEUE_CONNECTION' => 'sync',
];

foreach ($requiredEnvironment as $name => $expected) {
    $actual = $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name);

    if ($actual !== $expected) {
        throw new RuntimeException(sprintf(
            'Unsafe PHPUnit environment: %s must be %s; got %s. Tests were stopped before Laravel boot.',
            $name,
            var_export($expected, true),
            var_export($actual, true),
        ));
    }

    // `php artisan test` starts from an application process that has already
    // loaded .env. Keep every environment channel consistent before a fresh
    // test application reads config through Laravel's env() helper.
    $_ENV[$name] = $expected;
    $_SERVER[$name] = $expected;
    putenv($name.'='.$expected);
}

$databaseUrl = $_ENV['DB_URL'] ?? $_SERVER['DB_URL'] ?? getenv('DB_URL');

if ($databaseUrl !== false && $databaseUrl !== '') {
    throw new RuntimeException(
        'Unsafe PHPUnit environment: DB_URL must be empty for SQLite in-memory tests.'
    );
}

$_ENV['DB_URL'] = '';
$_SERVER['DB_URL'] = '';
putenv('DB_URL=');
