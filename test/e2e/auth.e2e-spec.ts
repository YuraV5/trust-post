import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../../src/app.module';
import { setupGlobalSettings } from '../../src/app/server';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const TEST_USER = {
    email: 'e2e_auth@example.com',
    password: 'Password1!',
    name: 'E2E Auth User',
  };

  const deviceId = uuidv4();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupGlobalSettings(app, app.get(ConfigService));
    await app.init();

    prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Isolated state per test: wipe users and dependent sessions
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  // Helper

  async function registerAndVerify(overrides: Partial<typeof TEST_USER> = {}): Promise<void> {
    const body = { ...TEST_USER, ...overrides };
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(body).expect(201);
    await prisma.user.update({
      where: { email: body.email },
      data: { isEmailVerified: true },
    });
  }

  // Register

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send(TEST_USER).expect(201);

      expect(res.body).toEqual({ message: 'User registered successfully' });
    });

    it('should return 409 when email is already taken', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(TEST_USER).expect(201);

      await request(app.getHttpServer()).post('/api/v1/auth/register').send(TEST_USER).expect(409);
    });

    it('should return 400 on invalid payload (short password)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...TEST_USER, password: 'weak' })
        .expect(400);
    });

    it('should return 400 on invalid payload (invalid email)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...TEST_USER, email: 'not-an-email' })
        .expect(400);
    });
  });


  // Login
  describe('POST /api/v1/auth/login', () => {
    it('should return 400 when email is not verified', async () => {
      // Register but do NOT verify email
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(TEST_USER).expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password, deviceId })
        .expect(400);

      expect(res.body.message).toMatch(/verify your email/i);
    });

    it('should return 400 with wrong password', async () => {
      await registerAndVerify();

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: 'WrongPass9!', deviceId })
        .expect(400);
    });

    it('should return 400 with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: TEST_USER.password, deviceId })
        .expect(400);
    });

    it('should login successfully and return accessToken + refreshToken cookie', async () => {
      await registerAndVerify();

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password, deviceId })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toMatchObject({ email: TEST_USER.email, name: TEST_USER.name.toLowerCase() });

      const cookies: string[] = (res.headers['set-cookie'] as unknown as string[]) ?? [];
      expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });
  });

  // Refresh

  describe('POST /api/v1/auth/refresh', () => {
    it('should issue a new accessToken with a valid refresh cookie', async () => {
      await registerAndVerify();

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password, deviceId })
        .expect(200);

      const cookies: string[] = (loginRes.headers['set-cookie'] as unknown as string[]) ?? [];

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      expect(refreshRes.body).toHaveProperty('accessToken');
    });

    it('should return 401 when no refresh cookie is present', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(401);
    });
  });

  // Logout

  describe('POST /api/v1/auth/logout', () => {
    it('should logout the current session and clear the cookie', async () => {
      await registerAndVerify();

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password, deviceId })
        .expect(200);

      const cookies: string[] = (loginRes.headers['set-cookie'] as unknown as string[]) ?? [];
      const accessToken: string = loginRes.body.accessToken;

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(logoutRes.body).toEqual({ message: 'Logged out successfully' });

      // After logout the refresh token must be invalid
      await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', cookies).expect(401);
    });

    it('should return 401 when no refresh cookie is present', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401);
    });
  });

  // Logout all

  describe('POST /api/v1/auth/logout-all', () => {
    it('should terminate all sessions for the user', async () => {
      await registerAndVerify();

      // Login from two devices
      const session1 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password, deviceId: uuidv4() })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password, deviceId: uuidv4() })
        .expect(200);

      const cookies1: string[] = (session1.headers['set-cookie'] as unknown as string[]) ?? [];
      const accessToken1: string = session1.body.accessToken;

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Cookie', cookies1)
        .set('Authorization', `Bearer ${accessToken1}`)
        .expect(200);

      expect(res.body).toEqual({ message: 'Logged out from all sessions successfully' });

      // No sessions should remain
      const sessions = await prisma.session.findMany();
      expect(sessions).toHaveLength(0);
    });
  });
});
