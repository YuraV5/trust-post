import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import {
  cleanupRunUsers,
  createAuthorizedSession,
  loginUser,
  registerUser,
  verifyUserEmail,
} from './helpers/auth-e2e.helper';
import { createE2EApp } from './helpers/e2e-app.helper';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const runId = `users-${uuidv4().slice(0, 8)}`;

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

  describe('GET /api/v1/users/me', () => {
    it('should return 401 without access token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });

    it('should return current user profile for authenticated user', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'get-me');

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: session.user.email,
        name: session.user.name.toLowerCase(),
        isEmailVerified: true,
      });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('createdAt');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should update profile and normalize name to lowercase', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'update-me');

      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ name: 'New Fancy Name', photoUrl: 'https://cdn.example.com/u.png' })
        .expect(200);

      expect(res.body).toEqual({ message: 'Updated successfully' });

      const me = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(me.body).toMatchObject({
        name: 'new fancy name',
        photoUrl: 'https://cdn.example.com/u.png',
      });
    });

    it('should clear profile photo when photoUrl is an empty string', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'clear-photo');

      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ photoUrl: 'https://cdn.example.com/u.png' })
        .expect(200);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ photoUrl: '' })
        .expect(200);

      const me = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(me.body.photoUrl).toBeNull();
    });

    it('should return 400 when no updatable fields provided', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'update-empty');

      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('PATCH /api/v1/users/me/password', () => {
    it('should update password and invalidate old credentials', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'update-password');
      const newPassword = 'Password2!';

      const updateRes = await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: session.user.password, newPassword })
        .expect(200);

      expect(updateRes.body).toEqual({ message: 'Password updated successfully' });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-device-id', uuidv4())
        .send({ email: session.user.email, password: session.user.password })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-device-id', uuidv4())
        .send({ email: session.user.email, password: newPassword })
        .expect(200);
    });
  });

  describe('DELETE /api/v1/users/me', () => {
    it('should delete current user account', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'delete-me');

      const deleteRes = await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(deleteRes.body).toEqual({ message: 'Removed successfully' });

      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      expect(user).toBeNull();
    });

    it('should block deleted user on next authenticated call', async () => {
      const unique = uuidv4().replace(/-/g, '').slice(0, 10);
      const user = {
        email: `e2e.delete-check.${runId}.${unique}@example.com`,
        password: 'Password1!',
        name: `Delete Check ${unique}`,
      };

      await registerUser(app, user);
      await verifyUserEmail(prisma, user.email);
      const login = await loginUser(app, user);

      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${login.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${login.accessToken}`)
        .expect(404);
    });
  });
});
