<?php

namespace App\Http\Controllers;

use App\Contracts\Services\ActivityServiceInterface;
use App\Enums\ActivityStatus;
use App\Events\ActivityCreated;
use App\Http\Requests\IndexActivityRequest;
use App\Http\Requests\StoreActivityRequest;
use App\Http\Requests\UpdateActivityRequest;
use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Notifications\ActivityResubmittedNotification;
use App\Notifications\ActivityRevisionRequestedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ActivityController extends Controller
{
    public function __construct(
        protected ActivityServiceInterface $service
    ) {}

    /**
     * Menampilkan daftar activity sesuai hak akses user.
     */
    public function index(IndexActivityRequest $request)
    {
        Gate::authorize('viewAny', Activity::class);

        return ActivityResource::collection(
            $this->service->paginate($request->user(), $request->validated())
        );
    }

    public function todaySummary(Request $request)
    {
        Gate::authorize('viewAny', Activity::class);

        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        return response()->json([
            'data' => $this->service->todaySummary(
                $request->user(),
                $validated['date'] ?? now()->toDateString(),
            ),
        ]);
    }

    /**
     * Menampilkan detail activity.
     */
    public function show(int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return $this->apiError('Aktivitas tidak ditemukan', 404);
        }

        // Policy menentukan apakah user boleh melihat activity.
        Gate::authorize('view', $activity);

        return new ActivityResource($activity);
    }

    /**
     * Membuat activity baru.
     */
    public function store(StoreActivityRequest $request)
    {
        $data = $request->validated();

        $user = $request->user();

        /*
         * KARYAWAN
         *
         * user_id dari request tidak dipercaya.
         * Activity selalu dibuat atas nama user yang sedang login.
         */
        if ($user->hasRole('karyawan')) {
            $data['user_id'] = $user->id;

            // Submit awal Karyawan langsung berstatus siap review (selesai).
            // Nilai status dari client tidak dipercaya agar konsisten
            // dengan alur antrean validasi Project Manager.
            $data['status'] = ActivityStatus::SELESAI->value;

            // Pastikan karyawan memang ditugaskan
            // secara aktif pada project tersebut.
            $assigned = ProjectAssignment::where('project_id', $data['project_id'])
                ->where('user_id', $user->id)
                ->where('status', 'aktif')
                ->exists();

            if (! $assigned) {
                return $this->apiError('Anda tidak ditugaskan ke project ini.', 403);
            }
        }

        /*
         * PROJECT MANAGER
         *
         * PM hanya boleh membuat activity pada project
         * yang memang dikelolanya.
         */
        if ($user->hasRole('project_manager')) {
            $projectOwned = Project::where('id', $data['project_id'])
                ->where('project_manager_id', $user->id)
                ->exists();

            if (! $projectOwned) {
                return $this->apiError('Anda bukan Project Manager dari project ini.', 403);
            }

            /*
             * PM hanya boleh membuat activity untuk karyawan
             * yang memang aktif ditugaskan pada project tersebut.
             *
             * Ini mencegah PM memasukkan user_id sembarang
             * selama user tersebut memang ada di database.
             */
            $assigned = ProjectAssignment::where('project_id', $data['project_id'])
                ->where('user_id', $data['user_id'])
                ->where('status', 'aktif')
                ->exists();

            if (! $assigned) {
                return $this->apiError('Karyawan tersebut tidak ditugaskan ke project ini.', 403);
            }
        }

        /*
         * ADMIN
         *
         * Admin tetap diperbolehkan membuat activity
         * untuk user/project sesuai kebutuhan administrasi.
         */
        $activity = DB::transaction(function () use ($request, $data) {
            $activity = $this->service->create($data);
            $activity->reviews()->create([
                'actor_id' => $request->user()->id,
                'action' => 'submitted',
            ]);
            $activity->load('reviews.actor');
            activity('activity')->causedBy($request->user())->performedOn($activity)->event('created')
                ->withProperty('subject_name', $activity->title)->log("Membuat aktivitas {$activity->title}");

            return $activity;
        });

        // Kirim event setelah activity berhasil dibuat.
        ActivityCreated::dispatch($activity);

        return response()->json([
            'message' => 'Aktivitas berhasil dibuat',
            'data' => new ActivityResource($activity),
        ], 201);
    }

    /**
     * Memperbarui activity.
     */
    public function update(UpdateActivityRequest $request, int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return $this->apiError('Aktivitas tidak ditemukan', 404);
        }

        // Policy memastikan user memiliki hak update.
        Gate::authorize('update', $activity);

        $data = $request->validated();

        $user = $request->user();

        /*
         * KARYAWAN
         *
         * Karyawan tidak boleh memindahkan activity
         * ke user atau project lain.
         */
        if ($user->hasRole('karyawan')) {
            $data['user_id'] = $activity->user_id;
            $data['project_id'] = $activity->project_id;

            // Karyawan yang mengedit / mengirim ulang aktivitas (termasuk revisi)
            // selalu menempatkan status aktivitas kembali ke antrean validasi (selesai).
            $data['status'] = ActivityStatus::SELESAI->value;

            if ($activity->project_id) {
                $assigned = ProjectAssignment::where(
                    'project_id',
                    $activity->project_id
                )
                    ->where('user_id', $user->id)
                    ->where('status', 'aktif')
                    ->exists();

                if (! $assigned) {
                    return $this->apiError('Anda tidak lagi ditugaskan ke project ini.', 403);
                }
            }
        }

        /*
         * PROJECT MANAGER
         *
         * PM hanya boleh mengubah activity pada project
         * yang memang dikelolanya.
         */
        if ($user->hasRole('project_manager')) {
            // Gunakan project baru jika dikirim,
            // jika tidak gunakan project activity saat ini.
            $projectId = $data['project_id'] ?? $activity->project_id;

            $projectOwned = Project::where('id', $projectId)
                ->where('project_manager_id', $user->id)
                ->exists();

            if (! $projectOwned) {
                    return $this->apiError('Anda bukan Project Manager dari project ini.', 403);
            }

            /*
             * Tentukan user yang akan menjadi pemilik activity.
             *
             * Jika user_id tidak dikirim, gunakan user activity
             * yang sekarang.
             */
            $targetUserId = $data['user_id'] ?? $activity->user_id;

            /*
             * PM hanya boleh mengubah activity untuk karyawan
             * yang aktif ditugaskan pada project tersebut.
             */
            $assigned = ProjectAssignment::where('project_id', $projectId)
                ->where('user_id', $targetUserId)
                ->where('status', 'aktif')
                ->exists();

            if (! $assigned) {
                    return $this->apiError('Karyawan tersebut tidak ditugaskan ke project ini.', 403);
            }

            /*
             * Pastikan user_id dan project_id yang digunakan
             * adalah kombinasi yang valid.
             */
            $data['user_id'] = $targetUserId;
            $data['project_id'] = $projectId;
        }

        /*
         * ADMIN
         *
         * Admin tetap diperbolehkan mengubah user/project
         * sesuai kebutuhan administrasi.
         */
        $wasRejected = $activity->status === ActivityStatus::REJECTED;
        $activity = $this->service->update($activity, $data, $request->user());
        $action = $wasRejected ? 'Mengirim ulang' : 'Memperbaiki';
        activity('activity')->causedBy($request->user())->performedOn($activity)->event($wasRejected ? 'resubmitted' : 'updated')
            ->withProperty('subject_name', $activity->title)->log("{$action} aktivitas {$activity->title}");

        if ($wasRejected) {
            $activity->project?->projectManager?->notify(
                new ActivityResubmittedNotification($activity, $request->user())
            );
        }

        return response()->json([
            'message' => $wasRejected
                ? 'Aktivitas berhasil dikirim ulang untuk divalidasi.'
                : 'Aktivitas berhasil diperbarui',
            'data' => new ActivityResource($activity),
        ]);
    }

    /**
     * Upload media sebagai bukti aktivitas.
     *
     * Hanya karyawan pemilik activity yang diperbolehkan.
     */
    public function uploadMedia(Request $request, int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return $this->apiError('Aktivitas tidak ditemukan', 404);
        }

        // Policy memastikan hanya pemilik activity
        // yang dapat mengupload media.
        Gate::authorize('uploadMedia', $activity);

        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $media = $activity
            ->addMediaFromRequest('file')
            ->toMediaCollection('activity_files');

        // Media ikut tampil pada ActivityResource list, sehingga descriptor
        // list harus diganti setelah upload berhasil.
        $this->service->invalidateListCache();

        return response()->json([
            'message' => 'File berhasil diupload',
            'data' => [
                'id' => $media->id,
                'name' => $media->name,
                'file_name' => $media->file_name,
                'mime_type' => $media->mime_type,
                'size' => $media->size,
                'url' => $media->getUrl(),
            ],
        ], 201);
    }

    /**
     * Menghapus activity.
     *
     * Hak akses ditentukan oleh ActivityPolicy.
     */
    public function destroy(int $id)
    {
        $activity = $this->service->getById($id);

        if (! $activity) {
            return $this->apiError('Aktivitas tidak ditemukan', 404);
        }

        // Policy menentukan siapa yang boleh menghapus activity.
        Gate::authorize('delete', $activity);

        $this->service->delete($activity);

        return response()->json([
            'message' => 'Aktivitas berhasil dihapus',
        ]);
    }

    public function approve(Request $request, Activity $activity)
    {
        Gate::authorize('approve', $activity);

        $activity = $this->service->approve($activity, $request->user());
        $ownerName = $activity->user()->value('name');
        activity('activity')->causedBy($request->user())->performedOn($activity)->event('approved')
            ->withProperty('subject_name', $activity->title)->log("Menyetujui aktivitas {$activity->title} milik {$ownerName}");

        return response()->json([
            'message' => 'Aktivitas berhasil disetujui',
            'data' => new ActivityResource($activity),
        ]);
    }

    public function reject(Request $request, Activity $activity)
    {
        Gate::authorize('reject', $activity);
        $data = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $activity = $this->service->reject(
            $activity,
            $request->user(),
            $data['rejection_reason']
        );
        $ownerName = $activity->user()->value('name');
        activity('activity')->causedBy($request->user())->performedOn($activity)->event('revision_requested')
            ->withProperty('subject_name', $activity->title)->log("Meminta revisi aktivitas {$activity->title} milik {$ownerName}");
        $activity->user->notify(
            new ActivityRevisionRequestedNotification($activity, $request->user())
        );

        return response()->json([
            'message' => 'Permintaan revisi berhasil dikirim.',
            'data' => new ActivityResource($activity),
        ]);
    }
}
