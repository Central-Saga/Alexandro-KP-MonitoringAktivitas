<?php

namespace Tests\Unit\Services;

use App\Models\Activity;
use App\Models\User;
use App\Repositories\ActivityRepository;
use App\Services\ActivityService;
use App\Support\QueryCache;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Mockery;
use Tests\TestCase;

class ActivityServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('csm.query_cache_store', 'array');
        config()->set('csm.query_cache_ttl', 60);
        Cache::store('array')->clear();
    }

    public function test_identical_list_uses_cached_descriptor_after_first_query(): void
    {
        $repository = Mockery::mock(ActivityRepository::class);
        $activity = $this->activity(10);
        $repository->shouldReceive('paginate')->once()->andReturn($this->paginator($activity));
        $repository->shouldReceive('findManyForList')->once()->with([10])->andReturn(new Collection([$activity]));
        $service = new ActivityService($repository, new QueryCache);
        $actor = $this->actor(1, 'admin');

        $first = $service->paginate($actor, ['page' => 1, 'per_page' => 10]);
        $second = $service->paginate($actor, ['page' => 1, 'per_page' => 10]);

        $this->assertSame(10, $first->items()[0]->id);
        $this->assertSame(10, $second->items()[0]->id);
    }

    public function test_actor_filter_and_page_have_isolated_cache_keys(): void
    {
        $repository = Mockery::mock(ActivityRepository::class);
        $repository->shouldReceive('paginate')->times(4)->andReturnUsing(
            fn () => $this->paginator($this->activity(random_int(1, 999)))
        );
        $repository->shouldNotReceive('findManyForList');
        $service = new ActivityService($repository, new QueryCache);
        $adminA = $this->actor(1, 'admin');
        $adminB = $this->actor(2, 'admin');

        $service->paginate($adminA, ['search' => 'alpha', 'page' => 1]);
        $service->paginate($adminA, ['search' => 'beta', 'page' => 1]);
        $service->paginate($adminA, ['search' => 'alpha', 'page' => 2]);
        $service->paginate($adminB, ['search' => 'alpha', 'page' => 1]);

        $this->addToAssertionCount(4);
    }

    public function test_create_update_and_delete_replace_list_namespace(): void
    {
        $repository = Mockery::mock(ActivityRepository::class);
        $activity = $this->activity(20);
        $repository->shouldReceive('paginate')->times(4)->andReturn($this->paginator($activity));
        $repository->shouldNotReceive('findManyForList');
        $repository->shouldReceive('create')->once()->with(['title' => 'Baru'])->andReturn($activity);
        $repository->shouldReceive('update')->once()->with($activity, ['title' => 'Ubah'])->andReturn($activity);
        $repository->shouldReceive('delete')->once()->with($activity)->andReturnTrue();
        $service = new ActivityService($repository, new QueryCache);
        $actor = $this->actor(1, 'admin');

        $service->paginate($actor, []);
        $service->create(['title' => 'Baru']);
        $service->paginate($actor, []);
        $service->update($activity, ['title' => 'Ubah']);
        $service->paginate($actor, []);
        $this->assertTrue($service->delete($activity));
        $service->paginate($actor, []);
    }

    private function actor(int $id, string $role): User
    {
        $user = Mockery::mock(User::class);
        $user->shouldReceive('getKey')->andReturn($id);
        $user->shouldReceive('getRoleNames')->andReturn(collect([$role]));

        return $user;
    }

    private function activity(int $id): Activity
    {
        $activity = new Activity;
        $activity->forceFill(['id' => $id]);

        return $activity;
    }

    private function paginator(Activity $activity): LengthAwarePaginator
    {
        return new LengthAwarePaginator([$activity], 1, 10, 1, [
            'path' => 'http://localhost/api/activities',
            'pageName' => 'page',
        ]);
    }
}
