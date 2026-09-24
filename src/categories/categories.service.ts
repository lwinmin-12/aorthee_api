import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ContentStatus, UserRole } from 'generated/prisma/enums';
import { User } from 'generated/prisma/client';
import { ListCategoryBooksDto } from './dto/list-category-book.dto';
// import { ListCategoryBooksDto } from './dto/list-category-books.dto';

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

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('A category with this slug already exists');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        iconUrl: dto.iconUrl,
        order: dto.order ?? 0,
      },
    });
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
      status: ContentStatus.PUBLISHED,
      ...(query.type ? { type: query.type } : {}),
      categories: { some: { categoryId: category.id } },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
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

  // POST /books/:bookId/categories  (book owner or ADMIN)
  async assignToBook(bookId: string, categoryId: string, user: User) {
    const book = await this.getOwnedBookOrThrow(bookId, user);
    if (!book) throw new NotFoundException('Book not found');
    await this.findOne(categoryId);

    const existing = await this.prisma.bookCategory.findUnique({
      where: { bookId_categoryId: { bookId, categoryId } },
    });
    if (existing) {
      throw new ConflictException('Category already assigned to this book');
    }

    await this.prisma.bookCategory.create({ data: { bookId, categoryId } });
    return { success: true };
  }

  // DELETE /books/:bookId/categories/:categoryId  (book owner or ADMIN)
  async removeFromBook(bookId: string, categoryId: string, user: User) {
    await this.getOwnedBookOrThrow(bookId, user);

    await this.prisma.bookCategory
      .delete({ where: { bookId_categoryId: { bookId, categoryId } } })
      .catch(() => {
        throw new NotFoundException(
          'This category is not assigned to the book',
        );
      });

    return { success: true };
  }

  // --- helpers ---------------------------------------------------------

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async findOne(id: string) {
    return this.ensureExists(id);
  }

  private async getOwnedBookOrThrow(bookId: string, user: User) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    const isOwner = book.authorId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to modify this book',
      );
    }
    return book;
  }
}
