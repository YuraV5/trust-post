import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ConfigService } from '@nestjs/config';
import { setupGlobalSettings } from '../../src/app/server';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { TokensService } from '../../src/modules/security/services';
import { PasswordService } from '../../src/modules/security/services';
import { UserRoles } from '@prisma/client';
import { USERS_ENDPOINTS } from './api-config/endpoints';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokensService: TokensService;
  let passwordService: PasswordService;
  let accessToken: string;
  let userId: string;

  const TEST_USER = {
    email: 'e2e-users@test.com',
    name: 'e2euser',
    password: 'E2eTest123!',
  };

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
    passwordService = app.get(PasswordService);

    // Clean up any leftover test data before starting
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-users' } } });

    const hashedPassword = await passwordService.createHash(TEST_USER.password);
    const user = await prisma.user.create({
      data: {
        email: TEST_USER.email,
        name: TEST_USER.name,
        password: hashedPassword,
        isEmailVerified: true,
        isActive: true,
      },
    });

    userId = user.id;
    accessToken = await tokensService.generateAccess({ sub: userId, role: UserRoles.USER });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-users' } } });
    await app.close();
  });

  // GET /users/me
  describe('GET /users/me', () => {
    it('should return 401 when no access token is provided', async () => {
      await request(app.getHttpServer()).get(USERS_ENDPOINTS.ME).expect(401);
    });

    it('should return the authenticated user profile', async () => {
      const res = await request(app.getHttpServer())
        .get(USERS_ENDPOINTS.ME)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: userId,
        email: TEST_USER.email,
        name: TEST_USER.name,
        isEmailVerified: true,
      });
      // Password must never be exposed
      expect(res.body.password).toBeUndefined();
    });
  });

  // PATCH /users/me
  describe('PATCH /users/me', () => {
    it('should return 401 when no access token is provided', async () => {
      await request(app.getHttpServer()).patch(USERS_ENDPOINTS.ME).send({ name: 'new' }).expect(401);
    });

    it('should return 400 when the request body is empty', async () => {
      await request(app.getHttpServer())
        .patch(USERS_ENDPOINTS.ME)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should update profile and return success message', async () => {
      const res = await request(app.getHttpServer())
        .patch(USERS_ENDPOINTS.ME)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'updatedname' })
        .expect(200);

      expect(res.body.message).toBe('Updated successfully');

      // Verify name was actually persisted (names are lowercased by the service)
      const updated = await prisma.user.findUnique({ where: { id: userId } });
      expect(updated?.name).toBe('updatedname');
    });
  });

  // PATCH /users/me/password
  describe('PATCH /users/me/password', () => {
    const NEW_PASSWORD = 'E2eNew456!';

    it('should return 401 when no access token is provided', async () => {
      await request(app.getHttpServer())
        .patch(USERS_ENDPOINTS.ME_PASSWORD)
        .send({ currentPassword: TEST_USER.password, newPassword: NEW_PASSWORD })
        .expect(401);
    });

    it('should return 400 when the current password is wrong', async () => {
      await request(app.getHttpServer())
        .patch(USERS_ENDPOINTS.ME_PASSWORD)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'WrongPass99!', newPassword: NEW_PASSWORD })
        .expect(400);
    });

    it('should update password successfully when correct credentials are supplied', async () => {
      const res = await request(app.getHttpServer())
        .patch(USERS_ENDPOINTS.ME_PASSWORD)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: TEST_USER.password, newPassword: NEW_PASSWORD })
        .expect(200);

      expect(res.body.message).toBe('Password updated successfully');

      // Verify the new password is actually stored and verifiable
      const updated = await prisma.user.findUnique({ where: { id: userId } });
      const isValid = await passwordService.verify(NEW_PASSWORD, updated!.password!);
      expect(isValid).toBe(true);
    });
  });

  // DELETE /users/me
  describe('DELETE /users/me', () => {
    it('should return 401 when no access token is provided', async () => {
      await request(app.getHttpServer()).delete(USERS_ENDPOINTS.ME).expect(401);
    });

    it('should delete the account and return success message', async () => {
      // Create a dedicated disposable user so the main test user is unaffected
      const disposableEmail = 'e2e-users-delete@test.com';
      const hashedPw = await passwordService.createHash('Disposable1!');
      const disposableUser = await prisma.user.create({
        data: {
          email: disposableEmail,
          name: 'disposable',
          password: hashedPw,
          isEmailVerified: true,
          isActive: true,
        },
      });
      const disposableToken = await tokensService.generateAccess({
        sub: disposableUser.id,
        role: UserRoles.USER,
      });

      const res = await request(app.getHttpServer())
        .delete(USERS_ENDPOINTS.ME)
        .set('Authorization', `Bearer ${disposableToken}`)
        .expect(200);

      expect(res.body.message).toBe('Removed successfully');

      // Confirm the record is gone from the DB
      const deleted = await prisma.user.findUnique({ where: { id: disposableUser.id } });
      expect(deleted).toBeNull();
    });

    it('should return 404 when the user no longer exists (token for already-deleted user)', async () => {
      // Create, delete via API, then try again with the same token
      const ghostEmail = 'e2e-users-ghost@test.com';
      const hashedPw = await passwordService.createHash('Ghost1pass!');
      const ghostUser = await prisma.user.create({
        data: {
          email: ghostEmail,
          name: 'ghost',
          password: hashedPw,
          isEmailVerified: true,
          isActive: true,
        },
      });
      const ghostToken = await tokensService.generateAccess({
        sub: ghostUser.id,
        role: UserRoles.USER,
      });

      // Delete directly via DB to simulate a stale token
      await prisma.user.delete({ where: { id: ghostUser.id } });

      await request(app.getHttpServer())
        .delete(USERS_ENDPOINTS.ME)
        .set('Authorization', `Bearer ${ghostToken}`)
        .expect(404);
    });
  });
});
