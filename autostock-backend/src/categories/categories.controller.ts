import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { CategoriesService } from './categories.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';



@Controller('categories')

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))

export class CategoriesController {

  constructor(private readonly categoriesService: CategoriesService) {}



  @Get()

  @UseGuards(JwtAuthGuard)

  findAll() {

    return this.categoriesService.findAll();

  }



  @Post()

  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles('admin', 'warehouse')

  create(@Body() dto: CreateCategoryDto) {

    return this.categoriesService.create(dto);

  }

  @Patch(':id')

  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles('admin', 'warehouse')

  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {

    return this.categoriesService.update(id, dto);

  }

}

