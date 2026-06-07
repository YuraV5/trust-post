#!/usr/bin/env ts-node

/**
 * Seeding script for database initialization
 *
 * Commands:
 * 1. npm run seed:staff                - Create/update only 1 admin + 2 moderators
 * 2. npm run seed:users                - Create staff and regular users
 * 3. npm run seed:posts -- --posts=25  - Create posts with deterministic review statuses
 * 4. npm run seed:comments             - Create comments and likes for seeded posts only
 *
 * Full seed: npm run seed:full -- --posts=25
 */

/* eslint-disable */
import {
  Prisma,
  PrismaClient,
  UserRoles,
  PostStatus,
  Currencies,
  CommentStatus,
  PostReviewStatus,
  FileProvider,
} from '@prisma/client';
import argon2 from 'argon2';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const prisma = new PrismaClient();
const SEED_REFERENCE_PREFIX = 'SEED';
const DEFAULT_REGULAR_USERS_COUNT = 10;
const IMAGES_FILE_PATH_CANDIDATES = [
  resolve(__dirname, 'imgs.json'),
  resolve(process.cwd(), 'tools', 'imgs.json'),
];

const STAFF_USERS = {
  admin: {
    email: 'admin1@mail.com',
    name: 'Admin One',
    role: UserRoles.ADMIN,
  },
  moderators: [
    {
      email: 'moderator1@mail.com',
      name: 'Moderator 1',
      role: UserRoles.MODERATOR,
    },
    {
      email: 'moderator2@mail.com',
      name: 'Moderator 2',
      role: UserRoles.MODERATOR,
    },
  ],
} as const;

type CliOptions = {
  command: string;
  postsCount?: number;
};

// ============== HELPER FUNCTIONS ==============

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

// Generate random text content
function generatePostContent(): string {
  const contents = [
    'I am looking for help to develop a startup in the field of technology.',
    'I need funds for medical treatment. Thank you for your help!',
    'I am raising money for my child"s education abroad.',
    'An environmental conservation project needs funding.',
    'Help implement an art project for the local community.',
    'I need financial support to open a small business.',
    'Target amount for the charitable needs of our rural community.',
    'We are looking for sponsors for a youth sports project.',
  ];
  return contents[Math.floor(Math.random() * contents.length)];
}

function generateCommentContent(): string {
  const comments = [
    'Good initiative! I wish you success!',
    'I support this project. It is very important!',
    'Thank you for this opportunity. What have you achieved?',
    'Excellent work! I hope for positive results.',
    'I am ready to help. How can I join?',
    'This is exactly what we all need.',
    'Thank you for the example. Good luck with your development!',
  ];
  return comments[Math.floor(Math.random() * comments.length)];
}

async function loadSeedImages(): Promise<string[]> {
  for (const filePath of IMAGES_FILE_PATH_CANDIDATES) {
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    } catch {
      continue;
    }
  }

  console.warn('⚠️  Unable to load tools/imgs.json. Posts will be created without images.');
  return [];
}

function pickRandomUniqueItems<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}

function parseCliOptions(argv: string[]): CliOptions {
  const args = argv.filter((arg) => arg !== '--');
  const command = args[0] || 'full';

  let postsCount: number | undefined;
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--posts=')) {
      const value = Number.parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        postsCount = value;
      }
    }
  }

  return { command, postsCount };
}

function mapPostStatusToReviewStatus(status: PostStatus): PostReviewStatus | null {
  switch (status) {
    case PostStatus.PENDING_REVIEW:
      return PostReviewStatus.PENDING;
    case PostStatus.APPROVED:
      return PostReviewStatus.APPROVED;
    case PostStatus.REJECTED:
    case PostStatus.BLOCKED:
      return PostReviewStatus.REJECTED;
    default:
      return null;
  }
}

function getModerationMessage(status: PostStatus): string | null {
  if (status === PostStatus.REJECTED) {
    return 'Post was rejected by moderation rules.';
  }

  if (status === PostStatus.BLOCKED) {
    return 'Post was blocked due to policy violation.';
  }

  return null;
}

