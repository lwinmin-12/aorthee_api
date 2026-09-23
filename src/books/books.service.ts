import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { User } from '../../generated/prisma/client';
import { assertOwnerOrAdmin } from '../auth/assert-owner-or-admin';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto, ListBooksDto, UpdateBookDto } from './dto/book.dto';

const bookSelect = {
  id: true,
  slug: true,
  title: true,
  synopsis: true,
  coverImageUrl: true,
  type: true,
  status: true,
  ageRating: true,
  language: true,
  tags: true,
  authorId: true,
  viewCount: true,
  favoriteCount: true,
  chapterCount: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookSelect;

const publishedBooks = {
  status: 'PUBLISHED',
  author: { status: 'ACTIVE', deletedAt: null },
} satisfies Prisma.BookWhereInput;

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListBooksDto) {
    return this.prisma.book.findMany({
      where: { ...publishedBooks, ...(query.type ? { type: query.type } : {}) },
      select: bookSelect,
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      take: query.limit,
      skip: query.offset,
    });
  }

  async getBySlug(slug: string) {
    const book = await this.prisma.book.findFirst({
      where: { slug, ...publishedBooks },
      select: bookSelect,
    });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async create(authorId: string, dto: CreateBookDto) {
    try {
      return await this.prisma.book.create({
        data: { ...dto, authorId, status: 'DRAFT', publishedAt: null },
        select: bookSelect,
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  update(user: Pick<User, 'id' | 'role'>, id: string, dto: UpdateBookDto) {
    return this.updateOwnedBook(user, id, dto);
  }

  publish(user: Pick<User, 'id' | 'role'>, id: string) {
    return this.updateOwnedBook(user, id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
  }

  async archive(user: Pick<User, 'id' | 'role'>, id: string): Promise<void> {
    await this.updateOwnedBook(user, id, { status: 'ARCHIVED' });
  }

  private async updateOwnedBook(
    user: Pick<User, 'id' | 'role'>,
    id: string,
    data: Prisma.BookUpdateInput,
  ) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!book) throw new NotFoundException('Book not found');
    assertOwnerOrAdmin(user, book);
    try {
      return await this.prisma.book.update({
        // Retain ownership in the write predicate as well as the permission check.
        where: { id, ...(user.role === 'ADMIN' ? {} : { authorId: user.id }) },
        data,
        select: bookSelect,
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  private rethrowDatabaseError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException('Slug is already in use');
      if (error.code === 'P2025') throw new NotFoundException('Book not found');
    }
    throw error;
  }
}
