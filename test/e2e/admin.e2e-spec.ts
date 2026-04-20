import { INestApplication } from '@nestjs/common';
import { PrismaClient, UserRoles } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import {
  cleanupRunUsers,
  createAuthorizedSession,
  buildE2ETestUser,
  registerUser,
  verifyUserEmail,
  loginUser,
} from './helpers/auth-e2e.helper';
import { ADMIN_ROUTES } from './constants/routes';
import { createE2EApp } from './helpers/e2e-app.helper';

// Sets the role of a user directly in the DB to bypass the API (needed to make an admin)
const grantAdminRole = async (prisma: PrismaClient, email: string): Promise<void> => {
  await prisma.user.update({
    where: { email },
    data: { role: UserRoles.ADMIN },
  });
};

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const runId = `admin-${uuidv4().slice(0, 8)}`;

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

  // ─── Auth & role guards ───────────────────────────────────────────────────────

  describe('GET /api/v1/admin/users — guard checks', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer()).get(ADMIN_ROUTES.users).expect(401);
    });

    it('should return 403 when user has USER role (not admin)', async () => {
      // Regular user — no role elevation
      const session = await createAuthorizedSession(app, prisma, runId, 'admin-guard-user');

      await request(app.getHttpServer())
        .get(ADMIN_ROUTES.users)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(403);
    });
  });

  // ─── List users (admin) ───────────────────────────────────────────────────────

  describe('GET /api/v1/admin/users', () => {
    it('should return paginated user list for admin', async () => {
      const admin = buildE2ETestUser(runId, 'list-users-admin');
      await registerUser(app, admin);
      await verifyUserEmail(prisma, admin.email);
      await grantAdminRole(prisma, admin.email);
      const { accessToken } = await loginUser(app, admin);

      const res = await request(app.getHttpServer())
        .get(ADMIN_ROUTES.users)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('total');
    });
  });

  // ─── Get user by id (admin) ───────────────────────────────────────────────────

  describe('GET /api/v1/admin/users/:id', () => {
    it('should return a specific user by id', async () => {
      const admin = buildE2ETestUser(runId, 'get-user-admin');
      await registerUser(app, admin);
      await verifyUserEmail(prisma, admin.email);
      await grantAdminRole(prisma, admin.email);
      const { accessToken } = await loginUser(app, admin);

      // Create a target user to retrieve
      const target = buildE2ETestUser(runId, 'get-user-target');
      await registerUser(app, target);
      const targetRecord = await prisma.user.findUnique({
        where: { email: target.email },
        select: { id: true },
      });

      const res = await request(app.getHttpServer())
        .get(ADMIN_ROUTES.userById(targetRecord!.id))
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(targetRecord!.id);
      expect(res.body.email).toBe(target.email);
    });

    it('should return 404 for non-existent user id', async () => {
      const admin = buildE2ETestUser(runId, 'get-user-404-admin');
      await registerUser(app, admin);
      await verifyUserEmail(prisma, admin.email);
      await grantAdminRole(prisma, admin.email);
      const { accessToken } = await loginUser(app, admin);

      await request(app.getHttpServer())
        .get(ADMIN_ROUTES.userById(uuidv4()))
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ─── Create user (admin) ──────────────────────────────────────────────────────

  describe('POST /api/v1/admin/users', () => {
    it('should create a user and return success message', async () => {
      const admin = buildE2ETestUser(runId, 'create-user-admin');
      await registerUser(app, admin);
      await verifyUserEmail(prisma, admin.email);
      await grantAdminRole(prisma, admin.email);
      const { accessToken } = await loginUser(app, admin);

      const newUser = buildE2ETestUser(runId, 'created-by-admin');

      const res = await request(app.getHttpServer())
        .post(ADMIN_ROUTES.users)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: newUser.email, name: newUser.name, password: newUser.password })
        .expect(201);

      expect(res.body).toEqual({ message: expect.any(String) });
    });
  });

  // ─── Toggle user status (admin) ───────────────────────────────────────────────

  describe('PATCH /api/v1/admin/users/:id/toggle-status', () => {
    it('should toggle isActive status of a user', async () => {
      const admin = buildE2ETestUser(runId, 'toggle-status-admin');
      await registerUser(app, admin);
      await verifyUserEmail(prisma, admin.email);
      await grantAdminRole(prisma, admin.email);
      const { accessToken } = await loginUser(app, admin);

      const target = buildE2ETestUser(runId, 'toggle-status-target');
      await registerUser(app, target);
      const targetRecord = await prisma.user.findUnique({
        where: { email: target.email },
        select: { id: true, isActive: true },
      });

      const res = await request(app.getHttpServer())
        .patch(ADMIN_ROUTES.toggleStatus(targetRecord!.id))
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({ message: expect.any(String) });

      // Verify the status was actually toggled in the DB
      const updated = await prisma.user.findUnique({
        where: { id: targetRecord!.id },
        select: { isActive: true },
      });
      expect(updated!.isActive).toBe(!targetRecord!.isActive);
    });
  });

  // ─── Change user role (admin) ─────────────────────────────────────────────────

  describe('PATCH /api/v1/admin/users/:id/roles', () => {
    it('should change target user role to MODERATOR', async () => {
      const admin = buildE2ETestUser(runId, 'change-role-admin');
      await registerUser(app, admin);
      await verifyUserEmail(prisma, admin.email);
      await grantAdminRole(prisma, admin.email);
      const { accessToken } = await loginUser(app, admin);

      const target = buildE2ETestUser(runId, 'change-role-target');
      await registerUser(app, target);
      const targetRecord = await prisma.user.findUnique({
        where: { email: target.email },
        select: { id: true },
      });

      const res = await request(app.getHttpServer())
        .patch(ADMIN_ROUTES.updateRole(targetRecord!.id))
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: UserRoles.MODERATOR })
        .expect(200);

      expect(res.body).toEqual({ message: expect.any(String) });

      const updated = await prisma.user.findUnique({
        where: { id: targetRecord!.id },
        select: { role: true },
      });
      expect(updated!.role).toBe(UserRoles.MODERATOR);
    });
  });
});
