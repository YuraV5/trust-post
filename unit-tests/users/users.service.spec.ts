import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/modules/users/users.service';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { MockAppLogger } from '../mock/logger.mock';
import { UsersRepo } from '../../src/modules/users/repo/users-repo';
import { PasswordService } from '../../src/modules/security/services';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        UsersRepo,
        PasswordService,
        { provide: PrismaService, useValue: jest.fn() },
        { provide: APP_LOGGER, useValue: MockAppLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
