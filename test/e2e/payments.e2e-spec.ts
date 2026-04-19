import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../../src/app.module';
import { setupGlobalSettings } from '../../src/app/server';
import { cleanupRunUsers, createAuthorizedSession } from './helpers/auth-e2e.helper';
import { PAYMENT_ROUTES } from './constants/routes';

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const runId = `payments-${uuidv4().slice(0, 8)}`;

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
    await cleanupRunUsers(prisma, runId);
    await prisma.$disconnect();
    await app.close();
  });

  // ─── List my payments ─────────────────────────────────────────────────────────

  describe('GET /api/v1/payments/my', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get(PAYMENT_ROUTES.my).expect(401);
    });

    it('should return empty paginated list for a new user', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'list-payments');

      const res = await request(app.getHttpServer())
        .get(PAYMENT_ROUTES.my)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Create payment ───────────────────────────────────────────────────────────

  describe('POST /api/v1/payments', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post(PAYMENT_ROUTES.base)
        .set('idempotency-key', uuidv4())
        .send({ postId: 1, amount: 100, currency: 'UAH', provider: 'WAYFORPAY' })
        .expect(401);
    });

    it('should return 404 for non-existent post even without idempotency-key header', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'payment-no-idempotency');

      await request(app.getHttpServer())
        .post(PAYMENT_ROUTES.base)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ postId: 999999999, amount: 100, currency: 'UAH', provider: 'WAYFORPAY' })
        .expect(404);
    });

    it('should return 400 when payload is invalid (negative amount)', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'payment-invalid');

      await request(app.getHttpServer())
        .post(PAYMENT_ROUTES.base)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('idempotency-key', uuidv4())
        .send({ postId: 1, amount: -50, currency: 'UAH', provider: 'WAYFORPAY' })
        .expect(400);
    });

    it('should return 404 when post does not exist', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'payment-no-post');

      await request(app.getHttpServer())
        .post(PAYMENT_ROUTES.base)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('idempotency-key', uuidv4())
        .send({ postId: 999999999, amount: 100, currency: 'UAH', provider: 'WAYFORPAY' })
        .expect(404);
    });
  });
});
