<?php

namespace App\Services;

use Exception;
use Google\Client as GoogleClient;
use Google\Service\Drive as GoogleDrive;
use Google\Service\Drive\DriveFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class GoogleDriveBackupService
{
    /**
     * Perform database dump and upload to Google Drive.
     *
     * @return array
     * @throws Exception
     */
    public function backup(): array
    {
        $backupDir = storage_path('app/backups');
        if (!File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true, true);
        }

        $timestamp = date('Y-m-d_H-i-s');
        $appName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower(config('app.name', 'confika_system')));
        $filename = "backup_{$appName}_{$timestamp}.sql";
        $filePath = $backupDir . DIRECTORY_SEPARATOR . $filename;

        // 1. Dump database
        $this->dumpDatabase($filePath);

        if (!File::exists($filePath) || File::size($filePath) === 0) {
            throw new Exception("Database backup file creation failed or produced an empty file.");
        }

        $fileSize = File::size($filePath);

        try {
            // 2. Authenticate with Google Drive Client
            $client = $this->createGoogleClient();
            $driveService = new GoogleDrive($client);

            // 3. Prepare Drive File metadata
            $driveFile = new DriveFile();
            $driveFile->setName($filename);

            $folderId = config('services.google.folder_id');
            if (!empty($folderId)) {
                $driveFile->setParents([$folderId]);
            }

            // 4. Upload to Google Drive
            $fileContent = File::get($filePath);
            $mimeType = str_ends_with($filePath, '.sqlite') ? 'application/vnd.sqlite3' : 'application/sql';

            $createdFile = $driveService->files->create($driveFile, [
                'data' => $fileContent,
                'mimeType' => $mimeType,
                'uploadType' => 'multipart',
                'fields' => 'id, name, webViewLink, size, createdTime'
            ]);

            return [
                'success' => true,
                'file_name' => $filename,
                'drive_file_id' => $createdFile->getId(),
                'web_view_link' => $createdFile->getWebViewLink(),
                'size' => $fileSize,
                'timestamp' => $timestamp,
            ];
        } finally {
            // Clean up temporary local file
            if (File::exists($filePath)) {
                File::delete($filePath);
            }
        }
    }

    /**
     * Create database dump file based on active connection.
     *
     * @param string $outputPath
     * @return void
     * @throws Exception
     */
    protected function dumpDatabase(string $outputPath): void
    {
        $defaultConnection = config('database.default');
        $connectionConfig = config("database.connections.{$defaultConnection}");

        $driver = $connectionConfig['driver'] ?? 'mysql';

        if ($driver === 'sqlite') {
            $dbPath = $connectionConfig['database'] ?? database_path('database.sqlite');
            if (File::exists($dbPath)) {
                $this->exportSqliteToDump($dbPath, $outputPath);
                return;
            }
            throw new Exception("SQLite database file not found at: {$dbPath}");
        }

        if ($driver === 'mysql' || $driver === 'mariadb') {
            $this->dumpMysql($connectionConfig, $outputPath);
            return;
        }

        // Generic PDO fallback dump for other DB engines
        $this->dumpViaPdo($outputPath);
    }

    /**
     * Dump SQLite database tables to SQL dump file.
     */
    protected function exportSqliteToDump(string $dbPath, string $outputPath): void
    {
        if ($this->hasCommand('sqlite3')) {
            $cmd = sprintf('sqlite3 %s .dump > %s', escapeshellarg($dbPath), escapeshellarg($outputPath));
            @exec($cmd, $output, $returnVar);
            if ($returnVar === 0 && File::exists($outputPath) && File::size($outputPath) > 0) {
                return;
            }
        }

        // Fallback: Copy SQLite database file directly as backup
        $sqliteOutputPath = preg_replace('/\.sql$/', '.sqlite', $outputPath);
        File::copy($dbPath, $sqliteOutputPath);
        if (File::exists($sqliteOutputPath)) {
            File::copy($sqliteOutputPath, $outputPath);
            File::delete($sqliteOutputPath);
        }
    }

    /**
     * Dump MySQL database using mysqldump if available, or PDO fallback.
     */
    protected function dumpMysql(array $config, string $outputPath): void
    {
        $host = $config['host'] ?? '127.0.0.1';
        $port = $config['port'] ?? '3306';
        $database = $config['database'] ?? '';
        $username = $config['username'] ?? 'root';
        $password = $config['password'] ?? '';

        if ($this->hasCommand('mysqldump')) {
            $cmd = sprintf(
                'mysqldump --host=%s --port=%s --user=%s %s %s > %s 2>&1',
                escapeshellarg($host),
                escapeshellarg($port),
                escapeshellarg($username),
                !empty($password) ? '--password=' . escapeshellarg($password) : '',
                escapeshellarg($database),
                escapeshellarg($outputPath)
            );

            @exec($cmd, $output, $returnVar);

            if ($returnVar === 0 && File::exists($outputPath) && File::size($outputPath) > 0) {
                return;
            }
        }

        // Fallback to PHP/PDO dump if mysqldump binary is unavailable or failed
        $this->dumpViaPdo($outputPath);
    }

    /**
     * Dump database tables and data using Laravel DB / PDO connection.
     */
    protected function dumpViaPdo(string $outputPath): void
    {
        $handle = fopen($outputPath, 'w');
        if (!$handle) {
            throw new Exception("Cannot open file for writing: {$outputPath}");
        }

        fwrite($handle, "-- Database Backup Generated by GoogleDriveBackupService\n");
        fwrite($handle, "-- Date: " . date('Y-m-d H:i:s') . "\n\n");

        $driver = config('database.connections.' . config('database.default') . '.driver');

        if ($driver === 'sqlite') {
            $tableResults = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
            $tableNames = array_map(fn($t) => $t->name, $tableResults);
        } else {
            fwrite($handle, "SET FOREIGN_KEY_CHECKS=0;\n\n");
            $tableResults = DB::select('SHOW TABLES');
            $tableNames = array_map(fn($t) => array_values((array)$t)[0], $tableResults);
        }

        foreach ($tableNames as $table) {
            if ($driver === 'sqlite') {
                $createSql = DB::select("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?", [$table]);
                if (!empty($createSql)) {
                    fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n");
                    fwrite($handle, $createSql[0]->sql . ";\n\n");
                }
            } else {
                $createSql = DB::select("SHOW CREATE TABLE `{$table}`");
                if (!empty($createSql)) {
                    $row = (array) $createSql[0];
                    $createTableStmt = $row['Create Table'] ?? array_values($row)[1];
                    fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n");
                    fwrite($handle, $createTableStmt . ";\n\n");
                }
            }

            $rows = DB::table($table)->get();
            foreach ($rows as $row) {
                $data = (array) $row;
                $cols = array_map(fn($c) => "`{$c}`", array_keys($data));
                $vals = array_map(function ($v) {
                    if (is_null($v)) return 'NULL';
                    return DB::getPdo()->quote((string)$v);
                }, array_values($data));

                if (!empty($cols)) {
                    $insertSql = sprintf(
                        "INSERT INTO `%s` (%s) VALUES (%s);\n",
                        $table,
                        implode(', ', $cols),
                        implode(', ', $vals)
                    );
                    fwrite($handle, $insertSql);
                }
            }
            fwrite($handle, "\n");
        }

        if ($driver !== 'sqlite') {
            fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
        }
        fclose($handle);
    }

    /**
     * Instantiate and configure Google Client for non-interactive automated auth.
     *
     * @return GoogleClient
     * @throws Exception
     */
    protected function createGoogleClient(): GoogleClient
    {
        $client = new GoogleClient();
        $client->setApplicationName(config('app.name', 'ConfikaSystem'));
        $client->addScope(GoogleDrive::DRIVE_FILE);

        $serviceAccountJson = config('services.google.service_account_json');
        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');
        $refreshToken = config('services.google.refresh_token');

        // Mode 1: Service Account Credentials (JSON string or file path)
        if (!empty($serviceAccountJson)) {
            if (File::exists($serviceAccountJson)) {
                $client->setAuthConfig($serviceAccountJson);
                return $client;
            }
            $jsonDecoded = json_decode($serviceAccountJson, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($jsonDecoded)) {
                $client->setAuthConfig($jsonDecoded);
                return $client;
            }
        }

        // Mode 2: OAuth2 Refresh Token (Client ID + Client Secret + Refresh Token)
        if (!empty($clientId) && !empty($clientSecret) && !empty($refreshToken)) {
            $client->setClientId($clientId);
            $client->setClientSecret($clientSecret);
            $client->refreshToken($refreshToken);
            return $client;
        }

        throw new Exception(
            "Google Drive API credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in your .env file."
        );
    }

    /**
     * Check if shell command is available in environment.
     */
    protected function hasCommand(string $command): bool
    {
        $whereCmd = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ? 'where' : 'which';
        @exec("{$whereCmd} " . escapeshellarg($command), $output, $returnVar);
        return $returnVar === 0;
    }
}
