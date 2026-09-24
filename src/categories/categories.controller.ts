import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import { UserRole } from 'generated/prisma/enums';
import { ListCategoryBooksDto } from './dto/list-category-book.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /categories
  @Public()
  @Get()
  @ApiOperation({
    summary: 'List all categories',
    description: 'Returns all available book categories.',
  })
  @ApiOkResponse({
    description: 'Categories retrieved successfully.',
  })
  findAll() {
    return this.categoriesService.findAll();
  }

  // GET /categories/:slug
  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Get category by slug',
    description: 'Returns a category using its unique slug.',
  })
  @ApiOkResponse({
    description: 'Category retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Category with the specified slug was not found.',
  })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  // POST /categories
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Create a new category',
    description: 'Creates a new book category. Admin access is required.',
  })
  @ApiCreatedResponse({
    description: 'Category created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid category data or slug/name already exists.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({
    description: 'User does not have ADMIN role.',
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  // PATCH /categories/:id
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a category',
    description: 'Updates an existing category. Admin access is required.',
  })
  @ApiOkResponse({
    description: 'Category updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid category data or slug/name already exists.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({
    description: 'User does not have ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Category with the specified ID was not found.',
  })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  // DELETE /categories/:id
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a category',
    description: 'Deletes an existing category. Admin access is required.',
  })
  @ApiNoContentResponse({
    description: 'Category deleted successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({
    description: 'User does not have ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Category with the specified ID was not found.',
  })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Public()
  @Get(':slug/books')
  findBooks(@Param('slug') slug: string, @Query() query: ListCategoryBooksDto) {
    return this.categoriesService.findBooksForCategory(slug, query);
  }
}
