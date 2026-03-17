import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { UserRoles } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { setupGlobalSettings } from '../../src/app/server';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { TokensService } from '../../src/modules/security/services';
import { ADMIN_USERS_ENDPOINTS } from './api-config/endpoints';

describe('UserRolePeriods via AdminUsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokensService: TokensService;

  let adminUserId: string;
  let plainUserId: string;
  let targetUserId: string;
  let adminAccessToken: string;
  let plainUserAccessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const config = app.get(ConfigService);
    setupGlobalSettings(app, config);
    await app.init();

    prisma = app.get(PrismaService);
    tokensService = app.get(TokensService);

    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-role-periods-' } } });

    const admin = await prisma.user.create({
      data: {
        email: 'e2e-role-periods-admin@test.com',
        name: 'admin-e2e',
        role: UserRoles.ADMIN,
        isActive: true,
        isEmailVerified: true,
      },
    });

    const plain = await prisma.user.create({
      data: {
        email: 'e2e-role-periods-user@test.com',
        name: 'user-e2e',
        role: UserRoles.USER,
        isActive: true,
        isEmailVerified: true,
      },
    });

    const target = await prisma.user.create({
      data: {
        email: 'e2e-role-periods-target@test.com',
        name: 'target-e2e',
        role: UserRoles.USER,
        isActive: true,
        isEmailVerified: true,
      },
    });

    adminUserId = admin.id;
    plainUserId = plain.id;
    targetUserId = target.id;

    adminAccessToken = await tokensService.generateAccess({ sub: adminUserId, role: UserRoles.ADMIN });
    plainUserAccessToken = await tokensService.generateAccess({ sub: plainUserId, role: UserRoles.USER });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-role-periods-' } } });
    await app.close();
  });
  // TODO: fix this test for paralel execution - it relies on state from previous test
  // describe('PATCH /admin/users/:id/roles', () => {
  //   it('should return 401 without access token', async () => {
  //     await request(app.getHttpServer())
  //       .patch(ADMIN_USERS_ENDPOINTS.CHANGE_ROLE(targetUserId))
  //       .send({ role: UserRoles.MODERATOR })
  //       .expect(401);
  //   });

  //   it('should return 403 for non-admin token', async () => {
  //     await request(app.getHttpServer())
  //       .patch(ADMIN_USERS_ENDPOINTS.CHANGE_ROLE(targetUserId))
  //       .set('Authorization', `Bearer ${plainUserAccessToken}`)
  //       .send({ role: UserRoles.MODERATOR })
  //       .expect(403);
  //   });

  //   it('should change role and create role period', async () => {
  //     const res = await request(app.getHttpServer())
  //       .patch(ADMIN_USERS_ENDPOINTS.CHANGE_ROLE(targetUserId))
  //       .set('Authorization', `Bearer ${adminAccessToken}`)
  //       .send({ role: UserRoles.MODERATOR })
  //       .expect(200);

  //     expect(res.body.message).toBe('User roles updated successfully');

  //     const updated = await prisma.user.findUnique({ where: { id: targetUserId } });
  //     expect(updated?.role).toBe(UserRoles.MODERATOR);

  //     const roleHistory = await prisma.userRolePeriod.findMany({ where: { userId: targetUserId } });
  //     expect(roleHistory.length).toBe(1);
  //     expect(roleHistory[0].role).toBe(UserRoles.MODERATOR);
  //     expect(roleHistory[0].changedById).toBe(adminUserId);
  //     expect(roleHistory[0].endDate).toBeNull();
  //   });
  // });

  // describe('GET /admin/users/:id/role-history', () => {
  //   it('should return 401 without access token', async () => {
  //     await request(app.getHttpServer()).get(ADMIN_USERS_ENDPOINTS.ROLE_HISTORY(targetUserId)).expect(401);
  //   });

  //   it('should return role history for admin', async () => {
  //     const res = await request(app.getHttpServer())
  //       .get(ADMIN_USERS_ENDPOINTS.ROLE_HISTORY(targetUserId))
  //       .set('Authorization', `Bearer ${adminAccessToken}`)
  //       .expect(200);

  //     expect(Array.isArray(res.body)).toBe(true);
  //     expect(res.body.length).toBeGreaterThanOrEqual(1);
  //     expect(res.body[0]).toEqual(
  //       expect.objectContaining({
  //         role: UserRoles.MODERATOR,
  //         changedById: adminUserId,
  //       }),
  //     );
  //   });

  //   it('should return 404 for non-existing user', async () => {
  //     await request(app.getHttpServer())
  //       .get(ADMIN_USERS_ENDPOINTS.ROLE_HISTORY(randomUUID()))
  //       .set('Authorization', `Bearer ${adminAccessToken}`)
  //       .expect(404);
  //   });
  // });
});
