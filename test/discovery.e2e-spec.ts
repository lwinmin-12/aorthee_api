jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Prisma } from '../generated/prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FirebaseAdminService } from '../src/firebase-admin/firebase-admin.service';

describe('Search, filters, and categories', () => {
  let app: INestApplication<App>;
  const user = {
    id: 'owner',
    firebaseUid: 'firebase-1',
    role: 'CREATOR',
    status: 'ACTIVE',
    deletedAt: null,
  };
  const category = {
    id: 'cat-1',
    name: 'Fantasy',
    slug: 'fantasy',
    iconUrl: null,
    order: 0,
  };
  const prisma = {
    user: { upsert: jest.fn() },
    book: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
    category: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    bookCategory: { createMany: jest.fn(), delete: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const firebase = { verifyIdToken: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(FirebaseAdminService)
      .useValue(firebase)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    firebase.verifyIdToken.mockResolvedValue({
      uid: 'firebase-1',
      provider: 'GOOGLE',
    });
    prisma.user.upsert.mockResolvedValue(user);
    prisma.book.findMany.mockResolvedValue([]);
    prisma.book.findUnique.mockResolvedValue({
      id: 'book-1',
      authorId: user.id,
    });
    prisma.book.count.mockResolvedValue(0);
    prisma.category.findMany.mockResolvedValue([category]);
    prisma.category.findUnique.mockResolvedValue(category);
    prisma.category.create.mockResolvedValue(category);
    prisma.bookCategory.createMany.mockResolvedValue({ count: 1 });
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(
      (work: ((tx: typeof prisma) => unknown) | Promise<unknown>[]) =>
        typeof work === 'function' ? work(prisma) : Promise.all(work),
    );
  });
  afterAll(async () => {
    await app.close();
  });

  it('searches publicly using bound full-text query parameters and default pagination', async () => {
    await request(app.getHttpServer())
      .get('/search')
      .query({ q: ' magic library ' })
      .expect(200)
      .expect([]);
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
    const sql = (prisma.$queryRaw.mock.calls as [Prisma.Sql][])[0][0];
    expect(sql.values).toEqual(['magic library', 20, 0]);
    expect(sql.text).toContain('websearch_to_tsquery');
    expect(sql.text).toContain('to_tsvector');
    expect(sql.text).toContain('b."tags"');
    expect(sql.text).toContain('ts_rank');
    expect(sql.text).toContain('b."status" = \'PUBLISHED\'');
    expect(sql.text).toContain('author."deletedAt" IS NULL');
  });
  it('keeps hostile-looking queries in bound values, not SQL text', async () => {
    const q = "library'); DROP TABLE book; --";
    await request(app.getHttpServer())
      .get('/search')
      .query({ q, limit: 5, offset: 10 })
      .expect(200);
    const sql = (prisma.$queryRaw.mock.calls as [Prisma.Sql][])[0][0];
    expect(sql.values).toEqual([q, 5, 10]);
    expect(sql.text).not.toContain(q);
  });
  it.each([
    {},
    { q: '' },
    { q: ' ' },
    { q: '!!!' },
    { q: ['one', 'two'] },
    { q: 'x'.repeat(201) },
    { q: 'book', limit: 101 },
    { q: 'book', offset: -1 },
  ])('rejects invalid search query %j', async (query) => {
    await request(app.getHttpServer()).get('/search').query(query).expect(400);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
  it('combines all browse filters with published and active-author restrictions', async () => {
    await request(app.getHttpServer())
      .get('/books')
      .query({
        category: 'fantasy',
        tags: 'magic, adventure',
        ageRating: 'TEEN',
        language: 'en',
        type: 'BOOK',
        limit: 3,
        offset: 2,
      })
      .expect(200);
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PUBLISHED',
          author: { status: 'ACTIVE', deletedAt: null },
          type: 'BOOK',
          categories: {
            some: {
              category: { OR: [{ id: 'fantasy' }, { slug: 'fantasy' }] },
            },
          },
          tags: { hasSome: ['magic', 'adventure'] },
          ageRating: 'TEEN',
          language: { equals: 'en', mode: 'insensitive' },
        },
        take: 3,
        skip: 2,
      }),
    );
  });
  it.each([
    { tags: '' },
    { tags: 'a,,b' },
    { tags: 'a,a' },
    { tags: 'x'.repeat(51) },
    { ageRating: 'INVALID' },
    { category: '' },
    { language: 'not a language' },
  ])('rejects invalid browse filters %j', async (query) => {
    await request(app.getHttpServer()).get('/books').query(query).expect(400);
    expect(prisma.book.findMany).not.toHaveBeenCalled();
  });
  it('lists categories publicly', async () => {
    await request(app.getHttpServer())
      .get('/categories')
      .expect(200)
      .expect([category]);
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
  });
  it('creates a category as ADMIN', async () => {
    prisma.user.upsert.mockResolvedValue({ ...user, role: 'ADMIN' });
    prisma.category.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', 'Bearer valid')
      .send({ name: 'Fantasy' })
      .expect(201)
      .expect(category);
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Fantasy', slug: 'fantasy', iconUrl: undefined, order: 0 },
    });
  });
  it('denies category creation for non-admins', async () => {
    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', 'Bearer valid')
      .send({ name: 'Fantasy' })
      .expect(403);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });
  it('maps duplicate category names to 409', async () => {
    prisma.user.upsert.mockResolvedValue({ ...user, role: 'ADMIN' });
    prisma.category.findUnique.mockResolvedValue(null);
    prisma.category.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '7',
      }),
    );
    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', 'Bearer valid')
      .send({ name: 'Fantasy' })
      .expect(409);
  });
  it('browses category books with page pagination and the shared filters', async () => {
    await request(app.getHttpServer())
      .get('/categories/fantasy/books')
      .query({
        page: 2,
        limit: 5,
        tags: 'magic',
        language: 'vi',
        ageRating: 'ALL',
      })
      .expect(200)
      .expect({
        category,
        items: [],
        page: 2,
        limit: 5,
        total: 0,
        totalPages: 0,
      });
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PUBLISHED',
          author: { status: 'ACTIVE', deletedAt: null },
          tags: { hasSome: ['magic'] },
          language: { equals: 'vi', mode: 'insensitive' },
          ageRating: 'ALL',
          categories: { some: { categoryId: category.id } },
        },
        skip: 5,
        take: 5,
      }),
    );
    expect(prisma.book.count).toHaveBeenCalledWith({
      where: (prisma.book.findMany.mock.calls as [{ where: unknown }][])[0][0]
        .where,
    });
  });
  it('returns 404 for an unknown category slug', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/categories/missing/books')
      .expect(404);
    expect(prisma.book.findMany).not.toHaveBeenCalled();
  });
  it('bulk assigns categories to the owned book', async () => {
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-1' },
      { id: 'cat-2' },
    ]);
    await request(app.getHttpServer())
      .post('/books/book-1/categories')
      .set('Authorization', 'Bearer valid')
      .send({ categoryIds: ['cat-1', 'cat-2'] })
      .expect(201)
      .expect({ success: true });
    expect(prisma.bookCategory.createMany).toHaveBeenCalledWith({
      data: [
        { bookId: 'book-1', categoryId: 'cat-1' },
        { bookId: 'book-1', categoryId: 'cat-2' },
      ],
      skipDuplicates: true,
    });
  });
  it('preserves single-category request compatibility', async () => {
    await request(app.getHttpServer())
      .post('/books/book-1/categories')
      .set('Authorization', 'Bearer valid')
      .send({ categoryId: 'cat-1' })
      .expect(201);
    expect(prisma.bookCategory.createMany).toHaveBeenCalledWith({
      data: [{ bookId: 'book-1', categoryId: 'cat-1' }],
      skipDuplicates: true,
    });
  });
  it('rejects an unknown category without writing any assignments', async () => {
    await request(app.getHttpServer())
      .post('/books/book-1/categories')
      .set('Authorization', 'Bearer valid')
      .send({ categoryIds: ['cat-1', 'missing'] })
      .expect(404);
    expect(prisma.bookCategory.createMany).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { categoryIds: [] },
    { categoryIds: [''] },
    { categoryIds: null },
    { categoryIds: [1] },
    { categoryIds: ['cat-1', 'cat-1'] },
    { categoryId: null },
    { categoryId: 'cat-1', categoryIds: ['cat-2'] },
    { categoryId: 'cat-1', authorId: 'other' },
  ])('rejects invalid assignment body %j', async (body) => {
    await request(app.getHttpServer())
      .post('/books/book-1/categories')
      .set('Authorization', 'Bearer valid')
      .send(body)
      .expect(400);
    expect(prisma.bookCategory.createMany).not.toHaveBeenCalled();
  });
  it.each(['post', 'delete'] as const)(
    'requires Firebase auth to %s an assignment',
    async (method) => {
      await request(app.getHttpServer())
        [method](
          method === 'post'
            ? '/books/book-1/categories'
            : '/books/book-1/categories/cat-1',
        )
        .send({ categoryId: 'cat-1' })
        .expect(401);
    },
  );
  it.each(['CREATOR', 'ADMIN'])(
    'denies non-owner %s assignment changes',
    async (role) => {
      prisma.user.upsert.mockResolvedValue({ ...user, id: 'other', role });
      await request(app.getHttpServer())
        .post('/books/book-1/categories')
        .set('Authorization', 'Bearer valid')
        .send({ categoryId: 'cat-1' })
        .expect(403);
      await request(app.getHttpServer())
        .delete('/books/book-1/categories/cat-1')
        .set('Authorization', 'Bearer valid')
        .expect(403);
      expect(prisma.bookCategory.createMany).not.toHaveBeenCalled();
      expect(prisma.bookCategory.delete).not.toHaveBeenCalled();
    },
  );
  it('removes the requested assignment as owner', async () => {
    await request(app.getHttpServer())
      .delete('/books/book-1/categories/cat-1')
      .set('Authorization', 'Bearer valid')
      .expect(200)
      .expect({ success: true });
    expect(prisma.bookCategory.delete).toHaveBeenCalledWith({
      where: { bookId_categoryId: { bookId: 'book-1', categoryId: 'cat-1' } },
    });
  });
  it('returns 404 for an absent assignment', async () => {
    prisma.bookCategory.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing', {
        code: 'P2025',
        clientVersion: '7',
      }),
    );
    await request(app.getHttpServer())
      .delete('/books/book-1/categories/cat-1')
      .set('Authorization', 'Bearer valid')
      .expect(404);
  });
});
