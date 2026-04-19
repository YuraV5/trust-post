import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../../src/app.module';
import { setupGlobalSettings } from '../../src/app/server';
import { cleanupRunUsers, createAuthorizedSession, loginUser, registerUser, verifyUserEmail, buildE2ETestUser } from './helpers/auth-e2e.helper';
import { SESSION_ROUTES } from './constants/routes';

describe('Sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const runId = `sessions-${uuidv4().slice(0, 8)}`;

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

  // ─── List sessions ────────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/sessions/me', () => {
    it('should return 401 without refresh token cookie', async () => {
      await request(app.getHttpServer()).get(SESSION_ROUTES.me).expect(401);
    });

    it('should return list of active sessions for the current user', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'list-sessions');

      const res = await request(app.getHttpServer())
        .get(SESSION_ROUTES.me)
        .set('Cookie', session.cookies)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      // Should at least have the current session
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('id');
    });
  });

  // ─── Delete specific session ──────────────────────────────────────────────────

  describe('DELETE /api/v1/auth/sessions/:sessionId', () => {
    it('should delete a specific session by id', async () => {
      // Create a user and log in from two different devices
      const user = buildE2ETestUser(runId, 'del-session');
      await registerUser(app, user);
      await verifyUserEmail(prisma, user.email);

      const sessionA = await loginUser(app, user, uuidv4());
      const sessionB = await loginUser(app, user, uuidv4());

      const userRecord = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      });

      const sessionBDb = await prisma.session.findFirst({
        where: { userId: userRecord!.id, deviceId: sessionB.deviceId },
        select: { id: true },
      });

      expect(sessionBDb).toBeDefined();

      // Delete sessionB while authenticated as sessionA
      await request(app.getHttpServer())
        .delete(SESSION_ROUTES.byId(sessionBDb!.id))
        .set('Cookie', sessionA.cookies)
        .set('Authorization', `Bearer ${sessionA.accessToken}`)
        .expect(200);

      // After deletion, sessionA should still work
      const listAfter = await request(app.getHttpServer())
        .get(SESSION_ROUTES.me)
        .set('Cookie', sessionA.cookies)
        .set('Authorization', `Bearer ${sessionA.accessToken}`)
        .expect(200);

      const sessionBStillExists = listAfter.body.some((s: { id: string }) => s.id === sessionBDb!.id);
      expect(sessionBStillExists).toBe(false);
    });
  });

  // ─── Delete all except current ────────────────────────────────────────────────

  describe('DELETE /api/v1/auth/sessions/all-except-current', () => {
    it('should delete all sessions except the current one', async () => {
      // Log in from three different devices
      const user = buildE2ETestUser(runId, 'del-all-except');
      await registerUser(app, user);
      await verifyUserEmail(prisma, user.email);

      const sessionA = await loginUser(app, user, uuidv4());
      await loginUser(app, user, uuidv4());
      await loginUser(app, user, uuidv4());

      const userRecord = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      });

      const sessionADb = await prisma.session.findFirst({
        where: { userId: userRecord!.id, deviceId: sessionA.deviceId },
        select: { id: true },
      });

      await request(app.getHttpServer())
        .delete(SESSION_ROUTES.allExceptCurrent)
        .set('Cookie', sessionA.cookies)
        .set('Authorization', `Bearer ${sessionA.accessToken}`)
        .expect(200);

      // Only sessionA should remain
      const listRes = await request(app.getHttpServer())
        .get(SESSION_ROUTES.me)
        .set('Cookie', sessionA.cookies)
        .set('Authorization', `Bearer ${sessionA.accessToken}`)
        .expect(200);

      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].id).toBe(sessionADb!.id);
    });
  });

  // ─── Delete all sessions ──────────────────────────────────────────────────────

  describe('DELETE /api/v1/auth/sessions/all', () => {
    it('should delete all sessions and invalidate cookie', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'del-all');

      await request(app.getHttpServer())
        .delete(SESSION_ROUTES.all)
        .set('Cookie', session.cookies)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      // Cookie is cleared — subsequent session listing should return 401
      await request(app.getHttpServer())
        .get(SESSION_ROUTES.me)
        .set('Cookie', session.cookies)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);
    });
  });
});
