import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../src/modules/auth/sessions/services/sessions.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { StubAppLogger } from '../__mock__';
import { SessionsRepo } from '../../src/modules/auth/sessions/repo/session-repo';

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        SessionsRepo,
        { provide: PrismaService, useValue: jest.fn() },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
