<?php

namespace App\Providers;

use App\Contracts\Repositories\ActivityRepositoryInterface;
use App\Contracts\Repositories\DivisionRepositoryInterface;
use App\Contracts\Repositories\ProjectTaskRepositoryInterface;
use App\Contracts\Repositories\RoleRepositoryInterface;
use App\Contracts\Repositories\UserRepositoryInterface;
use App\Contracts\Services\ActivityServiceInterface;
use App\Contracts\Services\DivisionServiceInterface;
use App\Contracts\Services\ProjectTaskServiceInterface;
use App\Contracts\Services\RoleServiceInterface;
use App\Contracts\Services\UserServiceInterface;
use App\Repositories\ActivityRepository;
use App\Repositories\DivisionRepository;
use App\Repositories\ProjectTaskRepository;
use App\Repositories\RoleRepository;
use App\Repositories\UserRepository;
use App\Services\ActivityService;
use App\Services\DivisionService;
use App\Services\ProjectTaskService;
use App\Services\RoleService;
use App\Services\UserService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register application services.
     */
    public function register(): void
    {
        // Seluruh boundary Service/Repository didaftarkan di satu tempat agar
        // consumer tidak perlu mengetahui concrete implementation-nya.
        $bindings = [
            ActivityRepositoryInterface::class => ActivityRepository::class,
            UserRepositoryInterface::class => UserRepository::class,
            RoleRepositoryInterface::class => RoleRepository::class,
            DivisionRepositoryInterface::class => DivisionRepository::class,
            ProjectTaskRepositoryInterface::class => ProjectTaskRepository::class,
            ActivityServiceInterface::class => ActivityService::class,
            UserServiceInterface::class => UserService::class,
            RoleServiceInterface::class => RoleService::class,
            DivisionServiceInterface::class => DivisionService::class,
            ProjectTaskServiceInterface::class => ProjectTaskService::class,
        ];

        foreach ($bindings as $contract => $implementation) {
            $this->app->bind($contract, $implementation);
        }
    }

    /**
     * Bootstrap application services.
     */
    public function boot(): void
    {
        // N+1 harus terlihat selama development dan test. Production tetap
        // mengizinkan lazy loading agar request lama tidak gagal mendadak.
        Model::preventLazyLoading(! $this->app->isProduction());
    }
}
