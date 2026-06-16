import { PrismaService } from '../common/prisma/prisma.service';
export declare class LocationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        code: string;
        zone: string;
        shelf: string;
    }[]>;
}
