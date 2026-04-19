import { INestApplication } from '@nestjs/common';
import { PostStatus, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { POST_ROUTES } from '../constants/routes';

export type CreatedPost = {
  id: number;
  title: string;
  status: string;
};

// Valid post payload that passes all validation rules
export const buildPostPayload = (overrides: Partial<{
  title: string;
  content: string;
  targetAmount: number;
  targetDate: string;
}> = {}) => ({
  title: overrides.title ?? 'E2E Test Post Title Here',
  content: overrides.content ?? 'This is the e2e test post content with enough characters to pass validation checks.',
  targetAmount: overrides.targetAmount ?? 1000,
  targetDate: overrides.targetDate ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
});

// Creates a post via the API and returns the created post body
export const createPost = async (
  app: INestApplication,
  accessToken: string,
  overrides: Parameters<typeof buildPostPayload>[0] = {},
): Promise<CreatedPost> => {
  const res = await request(app.getHttpServer())
    .post(POST_ROUTES.base)
    .set('Authorization', `Bearer ${accessToken}`)
    .set('idempotency-key', uuidv4())
    .send(buildPostPayload(overrides))
    .expect(201);

  return { id: res.body.id, title: res.body.title, status: res.body.status };
};

// Sets post status directly in DB — used to make a post APPROVED for public listing tests
export const approvePost = async (prisma: PrismaClient, postId: number): Promise<void> => {
  await prisma.post.update({
    where: { id: postId },
    data: { status: PostStatus.APPROVED },
  });
};

// Deletes all posts owned by test users created within a runId
export const cleanupRunPosts = async (prisma: PrismaClient, runId: string): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { email: { contains: `.${runId}.` } },
    select: { id: true },
  });

  if (users.length === 0) return;

  const userIds = users.map((u) => u.id);
  await prisma.post.deleteMany({ where: { authorId: { in: userIds } } });
};
