#!/usr/bin/env ts-node

/**
 * Seeding script for database initialization
 *
 * Commands:
 * 1. npm run seed:users    - Create admins, moderators, and regular users
 * 2. npm run seed:posts    - Create posts with reviews and different statuses
 * 3. npm run seed:comments - Create comments and likes for posts
 *
 * Full seed: npm run seed:full
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Prisma,
  PrismaClient,
  UserRoles,
  PostStatus,
  Currencies,
  CommentStatus,
  PostReviewStatus,
} from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

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
    'Шукаю допомогу на розвиток стартапу в сфері технологій.',
    'Потрібні кошти для медичного лікування. Дякую за допомогу!',
    'Збираю гроші на освіту моєї дитини за кордоном.',
    'Проєкт по збереженню довкілля потребує фінансування.',
    'Допоможіть реалізувати художній проєкт місцевої громади.',
    'Потрібна фінансова підтримка для відкриття малого бізнесу.',
    'Цільова сума на благодійні потреби нашої сільської громади.',
    'Шукаємо спонсорів для молодіжного спортивного проєкту.',
  ];
  return contents[Math.floor(Math.random() * contents.length)];
}

function generateCommentContent(): string {
  const comments = [
    'Гарна ініціатива! Бажаю успіхів!',
    'Підтримую цей проєкт. Це дуже важливо!',
    'Дякую за цю можливість. Чого вам вдалося?',
    'Відмінна робота! Сподіваюся на позитивні результати.',
    'Я готовий допомогти. Як мені приєднатися?',
    'Це саме те, що нам всім потрібно.',
    'Дякую за приклад. Вдалого вам розвитку!',
  ];
  return comments[Math.floor(Math.random() * comments.length)];
}

// ============== COMMAND 1: SEED USERS ==============

async function seedUsers() {
  console.log('🌱 Starting user seeding...');

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: UserRoles.ADMIN },
    });

    if (existingAdmin) {
      console.log('✅ Admin users already exist');
      return;
    }

    const hashedPassword = await hashPassword('Qwert!123');
    const now = new Date();

    // Create admins (2)
    const admins = await prisma.user.createMany({
      data: [
        {
          email: 'admin1@mail.com',
          name: 'Admin One',
          password: hashedPassword,
          role: UserRoles.ADMIN,
          isActive: true,
          isEmailVerified: true,
          createdByAdmin: true,
        },
        {
          email: 'admin2@mail.com',
          name: 'Admin Two',
          password: hashedPassword,
          role: UserRoles.ADMIN,
          isActive: true,
          isEmailVerified: true,
          createdByAdmin: true,
        },
      ],
    });

    // Create moderators (5)
    const moderators = await prisma.user.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        email: `moderator${i + 1}@mail.com`,
        name: `Moderator ${i + 1}`,
        password: hashedPassword,
        role: UserRoles.MODERATOR,
        isActive: true,
        isEmailVerified: true,
        createdByAdmin: true,
      })),
    });

    // Create regular users (10)
    const regularUsers = await prisma.user.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        email: `user${i + 1}@mail.com`,
        name: `User ${i + 1}`,
        password: hashedPassword,
        role: UserRoles.USER,
        isActive: true,
        isEmailVerified: true,
        createdByAdmin: false,
      })),
    });

    // Create UserRolePeriod entries to track when roles were assigned
    const allUsers = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRoles.ADMIN, UserRoles.MODERATOR],
        },
      },
    });

    await prisma.userRolePeriod.createMany({
      data: allUsers.map((user) => ({
        name: `${user.role} role assignment`,
        userId: user.id,
        role: user.role,
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        changedById: user.id, // Self-assigned or system admin
      })),
    });

    console.log('✅ Successfully created users:');
    console.log(`   ${admins.count} admins`);
    console.log(`   ${moderators.count} moderators`);
    console.log(`   ${regularUsers.count} regular users`);
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

async function seedPosts() {
  console.log('🌱 Starting posts seeding...');

  try {
    // Get all regular users
    const users = await prisma.user.findMany({
      where: { role: UserRoles.USER },
    });

    if (users.length === 0) {
      console.log('⚠️  No regular users found. Run: npm run seed:users');
      return;
    }

    // Get moderators for post reviews
    const moderators = await prisma.user.findMany({
      where: { role: UserRoles.MODERATOR },
    });

    // Create 2-3 posts per user with different statuses
    const posts: Prisma.PostCreateManyInput[] = [];
    const now = new Date();
    const statuses = [PostStatus.DRAFT, PostStatus.PENDING_REVIEW, PostStatus.APPROVED, PostStatus.REJECTED];

    for (const user of users) {
      const postCount = Math.floor(Math.random() * 2) + 2; // 2-3 posts per user

      for (let i = 0; i < postCount; i++) {
        const targetDate = new Date(now.getTime() + Math.random() * 90 * 24 * 60 * 60 * 1000); // 0-90 days in future
        const referencePaymentId = `REF-${user.id}-${i}-${Date.now()}`;
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        posts.push({
          title: `Post "${generatePostContent().substring(0, 50)}..." by ${user.name}`,
          content: generatePostContent(),
          targetAmount: parseFloat((Math.random() * 50000 + 1000).toFixed(2)),
          targetDate,
          status,
          authorId: user.id,
          currency: Currencies.UAH,
          referencePaymentId,
        });
      }
    }

    const createdPosts = await prisma.post.createMany({
      data: posts,
    });

    // Create post reviews
    if (moderators.length > 0) {
      const allPosts = await prisma.post.findMany({
        where: { status: { in: [PostStatus.PENDING_REVIEW, PostStatus.APPROVED, PostStatus.REJECTED] } },
      });

      console.log(`✅ Successfully created ${createdPosts.count} posts`);
      console.log(`   Creating ${allPosts.length} post reviews...`);

      // Each post gets 1-3 reviews from different moderators
      for (const post of allPosts) {
        const reviewCount = Math.floor(Math.random() * 3) + 1; // 1-3 reviews
        const usedModerators = new Set<string>();

        for (let j = 0; j < reviewCount; j++) {
          let moderator = moderators[Math.floor(Math.random() * moderators.length)];
          while (usedModerators.has(moderator.id) && moderators.length > 1) {
            moderator = moderators[Math.floor(Math.random() * moderators.length)];
          }
          usedModerators.add(moderator.id);

          const reviewStatuses = [PostReviewStatus.PENDING, PostReviewStatus.APPROVED, PostReviewStatus.REJECTED];
          const reviewStatus = reviewStatuses[Math.floor(Math.random() * reviewStatuses.length)];

          await prisma.postReview.create({
            data: {
              postId: post.id,
              reviewedById: moderator.id,
              status: reviewStatus,
              reviewReason: reviewStatus === PostReviewStatus.REJECTED ? 'Content does not meet guidelines' : undefined,
            },
          });
        }
      }

      console.log(`   ✅ Post reviews created`);
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
    // Get all posts
    const posts = await prisma.post.findMany({
      where: { status: PostStatus.APPROVED },
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
            status: CommentStatus.VISIBLE,
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

          await prisma.commentLike.create({
            data: {
              commentId: comment.id,
              userId: liker.id,
            },
          });

          totalCommentLikes++;
        }

        // Update comment total likes
        await prisma.comment.update({
          where: { id: comment.id },
          data: { totalLikes: likeCount },
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

        await prisma.postLike.create({
          data: {
            postId: post.id,
            userId: liker.id,
          },
        });

        postLikesCount++;
      }

      // Update post stats
      await prisma.post.update({
        where: { id: post.id },
        data: {
          totalComments: commentCount_,
          totalLikes: postLikeCount,
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
  const command = process.argv
    .slice(2)
    .find((arg) => arg !== '--') || 'full';

  try {
    switch (command) {
      case 'users':
        await seedUsers();
        break;

      case 'posts':
        await seedPosts();
        break;

      case 'comments':
        await seedCommentsAndLikes();
        break;

      case 'full':
        await seedUsers();
        await seedPosts();
        await seedCommentsAndLikes();
        break;

      default:
        console.log(
          'Usage: npm run seed:[users|posts|comments|full]',
        );
        console.log('');
        console.log('Commands:');
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
