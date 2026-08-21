<?php

namespace Tests\Feature;

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
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\DivisionController;
use App\Http\Controllers\ProjectTaskController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
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
use Tests\TestCase;

class ArchitectureBindingTest extends TestCase
{
    public function test_repository_and_service_contracts_resolve_to_expected_implementations(): void
    {
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
            $this->assertInstanceOf($implementation, app($contract));
        }
    }

    public function test_controllers_resolve_with_service_contract_dependencies(): void
    {
        foreach ([
            ActivityController::class,
            UserController::class,
            RoleController::class,
            DivisionController::class,
            ProjectTaskController::class,
        ] as $controller) {
            // Resolusi Controller membuktikan binding Service contract aktif
            // pada jalur dependency yang benar-benar dipakai endpoint.
            $this->assertInstanceOf($controller, app($controller));
        }
    }
}