async function upsertUser(params: {
  email: string;
  name: string;
  password: string;
  role: UserRoles;
  createdByAdmin: boolean;
}): Promise<void> {
  await prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      password: params.password,
      role: params.role,
      isActive: true,
      isEmailVerified: true,
      createdByAdmin: params.createdByAdmin,
    },
    create: {
      email: params.email,
      name: params.name,
      password: params.password,
      role: params.role,
      isActive: true,
      isEmailVerified: true,
      createdByAdmin: params.createdByAdmin,
    },
  });
}

async function seedStaffUsers() {
  console.log('🌱 Starting staff seeding (1 admin + 2 moderators)...');

  const hashedPassword = await hashPassword('Qwert!123');
  const now = new Date();

  await upsertUser({
    email: STAFF_USERS.admin.email,
    name: STAFF_USERS.admin.name,
    password: hashedPassword,
    role: STAFF_USERS.admin.role,
    createdByAdmin: true,
  });

  for (const moderator of STAFF_USERS.moderators) {
    await upsertUser({
      email: moderator.email,
      name: moderator.name,
      password: hashedPassword,
      role: moderator.role,
      createdByAdmin: true,
    });
  }

  const [admin, moderators] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { email: STAFF_USERS.admin.email },
      select: { id: true, role: true, email: true },
    }),
    prisma.user.findMany({
      where: {
        email: {
          in: STAFF_USERS.moderators.map((moderator) => moderator.email),
        },
      },
      select: { id: true, role: true, email: true },
      orderBy: { email: 'asc' },
    }),
  ]);

  // Keep UserRolePeriod deterministic for staff users only.
  await prisma.$transaction([
    prisma.userRolePeriod.deleteMany({}),
    prisma.userRolePeriod.createMany({
      data: [admin, ...moderators].map((user) => ({
        name: `${user.role} role assignment`,
        userId: user.id,
        role: user.role,
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        changedById: admin.id,
      })),
    }),
  ]);

  console.log('✅ Staff users are ready: 1 admin, 2 moderators');
  console.log('✅ UserRolePeriod reset to exactly 3 records for these users');
}

// ============== COMMAND 1: SEED USERS ==============

async function seedUsers() {
  console.log('🌱 Starting user seeding...');

  try {
    await seedStaffUsers();

    const hashedPassword = await hashPassword('Qwert!123');

    for (let i = 0; i < DEFAULT_REGULAR_USERS_COUNT; i++) {
      await upsertUser({
        email: `user${i + 1}@mail.com`,
        name: `User ${i + 1}`,
        password: hashedPassword,
        role: UserRoles.USER,
        createdByAdmin: false,
      });
    }

    console.log('✅ Successfully created users:');
    console.log('   1 admin');
    console.log('   2 moderators');
    console.log(`   ${DEFAULT_REGULAR_USERS_COUNT} regular users`);
    console.log('\n📝 Sample credentials:');
    console.log('   Admin: admin1@mail.com / Qwert!123');
    console.log('   Moderator: moderator1@mail.com / Qwert!123');
    console.log('   User: user1@mail.com / Qwert!123');
  } catch (error) {
    console.error('❌ User seeding error:', error);
    process.exit(1);
  }
}

// ============== COMMAND 2: SEED POSTS ==============

