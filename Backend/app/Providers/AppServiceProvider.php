<?php

namespace App\Providers;

use App\Contracts\RoleRepositoryInterface;
use App\Repositories\RoleRepository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register application services.
     */
    public function register(): void
    {
        /**
         * Menghubungkan interface repository dengan implementasinya.
         *
         * Saat RoleService meminta RoleRepositoryInterface,
         * Laravel otomatis memberikan RoleRepository.
         */
        $this->app->bind(
            RoleRepositoryInterface::class,
            RoleRepository::class
        );
    }

    /**
     * Bootstrap application services.
     */
    public function boot(): void
    {
        //
    }
}