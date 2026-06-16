import { AdminService } from './admin.service';
import { ResetDataDto } from './dto/reset-data.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    resetData(_dto: ResetDataDto): Promise<{
        message: string;
    }>;
}
