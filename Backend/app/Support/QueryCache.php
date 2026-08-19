<?php

namespace App\Support;

use Closure;
use Illuminate\Contracts\Pagination\LengthAwarePaginator as LengthAwarePaginatorContract;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Throwable;

class QueryCache
{
    public const ACTIVITIES = 'activities';

    public const USERS = 'users';

    public const PROJECTS = 'projects';

    public function remember(string $resource, array $context, Closure $resolver): mixed
    {
        $store = Cache::store(config('csm.query_cache_store'));
        $key = $this->key($resource, $context);

        try {
            $cached = $store->get($key);

            if ($cached !== null) {
                return $cached;
            }
        } catch (Throwable $exception) {
            // Cache hanya optimasi. Kegagalan Redis dilaporkan, sedangkan
            // resolver database tetap menjadi source of truth.
            report($exception);
        }

        $value = $resolver();

        try {
            $store->put($key, $value, max(1, (int) config('csm.query_cache_ttl', 60)));
        } catch (Throwable $exception) {
            report($exception);
        }

        return $value;
    }

    public function rememberPaginator(
        string $resource,
        array $context,
        Closure $resolver,
        Closure $hydrate
    ): LengthAwarePaginatorContract {
        $resolved = null;

        // Descriptor scalar aman disimpan di Redis tanpa mengizinkan
        // unserialisasi model atau paginator PHP dari cache.
        $descriptor = $this->remember($resource, $context, function () use ($resolver, &$resolved) {
            $resolved = $resolver();

            return [
                'ids' => collect($resolved->items())->map(fn ($model) => $model->getKey())->all(),
                'total' => $resolved->total(),
                'per_page' => $resolved->perPage(),
                'current_page' => $resolved->currentPage(),
                'page_name' => $resolved->getPageName(),
            ];
        });

        if ($resolved instanceof LengthAwarePaginatorContract) {
            return $resolved;
        }

        return new LengthAwarePaginator(
            $hydrate($descriptor['ids']),
            $descriptor['total'],
            $descriptor['per_page'],
            $descriptor['current_page'],
            [
                // Link pagination dibangun dari request saat ini, bukan raw
                // search/filter yang disimpan sebagai payload cache.
                'path' => request()->url(),
                'query' => request()->query(),
                'pageName' => $descriptor['page_name'],
            ],
        );
    }

    public function invalidate(string ...$resources): void
    {
        $store = Cache::store(config('csm.query_cache_store'));

        foreach (array_unique($resources) as $resource) {
            try {
                // Version namespace menghindari enumerasi ribuan kombinasi
                // filter. Cache lama dibiarkan kedaluwarsa sesuai TTL.
                $store->increment($this->versionKey($resource));
            } catch (Throwable $exception) {
                // Mutation database tidak boleh dibatalkan hanya karena cache
                // sedang unavailable; tidak ada Cache::flush() global.
                report($exception);
            }
        }
    }

    private function key(string $resource, array $context): string
    {
        $version = 0;

        try {
            $version = (int) Cache::store(config('csm.query_cache_store'))
                ->get($this->versionKey($resource), 0);
        } catch (Throwable $exception) {
            report($exception);
        }

        $payload = json_encode($this->normalize($context), JSON_THROW_ON_ERROR);

        // Context di-hash agar search/email tidak muncul sebagai raw cache key.
        return "csm:query:{$resource}:v{$version}:".hash('sha256', $payload);
    }

    private function versionKey(string $resource): string
    {
        return "csm:query:{$resource}:version";
    }

    private function normalize(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        if (array_is_list($value)) {
            return array_map($this->normalize(...), $value);
        }

        ksort($value);

        return array_map($this->normalize(...), $value);
    }
}
