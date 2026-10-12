import { Prisma } from '../../generated/prisma/client';
import { BookFiltersDto } from './dto/book-filters.dto';

export const publishedBooks = {
  status: 'PUBLISHED',
  author: { status: 'ACTIVE', deletedAt: null },
} satisfies Prisma.BookWhereInput;

export function publicBookFilters(
  query: BookFiltersDto,
): Prisma.BookWhereInput {
  return {
    ...publishedBooks,
    ...(query.type ? { type: query.type } : {}),
    ...(query.category
      ? {
          categories: {
            some: {
              category: {
                OR: [{ id: query.category }, { slug: query.category }],
              },
            },
          },
        }
      : {}),
    ...(query.tags ? { tags: { hasSome: query.tags } } : {}),
    ...(query.ageRating ? { ageRating: query.ageRating } : {}),
    ...(query.language
      ? { language: { equals: query.language, mode: 'insensitive' } }
      : {}),
  };
}
