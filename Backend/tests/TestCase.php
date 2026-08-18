<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Validate the effective Laravel configuration before database testing
     * traits such as RefreshDatabase are allowed to run.
     */
    protected function setUpTraits()
    {
        $this->ensureSafeTestingEnvironment();

        return parent::setUpTraits();
    }

    private function ensureSafeTestingEnvironment(): void
    {
        $expected = [
            'database.default' => 'sqlite',
            'database.connections.sqlite.driver' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'cache.default' => 'array',
            'session.driver' => 'array',
            'queue.default' => 'sync',
        ];

        if (! $this->app->environment('testing')) {
            throw new \RuntimeException(
                'Unsafe test environment: APP_ENV must be testing before database tests may run.'
            );
        }

        foreach ($expected as $key => $value) {
            if (config($key) !== $value) {
                throw new \RuntimeException(sprintf(
                    'Unsafe test database configuration: %s must be %s; got %s. Database mutation was blocked.',
                    $key,
                    var_export($value, true),
                    var_export(config($key), true),
                ));
            }
        }

        if (filled(config('database.connections.sqlite.url'))) {
            throw new \RuntimeException(
                'Unsafe test database configuration: DB_URL must be empty for SQLite in-memory tests.'
            );
        }
    }
}
