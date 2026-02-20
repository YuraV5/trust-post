import { Test, TestingModule } from '@nestjs/testing';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { UsersRepo } from '../../src/modules/users/repo/users-repo';
import { PasswordService } from '../../src/modules/security/services';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { StubAppLogger } from '../__mock__';
import { UsersService } from '../../src/modules/users/services';
import { EmailQueueService } from '../../src/modules/emails/email-queue.service';
import { LinksService } from '../../src/modules/links/links.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        UsersRepo,
        PasswordService,
        { provide: LinksService, useValue: jest.fn() },
        { provide: EmailQueueService, useValue: jest.fn() },
        { provide: PrismaService, useValue: jest.fn() },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
