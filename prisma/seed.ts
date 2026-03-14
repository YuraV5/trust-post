// eslint-disable-next-line import/no-extraneous-dependencies
import { PrismaClient, UserRoles } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

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
     await prisma.user.createMany({
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
        {
          email: 'user@com.com',
          name: 'user',
          password: hashedPassword,
          role: UserRoles.USER,
          isActive: true,
          isEmailVerified: true,
          createdByAdmin: true,
        }
      ],
    });

    console.log('✅ Admin and Moderator users created successfully');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
