import type { Request, Response } from 'express';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BackupService } from './backup.service';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { UpdateBackupScheduleDto } from './dto/update-backup-schedule.dto';
export declare class BackupController {
    private readonly backupService;
    constructor(backupService: BackupService);
    download(res: Response): Promise<void>;
    dryRun(backupData: Record<string, unknown>): Promise<import("./backup.types").BackupDryRunResult>;
    restore(req: Request & {
        user: JwtPayload;
    }, dto: RestoreBackupDto): Promise<import("./backup.types").BackupRestoreResult>;
    getSchedule(): import("./backup.types").BackupScheduleConfig;
    updateSchedule(dto: UpdateBackupScheduleDto): import("./backup.types").BackupScheduleConfig;
}
