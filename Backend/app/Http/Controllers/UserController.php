<?php

namespace App\Http\Controllers;

use App\Contracts\Services\UserServiceInterface;
use App\Http\Requests\IndexUserRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\UpdateUserStatusRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

class UserController extends Controller
{
    public function __construct(protected UserServiceInterface $service) {}

    public function index(IndexUserRequest $request)
    {
        Gate::authorize('viewAny', User::class);

        return UserResource::collection(
            $this->service->paginate($request->user(), $request->validated())
        );
    }

    public function store(StoreUserRequest $request)
    {
        Gate::authorize('create', User::class);

        $user = $this->service->create($request->validated());
        activity('user')->causedBy($request->user())->performedOn($user)->event('created')
            ->withProperty('subject_name', $user->name)->log("Membuat pengguna {$user->name}");

        return response()->json([
            'message' => 'User berhasil dibuat.',
            'data' => new UserResource($user),
        ], 201);
    }

    public function show(User $user)
    {
        Gate::authorize('view', $user);

        return new UserResource($user->load(['roles', 'division']));
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        Gate::authorize('update', $user);

        $user = $this->service->update($user, $request->validated());
        activity('user')->causedBy($request->user())->performedOn($user)->event('updated')
            ->withProperty('subject_name', $user->name)->log("Mengubah data pengguna {$user->name}");

        return response()->json([
            'message' => 'User berhasil diperbarui.',
            'data' => new UserResource($user),
        ]);
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user)
    {
        Gate::authorize('updateStatus', $user);

        $user = $this->service->updateStatus(
            $request->user(),
            $user,
            $request->boolean('is_active')
        );
        activity('user')->causedBy($request->user())->performedOn($user)
            ->event($user->is_active ? 'activated' : 'deactivated')
            ->withProperty('subject_name', $user->name)
            ->log(($user->is_active ? 'Mengaktifkan' : 'Menonaktifkan')." pengguna {$user->name}");

        return response()->json([
            'message' => $user->is_active
                ? 'User berhasil diaktifkan.'
                : 'User berhasil dinonaktifkan.',
            'data' => new UserResource($user),
        ]);
    }
}
