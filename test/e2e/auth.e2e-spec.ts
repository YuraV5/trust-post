import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import {
  buildE2ETestUser,
  cleanupRunUsers,
  createAuthorizedSession,
  registerUser,
  verifyUserEmail,
} from './helpers/auth-e2e.helper';
import { createE2EApp } from './helpers/e2e-app.helper';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const runId = `auth-${uuidv4().slice(0, 8)}`;

  beforeAll(async () => {
    app = await createE2EApp();

    prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    await cleanupRunUsers(prisma, runId);
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const testUser = buildE2ETestUser(runId, 'register-success');

      const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send(testUser).expect(201);

      expect(res.body).toEqual({ message: 'Registration successful. We sent a verification email to your address.' });
    });

    it('should return 409 when email is already taken', async () => {
      const testUser = buildE2ETestUser(runId, 'register-conflict');

      await request(app.getHttpServer()).post('/api/v1/auth/register').send(testUser).expect(201);

      await request(app.getHttpServer()).post('/api/v1/auth/register').send(testUser).expect(409);
    });

    it('should return 400 on invalid payload (short password)', async () => {
      const testUser = buildE2ETestUser(runId, 'register-short-pass');

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, password: 'weak' })
        .expect(400);
    });

    it('should return 400 on invalid payload (invalid email)', async () => {
      const testUser = buildE2ETestUser(runId, 'register-invalid-email');

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 when email is not verified', async () => {
      const testUser = buildE2ETestUser(runId, 'login-unverified');

      await registerUser(app, testUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-device-id', uuidv4())
        .send({ email: testUser.email, password: testUser.password })
        .expect(400);

      expect(res.body.message).toMatch(/verify your email/i);
    });

    it('should return 400 with wrong password', async () => {
      const testUser = buildE2ETestUser(runId, 'login-wrong-pass');
      await registerUser(app, testUser);
      await verifyUserEmail(prisma, testUser.email);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-device-id', uuidv4())
        .send({ email: testUser.email, password: 'WrongPass9!' })
        .expect(400);
    });

    it('should return 400 with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-device-id', uuidv4())
        .send({ email: `missing.${uuidv4()}@example.com`, password: 'Password1!' })
        .expect(400);
    });

    it('should login successfully and return accessToken + refreshToken cookie', async () => {
      const testUser = buildE2ETestUser(runId, 'login-success');
      await registerUser(app, testUser);
      await verifyUserEmail(prisma, testUser.email);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-device-id', uuidv4())
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toMatchObject({ email: testUser.email, name: testUser.name.toLowerCase() });

      const cookies: string[] = (res.headers['set-cookie'] as unknown as string[]) ?? [];
      expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should issue a new accessToken with a valid refresh cookie', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'refresh-success');

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', session.cookies)
        .expect(200);

      expect(refreshRes.body).toHaveProperty('accessToken');
    });

    it('should return 401 when no refresh cookie is present', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout the current session and clear the cookie', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'logout-success');

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', session.cookies)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(logoutRes.body).toEqual({ message: 'Logged out successfully' });

      await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', session.cookies).expect(401);
    });

    it('should return 401 when no refresh cookie is present', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401);
    });
  });

  describe('POST /api/v1/auth/logout-all', () => {
    it('should terminate all sessions for the user', async () => {
      const testUser = buildE2ETestUser(runId, 'logout-all');
      await registerUser(app, testUser);
      await verifyUserEmail(prisma, testUser.email);

      const session1 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-device-id', uuidv4())
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-device-id', uuidv4())
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const cookies1: string[] = (session1.headers['set-cookie'] as unknown as string[]) ?? [];
      const accessToken1: string = session1.body.accessToken;

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Cookie', cookies1)
        .set('Authorization', `Bearer ${accessToken1}`)
        .expect(200);

      expect(res.body).toEqual({ message: 'Logged out from all sessions successfully' });

      const createdUser = await prisma.user.findUnique({ where: { email: testUser.email } });
      const sessions = await prisma.session.findMany({ where: { userId: createdUser!.id } });
      expect(sessions).toHaveLength(0);
    });
  });
});
