import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/services';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { HashingService, PasswordService, TokensService } from '../../src/modules/security/services';
import { UsersService } from '../../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersRepo } from '../../src/modules/users/repo/users-repo';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { ConfigServiceMock, StubAppLogger } from '../__mock__';
import { SessionsService } from '../../src/modules/auth/sessions/services';
import { SessionsPolicy } from '../../src/modules/auth/sessions/services/sessions-polict.service';
import { SessionsRepo } from '../../src/modules/auth/sessions/repo/session-repo';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PasswordService,
        TokensService,
        UsersService,
        JwtService,
        UsersRepo,
        PrismaService,
        SessionsService,
        SessionsPolicy,
        SessionsRepo,
        HashingService,
        { provide: ConfigService, useValue: ConfigServiceMock },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
