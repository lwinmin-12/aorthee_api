import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Prisma } from '../../generated/prisma/client';
import { publicBookFilters } from '../books/book-query';
import { AssignCategoryDto } from '../books-categories/dto/assign-category.dto';
import { User } from 'generated/prisma/client';
import { ListCategoryBooksDto } from './dto/list-category-book.dto';

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /categories
  findAll() {
    return this.prisma.category.findMany({
      orderBy: { order: 'asc' },
    });
  }

  // GET /categories/:slug
  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  // POST /categories  (ADMIN only — enforced by RolesGuard at the controller)
  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    if (!slug)
      throw new BadRequestException('Category must have a nonempty slug');

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('A category with this slug already exists');
    }

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug,
          iconUrl: dto.iconUrl,
          order: dto.order ?? 0,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Category name or slug already exists');
      }
      throw error;
    }
  }

  // PATCH /categories/:id  (ADMIN only)
  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);

    const data: Record<string, unknown> = { ...dto };
    if (dto.slug) data.slug = slugify(dto.slug);
    else if (dto.name) data.slug = slugify(dto.name);

    return this.prisma.category.update({ where: { id }, data });
  }

  // DELETE /categories/:id  (ADMIN only)
  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  // GET /categories/:slug/books
  async findBooksForCategory(slug: string, query: ListCategoryBooksDto) {
    const category = await this.findBySlug(slug);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      ...publicBookFilters(query),
      categories: { some: { categoryId: category.id } },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      category,
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Category assignment is restricted to the actual book owner.
  async assignToBook(bookId: string, dto: AssignCategoryDto, user: User) {
    if ((dto.categoryId === undefined) === (dto.categoryIds === undefined)) {
      throw new BadRequestException(
        'Provide exactly one of categoryId or categoryIds',
      );
    }
    const categoryIds = dto.categoryIds ?? [dto.categoryId!];
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.getOwnedBookOrThrow(bookId, user, tx);
        const categories = await tx.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true },
        });
        if (categories.length !== categoryIds.length) {
          throw new NotFoundException('One or more categories were not found');
        }
        await tx.bookCategory.createMany({
          data: categoryIds.map((categoryId) => ({ bookId, categoryId })),
          skipDuplicates: true,
        });
        return { success: true };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException('Book or category no longer exists');
      }
      throw error;
    }
  }

  async removeFromBook(bookId: string, categoryId: string, user: User) {
    await this.getOwnedBookOrThrow(bookId, user);
    try {
      await this.prisma.bookCategory.delete({
        where: { bookId_categoryId: { bookId, categoryId } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'This category is not assigned to the book',
        );
      }
      throw error;
    }
    return { success: true };
  }

  // --- helpers ---------------------------------------------------------

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async getOwnedBookOrThrow(
    bookId: string,
    user: User,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const book = await db.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    const isOwner = book.authorId === user.id;
    if (!isOwner) {
      throw new ForbiddenException(
        'You do not have permission to modify this book',
      );
    }
    return book;
  }
}
