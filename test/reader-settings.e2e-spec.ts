jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FirebaseAdminService } from '../src/firebase-admin/firebase-admin.service';

describe('Reader settings', () => {
  let app: INestApplication<App>;
  const user = {
    id: 'reader-1',
    status: 'ACTIVE',
    deletedAt: null,
    role: 'READER',
  };
  const defaults = {
    id: 'settings-1',
    userId: user.id,
    readingMode: 'PAGE',
    readerTheme: 'LIGHT',
    fontSize: 16,
    letterSpacing: 0,
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
  const prisma = {
    user: { upsert: jest.fn() },
    readerSettings: { upsert: jest.fn() },
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
    prisma.readerSettings.upsert.mockResolvedValue(defaults);
    firebase.verifyIdToken.mockResolvedValue({
      uid: 'firebase-1',
      provider: 'GOOGLE',
    });
  });
  afterAll(async () => {
    await app.close();
  });
  it.each(['get', 'patch'] as const)(
    'requires Firebase authentication for %s',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/users/me/reader-settings')
        .expect(401);
      expect(prisma.readerSettings.upsert).not.toHaveBeenCalled();
    },
  );
  it('gets settings and creates defaults without overwriting existing values', async () => {
    await request(app.getHttpServer())
      .get('/users/me/reader-settings')
      .set('Authorization', 'Bearer valid')
      .expect(200)
      .expect(defaults);
    expect(prisma.readerSettings.upsert).toHaveBeenCalledWith({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
  });
  it.each([
    {
      readingMode: 'SCROLL',
      readerTheme: 'NIGHT',
      fontSize: 24,
      letterSpacing: 0.5,
    },
    { readingMode: 'PAGE', readerTheme: 'LIGHT' },
    { readerTheme: 'DARK' },
    { readerTheme: 'SEPIA' },
    { fontSize: 8, letterSpacing: 0 },
    { fontSize: 72, letterSpacing: 10 },
    {},
  ])(
    'accepts partial settings %j and preserves omitted fields',
    async (data) => {
      prisma.readerSettings.upsert.mockResolvedValue({ ...defaults, ...data });
      await request(app.getHttpServer())
        .patch('/users/me/reader-settings')
        .set('Authorization', 'Bearer valid')
        .send(data)
        .expect(200)
        .expect({ ...defaults, ...data });
      expect(prisma.readerSettings.upsert).toHaveBeenCalledWith({
        where: { userId: user.id },
        create: { ...data, userId: user.id },
        update: data,
      });
    },
  );
  it.each([
    { readingMode: 'INVALID' },
    { readerTheme: 'SYSTEM' },
    { fontSize: 7 },
    { fontSize: 73 },
    { fontSize: 16.5 },
    { fontSize: '16' },
    { letterSpacing: -1 },
    { letterSpacing: 11 },
    { letterSpacing: '0.5' },
    { readingMode: null },
    { readerTheme: null },
    { fontSize: null },
    { letterSpacing: null },
    { userId: 'other' },
    { id: 'other' },
    { themeMode: 'DARK' },
  ])('rejects invalid or unexpected settings %j', async (body) => {
    await request(app.getHttpServer())
      .patch('/users/me/reader-settings')
      .set('Authorization', 'Bearer valid')
      .send(body)
      .expect(400);
    expect(prisma.readerSettings.upsert).not.toHaveBeenCalled();
  });
  it.each(['get', 'patch'] as const)(
    'rejects suspended accounts for %s',
    async (method) => {
      prisma.user.upsert.mockResolvedValue({ ...user, status: 'SUSPENDED' });
      await request(app.getHttpServer())
        [method]('/users/me/reader-settings')
        .set('Authorization', 'Bearer valid')
        .send({})
        .expect(403);
      expect(prisma.readerSettings.upsert).not.toHaveBeenCalled();
    },
  );
});
