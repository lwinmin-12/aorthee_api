import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { publishedBooks } from '../books/book-query';
import { PrismaService } from '../prisma/prisma.service';
import { LibraryQueryDto, UpsertReadingProgressDto } from './dto/library.dto';

const visibleProgress = {
  book: publishedBooks,
  OR: [{ chapterId: null }, { chapter: { status: 'PUBLISHED' } }],
} satisfies Prisma.ReadingProgressWhereInput;

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  favorite(userId: string, bookId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePublishedBook(tx, bookId);
      const created = await tx.favorite.createMany({
        data: [{ userId, bookId }],
        skipDuplicates: true,
      });
      if (created.count) {
        await tx.book.update({
          where: { id: bookId },
          data: { favoriteCount: { increment: 1 } },
        });
      }
      return tx.favorite.findUniqueOrThrow({
        where: { userId_bookId: { userId, bookId } },
      });
    });
  }

  async unfavorite(userId: string, bookId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const removed = await tx.favorite.deleteMany({
        where: { userId, bookId },
      });
      if (removed.count) {
        await tx.book.updateMany({
          where: { id: bookId, favoriteCount: { gt: 0 } },
          data: { favoriteCount: { decrement: 1 } },
        });
      }
    });
  }

  async favorites(userId: string, query: LibraryQueryDto) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId, book: publishedBooks },
      include: { book: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: query.limit,
      skip: query.offset,
    });
    return favorites.map(({ book }) => book);
  }

  drafts(userId: string, query: LibraryQueryDto) {
    return this.prisma.book.findMany({
      where: { authorId: userId, status: 'DRAFT' },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: query.limit,
      skip: query.offset,
    });
  }

  continueReading(userId: string, query: LibraryQueryDto) {
    return this.prisma.readingProgress.findMany({
      where: {
        userId,
        ...visibleProgress,
        progressPercent: { gt: 0, lt: 100 },
      },
      include: { book: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: query.limit,
      skip: query.offset,
    });
  }

  async getProgress(userId: string, bookId: string) {
    const progress = await this.prisma.readingProgress.findFirst({
      where: { userId, bookId, ...visibleProgress },
    });
    if (!progress) throw new NotFoundException('Reading progress not found');
    return progress;
  }

  upsertProgress(userId: string, dto: UpsertReadingProgressDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePublishedBook(tx, dto.bookId);
      const where = { userId_bookId: { userId, bookId: dto.bookId } };
      const existing = await tx.readingProgress.findUnique({ where });
      const chapterId =
        dto.chapterId === undefined ? existing?.chapterId : dto.chapterId;
      if (chapterId) {
        const chapter = await tx.chapter.findFirst({
          where: { id: chapterId, bookId: dto.bookId, status: 'PUBLISHED' },
          select: { id: true },
        });
        if (!chapter)
          throw new BadRequestException(
            'Chapter must be published and belong to this book',
          );
      }
      const chapterChanged =
        dto.chapterId !== undefined &&
        dto.chapterId !== (existing?.chapterId ?? null);
      const data = {
        chapterId: dto.chapterId,
        progressPercent: dto.progressPercent,
        lastPageIndex:
          dto.lastPageIndex === undefined && chapterChanged
            ? null
            : dto.lastPageIndex,
        scrollOffset:
          dto.scrollOffset === undefined && chapterChanged
            ? null
            : dto.scrollOffset,
      };
      return tx.readingProgress.upsert({
        where,
        create: { ...data, userId, bookId: dto.bookId },
        update: data,
      });
    });
  }

  private async requirePublishedBook(
    tx: Prisma.TransactionClient,
    bookId: string,
  ) {
    const book = await tx.book.findFirst({
      where: { id: bookId, ...publishedBooks },
      select: { id: true },
    });
    if (!book) throw new NotFoundException('Book not found');
  }
}
