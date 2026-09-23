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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { UserRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BooksService } from './books.service';
import { BookResponseDto } from './dto/book-response.dto';
import { CreateBookDto, ListBooksDto, UpdateBookDto } from './dto/book.dto';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse published books and comics' })
  @ApiOkResponse({ type: [BookResponseDto] })
  @ApiBadRequestResponse({ description: 'Invalid pagination or content type.' })
  list(@Query() query: ListBooksDto) {
    return this.books.list(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get published book or comic metadata by slug' })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiNotFoundResponse({
    description:
      'Book is missing, unpublished, archived, or its author is inactive.',
  })
  getBySlug(@Param('slug') slug: string) {
    return this.books.getBySlug(slug);
  }

  @Post()
  @Roles(UserRole.CREATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a draft book or comic as a creator' })
  @ApiCreatedResponse({ type: BookResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid metadata or unexpected fields.',
  })
  @ApiConflictResponse({ description: 'Slug is already in use.' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Requires an active CREATOR account.' })
  create(@CurrentUser() user: User, @Body() dto: CreateBookDto) {
    return this.books.create(user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Edit book metadata as its owner or an admin',
    description:
      'Content type is immutable. Use publish and delete endpoints to change status.',
  })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid metadata or unexpected fields.',
  })
  @ApiConflictResponse({ description: 'Slug is already in use.' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
  ) {
    return this.books.update(user, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish a book as its owner or an admin',
    description:
      'Sets status to PUBLISHED and publishedAt to the current time, including on repeat calls or when republishing an archived book.',
  })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  publish(@CurrentUser() user: User, @Param('id') id: string) {
    return this.books.publish(user, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Archive a book as its owner or an admin',
    description:
      'Sets status to ARCHIVED and retains chapters, relations, and publication history. Repeated archiving succeeds.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  archive(@CurrentUser() user: User, @Param('id') id: string) {
    return this.books.archive(user, id);
  }
}
