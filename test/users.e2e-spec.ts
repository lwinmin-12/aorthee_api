jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Prisma } from '../generated/prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FirebaseAdminService } from '../src/firebase-admin/firebase-admin.service';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Database error', {
    code,
    clientVersion: '7',
  });

describe('Users endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const user = {
    id: 'self',
    firebaseUid: 'firebase-self',
    status: 'ACTIVE',
    deletedAt: null,
    role: 'READER',
    name: 'Reader',
    themeMode: 'SYSTEM',
  };
  const profile = {
    id: 'target',
    username: 'reader',
    name: 'Reader',
    avatarUrl: null,
    coverPhotoUrl: null,
    bio: null,
  };
  const link = {
    id: 'link-1',
    platform: 'website',
    url: 'https://example.com',
    order: 0,
  };
  const settings = {
    id: 'privacy-1',
    userId: user.id,
    profileVisibility: 'PUBLIC',
    showReadingActivity: true,
    showLibrary: true,
    allowFollow: true,
  };
  const prisma = {
    user: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    socialLink: {
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    follow: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    privacySetting: { upsert: jest.fn() },
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
      uid: 'firebase-self',
      provider: 'GOOGLE',
    });
    prisma.user.upsert.mockResolvedValue(user);
    prisma.user.findFirst.mockResolvedValue(profile);
    prisma.user.findMany.mockResolvedValue([profile]);
    prisma.user.update.mockResolvedValue(user);
    prisma.socialLink.findMany.mockResolvedValue([link]);
    prisma.socialLink.create.mockResolvedValue(link);
    prisma.socialLink.update.mockResolvedValue(link);
    prisma.socialLink.deleteMany.mockResolvedValue({ count: 1 });
    prisma.privacySetting.upsert.mockResolvedValue(settings);
  });
  afterAll(async () => {
    await app.close();
  });

  it.each([
    '/users/target',
    '/users/username/reader',
    '/users/target/social-links',
    '/users/target/followers',
    '/users/target/following',
  ])('allows anonymous reads of %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(200);
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining<Record<string, unknown>>({
        where: expect.objectContaining<Record<string, unknown>>({
          status: 'ACTIVE',
          deletedAt: null,
          OR: [
            { privacySetting: { is: null } },
            { privacySetting: { is: { profileVisibility: 'PUBLIC' } } },
          ],
        }),
      }),
    );
  });
  it('selects only public fields and looks up the exact username', async () => {
    await request(app.getHttpServer())
      .get('/users/username/reader')
      .expect(200)
      .expect(profile);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining<Record<string, unknown>>({
        username: 'reader',
      }) as unknown,
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        coverPhotoUrl: true,
        bio: true,
      },
    });
  });
  it('allows owner and follower visibility with verified optional credentials', async () => {
    await request(app.getHttpServer())
      .get('/users/target')
      .set('Authorization', 'Bearer valid')
      .expect(200);
    expect(firebase.verifyIdToken).toHaveBeenCalledWith('valid');
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining<Record<string, unknown>>({
        where: expect.objectContaining<Record<string, unknown>>({
          OR: expect.arrayContaining<unknown>([
            { id: user.id },
            {
              privacySetting: { is: { profileVisibility: 'FOLLOWERS_ONLY' } },
              followers: { some: { followerId: user.id } },
            },
          ]),
        }),
      }),
    );
  });
  it('rejects invalid tokens even on optional-auth routes', async () => {
    firebase.verifyIdToken.mockRejectedValue(new UnauthorizedException());
    await request(app.getHttpServer())
      .get('/users/target')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
  it('rejects malformed optional authorization', async () => {
    await request(app.getHttpServer())
      .get('/users/target')
      .set('Authorization', 'invalid')
      .expect(401);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
  it.each([
    '/users/target',
    '/users/username/reader',
    '/users/target/social-links',
    '/users/target/followers',
    '/users/target/following',
  ])('returns 404 for missing or invisible users on %s', async (path) => {
    prisma.user.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).get(path).expect(404);
    expect(prisma.socialLink.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
  it.each([
    ['patch', '/users/me'],
    ['patch', '/users/me/cover-photo'],
    ['post', '/users/me/social-links'],
    ['patch', '/users/me/social-links/link-1'],
    ['delete', '/users/me/social-links/link-1'],
    ['post', '/users/target/follow'],
    ['delete', '/users/target/follow'],
    ['get', '/users/me/privacy-settings'],
    ['patch', '/users/me/privacy-settings'],
  ] as const)('requires auth for %s %s', async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(401);
  });
  it('updates only the authenticated profile and omits internal identity', async () => {
    const data = {
      name: 'New name',
      username: 'new_reader',
      bio: 'Hello',
      avatarUrl: 'https://example.com/avatar.png',
    };
    prisma.user.update.mockResolvedValue({ ...user, ...data });
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(200);
    expect(response.body).toMatchObject(data);
    expect(response.body).not.toHaveProperty('firebaseUid');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data,
    });
  });
  it('maps a duplicate username to conflict', async () => {
    prisma.user.update.mockRejectedValue(prismaError('P2002'));
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', 'Bearer valid')
      .send({ username: 'reader' })
      .expect(409);
  });
  it.each([
    { role: 'ADMIN' },
    { userId: 'other' },
    { bio: 'x'.repeat(301) },
    { username: 'bad/name' },
    { avatarUrl: 'javascript:alert(1)' },
    { name: 1 },
  ])('rejects invalid profile body %j', async (data) => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it.each(['https://example.com/cover.jpg', null])(
    'updates or clears a cover photo: %s',
    async (coverPhotoUrl) => {
      await request(app.getHttpServer())
        .patch('/users/me/cover-photo')
        .set('Authorization', 'Bearer valid')
        .send({ coverPhotoUrl })
        .expect(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { coverPhotoUrl },
      });
    },
  );
  it.each([
    {},
    { coverPhotoUrl: 'ftp://example.com/photo' },
    { coverPhotoUrl: '', name: 'extra' },
  ])('rejects invalid cover request %j', async (data) => {
    await request(app.getHttpServer())
      .patch('/users/me/cover-photo')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('creates an owned social link', async () => {
    const data = { platform: link.platform, url: link.url, order: 2 };
    await request(app.getHttpServer())
      .post('/users/me/social-links')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(201)
      .expect(link);
    expect(prisma.socialLink.create).toHaveBeenCalledWith(
      expect.objectContaining<Record<string, unknown>>({
        data: { ...data, userId: user.id },
      }),
    );
  });
  it('scopes social-link updates to the owner', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/social-links/link-1')
      .set('Authorization', 'Bearer valid')
      .send({ order: 3 })
      .expect(200);
    expect(prisma.socialLink.update).toHaveBeenCalledWith(
      expect.objectContaining<Record<string, unknown>>({
        where: { id: link.id, userId: user.id },
        data: { order: 3 },
      }),
    );
  });
  it('returns 404 when editing someone else’s link', async () => {
    prisma.socialLink.update.mockRejectedValue(prismaError('P2025'));
    await request(app.getHttpServer())
      .patch('/users/me/social-links/other-link')
      .set('Authorization', 'Bearer valid')
      .send({ order: 3 })
      .expect(404);
  });
  it('deletes only an owned social link', async () => {
    await request(app.getHttpServer())
      .delete('/users/me/social-links/link-1')
      .set('Authorization', 'Bearer valid')
      .expect(204);
    expect(prisma.socialLink.deleteMany).toHaveBeenCalledWith({
      where: { id: link.id, userId: user.id },
    });
  });
  it('returns 404 when deleting an unowned or absent link', async () => {
    prisma.socialLink.deleteMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .delete('/users/me/social-links/other-link')
      .set('Authorization', 'Bearer valid')
      .expect(404);
  });
  it.each([
    { platform: null },
    { url: null },
    { order: null },
    { order: -1 },
    { order: 1.2 },
    { userId: 'other' },
    { url: 'javascript:alert(1)' },
    { platform: '  ' },
  ])('rejects invalid social-link patch %j', async (data) => {
    await request(app.getHttpServer())
      .patch('/users/me/social-links/link-1')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(400);
    expect(prisma.socialLink.update).not.toHaveBeenCalled();
  });
  it('requires platform and URL when creating a social link', async () => {
    await request(app.getHttpServer())
      .post('/users/me/social-links')
      .set('Authorization', 'Bearer valid')
      .send({ order: 1 })
      .expect(400);
  });
  it('sorts public social links by order and ID', async () => {
    await request(app.getHttpServer())
      .get('/users/target/social-links')
      .expect(200)
      .expect([link]);
    expect(prisma.socialLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining<Record<string, unknown>>({
        where: { userId: 'target' },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
      }),
    );
  });
  it('creates or returns the same follow on repeated requests', async () => {
    prisma.user.findFirst.mockResolvedValue({ privacySetting: null });
    const follow = {
      id: 'follow-1',
      followerId: user.id,
      followingId: 'target',
    };
    prisma.follow.upsert.mockResolvedValue(follow);
    for (let i = 0; i < 2; i++) {
      await request(app.getHttpServer())
        .post('/users/target/follow')
        .set('Authorization', 'Bearer valid')
        .expect(201)
        .expect(follow);
    }
    expect(prisma.follow.upsert).toHaveBeenCalledWith({
      where: {
        followerId_followingId: { followerId: user.id, followingId: 'target' },
      },
      create: { followerId: user.id, followingId: 'target' },
      update: {},
    });
  });
  it('returns the existing follow after a concurrent unique-key conflict', async () => {
    const follow = {
      id: 'follow-1',
      followerId: user.id,
      followingId: 'target',
    };
    prisma.follow.upsert.mockRejectedValue(prismaError('P2002'));
    prisma.follow.findUniqueOrThrow.mockResolvedValue(follow);
    await request(app.getHttpServer())
      .post('/users/target/follow')
      .set('Authorization', 'Bearer valid')
      .expect(201)
      .expect(follow);
    expect(prisma.follow.findUniqueOrThrow).toHaveBeenCalledWith({
      where: {
        followerId_followingId: { followerId: user.id, followingId: 'target' },
      },
    });
  });
  it('rejects self-follow', async () => {
    await request(app.getHttpServer())
      .post('/users/self/follow')
      .set('Authorization', 'Bearer valid')
      .expect(400);
    expect(prisma.follow.upsert).not.toHaveBeenCalled();
  });
  it('enforces allowFollow', async () => {
    prisma.user.findFirst.mockResolvedValue({
      privacySetting: { allowFollow: false },
    });
    await request(app.getHttpServer())
      .post('/users/target/follow')
      .set('Authorization', 'Bearer valid')
      .expect(403);
    expect(prisma.follow.upsert).not.toHaveBeenCalled();
  });
  it('rejects follows of nonexistent or inactive users', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/users/target/follow')
      .set('Authorization', 'Bearer valid')
      .expect(404);
    expect(prisma.follow.upsert).not.toHaveBeenCalled();
  });
  it('unfollows idempotently even after a target disables follows', async () => {
    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .delete('/users/target/follow')
      .set('Authorization', 'Bearer valid')
      .expect(204);
    expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
      where: { followerId: user.id, followingId: 'target' },
    });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
  it.each(['followers', 'following'])(
    'paginates and filters %s in the correct direction',
    async (direction) => {
      await request(app.getHttpServer())
        .get(`/users/target/${direction}?limit=5&offset=10`)
        .expect(200)
        .expect([profile]);
      const relation =
        direction === 'followers'
          ? { following: { some: { followingId: 'target' } } }
          : { followers: { some: { followerId: 'target' } } };
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining<Record<string, unknown>>({
          where: expect.objectContaining<Record<string, unknown>>({
            ...relation,
            status: 'ACTIVE',
            deletedAt: null,
            OR: expect.any(Array) as unknown,
          }),
          take: 5,
          skip: 10,
          orderBy: { id: 'asc' },
        }),
      );
    },
  );
  it.each(['limit=101', 'limit=0', 'offset=-1', 'offset=abc'])(
    'rejects invalid pagination %s',
    async (query) => {
      await request(app.getHttpServer())
        .get(`/users/target/followers?${query}`)
        .expect(400);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    },
  );
  it('gets privacy settings for the authenticated user with schema defaults', async () => {
    await request(app.getHttpServer())
      .get('/users/me/privacy-settings')
      .set('Authorization', 'Bearer valid')
      .expect(200)
      .expect(settings);
    expect(prisma.privacySetting.upsert).toHaveBeenCalledWith({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
  });
  it('patches privacy settings, preserving explicit false and omitted fields', async () => {
    const data = {
      profileVisibility: 'FOLLOWERS_ONLY',
      showLibrary: false,
      showReadingActivity: false,
      allowFollow: false,
    };
    await request(app.getHttpServer())
      .patch('/users/me/privacy-settings')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(200);
    expect(prisma.privacySetting.upsert).toHaveBeenCalledWith({
      where: { userId: user.id },
      create: { ...data, userId: user.id },
      update: data,
    });
  });
  it.each([
    { profileVisibility: 'invalid' },
    { profileVisibility: null },
    { allowFollow: null },
    { showLibrary: 'false' },
    { showReadingActivity: 0 },
    { userId: 'other' },
  ])('rejects invalid privacy body %j', async (data) => {
    await request(app.getHttpServer())
      .patch('/users/me/privacy-settings')
      .set('Authorization', 'Bearer valid')
      .send(data)
      .expect(400);
    expect(prisma.privacySetting.upsert).not.toHaveBeenCalled();
  });
  it('rejects inactive authenticated callers', async () => {
    prisma.user.upsert.mockResolvedValue({ ...user, status: 'SUSPENDED' });
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', 'Bearer valid')
      .send({ name: 'Changed' })
      .expect(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('documents optional authentication and request/response models', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(doc.paths['/users/{id}'].get?.security).toEqual([
      {},
      { bearer: [] },
    ]);
    expect(doc.paths['/users/me'].patch?.security).toEqual([{ bearer: [] }]);
    expect(doc.components?.schemas).toHaveProperty('UpdatePrivacySettingsDto');
    expect(doc.components?.schemas).toHaveProperty('PublicProfileDto');
  });
});
