import { INestApplication } from '@nestjs/common';
import { CommentStatus, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { cleanupRunUsers, createAuthorizedSession } from './helpers/auth-e2e.helper';
import { POST_ROUTES, COMMENT_ROUTES } from './constants/routes';
import { approvePost, cleanupRunPosts, createPost } from './helpers/posts-e2e.helper';
import { createE2EApp } from './helpers/e2e-app.helper';

describe('Comments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const runId = `comments-${uuidv4().slice(0, 8)}`;

  const resolveUserId = async (email: string): Promise<string> => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return user!.id;
  };

  const createCommentAndGetId = async (
    accessToken: string,
    authorEmail: string,
    postId: number,
    content: string,
  ): Promise<number> => {
    await request(app.getHttpServer())
      .post(POST_ROUTES.comments(postId))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content })
      .expect(201);

    const authorId = await resolveUserId(authorEmail);
    const comment = await prisma.comment.findFirst({
      where: { postId, authorId, content },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    return comment!.id;
  };

  beforeAll(async () => {
    app = await createE2EApp();

    prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    await cleanupRunPosts(prisma, runId);
    await cleanupRunUsers(prisma, runId);
    await prisma.$disconnect();
    await app.close();
  });

  // ─── Create comment ───────────────────────────────────────────────────────────

  describe('POST /api/v1/posts/:postId/comments', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post(POST_ROUTES.comments(1))
        .send({ content: 'Test comment content here' })
        .expect(401);
    });

    it('should create a comment on an existing post', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'create-comment');
      const post = await createPost(app, session.accessToken);
      await approvePost(prisma, post.id);

      const content = 'This is my e2e test comment, it is long enough.';
      const commentId = await createCommentAndGetId(session.accessToken, session.user.email, post.id, content);

      expect(commentId).toBeGreaterThan(0);
    });

    it('should return 400 when comment content is empty', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'empty-comment');
      const post = await createPost(app, session.accessToken);
      await approvePost(prisma, post.id);

      await request(app.getHttpServer())
        .post(POST_ROUTES.comments(post.id))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ content: '' })
        .expect(400);
    });
  });

  // ─── List comments ────────────────────────────────────────────────────────────

  describe('GET /api/v1/posts/:postId/comments', () => {
    it('should return comments without auth (public route)', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'list-comments');
      const post = await createPost(app, session.accessToken);
      await approvePost(prisma, post.id);

      // Add a comment so we have something to list
      const content = 'Comment for listing test, enough content here.';
      const commentId = await createCommentAndGetId(session.accessToken, session.user.email, post.id, content);

      // In e2e we mock queue workers, so moderation does not run automatically.
      await prisma.comment.update({
        where: { id: commentId },
        data: { status: CommentStatus.APPROVED },
      });

      const res = await request(app.getHttpServer()).get(POST_ROUTES.comments(post.id)).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('total');
      expect(res.body.data.some((c: { id: number }) => c.id === commentId)).toBe(true);
      expect(commentId).toBeGreaterThan(0);
    });
  });

  // ─── Update comment ───────────────────────────────────────────────────────────

  describe('PATCH /api/v1/comments/:id', () => {
    it('should update own comment', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'update-comment');
      const post = await createPost(app, session.accessToken);
      await approvePost(prisma, post.id);

      const commentId = await createCommentAndGetId(
        session.accessToken,
        session.user.email,
        post.id,
        'Original comment content for update test.',
      );

      const res = await request(app.getHttpServer())
        .patch(COMMENT_ROUTES.byId(commentId))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ content: 'Updated comment content for the e2e test.' })
        .expect(200);

      expect(res.body).toEqual({ message: expect.any(String) });
    });

    it('should return 403 when another user tries to update the comment', async () => {
      const owner = await createAuthorizedSession(app, prisma, runId, 'update-comment-owner');
      const other = await createAuthorizedSession(app, prisma, runId, 'update-comment-other');
      const post = await createPost(app, owner.accessToken);
      await approvePost(prisma, post.id);

      const commentId = await createCommentAndGetId(
        owner.accessToken,
        owner.user.email,
        post.id,
        'Comment that only the owner should update.',
      );

      await request(app.getHttpServer())
        .patch(COMMENT_ROUTES.byId(commentId))
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ content: 'Unauthorized update attempt for comment test.' })
        .expect(403);
    });
  });

  // ─── Like comment ─────────────────────────────────────────────────────────────

  describe('POST /api/v1/comments/:id/like', () => {
    it('should toggle like on a comment', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'like-comment');
      const post = await createPost(app, session.accessToken);
      await approvePost(prisma, post.id);

      const commentId = await createCommentAndGetId(
        session.accessToken,
        session.user.email,
        post.id,
        'Comment to be liked in e2e test run here.',
      );

      const res = await request(app.getHttpServer())
        .post(COMMENT_ROUTES.like(commentId))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('liked');
    });
  });

  // ─── Delete comment ───────────────────────────────────────────────────────────

  describe('DELETE /api/v1/comments/:id', () => {
    it('should delete own comment', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'delete-comment');
      const post = await createPost(app, session.accessToken);
      await approvePost(prisma, post.id);

      const commentId = await createCommentAndGetId(
        session.accessToken,
        session.user.email,
        post.id,
        'Comment to be deleted in the e2e test run.',
      );

      const res = await request(app.getHttpServer())
        .delete(COMMENT_ROUTES.byId(commentId))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body).toEqual({ message: expect.any(String) });
    });

    it('should return 403 when another user tries to delete the comment', async () => {
      const owner = await createAuthorizedSession(app, prisma, runId, 'delete-comment-owner');
      const other = await createAuthorizedSession(app, prisma, runId, 'delete-comment-other');
      const post = await createPost(app, owner.accessToken);
      await approvePost(prisma, post.id);

      const commentId = await createCommentAndGetId(
        owner.accessToken,
        owner.user.email,
        post.id,
        'Comment that only the owner should delete here.',
      );

      await request(app.getHttpServer())
        .delete(COMMENT_ROUTES.byId(commentId))
        .set('Authorization', `Bearer ${other.accessToken}`)
        .expect(403);
    });
  });
});
