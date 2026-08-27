<?php

namespace App\Http\Controllers;

use App\Services\GoogleDriveBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class BackupController extends Controller
{
    /**
     * Trigger database backup and upload to Google Drive.
     *
     * @param GoogleDriveBackupService $backupService
     * @return JsonResponse
     */
    public function backupToGoogleDrive(GoogleDriveBackupService $backupService): JsonResponse
    {
        try {
            $result = $backupService->backup();

            return response()->json([
                'status' => 'success',
                'message' => 'Database backup created and uploaded to Google Drive successfully.',
                'data' => $result,
            ], 200);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Backup failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
