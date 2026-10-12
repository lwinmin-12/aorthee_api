import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ChapterResponseDto,
  ChapterTextResponseDto,
  ChapterPageResponseDto,
  TextContentResponseDto,
  PagesContentResponseDto,
} from './dto/chapter-response.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { UpsertChapterTextDto } from './dto/upsert-chapter-text.dto';
import { CreateChapterPageDto } from './dto/create-chapter-page.dto';
import { UpdateChapterPageDto } from './dto/update-chapter-page.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'generated/prisma/client';

@ApiTags('Chapters')
@ApiExtraModels(TextContentResponseDto, PagesContentResponseDto)
@ApiNotFoundResponse({ description: 'Chapter or page not found.' })
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  // GET /chapters/:id — metadata only, no content payload
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get chapter metadata by ID' })
  @ApiOkResponse({ type: ChapterResponseDto })
  findOne(@Param('id') id: string) {
    return this.chaptersService.findOne(id);
  }

  // GET /chapters/:id/content — branches on Book.type server-side
  @Public()
  @Get(':id/content')
  @ApiOperation({
    summary: 'Read published chapter content',
    description:
      'Returns text for BOOK chapters or ordered pages for COMIC chapters. Unpublished chapters return 404.',
  })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(TextContentResponseDto) },
        { $ref: getSchemaPath(PagesContentResponseDto) },
      ],
      discriminator: {
        propertyName: 'type',
        mapping: {
          text: getSchemaPath(TextContentResponseDto),
          pages: getSchemaPath(PagesContentResponseDto),
        },
      },
    },
  })
  getContent(@Param('id') id: string, @CurrentUser() user?: User) {
    return this.chaptersService.getContent(id, user);
  }

  // PATCH /chapters/:id  (owner/ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update chapter metadata',
    description: 'Requires book ownership or ADMIN role.',
  })
  @ApiOkResponse({ type: ChapterResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Not the owner or admin, or account is inactive.',
  })
  @ApiBadRequestResponse({ description: 'Invalid chapter metadata.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChapterDto,
    @CurrentUser() user: User,
  ) {
    return this.chaptersService.update(id, dto, user);
  }

  // DELETE /chapters/:id  (owner/ADMIN)
  @HttpCode(204)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a chapter and its content',
    description: 'Requires book ownership or ADMIN role.',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Not the owner or admin, or account is inactive.',
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.chaptersService.remove(id, user);
  }

  // POST /chapters/:id/publish  (owner/ADMIN)
  @Post(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish a chapter',
    description: 'Requires book ownership or ADMIN role.',
  })
  @ApiCreatedResponse({ type: ChapterResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Not the owner or admin, or account is inactive.',
  })
  @ApiBadRequestResponse({
    description:
      'Text chapters require content; comic chapters require at least one page.',
  })
  publish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.chaptersService.publish(id, user);
  }

  // PUT /chapters/:id/text  (novels only — owner/ADMIN)
  @Put(':id/text')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or replace novel chapter text',
    description: 'Requires book ownership or ADMIN role.',
  })
  @ApiOkResponse({ type: ChapterTextResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Not the owner or admin, or account is inactive.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid text body or chapter belongs to a comic.',
  })
  upsertText(
    @Param('id') id: string,
    @Body() dto: UpsertChapterTextDto,
    @CurrentUser() user: User,
  ) {
    return this.chaptersService.upsertText(id, dto, user);
  }

  // POST /chapters/:id/pages  (comics only — owner/ADMIN)
  @Post(':id/pages')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a page to a comic chapter',
    description: 'Requires book ownership or ADMIN role.',
  })
  @ApiCreatedResponse({ type: ChapterPageResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Not the owner or admin, or account is inactive.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid page data or chapter belongs to a novel.',
  })
  addPage(
    @Param('id') id: string,
    @Body() dto: CreateChapterPageDto,
    @CurrentUser() user: User,
  ) {
    return this.chaptersService.addPage(id, dto, user);
  }

  // PATCH /chapters/:id/pages/:pageId  (owner/ADMIN)
  @Patch(':id/pages/:pageId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a comic chapter page',
    description: 'Requires book ownership or ADMIN role.',
  })
  @ApiOkResponse({ type: ChapterPageResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Not the owner or admin, or account is inactive.',
  })
  @ApiBadRequestResponse({ description: 'Invalid page data.' })
  updatePage(
    @Param('id') id: string,
    @Param('pageId') pageId: string,
    @Body() dto: UpdateChapterPageDto,
    @CurrentUser() user: User,
  ) {
    return this.chaptersService.updatePage(id, pageId, dto, user);
  }

  // DELETE /chapters/:id/pages/:pageId  (owner/ADMIN)
  @HttpCode(204)
  @Delete(':id/pages/:pageId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a comic chapter page',
    description: 'Requires book ownership or ADMIN role.',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Not the owner or admin, or account is inactive.',
  })
  removePage(
    @Param('id') id: string,
    @Param('pageId') pageId: string,
    @CurrentUser() user: User,
  ) {
    return this.chaptersService.removePage(id, pageId, user);
  }
}