async function seedPosts(postsCount?: number) {
  console.log('🌱 Starting posts seeding...');

  try {
    const seedImages = await loadSeedImages();

    // Get all regular users
    const users = await prisma.user.findMany({
      where: { role: UserRoles.USER },
    });

    if (users.length === 0) {
      console.log('⚠️  No regular users found. Run: npm run seed:users');
      return;
    }

    // Get only active moderators and use only their ids for post reviews
    const moderators = await prisma.user.findMany({
      where: {
        role: UserRoles.MODERATOR,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
    const moderatorIds = moderators.map((moderator) => moderator.id);

    // Create seed posts with status/review consistency.
    const posts: Prisma.PostCreateManyInput[] = [];
    const now = new Date();
    const statuses = [
      PostStatus.DRAFT,
      PostStatus.PENDING_REVIEW,
      PostStatus.APPROVED,
      PostStatus.REJECTED,
      PostStatus.BLOCKED,
    ];

    const totalPostsTarget = postsCount ?? users.length * 3;

    for (let index = 0; index < totalPostsTarget; index++) {
      const user = users[index % users.length];
      const targetDate = new Date(now.getTime() + Math.random() * 90 * 24 * 60 * 60 * 1000); // 0-90 days in future
      const referencePaymentId = `${SEED_REFERENCE_PREFIX}-${Date.now()}-${index}-${user.id.slice(0, 8)}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const statusReason = getModerationMessage(status);

      posts.push({
        title: `Post "${generatePostContent().substring(0, 50)}..." by ${user.name}`,
        content: generatePostContent(),
        targetAmount: parseFloat((Math.random() * 50000 + 1000).toFixed(2)),
        targetDate,
        status,
        statusReason,
        authorId: user.id,
        currency: Currencies.UAH,
        referencePaymentId,
      });
    }

    const createdPosts = await prisma.post.createMany({
      data: posts,
      skipDuplicates: true,
    });

    // Create 1-3 images per seeded post from tools/imgs.json
    const seededPosts = await prisma.post.findMany({
      where: {
        referencePaymentId: { startsWith: `${SEED_REFERENCE_PREFIX}-` },
      },
      orderBy: { id: 'desc' },
      take: totalPostsTarget,
      select: {
        id: true,
        authorId: true,
      },
    });

    if (seededPosts.length > 0) {
      await prisma.postFile.deleteMany({
        where: {
          postId: {
            in: seededPosts.map((post) => post.id),
          },
        },
      });

      if (seedImages.length > 0) {
        const filesToCreate: Prisma.PostFileCreateManyInput[] = [];

        for (const post of seededPosts) {
          const imageCount = Math.min(Math.floor(Math.random() * 3) + 1, seedImages.length);
          const selectedImages = pickRandomUniqueItems(seedImages, imageCount);

          selectedImages.forEach((url, index) => {
            filesToCreate.push({
              url,
              postId: post.id,
              uploadedById: post.authorId,
              storageKey: `${SEED_REFERENCE_PREFIX.toLowerCase()}-${post.id}-${index + 1}`,
              provider: FileProvider.CLOUDINARY,
              mimeType: 'image/jpeg',
              mainImage: index === 0,
              size: Math.floor(Math.random() * 1_200_000) + 150_000,
              originalName: `seed-image-${post.id}-${index + 1}.jpg`,
              metadata: { source: 'tools/imgs.json' },
            });
          });
        }

        if (filesToCreate.length > 0) {
          await prisma.postFile.createMany({
            data: filesToCreate,
            skipDuplicates: true,
          });
        }
      }
    }

    // Create post reviews
    if (moderatorIds.length > 0) {
      const allPosts = await prisma.post.findMany({
        where: {
          referencePaymentId: { startsWith: `${SEED_REFERENCE_PREFIX}-` },
          status: {
            in: [PostStatus.PENDING_REVIEW, PostStatus.APPROVED, PostStatus.REJECTED, PostStatus.BLOCKED],
          },
        },
        orderBy: { id: 'desc' },
        take: totalPostsTarget,
      });

      console.log(`✅ Successfully created ${createdPosts.count} posts`);
      console.log(`   Creating ${allPosts.length} post reviews...`);

      // One review per post to keep post/review status mapping deterministic.
      for (const post of allPosts) {
        const reviewStatus = mapPostStatusToReviewStatus(post.status);
        if (!reviewStatus) {
          continue;
        }

        const reviewerId = moderatorIds[Math.floor(Math.random() * moderatorIds.length)];
        const moderationMessage = getModerationMessage(post.status);

        await prisma.postReview.create({
          data: {
            postId: post.id,
            reviewedById: reviewerId,
            status: reviewStatus,
            reviewReason: moderationMessage ?? undefined,
          },
        });
      }

      console.log(`   ✅ Post reviews created`);
    } else {
      console.log('⚠️  No active moderators found. Post reviews were not created.');
    }
  } catch (error) {
    console.error('❌ Posts seeding error:', error);
    process.exit(1);
  }
}

// ============== COMMAND 3: SEED COMMENTS & LIKES ==============

async function seedCommentsAndLikes() {
  console.log('🌱 Starting comments and likes seeding...');

  try {
    // Get only seed posts to avoid changing non-seed data.
    const posts = await prisma.post.findMany({
      where: {
        status: PostStatus.APPROVED,
        referencePaymentId: { startsWith: `${SEED_REFERENCE_PREFIX}-` },
      },
    });

    if (posts.length === 0) {
      console.log('⚠️  No posts found. Run: npm run seed:posts');
      return;
    }

    // Get all users
    const users = await prisma.user.findMany({
      where: { role: UserRoles.USER },
    });

    // Create comments for each post
    let commentCount = 0;
    let totalCommentLikes = 0;
    let postLikesCount = 0;

    const seedPostIds = posts.map((post) => post.id);

    if (seedPostIds.length > 0) {
      await prisma.$transaction([
        prisma.commentLike.deleteMany({
          where: {
            comment: {
              postId: {
                in: seedPostIds,
              },
            },
          },
        }),
        prisma.comment.deleteMany({
          where: {
            postId: {
              in: seedPostIds,
            },
          },
        }),
        prisma.postLike.deleteMany({
          where: {
            postId: {
              in: seedPostIds,
            },
          },
        }),
      ]);
    }

    for (const post of posts) {
      // 3-7 comments per post
      const commentCount_ = Math.floor(Math.random() * 5) + 3;

      for (let i = 0; i < commentCount_; i++) {
        // Pick random user (not the post author)
        let randomUser = users[Math.floor(Math.random() * users.length)];
        while (randomUser.id === post.authorId && users.length > 1) {
          randomUser = users[Math.floor(Math.random() * users.length)];
        }

        const comment = await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: randomUser.id,
            content: generateCommentContent(),
            status: CommentStatus.APPROVED,
          },
        });

        commentCount++;

        // 0-3 likes per comment
        const likeCount = Math.floor(Math.random() * 4);
        const likerIds = new Set<string>();

        for (let j = 0; j < likeCount; j++) {
          let liker = users[Math.floor(Math.random() * users.length)];
          while (likerIds.has(liker.id)) {
            liker = users[Math.floor(Math.random() * users.length)];
          }
          likerIds.add(liker.id);
        }

        const createdCommentLikes = await prisma.commentLike.createMany({
          data: Array.from(likerIds).map((likerId) => ({
            commentId: comment.id,
            userId: likerId,
          })),
          skipDuplicates: true,
        });
        totalCommentLikes += createdCommentLikes.count;

        // Update comment total likes
        await prisma.comment.update({
          where: { id: comment.id },
          data: { totalLikes: createdCommentLikes.count },
        });
      }

      // 1-8 likes per post
      const postLikeCount = Math.floor(Math.random() * 8) + 1;
      const postLikerIds = new Set<string>();

      for (let j = 0; j < postLikeCount; j++) {
        let liker = users[Math.floor(Math.random() * users.length)];
        while (postLikerIds.has(liker.id)) {
          liker = users[Math.floor(Math.random() * users.length)];
        }
        postLikerIds.add(liker.id);
      }

      const createdPostLikes = await prisma.postLike.createMany({
        data: Array.from(postLikerIds).map((likerId) => ({
          postId: post.id,
          userId: likerId,
        })),
        skipDuplicates: true,
      });
      postLikesCount += createdPostLikes.count;

      // Update post stats
      await prisma.post.update({
        where: { id: post.id },
        data: {
          totalComments: commentCount_,
          totalLikes: createdPostLikes.count,
        },
      });
    }

    console.log('✅ Successfully created comments and likes:');
    console.log(`   ${commentCount} comments`);
    console.log(`   ${totalCommentLikes} comment likes`);
    console.log(`   ${postLikesCount} post likes`);
  } catch (error) {
    console.error('❌ Comments and likes seeding error:', error);
    process.exit(1);
  }
}

// ============== MAIN ==============

async function main() {
  const { command, postsCount } = parseCliOptions(process.argv.slice(2));

  try {
    switch (command) {
      case 'staff':
        await seedStaffUsers();
        break;

      case 'users':
        await seedUsers();
        break;

      case 'posts':
        await seedPosts(postsCount);
        break;

      case 'comments':
        await seedCommentsAndLikes();
        break;

      case 'full':
        await seedUsers();
        await seedPosts(postsCount);
        await seedCommentsAndLikes();
        break;

      default:
        console.log(
          'Usage: npm run seed:[staff|users|posts|comments|full] -- --posts=25',
        );
        console.log('');
        console.log('Commands:');
        console.log('  staff     - Create/update only 1 admin and 2 moderators');
        console.log('  users     - Create admins, moderators, and regular users');
        console.log('  posts     - Create posts with reviews from moderators');
        console.log('  comments  - Create comments and likes for posts');
        console.log('  full      - Run all commands in sequence');
    }
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
