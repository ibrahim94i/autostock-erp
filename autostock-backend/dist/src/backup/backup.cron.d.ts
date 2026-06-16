import { BackupService } from './backup.service';
export declare class BackupCronJob {
    private readonly backupService;
    private readonly logger;
    constructor(backupService: BackupService);
    handleScheduledBackup(): Promise<void>;
}
