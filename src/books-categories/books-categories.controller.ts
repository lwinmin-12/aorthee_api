import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Controller, Post, Body, Param, Delete } from '@nestjs/common';
import { AssignCategoryDto } from './dto/assign-category.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { User } from 'generated/prisma/client';
import { CategoriesService } from 'src/categories/categories.service';

@ApiTags('Book categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing or invalid Firebase ID token.',
})
@ApiForbiddenResponse({
  description: 'Requires book ownership and an active account.',
})
@ApiNotFoundResponse({
  description: 'Book, category, or assignment not found.',
})
@Controller('books/:bookId/categories')
export class BooksCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({
    summary: 'Assign categories to a book',
    description:
      'Provide categoryIds for bulk assignment or categoryId for one category. Existing assignments are retained; repeats are ignored.',
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      required: ['success'],
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid category ID or unexpected fields.',
  })
  assign(
    @Param('bookId') bookId: string,
    @Body() dto: AssignCategoryDto,
    @CurrentUser() user: User,
  ) {
    return this.categoriesService.assignToBook(bookId, dto, user);
  }

  @Delete(':categoryId')
  @ApiOperation({ summary: 'Remove a category from a book' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['success'],
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  remove(
    @Param('bookId') bookId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: User,
  ) {
    return this.categoriesService.removeFromBook(bookId, categoryId, user);
  }
}
