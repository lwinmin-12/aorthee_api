import { Module } from '@nestjs/common';
import { BooksCategoriesService } from './books-categories.service';
import { BooksCategoriesController } from './books-categories.controller';

@Module({
  controllers: [BooksCategoriesController],
  providers: [BooksCategoriesService],
})
export class BooksCategoriesModule {}
