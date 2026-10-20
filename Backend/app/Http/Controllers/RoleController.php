<?php

namespace App\Http\Controllers;

use App\Contracts\Services\RoleServiceInterface;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    private const SYSTEM_ROLES = [
        'admin',
        'project_manager',
        'karyawan',
    ];

    public function __construct(
        protected RoleServiceInterface $service
    ) {}

    /**
     * Menampilkan seluruh role beserta permission.
     *
     * Endpoint ini hanya dapat digunakan oleh Admin.
     */
    public function index(Request $request)
    {
        // Pastikan hanya Admin yang dapat mengakses
        // manajemen role.
        abort_unless(
            $request->user()->hasRole('admin'),
            403,
            'Hanya Admin yang dapat mengelola role.'
        );

        return RoleResource::collection(
            $this->service->getAll()
        );
    }

    /**
     * Menampilkan detail satu role.
     */
    public function show(Request $request, int $id)
    {
        // Hanya Admin yang dapat melihat detail role.
        abort_unless(
            $request->user()->hasRole('admin'),
            403,
            'Hanya Admin yang dapat mengelola role.'
        );

        $role = $this->service->getById($id);

        if (! $role) {
            return $this->apiError('Role tidak ditemukan.', 404);
        }

        return new RoleResource($role);
    }

    /**
     * Membuat role baru beserta permission.
     */
    public function store(StoreRoleRequest $request)
    {
        // StoreRoleRequest juga melakukan pengecekan Admin.
        $data = $request->validated();

        // Guard default aplikasi menggunakan web.
        $data['guard_name'] ??= 'web';

        // Pastikan permission yang dikirim memang
        // menggunakan guard yang sama dengan role.
        if (! empty($data['permissions'])) {
            $invalidGuard = Permission::whereIn(
                'name',
                $data['permissions']
            )
                ->where('guard_name', '!=', $data['guard_name'])
                ->exists();

            if ($invalidGuard) {
                return $this->apiError('Permission menggunakan guard yang berbeda.', 422);
            }
        }

        $role = DB::transaction(function () use ($request, $data) {
            $role = $this->service->create($data);
            activity('role')->causedBy($request->user())->performedOn($role)->event('created')
                ->withProperty('subject_name', $role->name)->log("Membuat role {$role->name}");

            return $role;
        });

        return response()->json([
            'message' => 'Role berhasil dibuat.',
            'data' => new RoleResource($role),
        ], 201);
    }

    /**
     * Mengubah nama role dan/atau permission.
     */
    public function update(
        UpdateRoleRequest $request,
        int $id
    ) {
        // Cari role berdasarkan ID.
        $role = $this->service->getById($id);

        if (! $role) {
            return $this->apiError('Role tidak ditemukan.', 404);
        }

        // Role bawaan sistem tidak boleh sembarangan
        // diubah menjadi role yang dapat mengganggu
        // struktur akses aplikasi.
        $data = $request->validated();

        if (
            in_array($role->name, self::SYSTEM_ROLES, true)
            && $data['name'] !== $role->name
        ) {
            return $this->apiError('Nama role bawaan sistem tidak dapat diubah.', 422);
        }

        // Jika permission dikirim, pastikan permission
        // menggunakan guard yang sama.
        if (array_key_exists('permissions', $data)) {
            $invalidGuard = Permission::whereIn(
                'name',
                $data['permissions'] ?? []
            )
                ->where('guard_name', '!=', $role->guard_name)
                ->exists();

            if ($invalidGuard) {
                return $this->apiError('Permission menggunakan guard yang berbeda.', 422);
            }
        }

        $role = DB::transaction(function () use ($request, $role, $data) {
            $role = $this->service->update($role, $data);
            activity('role')->causedBy($request->user())->performedOn($role)->event('updated')
                ->withProperty('subject_name', $role->name)->log("Mengubah hak akses {$role->name}");

            return $role;
        });

        return response()->json([
            'message' => 'Role berhasil diperbarui.',
            'data' => new RoleResource($role),
        ]);
    }

    /**
     * Menghapus role.
     *
     * Role yang sedang digunakan oleh user tidak boleh
     * dihapus agar tidak menyebabkan user kehilangan
     * hak akses secara tidak sengaja.
     */
    public function destroy(Request $request, int $id)
    {
        // Hanya Admin yang dapat menghapus role.
        abort_unless(
            $request->user()->hasRole('admin'),
            403,
            'Hanya Admin yang dapat mengelola role.'
        );

        $role = $this->service->getById($id);

        if (! $role) {
            return $this->apiError('Role tidak ditemukan.', 404);
        }

        // Jangan izinkan Admin menghapus role yang sedang
        // digunakan oleh user.
        $usersUsingRole = User::role($role->name)->exists();

        if ($usersUsingRole) {
            return $this->apiError('Role masih digunakan oleh user dan tidak dapat dihapus.', 422);
        }

        // Jangan izinkan role sistem utama dihapus.
        if (in_array($role->name, self::SYSTEM_ROLES, true)) {
            return $this->apiError('Role bawaan sistem tidak dapat dihapus.', 422);
        }

        $this->service->delete($role);

        return response()->json([
            'message' => 'Role berhasil dihapus.',
        ]);
    }
}
