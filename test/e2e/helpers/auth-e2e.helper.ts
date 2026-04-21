import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

export type E2ETestUser = {
  email: string;
  password: string;
  name: string;
};

export type AuthSession = {
  user: E2ETestUser;
  accessToken: string;
  cookies: string[];
  deviceId: string;
};

export const buildE2ETestUser = (runId: string, label: string): E2ETestUser => {
  const unique = uuidv4().replace(/-/g, '').slice(0, 12);

  return {
    email: `e2e.${label}.${runId}.${unique}@example.com`,
    password: 'Password1!',
    name: `E2E ${label} ${unique}`,
  };
};

export const registerUser = async (app: INestApplication, user: E2ETestUser): Promise<void> => {
  await request(app.getHttpServer()).post('/api/v1/auth/register').send(user).expect(201);
};

export const verifyUserEmail = async (prisma: PrismaClient, email: string): Promise<void> => {
  await prisma.user.update({
    where: { email },
    data: { isEmailVerified: true },
  });
};

export const loginUser = async (
  app: INestApplication,
  creds: Pick<E2ETestUser, 'email' | 'password'>,
  deviceId = uuidv4(),
): Promise<{ accessToken: string; cookies: string[]; deviceId: string }> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('x-device-id', deviceId)
    .send({ email: creds.email, password: creds.password })
    .expect(200);

  return {
    accessToken: res.body.accessToken,
    cookies: (res.headers['set-cookie'] as unknown as string[]) ?? [],
    deviceId,
  };
};

export const createAuthorizedSession = async (
  app: INestApplication,
  prisma: PrismaClient,
  runId: string,
  label: string,
): Promise<AuthSession> => {
  const user = buildE2ETestUser(runId, label);

  await registerUser(app, user);
  await verifyUserEmail(prisma, user.email);

  const session = await loginUser(app, user);

  return {
    user,
    accessToken: session.accessToken,
    cookies: session.cookies,
    deviceId: session.deviceId,
  };
};

export const cleanupRunUsers = async (prisma: PrismaClient, runId: string): Promise<void> => {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: `.${runId}.`,
      },
    },
    select: { id: true },
  });

  if (users.length === 0) {
    return;
  }

  const userIds = users.map((u) => u.id);

  await prisma.session.deleteMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds,
      },
    },
  });
};
