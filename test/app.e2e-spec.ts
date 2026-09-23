// SDK calls are replaced by the FirebaseAdminService mocks in these tests.
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FirebaseAdminService } from '../src/firebase-admin/firebase-admin.service';

describe('Authentication endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const user = {
    id: 'user-1',
    firebaseUid: 'firebase-1',
    status: 'ACTIVE',
    deletedAt: null,
    role: 'READER',
    name: 'Reader',
    isAgeVerified: false,
  };
  const prisma = {
    user: { upsert: jest.fn().mockResolvedValue(user), update: jest.fn() },
    session: { upsert: jest.fn(), updateMany: jest.fn() },
    interest: { findMany: jest.fn() },
    userInterest: { createMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const firebase = {
    verifyIdToken: jest
      .fn()
      .mockResolvedValue({ uid: 'firebase-1', provider: 'GOOGLE' }),
    revokeRefreshTokens: jest.fn(),
  };
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
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await app.close();
  });
  it('keeps the health route public', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
  });
  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
  it('omits Firebase identity from the current profile', async () => {
    const result = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer valid')
      .expect(200);
    expect(result.body).toMatchObject({ id: user.id, name: user.name });
    expect(result.body).not.toHaveProperty('firebaseUid');
  });
  it('rejects under-12 users without writing age verification', async () => {
    const date = new Date();
    date.setUTCFullYear(date.getUTCFullYear() - 10);
    const result = await request(app.getHttpServer())
      .post('/auth/verify-age')
      .set('Authorization', 'Bearer valid')
      .send({ birthDate: date.toISOString().slice(0, 10) })
      .expect(403);
    expect(result.body).toMatchObject({
      message: 'Must be 12 or older',
      code: 'AGE_REQUIREMENT_NOT_MET',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it.each(['2020-02-30', 'not-a-date', '2999-01-01'])(
    'rejects invalid or future date %s',
    async (birthDate) => {
      await request(app.getHttpServer())
        .post('/auth/verify-age')
        .set('Authorization', 'Bearer valid')
        .send({ birthDate })
        .expect(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
    },
  );
  it('rejects attempts to submit privileged profile fields', async () => {
    await request(app.getHttpServer())
      .post('/auth/verify-age')
      .set('Authorization', 'Bearer valid')
      .send({ birthDate: '2000-01-01', role: 'ADMIN' })
      .expect(400);
  });
  it('validates session platform', async () => {
    await request(app.getHttpServer())
      .post('/auth/sessions')
      .set('Authorization', 'Bearer valid')
      .send({ deviceId: 'device-1', platform: 'INVALID' })
      .expect(400);
  });
  it('lists interest options without authentication', async () => {
    const options = [
      {
        id: 'interest-1',
        name: 'Fantasy',
        slug: 'fantasy',
        iconUrl: null,
        order: 0,
      },
    ];
    prisma.interest.findMany.mockResolvedValueOnce(options);
    await request(app.getHttpServer())
      .get('/interests')
      .expect(200)
      .expect(options);
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
  });
  it.each(['get', 'post', 'patch'] as const)(
    'protects the %s preference endpoint',
    async (method) => {
      const path =
        method === 'patch' ? '/users/me/theme' : '/users/me/interests';
      await request(app.getHttpServer())[method](path).send({}).expect(401);
    },
  );
  it('reads only the current user interests', async () => {
    prisma.interest.findMany.mockResolvedValueOnce([]);
    await request(app.getHttpServer())
      .get('/users/me/interests')
      .set('Authorization', 'Bearer valid')
      .expect(200)
      .expect([]);
    expect(prisma.interest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { users: { some: { userId: user.id } } },
      }),
    );
  });
  it.each([
    {},
    { interestIds: 'id' },
    { interestIds: [null] },
    { interestIds: [''] },
    { interestIds: [1] },
    { interestIds: [], userId: 'other' },
  ])('rejects invalid interest body %j', async (body) => {
    await request(app.getHttpServer())
      .post('/users/me/interests')
      .set('Authorization', 'Bearer valid')
      .send(body)
      .expect(400);
    expect(prisma.userInterest.createMany).not.toHaveBeenCalled();
  });
  it('bulk saves unique selections for the authenticated user', async () => {
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.interest.findMany
      .mockResolvedValueOnce([{ id: 'interest-1' }])
      .mockResolvedValueOnce([{ id: 'interest-1', name: 'Fantasy' }]);
    await request(app.getHttpServer())
      .post('/users/me/interests')
      .set('Authorization', 'Bearer valid')
      .send({ interestIds: ['interest-1', 'interest-1'] })
      .expect(201)
      .expect([{ id: 'interest-1', name: 'Fantasy' }]);
    expect(prisma.userInterest.createMany).toHaveBeenCalledWith({
      data: [{ userId: user.id, interestId: 'interest-1' }],
      skipDuplicates: true,
    });
  });
  it('rejects unknown interests before any bulk write', async () => {
    prisma.interest.findMany.mockResolvedValueOnce([{ id: 'interest-1' }]);
    await request(app.getHttpServer())
      .post('/users/me/interests')
      .set('Authorization', 'Bearer valid')
      .send({ interestIds: ['interest-1', 'unknown'] })
      .expect(400);
    expect(prisma.userInterest.createMany).not.toHaveBeenCalled();
  });
  it('accepts empty interest selections without a write', async () => {
    prisma.interest.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await request(app.getHttpServer())
      .post('/users/me/interests')
      .set('Authorization', 'Bearer valid')
      .send({ interestIds: [] })
      .expect(201)
      .expect([]);
    expect(prisma.userInterest.createMany).not.toHaveBeenCalled();
  });
  it.each(['LIGHT', 'DARK', 'SYSTEM'])(
    'updates theme to %s',
    async (themeMode) => {
      prisma.user.update.mockResolvedValueOnce({ themeMode });
      await request(app.getHttpServer())
        .patch('/users/me/theme')
        .set('Authorization', 'Bearer valid')
        .send({ themeMode })
        .expect(200)
        .expect({ themeMode });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { themeMode },
        select: { themeMode: true },
      });
    },
  );
  it.each([
    {},
    { themeMode: null },
    { themeMode: 'dark' },
    { themeMode: 'DARK', userId: 'other' },
  ])('rejects invalid theme body %j', async (body) => {
    await request(app.getHttpServer())
      .patch('/users/me/theme')
      .set('Authorization', 'Bearer valid')
      .send(body)
      .expect(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
