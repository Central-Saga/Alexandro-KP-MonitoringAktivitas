<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use App\Services\UserService;
use App\Support\QueryCache;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class UserServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('csm.query_cache_store', 'array');
        config()->set('csm.query_cache_ttl', 60);
        Cache::store('array')->clear();
    }

    public function test_identical_list_uses_cache_and_query_context_is_isolated(): void
    {
        $repository = Mockery::mock(UserRepository::class);
        $user = $this->user(10);
        $repository->shouldReceive('paginate')->times(4)->andReturn($this->paginator($user));
        $repository->shouldReceive('findManyForList')->once()->with([10])->andReturn(new Collection([$user]));
        $service = new UserService($repository, new QueryCache);
        $adminA = $this->actor(1);
        $adminB = $this->actor(2);

        $service->paginate($adminA, ['search' => 'alpha', 'page' => 1]);
        $cached = $service->paginate($adminA, ['search' => 'alpha', 'page' => 1]);
        $service->paginate($adminA, ['search' => 'beta', 'page' => 1]);
        $service->paginate($adminA, ['search' => 'alpha', 'page' => 2]);
        $service->paginate($adminB, ['search' => 'alpha', 'page' => 1]);

        $this->assertSame(10, $cached->items()[0]->id);
    }

    public function test_create_replaces_user_list_namespace(): void
    {
        $repository = Mockery::mock(UserRepository::class);
        $created = Mockery::mock(User::class);
        $created->shouldReceive('syncRoles')->once()->with('karyawan');
        $created->shouldReceive('load')->once()->with('roles')->andReturnSelf();
        $repository->shouldReceive('paginate')->twice()->andReturn($this->paginator($this->user(11)));
        $repository->shouldNotReceive('findManyForList');
        $repository->shouldReceive('create')->once()->andReturn($created);
        DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($callback) => $callback());
        $service = new UserService($repository, new QueryCache);
        $actor = $this->actor(1);

        $service->paginate($actor, []);
        $this->assertSame($created, $service->create(['role' => 'karyawan']));
        $service->paginate($actor, []);
    }

    public function test_update_replaces_user_and_activity_namespaces(): void
    {
        $repository = Mockery::mock(UserRepository::class);
        $target = Mockery::mock(User::class);
        $target->shouldReceive('syncRoles')->once()->with('project_manager');
        $target->shouldReceive('fresh')->once()->with('roles')->andReturnSelf();
        $repository->shouldReceive('update')->once()->with($target, ['role' => 'project_manager'])->andReturn($target);
        DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($callback) => $callback());
        $cache = new QueryCache;
        $activityReads = 0;
        $cache->remember(QueryCache::ACTIVITIES, ['actor_id' => 1], function () use (&$activityReads) {
            return ++$activityReads;
        });
        $service = new UserService($repository, $cache);

        $this->assertSame($target, $service->update($target, ['role' => 'project_manager']));
        $cache->remember(QueryCache::ACTIVITIES, ['actor_id' => 1], function () use (&$activityReads) {
            return ++$activityReads;
        });

        $this->assertSame(2, $activityReads);
    }

    public function test_status_mutation_replaces_user_and_activity_namespaces(): void
    {
        $repository = Mockery::mock(UserRepository::class);
        $actor = Mockery::mock(User::class);
        $target = Mockery::mock(User::class);
        $locked = Mockery::mock(User::class);
        $target->shouldReceive('getAttribute')->with('id')->andReturn(22);
        $actor->shouldReceive('is')->with($locked)->andReturnFalse();
        $locked->shouldReceive('hasRole')->with('admin')->andReturnFalse();
        $repository->shouldReceive('findForUpdate')->once()->with(22)->andReturn($locked);
        $repository->shouldReceive('updateStatus')->once()->with($locked, false)->andReturn($locked);
        DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($callback) => $callback());
        $cache = new QueryCache;
        $userReads = 0;
        $activityReads = 0;
        $cache->remember(QueryCache::USERS, ['actor_id' => 1], function () use (&$userReads) {
            return ++$userReads;
        });
        $cache->remember(QueryCache::ACTIVITIES, ['actor_id' => 1], function () use (&$activityReads) {
            return ++$activityReads;
        });
        $service = new UserService($repository, $cache);

        $this->assertSame($locked, $service->updateStatus($actor, $target, false));
        $cache->remember(QueryCache::USERS, ['actor_id' => 1], function () use (&$userReads) {
            return ++$userReads;
        });
        $cache->remember(QueryCache::ACTIVITIES, ['actor_id' => 1], function () use (&$activityReads) {
            return ++$activityReads;
        });

        $this->assertSame(2, $userReads);
        $this->assertSame(2, $activityReads);
    }

    private function actor(int $id): User
    {
        $user = Mockery::mock(User::class);
        $user->shouldReceive('getKey')->andReturn($id);
        $user->shouldReceive('getRoleNames')->andReturn(collect(['admin']));

        return $user;
    }

    private function user(int $id): User
    {
        $user = new User;
        $user->forceFill(['id' => $id]);

        return $user;
    }

    private function paginator(User $user): LengthAwarePaginator
    {
        return new LengthAwarePaginator([$user], 1, 10, 1, [
            'path' => 'http://localhost/api/users',
            'pageName' => 'page',
        ]);
    }
}
