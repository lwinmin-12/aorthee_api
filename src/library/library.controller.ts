import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
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
import type { User } from '../../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BookResponseDto } from '../books/dto/book-response.dto';
import {
  ContinueReadingResponseDto,
  FavoriteResponseDto,
  LibraryQueryDto,
  ReadingProgressResponseDto,
  UpsertReadingProgressDto,
} from './dto/library.dto';
import { LibraryService } from './library.service';

@ApiTags('Library')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing or invalid Firebase ID token.',
})
@ApiForbiddenResponse({ description: 'Account is suspended or deleted.' })
@Controller('books')
export class BookFavoritesController {
  constructor(private readonly library: LibraryService) {}

  @Post(':id/favorite')
  @ApiOperation({
    summary: 'Favorite a published book',
    description:
      'Repeated calls return the existing Favorite without increasing the counter again.',
  })
  @ApiCreatedResponse({ type: FavoriteResponseDto })
  @ApiNotFoundResponse({
    description:
      'Book is missing, unpublished, archived, or its author is inactive.',
  })
  favorite(@CurrentUser() user: User, @Param('id') id: string) {
    return this.library.favorite(user.id, id);
  }

  @Delete(':id/favorite')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove a favorite',
    description:
      'Idempotent. Also allows removal when the book is no longer publicly available.',
  })
  @ApiNoContentResponse()
  unfavorite(@CurrentUser() user: User, @Param('id') id: string) {
    return this.library.unfavorite(user.id, id);
  }
}

@ApiTags('Library')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@ApiForbiddenResponse({ description: 'Account is suspended or deleted.' })
@ApiBadRequestResponse({ description: 'Invalid pagination.' })
@Controller('users/me')
export class UserLibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get('favorites')
  @ApiOperation({
    summary: 'List your favorited books',
    description:
      'Published books by active authors, most recently favorited first.',
  })
  @ApiOkResponse({ type: [BookResponseDto] })
  favorites(@CurrentUser() user: User, @Query() query: LibraryQueryDto) {
    return this.library.favorites(user.id, query);
  }

  @Get('drafts')
  @ApiOperation({
    summary: 'List your draft books',
    description: 'Only the caller’s DRAFT books, most recently updated first.',
  })
  @ApiOkResponse({ type: [BookResponseDto] })
  drafts(@CurrentUser() user: User, @Query() query: LibraryQueryDto) {
    return this.library.drafts(user.id, query);
  }

  @Get('continue-reading')
  @ApiOperation({
    summary: 'List books you are currently reading',
    description:
      'Progress strictly between 0 and 100 percent, newest updatedAt first. Includes book metadata. Unpublished books/chapters and inactive authors are excluded.',
  })
  @ApiOkResponse({ type: [ContinueReadingResponseDto] })
  continueReading(@CurrentUser() user: User, @Query() query: LibraryQueryDto) {
    return this.library.continueReading(user.id, query);
  }
}

@ApiTags('Reading progress')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@ApiForbiddenResponse({ description: 'Account is suspended or deleted.' })
@Controller('reading-progress')
export class ReadingProgressController {
  constructor(private readonly library: LibraryService) {}

  @Put()
  @ApiOperation({
    summary: 'Save your reading progress',
    description:
      'Upserts one progress row per user/book. Requires a published book; any chapter must be published and belong to that book. Omitted positions are retained unless the chapter changes. Null clears an optional field.',
  })
  @ApiOkResponse({ type: ReadingProgressResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid progress, chapter mismatch, unpublished chapter, or unexpected fields.',
  })
  @ApiNotFoundResponse({ description: 'Book is missing or unavailable.' })
  upsert(@CurrentUser() user: User, @Body() dto: UpsertReadingProgressDto) {
    return this.library.upsertProgress(user.id, dto);
  }

  @Get(':bookId')
  @ApiOperation({ summary: 'Get your saved progress for a book' })
  @ApiOkResponse({ type: ReadingProgressResponseDto })
  @ApiNotFoundResponse({
    description: 'No saved progress, or book/chapter is no longer available.',
  })
  get(@CurrentUser() user: User, @Param('bookId') bookId: string) {
    return this.library.getProgress(user.id, bookId);
  }
}
