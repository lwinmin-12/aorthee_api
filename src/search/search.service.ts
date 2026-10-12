import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { Book } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  search(query: SearchDto) {
    // Tagged SQL binds all input as parameters. Weight title matches above tags.
    return this.prisma.$queryRaw<Book[]>(Prisma.sql`
      SELECT b."id", b."slug", b."title", b."synopsis", b."coverImageUrl",
        b."type", b."status", b."ageRating", b."language", b."tags", b."authorId",
        b."viewCount", b."favoriteCount", b."chapterCount", b."publishedAt",
        b."createdAt", b."updatedAt"
      FROM "Book" b
      JOIN "User" author ON author."id" = b."authorId"
      CROSS JOIN LATERAL (
        SELECT setweight(to_tsvector('simple', b."title"), 'A') ||
          setweight(to_tsvector('simple', coalesce(array_to_string(b."tags", ' '), '')), 'B') AS document
      ) search
      CROSS JOIN websearch_to_tsquery('simple', ${query.q}) AS query(terms)
      WHERE b."status" = 'PUBLISHED'
        AND author."status" = 'ACTIVE' AND author."deletedAt" IS NULL
        AND search.document @@ query.terms
      ORDER BY ts_rank(search.document, query.terms) DESC,
        b."publishedAt" DESC NULLS LAST, b."id" ASC
      LIMIT ${query.limit} OFFSET ${query.offset}
    `);
  }
}
