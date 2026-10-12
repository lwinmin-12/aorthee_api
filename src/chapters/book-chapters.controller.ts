import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ChapterResponseDto } from './dto/chapter-response.dto';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'generated/prisma/client';

@ApiTags('Chapters')
@ApiNotFoundResponse({ description: 'Book not found.' })
@Controller('books/:bookId/chapters')
export class BookChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  // GET /books/:bookId/chapters
  // Public route — service itself hides DRAFT chapters from non-owners.
  @Public()
  @Get()
  @ApiOperation({ summary: 'List published chapters in book order' })
  @ApiOkResponse({ type: [ChapterResponseDto] })
  list(@Param('bookId') bookId: string, @CurrentUser() user?: User) {
    return this.chaptersService.listForBook(bookId, user);
  }

  // POST /books/:bookId/chapters  (book owner or ADMIN — checked in service)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a draft chapter as book owner or admin' })
  @ApiCreatedResponse({ type: ChapterResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid chapter metadata.' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Requires book ownership or ADMIN role and an active account.',
  })
  create(
    @Param('bookId') bookId: string,
    @Body() dto: CreateChapterDto,
    @CurrentUser() user: User,
  ) {
    return this.chaptersService.create(bookId, dto, user);
  }
}
