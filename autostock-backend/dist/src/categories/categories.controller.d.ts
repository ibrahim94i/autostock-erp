import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        parentId: string | null;
    }[]>;
    create(dto: CreateCategoryDto): import("@prisma/client").Prisma.Prisma__CategoryClient<{
        id: string;
        name: string;
        parentId: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        name: string;
        parentId: string | null;
    }>;
}
