import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  BookFavoritesController,
  UserLibraryController,
  ReadingProgressController,
} from './library.controller';
import { LibraryService } from './library.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    BookFavoritesController,
    UserLibraryController,
    ReadingProgressController,
  ],
  providers: [LibraryService],
})
export class LibraryModule {}
