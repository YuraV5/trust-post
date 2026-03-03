#!/usr/bin/env ts-node

/**
 * Manual seeding script for creating admin and moderator users
 * Run with: npm run seed:admin
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { PrismaClient, UserRoles } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('🌱 Starting manual seed...');

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@mail.com' },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Hash the password
    const hashedPassword = await argon2.hash('Qwert!123', {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });

    // Create admin and moderator users
    const createdUsers = await prisma.user.createMany({
      data: [
        {
          email: 'admin@mail.com',
          name: 'admin',
          password: hashedPassword,
          role: UserRoles.ADMIN,
          isActive: true,
          isEmailVerified: true,
          createdByAdmin: true,
        },
        {
          email: 'moderator@mail.com',
          name: 'moderator',
          password: hashedPassword,
          role: UserRoles.MODERATOR,
          isActive: true,
          isEmailVerified: true,
          createdByAdmin: true,
        },
      ],
    });

    console.log(
      `✅ Successfully created ${createdUsers.count} users (admin and moderator)`,
    );
    console.log('\n📝 Default credentials:');
    console.log('   Admin: admin@mail.com / Qwert!123');
    console.log('   Moderator: moderator@mail.com / Qwert!123');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
