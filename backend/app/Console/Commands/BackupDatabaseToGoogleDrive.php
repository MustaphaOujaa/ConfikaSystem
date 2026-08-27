<?php

namespace App\Console\Commands;

use App\Services\GoogleDriveBackupService;
use Illuminate\Console\Command;
use Throwable;

class BackupDatabaseToGoogleDrive extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'backup:google-drive';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically dump database and upload backup to Google Drive';

    /**
     * Execute the console command.
     *
     * @param GoogleDriveBackupService $backupService
     * @return int
     */
    public function handle(GoogleDriveBackupService $backupService): int
    {
        $this->info('Starting database backup to Google Drive...');

        try {
            $result = $backupService->backup();

            $this->info('Database backup completed successfully!');
            $this->line("File Name: {$result['file_name']}");
            $this->line("Google Drive File ID: {$result['drive_file_id']}");
            $this->line("Size: " . number_format($result['size'] / 1024, 2) . " KB");

            return Command::SUCCESS;
        } catch (Throwable $e) {
            $this->error('Database backup failed: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
