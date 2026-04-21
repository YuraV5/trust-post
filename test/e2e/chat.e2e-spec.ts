import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { cleanupRunUsers, createAuthorizedSession } from './helpers/auth-e2e.helper';
import { CHAT_ROUTES } from './constants/routes';
import { createE2EApp } from './helpers/e2e-app.helper';

describe('Chat (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const runId = `chat-${uuidv4().slice(0, 8)}`;

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

  // ─── Create chat ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/chats', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .send({ type: 'PRIVATE', participantIds: [uuidv4()] })
        .expect(401);
    });

    it('should create a private chat between two users', async () => {
      const userA = await createAuthorizedSession(app, prisma, runId, 'private-chat-a');
      const userB = await createAuthorizedSession(app, prisma, runId, 'private-chat-b');

      // Retrieve userB's actual DB id
      const userBRecord = await prisma.user.findUnique({
        where: { email: userB.user.email },
        select: { id: true },
      });

      const res = await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ type: 'PRIVATE', participantIds: [userBRecord!.id] })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should return 400 when private chat has more than one participant', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'private-chat-invalid');

      await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ type: 'PRIVATE', participantIds: [uuidv4(), uuidv4()] })
        .expect(400);
    });

    it('should create a group chat', async () => {
      const creator = await createAuthorizedSession(app, prisma, runId, 'group-chat-creator');
      const member = await createAuthorizedSession(app, prisma, runId, 'group-chat-member');

      const memberRecord = await prisma.user.findUnique({
        where: { email: member.user.email },
        select: { id: true },
      });

      const res = await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .send({
          type: 'GROUP',
          title: 'E2E Group Chat',
          participantIds: [memberRecord!.id],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should create an empty group chat (creator only)', async () => {
      const creator = await createAuthorizedSession(app, prisma, runId, 'group-chat-empty-creator');

      const res = await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .send({
          type: 'GROUP',
          title: 'Empty Group Chat',
          participantIds: [],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should add a verified user to group chat by email', async () => {
      const creator = await createAuthorizedSession(app, prisma, runId, 'group-chat-email-creator');
      const member = await createAuthorizedSession(app, prisma, runId, 'group-chat-email-member');

      const chatRes = await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .send({
          type: 'GROUP',
          title: 'Invite By Email Group',
          participantIds: [],
        })
        .expect(201);

      const addRes = await request(app.getHttpServer())
        .post(CHAT_ROUTES.addMemberByEmail(chatRes.body.id))
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .send({ email: member.user.email })
        .expect(201);

      expect(addRes.body).toHaveProperty('message', 'User added to chat successfully');
      expect(addRes.body.chat).toHaveProperty('id', chatRes.body.id);
    });
  });

  // ─── List chats ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/chats', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get(CHAT_ROUTES.base).expect(401);
    });

    it('should return list of chats for authenticated user', async () => {
      const session = await createAuthorizedSession(app, prisma, runId, 'list-chats');

      const res = await request(app.getHttpServer())
        .get(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Get chat by id ───────────────────────────────────────────────────────────

  describe('GET /api/v1/chats/:chatId', () => {
    it('should return chat details for a chat member', async () => {
      const creator = await createAuthorizedSession(app, prisma, runId, 'get-chat-creator');
      const member = await createAuthorizedSession(app, prisma, runId, 'get-chat-member');

      const memberRecord = await prisma.user.findUnique({
        where: { email: member.user.email },
        select: { id: true },
      });

      const createRes = await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .send({
          type: 'GROUP',
          title: 'Get Chat Test Group',
          participantIds: [memberRecord!.id],
        })
        .expect(201);

      const chatId: string = createRes.body.id;

      const res = await request(app.getHttpServer())
        .get(CHAT_ROUTES.byId(chatId))
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(chatId);
    });

    it('should return 403 when user is not a chat member', async () => {
      const creator = await createAuthorizedSession(app, prisma, runId, 'get-chat-non-member-owner');
      const member = await createAuthorizedSession(app, prisma, runId, 'get-chat-non-member-member');
      const stranger = await createAuthorizedSession(app, prisma, runId, 'get-chat-stranger');

      const memberRecord = await prisma.user.findUnique({
        where: { email: member.user.email },
        select: { id: true },
      });

      const createRes = await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .send({
          type: 'GROUP',
          title: 'Private Group Chat No Stranger',
          participantIds: [memberRecord!.id],
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(CHAT_ROUTES.byId(createRes.body.id))
        .set('Authorization', `Bearer ${stranger.accessToken}`)
        .expect(403);
    });
  });

  // ─── Join / Leave chat ────────────────────────────────────────────────────────

  describe('POST /api/v1/chats/:chatId/join and leave', () => {
    it('should join a group chat then leave it', async () => {
      const creator = await createAuthorizedSession(app, prisma, runId, 'join-leave-creator');
      const joiner = await createAuthorizedSession(app, prisma, runId, 'join-leave-joiner');

      const creatorRecord = await prisma.user.findUnique({
        where: { email: creator.user.email },
        select: { id: true },
      });

      // Create a group chat without the joiner initially
      const createRes = await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .send({ type: 'GROUP', title: 'Join Leave Test Group', participantIds: [creatorRecord!.id] })
        .expect(201);

      const chatId: string = createRes.body.id;

      // Joiner joins the chat
      await request(app.getHttpServer())
        .post(CHAT_ROUTES.join(chatId))
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .expect(201);

      // Joiner leaves the chat
      await request(app.getHttpServer())
        .post(CHAT_ROUTES.leave(chatId))
        .set('Authorization', `Bearer ${joiner.accessToken}`)
        .expect(201);
    });
  });

  // ─── Mark as read ─────────────────────────────────────────────────────────────

  describe('POST /api/v1/chats/:chatId/read', () => {
    it('should mark all messages in a chat as read', async () => {
      const creator = await createAuthorizedSession(app, prisma, runId, 'read-mark-creator');
      const member = await createAuthorizedSession(app, prisma, runId, 'read-mark-member');

      const memberRecord = await prisma.user.findUnique({
        where: { email: member.user.email },
        select: { id: true },
      });

      const createRes = await request(app.getHttpServer())
        .post(CHAT_ROUTES.base)
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .send({
          type: 'GROUP',
          title: 'Read Mark Test Group',
          participantIds: [memberRecord!.id],
        })
        .expect(201);

      const chatId: string = createRes.body.id;

      const res = await request(app.getHttpServer())
        .post(CHAT_ROUTES.read(chatId))
        .set('Authorization', `Bearer ${creator.accessToken}`)
        .expect(201);

      expect(res.body).toEqual({ message: expect.any(String) });
    });
  });
});
