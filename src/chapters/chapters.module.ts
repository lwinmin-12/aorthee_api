import { Module } from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { ChaptersController } from './chapters.controller';
import { BookChaptersController } from './book-chapters.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChaptersController, BookChaptersController],
  providers: [ChaptersService],
})
export class ChaptersModule {}
