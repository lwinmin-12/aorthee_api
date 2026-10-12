import { Module } from '@nestjs/common';
import { BooksCategoriesController } from './books-categories.controller';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [BooksCategoriesController],
})
export class BooksCategoriesModule {}
