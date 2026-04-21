import { INestApplication } from '@nestjs/common';
import { PostStatus, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { cleanupRunUsers, createAuthorizedSession } from './helpers/auth-e2e.helper';
import { POST_ROUTES } from './constants/routes';
import { approvePost, buildPostPayload, cleanupRunPosts, createPost } from './helpers/posts-e2e.helper';
import { createE2EApp } from './helpers/e2e-app.helper';

describe('Posts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const runId = `posts-${uuidv4().slice(0, 8)}`;

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

  // ─── Public listing ──────────────────────────────────────────────────────────

  describe('GET /api/v1/posts', () => {
    it('should return paginated list without auth', async () => {
      const res = await request(app.getHttpServer()).get(`${POST_ROUTES.base}?limit=100`).expect(200);

      // Response always has pagination shape
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should include an approved post in the list', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'list-posts');
      const post = await createPost(app, session.accessToken);
      // Bypass review queue — set status directly in DB
      await approvePost(prisma, post.id);

      const res = await request(app.getHttpServer()).get(POST_ROUTES.base).expect(200);

      const found = res.body.data.find((p: { id: number }) => p.id === post.id);
      expect(found).toBeDefined();
    });

    it('should filter posts by search query matching title', async () => {
      const uniqueWord = `search-${uuidv4().slice(0, 8)}`;
      const session = await createAuthorizedSession(app, prisma, runId, 'search-title');
      const post = await createPost(app, session.accessToken, {
        title: `${uniqueWord} Test Post Title Here`,
        content: 'This is the e2e test post content with enough characters to pass validation checks.',
      });
      await approvePost(prisma, post.id);

      const res = await request(app.getHttpServer())
        .get(`${POST_ROUTES.base}?search=${uniqueWord}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      const found = res.body.data.find((p: { id: number }) => p.id === post.id);
      expect(found).toBeDefined();
    });

    it('should not return non-matching posts when searching', async () => {
      const res = await request(app.getHttpServer())
        .get(`${POST_ROUTES.base}?search=xyzzy-no-match-${uuidv4()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  // ─── Get by ID ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/posts/:id', () => {
    it('should return 404 for non-existent post', async () => {
      await request(app.getHttpServer()).get(POST_ROUTES.byId(999999999)).expect(404);
    });

    it('should return post by id', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'get-by-id');
      const post = await createPost(app, session.accessToken);
      await approvePost(prisma, post.id);

      const res = await request(app.getHttpServer()).get(POST_ROUTES.byId(post.id)).expect(200);

      expect(res.body.id).toBe(post.id);
      expect(res.body.title).toBe(post.title);
    });
  });

  // ─── Create post ─────────────────────────────────────────────────────────────

  describe('POST /api/v1/posts', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post(POST_ROUTES.base)
        .set('idempotency-key', uuidv4())
        .send(buildPostPayload())
        .expect(401);
    });

    it('should create post even when idempotency-key header is missing', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'create-no-idempotency');

      const res = await request(app.getHttpServer())
        .post(POST_ROUTES.base)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send(buildPostPayload())
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should return 400 when payload is invalid (title too short)', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'create-invalid');

      await request(app.getHttpServer())
        .post(POST_ROUTES.base)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('idempotency-key', uuidv4())
        .send(buildPostPayload({ title: 'Short' }))
        .expect(400);
    });

    it('should create a post and return 201 with the post body', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'create-ok');
      const payload = buildPostPayload();

      const res = await request(app.getHttpServer())
        .post(POST_ROUTES.base)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('idempotency-key', uuidv4())
        .send(payload)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(payload.title);
    });
  });

  // ─── List own posts ───────────────────────────────────────────────────────────

  describe('GET /api/v1/posts/my', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get(POST_ROUTES.my).expect(401);
    });

    it('should return own posts', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'my-posts');
      const createdPost = await createPost(app, session.accessToken);

      const res = await request(app.getHttpServer())
        .get(POST_ROUTES.my)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      // Created post should be present in current user's list
      expect(res.body.data.some((p: { id: number }) => p.id === createdPost.id)).toBe(true);
    });
  });

  // ─── Update post ──────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/posts/:id', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).patch(POST_ROUTES.byId(1)).send({ title: 'New Title Here Ok' }).expect(401);
    });

    it('should update post title', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'update-post');
      const post = await createPost(app, session.accessToken);
      const newTitle = 'Updated Post Title For Test';

      const res = await request(app.getHttpServer())
        .patch(POST_ROUTES.byId(post.id))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ title: newTitle })
        .expect(200);

      expect(res.body).toEqual({ message: expect.any(String) });
    });
  });

  // ─── Archive post (status change) ────────────────────────────────────────────

  describe('PATCH /api/v1/posts/:id/status', () => {
    it('should archive own post', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'archive-post');
      const post = await createPost(app, session.accessToken);

      const res = await request(app.getHttpServer())
        .patch(POST_ROUTES.status(post.id))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ status: 'ARCHIVED', statusReason: 'No longer needed after testing' })
        .expect(200);

      expect(res.body).toEqual({ message: expect.any(String) });
    });

    it('should return 403 when another user tries to change post status', async () => {
      const owner = await createAuthorizedSession(app, prisma, runId, 'status-owner');
      const other = await createAuthorizedSession(app, prisma, runId, 'status-other');
      const post = await createPost(app, owner.accessToken);

      await request(app.getHttpServer())
        .patch(POST_ROUTES.status(post.id))
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ status: 'ARCHIVED', statusReason: 'Unauthorized attempt to archive' })
        .expect(403);
    });
  });

  // ─── Like post ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/posts/:id/like', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).post(POST_ROUTES.like(1)).expect(401);
    });

    it('should toggle like on a post', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'like-post');
      const post = await createPost(app, session.accessToken);
      await approvePost(prisma, post.id);

      const res = await request(app.getHttpServer())
        .post(POST_ROUTES.like(post.id))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      // Returns liked: true on first like, false on unlike
      expect(res.body).toHaveProperty('liked');
    });
  });

  // ─── Delete post ──────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/posts/:id', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).delete(POST_ROUTES.byId(1)).expect(401);
    });

    it('should delete own post', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'delete-post');
      const post = await createPost(app, session.accessToken);

      await request(app.getHttpServer())
        .delete(POST_ROUTES.byId(post.id))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ statusReason: 'Removing test post' })
        .expect(200);

      // User delete is a soft-delete: post is archived
      const archived = await prisma.post.findUnique({
        where: { id: post.id },
        select: { status: true, deletedAt: true },
      });
      expect(archived?.status).toBe(PostStatus.ARCHIVED);
      expect(archived?.deletedAt).toBeTruthy();
    });

    it('should return 403 when another user tries to delete the post', async () => {
      const owner = await createAuthorizedSession(app, prisma, runId, 'delete-owner');
      const other = await createAuthorizedSession(app, prisma, runId, 'delete-other');
      const post = await createPost(app, owner.accessToken);

      await request(app.getHttpServer())
        .delete(POST_ROUTES.byId(post.id))
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ statusReason: 'Trying to remove someone else post' })
        .expect(403);
    });
  });
});
