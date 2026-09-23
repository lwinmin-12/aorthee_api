jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Prisma } from '../generated/prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FirebaseAdminService } from '../src/firebase-admin/firebase-admin.service';

describe('Books endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const user = {
    id: 'creator-1',
    firebaseUid: 'firebase-1',
    role: 'CREATOR',
    status: 'ACTIVE',
    deletedAt: null,
  };
  const draft = {
    slug: 'the-last-library',
    title: 'The Last Library',
    type: 'BOOK',
  };
  const book = {
    id: 'book-1',
    ...draft,
    authorId: user.id,
    status: 'DRAFT',
    publishedAt: null,
  };
  const prisma = {
    user: { upsert: jest.fn() },
    book: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
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
    prisma.book.findFirst.mockResolvedValue({ ...book, status: 'PUBLISHED' });
    prisma.book.findUnique.mockResolvedValue({ authorId: user.id });
    prisma.book.create.mockResolvedValue(book);
    prisma.book.update.mockResolvedValue(book);
  });
  afterAll(async () => {
    await app.close();
  });

  it('browses publicly with bounded default pagination and published-only filtering', async () => {
    await request(app.getHttpServer()).get('/books').expect(200).expect([]);
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PUBLISHED',
          author: { status: 'ACTIVE', deletedAt: null },
        },
        take: 20,
        skip: 0,
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });
  it.each(['BOOK', 'COMIC'])('filters by %s and paginates', async (type) => {
    await request(app.getHttpServer())
      .get(`/books?type=${type}&limit=5&offset=10`)
      .expect(200);
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining<Record<string, unknown>>({
        where: expect.objectContaining({ type, status: 'PUBLISHED' }),
        take: 5,
        skip: 10,
      }),
    );
  });
  it.each([
    'type=INVALID',
    'limit=0',
    'limit=101',
    'limit=abc',
    'offset=-1',
    'offset=1.5',
    'status=DRAFT',
  ])('rejects invalid browse query %s', async (query) => {
    await request(app.getHttpServer()).get(`/books?${query}`).expect(400);
    expect(prisma.book.findMany).not.toHaveBeenCalled();
  });
  it('looks up published details by slug rather than ID', async () => {
    await request(app.getHttpServer())
      .get('/books/the-last-library')
      .expect(200);
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
    expect(prisma.book.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: draft.slug,
          status: 'PUBLISHED',
          author: { status: 'ACTIVE', deletedAt: null },
        },
      }),
    );
  });
  it('returns 404 for unpublished, archived, or missing details', async () => {
    prisma.book.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).get('/books/hidden-book').expect(404);
  });
  it.each([
    ['post', '/books'],
    ['patch', '/books/book-1'],
    ['post', '/books/book-1/publish'],
    ['delete', '/books/book-1'],
  ] as const)('requires authentication for %s %s', async (method, path) => {
    await request(app.getHttpServer())[method](path).send(draft).expect(401);
  });
  it.each(['BOOK', 'COMIC'])(
    'creates a %s draft under the authenticated creator',
    async (type) => {
      await request(app.getHttpServer())
        .post('/books')
        .set('Authorization', 'Bearer valid')
        .send({ ...draft, type })
        .expect(201);
      expect(prisma.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            ...draft,
            type,
            authorId: user.id,
            status: 'DRAFT',
            publishedAt: null,
          },
        }),
      );
    },
  );
  it.each(['READER', 'ADMIN'])(
    'requires the CREATOR role for creation (%s)',
    async (role) => {
      prisma.user.upsert.mockResolvedValue({ ...user, role });
      await request(app.getHttpServer())
        .post('/books')
        .set('Authorization', 'Bearer valid')
        .send(draft)
        .expect(403);
      expect(prisma.book.create).not.toHaveBeenCalled();
    },
  );
  it.each([
    { title: null },
    { title: ' ' },
    { slug: 'bad/slug' },
    { type: 'INVALID' },
    { status: 'PUBLISHED' },
    { authorId: 'someone-else' },
    { publishedAt: '2026-01-01' },
    { viewCount: 100 },
    { ageRating: null },
    { language: null },
    { tags: null },
    { tags: ['tag', 'tag'] },
    { tags: [1] },
    { coverImageUrl: 'javascript:alert(1)' },
  ])('rejects invalid or privileged creation fields %j', async (data) => {
    await request(app.getHttpServer())
      .post('/books')
      .set('Authorization', 'Bearer valid')
      .send({ ...draft, ...data })
      .expect(400);
    expect(prisma.book.create).not.toHaveBeenCalled();
  });
  it('requires slug, title, and type on creation', async () => {
    await request(app.getHttpServer())
      .post('/books')
      .set('Authorization', 'Bearer valid')
      .send({})
      .expect(400);
    expect(prisma.book.create).not.toHaveBeenCalled();
  });
  it('allows metadata updates and clearing nullable fields for the owner', async () => {
    const data = {
      title: 'Updated',
      synopsis: null,
      coverImageUrl: null,
      tags: [],
      ageRating: 'TEEN',
      language: 'vi',
    };
    await request(app.getHttpServer())
      .patch('/books/book-1')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(200);
    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: book.id, authorId: user.id },
        data,
      }),
    );
  });
  it.each([
    { title: null },
    { slug: null },
    { type: 'COMIC' },
    { status: 'PUBLISHED' },
    { authorId: 'other' },
    { chapterCount: 1 },
    { ageRating: null },
    { tags: null },
  ])('rejects invalid or immutable metadata patch %j', async (data) => {
    await request(app.getHttpServer())
      .patch('/books/book-1')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(400);
    expect(prisma.book.update).not.toHaveBeenCalled();
  });
  it.each(['patch', 'post', 'delete'] as const)(
    'denies a nonowner %s operation',
    async (method) => {
      prisma.book.findUnique.mockResolvedValue({ authorId: 'other-user' });
      const path =
        method === 'post' ? '/books/book-1/publish' : '/books/book-1';
      await request(app.getHttpServer())
        [method](path)
        .set('Authorization', 'Bearer valid')
        .send(method === 'patch' ? { title: 'Changed' } : {})
        .expect(403);
      expect(prisma.book.update).not.toHaveBeenCalled();
    },
  );
  it.each(['patch', 'post', 'delete'] as const)(
    'allows an admin %s operation on someone else’s book',
    async (method) => {
      prisma.user.upsert.mockResolvedValue({ ...user, role: 'ADMIN' });
      prisma.book.findUnique.mockResolvedValue({ authorId: 'other-user' });
      const path =
        method === 'post' ? '/books/book-1/publish' : '/books/book-1';
      await request(app.getHttpServer())
        [method](path)
        .set('Authorization', 'Bearer valid')
        .send(method === 'patch' ? { title: 'Changed' } : {})
        .expect(method === 'delete' ? 204 : 200);
      expect(prisma.book.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: book.id } }),
      );
    },
  );
  it('allows an owner to edit even if no longer a creator', async () => {
    prisma.user.upsert.mockResolvedValue({ ...user, role: 'READER' });
    await request(app.getHttpServer())
      .patch('/books/book-1')
      .set('Authorization', 'Bearer valid')
      .send({ title: 'Changed' })
      .expect(200);
  });
  it.each(['patch', 'post', 'delete'] as const)(
    'returns 404 on a missing book for %s',
    async (method) => {
      prisma.book.findUnique.mockResolvedValue(null);
      const path =
        method === 'post' ? '/books/book-1/publish' : '/books/book-1';
      await request(app.getHttpServer())
        [method](path)
        .set('Authorization', 'Bearer valid')
        .send(method === 'patch' ? { title: 'Changed' } : {})
        .expect(404);
      expect(prisma.book.update).not.toHaveBeenCalled();
    },
  );
  it('publishes with a server-generated timestamp', async () => {
    const before = Date.now();
    await request(app.getHttpServer())
      .post('/books/book-1/publish')
      .set('Authorization', 'Bearer valid')
      .expect(200);
    const calls = prisma.book.update.mock.calls as [
      { data: { status: string; publishedAt: Date } },
    ][];
    const data = calls[0][0].data;
    expect(data.status).toBe('PUBLISHED');
    expect(data.publishedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(data.publishedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
  it('archives without deleting chapters or changing publication history', async () => {
    await request(app.getHttpServer())
      .delete('/books/book-1')
      .set('Authorization', 'Bearer valid')
      .expect(204);
    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ARCHIVED' } }),
    );
  });
  it.each(['post', 'patch'] as const)(
    'maps duplicate slugs to 409 for %s',
    async (method) => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        { code: 'P2002', clientVersion: '7' },
      );
      prisma.book.create.mockRejectedValue(error);
      prisma.book.update.mockRejectedValue(error);
      await request(app.getHttpServer())
        [method](method === 'post' ? '/books' : '/books/book-1')
        .set('Authorization', 'Bearer valid')
        .send(method === 'post' ? draft : { slug: draft.slug })
        .expect(409);
    },
  );
  it('maps a book removed between lookup and update to 404', async () => {
    prisma.book.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing', {
        code: 'P2025',
        clientVersion: '7',
      }),
    );
    await request(app.getHttpServer())
      .patch('/books/book-1')
      .set('Authorization', 'Bearer valid')
      .send({ title: 'Changed' })
      .expect(404);
  });
  it('rejects suspended creators', async () => {
    prisma.user.upsert.mockResolvedValue({ ...user, status: 'SUSPENDED' });
    await request(app.getHttpServer())
      .post('/books')
      .set('Authorization', 'Bearer valid')
      .send(draft)
      .expect(403);
    expect(prisma.book.create).not.toHaveBeenCalled();
  });
  it('documents the six routes and their authentication', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(doc.paths['/books'].get?.security).toBeUndefined();
    expect(doc.paths['/books'].post?.security).toEqual([{ bearer: [] }]);
    expect(doc.paths['/books/{slug}'].get).toBeDefined();
    expect(doc.paths['/books/{id}'].patch).toBeDefined();
    expect(doc.paths['/books/{id}'].delete).toBeDefined();
    expect(doc.paths['/books/{id}/publish'].post).toBeDefined();
  });
});
