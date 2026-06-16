import { LocationsService } from './locations.service';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    findAll(): Promise<{
        id: string;
        code: string;
        zone: string;
        shelf: string;
    }[]>;
}
