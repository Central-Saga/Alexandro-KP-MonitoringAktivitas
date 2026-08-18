<?php

namespace Tests\Feature;

use PDO;
use Tests\TestCase;

class DatabaseSafetyGuardTest extends TestCase
{
    public function test_test_suite_uses_sqlite_in_memory_database(): void
    {
        $connection = $this->app['db']->connection();

        $this->assertSame('testing', $this->app->environment());
        $this->assertSame('sqlite', $connection->getDriverName());
        $this->assertSame(':memory:', $connection->getDatabaseName());
        $this->assertSame('sqlite', $connection->getPdo()->getAttribute(PDO::ATTR_DRIVER_NAME));
        $this->assertSame('array', config('cache.default'));
        $this->assertSame('array', config('session.driver'));
        $this->assertSame('sync', config('queue.default'));
    }
}
