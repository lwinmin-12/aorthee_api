jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FirebaseAdminService } from '../src/firebase-admin/firebase-admin.service';

describe('Library endpoints', () => {
  let app: INestApplication<App>;
  const user = {
    id: 'reader-1',
    status: 'ACTIVE',
    deletedAt: null,
    role: 'READER',
  };
  const book = { id: 'book-1', title: 'A book', status: 'PUBLISHED' };
  const favorite = { id: 'favorite-1', userId: user.id, bookId: book.id };
  const progress = {
    id: 'progress-1',
    userId: user.id,
    bookId: book.id,
    chapterId: 'chapter-1',
    progressPercent: 25,
    lastPageIndex: 2,
    scrollOffset: 10,
  };
  const prisma = {
    user: { upsert: jest.fn() },
    book: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    favorite: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
    },
    chapter: { findFirst: jest.fn() },
    readingProgress: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
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
    prisma.user.upsert.mockResolvedValue(user);
    firebase.verifyIdToken.mockResolvedValue({
      uid: 'firebase-1',
      provider: 'GOOGLE',
    });
    prisma.$transaction.mockImplementation(
      (work: (tx: typeof prisma) => unknown) => work(prisma),
    );
    prisma.book.findFirst.mockResolvedValue(book);
    prisma.book.findMany.mockResolvedValue([]);
    prisma.favorite.createMany.mockResolvedValue({ count: 1 });
    prisma.favorite.deleteMany.mockResolvedValue({ count: 1 });
    prisma.favorite.findUniqueOrThrow.mockResolvedValue(favorite);
    prisma.favorite.findMany.mockResolvedValue([{ ...favorite, book }]);
    prisma.chapter.findFirst.mockResolvedValue({ id: 'chapter-1' });
    prisma.readingProgress.findFirst.mockResolvedValue(progress);
    prisma.readingProgress.findUnique.mockResolvedValue(progress);
    prisma.readingProgress.findMany.mockResolvedValue([{ ...progress, book }]);
    prisma.readingProgress.upsert.mockResolvedValue(progress);
  });
  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['post', '/books/book-1/favorite'],
    ['delete', '/books/book-1/favorite'],
    ['get', '/users/me/favorites'],
    ['get', '/users/me/drafts'],
    ['get', '/users/me/continue-reading'],
    ['put', '/reading-progress'],
    ['get', '/reading-progress/book-1'],
  ] as const)('requires authentication for %s %s', async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(401);
  });
  it('creates a favorite and increments the counter inside a transaction', async () => {
    await request(app.getHttpServer())
      .post('/books/book-1/favorite')
      .set('Authorization', 'Bearer valid')
      .expect(201)
      .expect(favorite);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.favorite.createMany).toHaveBeenCalledWith({
      data: [{ userId: user.id, bookId: book.id }],
      skipDuplicates: true,
    });
    expect(prisma.book.update).toHaveBeenCalledWith({
      where: { id: book.id },
      data: { favoriteCount: { increment: 1 } },
    });
    expect(prisma.book.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: book.id,
          status: 'PUBLISHED',
          author: { status: 'ACTIVE', deletedAt: null },
        },
      }),
    );
  });
  it('does not increment the counter for repeated favorites', async () => {
    prisma.favorite.createMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .post('/books/book-1/favorite')
      .set('Authorization', 'Bearer valid')
      .expect(201);
    expect(prisma.book.update).not.toHaveBeenCalled();
  });
  it('rejects favorites of unavailable books', async () => {
    prisma.book.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/books/book-1/favorite')
      .set('Authorization', 'Bearer valid')
      .expect(404);
    expect(prisma.favorite.createMany).not.toHaveBeenCalled();
  });
  it('removes only the caller favorite and decrements without underflow', async () => {
    await request(app.getHttpServer())
      .delete('/books/book-1/favorite')
      .set('Authorization', 'Bearer valid')
      .expect(204);
    expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: user.id, bookId: book.id },
    });
    expect(prisma.book.updateMany).toHaveBeenCalledWith({
      where: { id: book.id, favoriteCount: { gt: 0 } },
      data: { favoriteCount: { decrement: 1 } },
    });
    expect(prisma.book.findFirst).not.toHaveBeenCalled();
  });
  it('unfavorites idempotently', async () => {
    prisma.favorite.deleteMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .delete('/books/book-1/favorite')
      .set('Authorization', 'Bearer valid')
      .expect(204);
    expect(prisma.book.updateMany).not.toHaveBeenCalled();
  });
  it('lists favorited books, filtering visibility and applying pagination', async () => {
    await request(app.getHttpServer())
      .get('/users/me/favorites?limit=5&offset=10')
      .set('Authorization', 'Bearer valid')
      .expect(200)
      .expect([book]);
    expect(prisma.favorite.findMany).toHaveBeenCalledWith({
      where: {
        userId: user.id,
        book: {
          status: 'PUBLISHED',
          author: { status: 'ACTIVE', deletedAt: null },
        },
      },
      include: { book: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 5,
      skip: 10,
    });
  });
  it('lists only own drafts, even for ordinary readers', async () => {
    await request(app.getHttpServer())
      .get('/users/me/drafts')
      .set('Authorization', 'Bearer valid')
      .expect(200)
      .expect([]);
    expect(prisma.book.findMany).toHaveBeenCalledWith({
      where: { authorId: user.id, status: 'DRAFT' },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: 20,
      skip: 0,
    });
  });
  it('lists only in-progress reading with visible books/chapters, newest first', async () => {
    await request(app.getHttpServer())
      .get('/users/me/continue-reading')
      .set('Authorization', 'Bearer valid')
      .expect(200)
      .expect([{ ...progress, book }]);
    expect(prisma.readingProgress.findMany).toHaveBeenCalledWith({
      where: {
        userId: user.id,
        book: {
          status: 'PUBLISHED',
          author: { status: 'ACTIVE', deletedAt: null },
        },
        OR: [{ chapterId: null }, { chapter: { status: 'PUBLISHED' } }],
        progressPercent: { gt: 0, lt: 100 },
      },
      include: { book: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: 20,
      skip: 0,
    });
  });
  it.each(['favorites', 'drafts', 'continue-reading'])(
    'validates %s pagination',
    async (route) => {
      await request(app.getHttpServer())
        .get(`/users/me/${route}?limit=101`)
        .set('Authorization', 'Bearer valid')
        .expect(400);
    },
  );
  it('scopes resume progress to the current user and visible content', async () => {
    await request(app.getHttpServer())
      .get('/reading-progress/book-1')
      .set('Authorization', 'Bearer valid')
      .expect(200)
      .expect(progress);
    expect(prisma.readingProgress.findFirst).toHaveBeenCalledWith(
      expect.objectContaining<Record<string, unknown>>({
        where: expect.objectContaining({
          userId: user.id,
          bookId: book.id,
          book: {
            status: 'PUBLISHED',
            author: { status: 'ACTIVE', deletedAt: null },
          },
        }),
      }),
    );
  });
  it('returns 404 when no visible progress exists', async () => {
    prisma.readingProgress.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/reading-progress/book-1')
      .set('Authorization', 'Bearer valid')
      .expect(404);
  });
  it('creates progress with zero-valued positions', async () => {
    prisma.readingProgress.findUnique.mockResolvedValue(null);
    const dto = {
      bookId: book.id,
      chapterId: 'chapter-1',
      progressPercent: 0,
      lastPageIndex: 0,
      scrollOffset: 0,
    };
    await request(app.getHttpServer())
      .put('/reading-progress')
      .set('Authorization', 'Bearer valid')
      .send(dto)
      .expect(200);
    expect(prisma.chapter.findFirst).toHaveBeenCalledWith({
      where: { id: 'chapter-1', bookId: book.id, status: 'PUBLISHED' },
      select: { id: true },
    });
    expect(prisma.readingProgress.upsert).toHaveBeenCalledWith({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
      create: { ...dto, userId: user.id },
      update: {
        chapterId: 'chapter-1',
        progressPercent: 0,
        lastPageIndex: 0,
        scrollOffset: 0,
      },
    });
  });
  it('preserves omitted chapter and positions', async () => {
    await request(app.getHttpServer())
      .put('/reading-progress')
      .set('Authorization', 'Bearer valid')
      .send({ bookId: book.id, progressPercent: 100 })
      .expect(200);
    expect(prisma.readingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          chapterId: undefined,
          progressPercent: 100,
          lastPageIndex: undefined,
          scrollOffset: undefined,
        },
      }),
    );
  });
  it('resets old positions when changing chapters', async () => {
    await request(app.getHttpServer())
      .put('/reading-progress')
      .set('Authorization', 'Bearer valid')
      .send({ bookId: book.id, chapterId: 'chapter-2', progressPercent: 50 })
      .expect(200);
    expect(prisma.readingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          chapterId: 'chapter-2',
          progressPercent: 50,
          lastPageIndex: null,
          scrollOffset: null,
        },
      }),
    );
  });
  it('allows clearing chapter and positions explicitly', async () => {
    const data = {
      chapterId: null,
      progressPercent: 10,
      lastPageIndex: null,
      scrollOffset: null,
    };
    await request(app.getHttpServer())
      .put('/reading-progress')
      .set('Authorization', 'Bearer valid')
      .send({ bookId: book.id, ...data })
      .expect(200);
    expect(prisma.readingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: data }),
    );
    expect(prisma.chapter.findFirst).not.toHaveBeenCalled();
  });
  it('rejects chapters from another book or unpublished chapters', async () => {
    prisma.chapter.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .put('/reading-progress')
      .set('Authorization', 'Bearer valid')
      .send({ bookId: book.id, chapterId: 'other', progressPercent: 10 })
      .expect(400);
    expect(prisma.readingProgress.upsert).not.toHaveBeenCalled();
  });
  it('rejects progress for unavailable books', async () => {
    prisma.book.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .put('/reading-progress')
      .set('Authorization', 'Bearer valid')
      .send({ bookId: book.id, progressPercent: 10 })
      .expect(404);
    expect(prisma.readingProgress.upsert).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { bookId: '' },
    { progressPercent: -1 },
    { progressPercent: 101 },
    { progressPercent: '25' },
    { progressPercent: null },
    { chapterId: '' },
    { lastPageIndex: -1 },
    { lastPageIndex: 1.5 },
    { lastPageIndex: 2147483648 },
    { scrollOffset: -1 },
    { scrollOffset: '10' },
    { userId: 'other-user' },
  ])('rejects invalid progress fields %j', async (invalid) => {
    const data = Object.keys(invalid).length
      ? { bookId: book.id, progressPercent: 10, ...invalid }
      : {};
    await request(app.getHttpServer())
      .put('/reading-progress')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(400);
    expect(prisma.readingProgress.upsert).not.toHaveBeenCalled();
  });
  it('rejects suspended accounts', async () => {
    prisma.user.upsert.mockResolvedValue({ ...user, status: 'SUSPENDED' });
    await request(app.getHttpServer())
      .get('/users/me/favorites')
      .set('Authorization', 'Bearer valid')
      .expect(403);
    expect(prisma.favorite.findMany).not.toHaveBeenCalled();
  });
});
