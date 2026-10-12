import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { Book, Chapter, ContentFormat, ContentStatus, ContentType, User, UserRole } from 'generated/prisma/client';
import { UpsertChapterTextDto } from './dto/upsert-chapter-text.dto';
import { CreateChapterPageDto } from './dto/create-chapter-page.dto';
import { UpdateChapterPageDto } from './dto/update-chapter-page.dto';


const AVERAGE_READING_WPM = 200;

function computeTextStats(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const estimatedReadMinutes = Math.max(1, Math.round(wordCount / AVERAGE_READING_WPM));
  return { wordCount, estimatedReadMinutes };
}

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /books/:bookId/chapters
  async listForBook(bookId: string, user?: User) {
    const book = await this.getBookOrThrow(bookId);
    const isOwnerOrAdmin = user && (user.id === book.authorId || user.role === UserRole.ADMIN);

    return this.prisma.chapter.findMany({
      where: {
        bookId,
        ...(isOwnerOrAdmin ? {} : { status: ContentStatus.PUBLISHED }),
      },
      orderBy: { order: 'asc' },
    });
  }

  // GET /chapters/:id
  async findOne(id: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter) throw new NotFoundException('Chapter not found');
    return chapter;
  }

  // GET /chapters/:id/content — branches on Book.type so the client never
  // has to know whether a book is a novel or a comic.
  async getContent(id: string, user?: User) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: { book: true, text: true, pages: { orderBy: { order: 'asc' } } },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');

    const isOwnerOrAdmin =
      user && (user.id === chapter.book.authorId || user.role === UserRole.ADMIN);
    if (chapter.status !== ContentStatus.PUBLISHED && !isOwnerOrAdmin) {
      throw new NotFoundException('Chapter not found');
    }

    if (chapter.book.type === ContentType.BOOK) {
      return { type: 'text' as const, chapter: this.stripBookMeta(chapter), text: chapter.text };
    }

    return {
      type: 'pages' as const,
      chapter: this.stripBookMeta(chapter),
      pages: chapter.pages,
    };
  }

  // POST /books/:bookId/chapters
  async create(bookId: string, dto: CreateChapterDto, user: User) {
    const book = await this.getOwnedBookOrThrow(bookId, user);

    const order = dto.order ?? (await this.nextOrder(bookId));

    return this.prisma.chapter.create({
      data: {
        bookId: book.id,
        title: dto.title,
        order,
        releaseAt: dto.releaseAt ? new Date(dto.releaseAt) : undefined,
      },
    });
  }

  // PATCH /chapters/:id
  async update(id: string, dto: UpdateChapterDto, user: User) {
    const chapter = await this.getOwnedChapterOrThrow(id, user);

    return this.prisma.chapter.update({
      where: { id: chapter.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.releaseAt !== undefined ? { releaseAt: new Date(dto.releaseAt) } : {}),
      },
    });
  }

  // DELETE /chapters/:id
  async remove(id: string, user: User) {
    const chapter = await this.getOwnedChapterOrThrow(id, user);
    await this.prisma.chapter.delete({ where: { id: chapter.id } });
    await this.syncChapterCount(chapter.bookId);
    return { success: true };
  }

  // POST /chapters/:id/publish
  async publish(id: string, user: User) {
    const chapter = await this.getOwnedChapterOrThrow(id, user, { includeBook: true });
    const book = (chapter as any).book as Book;

    if (book.type === ContentType.BOOK) {
      const text = await this.prisma.chapterText.findUnique({ where: { chapterId: id } });
      if (!text) {
        throw new BadRequestException('Cannot publish a text chapter with no content');
      }
    } else {
      const pageCount = await this.prisma.chapterPage.count({ where: { chapterId: id } });
      if (pageCount === 0) {
        throw new BadRequestException('Cannot publish a comic chapter with no pages');
      }
    }

    const published = await this.prisma.chapter.update({
      where: { id },
      data: { status: ContentStatus.PUBLISHED, publishedAt: new Date() },
    });
    await this.syncChapterCount(chapter.bookId);
    return published;
  }

  // PUT /chapters/:id/text  (novels only)
  async upsertText(id: string, dto: UpsertChapterTextDto, user: User) {
    const chapter = await this.getOwnedChapterOrThrow(id, user, { includeBook: true });
    const book = (chapter as any).book as Book;

    if (book.type !== ContentType.BOOK) {
      throw new BadRequestException('This chapter belongs to a comic — use the pages endpoints');
    }

    const { wordCount, estimatedReadMinutes } = computeTextStats(dto.content);

    return this.prisma.chapterText.upsert({
      where: { chapterId: id },
      update: {
        format: dto.format ?? ContentFormat.MARKDOWN,
        content: dto.content,
        wordCount,
        estimatedReadMinutes,
      },
      create: {
        chapterId: id,
        format: dto.format ?? ContentFormat.MARKDOWN,
        content: dto.content,
        wordCount,
        estimatedReadMinutes,
      },
    });
  }

  // POST /chapters/:id/pages  (comics only)
  async addPage(id: string, dto: CreateChapterPageDto, user: User) {
    const chapter = await this.getOwnedChapterOrThrow(id, user, { includeBook: true });
    const book = (chapter as any).book as Book;

    if (book.type !== ContentType.COMIC) {
      throw new BadRequestException('This chapter belongs to a novel — use the text endpoint');
    }

    const order = dto.order ?? (await this.nextPageOrder(id));

    return this.prisma.chapterPage.create({
      data: {
        chapterId: id,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl,
        width: dto.width,
        height: dto.height,
        fileSizeBytes: dto.fileSizeBytes,
        blurhash: dto.blurhash,
        order,
      },
    });
  }

  // PATCH /chapters/:id/pages/:pageId
  async updatePage(id: string, pageId: string, dto: UpdateChapterPageDto, user: User) {
    await this.getOwnedChapterOrThrow(id, user);
    await this.getPageOrThrow(id, pageId);

    return this.prisma.chapterPage.update({
      where: { id: pageId },
      data: { ...dto },
    });
  }

  // DELETE /chapters/:id/pages/:pageId
  async removePage(id: string, pageId: string, user: User) {
    await this.getOwnedChapterOrThrow(id, user);
    await this.getPageOrThrow(id, pageId);

    await this.prisma.chapterPage.delete({ where: { id: pageId } });
    return { success: true };
  }

  // --- helpers ---------------------------------------------------------

  private stripBookMeta(chapter: Chapter & { book?: Book }) {
    const { book, ...rest } = chapter as any;
    return rest;
  }

  private async nextOrder(bookId: string) {
    const last = await this.prisma.chapter.findFirst({
      where: { bookId },
      orderBy: { order: 'desc' },
    });
    return (last?.order ?? 0) + 1;
  }

  private async nextPageOrder(chapterId: string) {
    const last = await this.prisma.chapterPage.findFirst({
      where: { chapterId },
      orderBy: { order: 'desc' },
    });
    return (last?.order ?? 0) + 1;
  }

  private async syncChapterCount(bookId: string) {
    const chapterCount = await this.prisma.chapter.count({
      where: { bookId, status: ContentStatus.PUBLISHED },
    });
    await this.prisma.book.update({ where: { id: bookId }, data: { chapterCount } });
  }

  private async getBookOrThrow(bookId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  private async getOwnedBookOrThrow(bookId: string, user: User) {
    const book = await this.getBookOrThrow(bookId);
    const isOwner = book.authorId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to modify this book');
    }
    return book;
  }

  private async getOwnedChapterOrThrow(
    id: string,
    user: User,
    opts: { includeBook?: boolean } = {},
  ) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: { book: true },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');

    const isOwner = chapter.book.authorId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to modify this chapter');
    }

    return opts.includeBook ? chapter : (({ book, ...rest }) => rest)(chapter);
  }

  private async getPageOrThrow(chapterId: string, pageId: string) {
    const page = await this.prisma.chapterPage.findUnique({ where: { id: pageId } });
    if (!page || page.chapterId !== chapterId) {
      throw new NotFoundException('Page not found on this chapter');
    }
    return page;
  }
}