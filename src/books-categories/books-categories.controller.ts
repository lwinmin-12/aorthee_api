import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { AssignCategoryDto } from './dto/assign-category.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { User } from 'generated/prisma/client';
import { CategoriesService } from 'src/categories/categories.service';

@Controller('books-categories')
export class BooksCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  assign(
    @Param('bookId') bookId: string,
    @Body() dto: AssignCategoryDto,
    @CurrentUser() user: User,
  ) {
    return this.categoriesService.assignToBook(bookId, dto.categoryId, user);
  }

  @Delete(':categoryId')
  remove(
    @Param('bookId') bookId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: User,
  ) {
    return this.categoriesService.removeFromBook(bookId, categoryId, user);
  }
}
