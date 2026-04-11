import { Controller, Get } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicRoute } from '../../common/decorators';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { RedisConnectionManager } from '../../modules/cache/factories/redis-connection.manager';
import { AppServiceUnavailableException } from '../../shared/errors/app-errors';

type HealthSection = {
  status: 'up' | 'down';
  error?: string;
};

type HealthResponse = {
  status: 'ok';
  info: {
    database: HealthSection;
    redis: HealthSection;
  };
  error: Record<string, never>;
  details: {
    database: HealthSection;
    redis: HealthSection;
  };
};

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisConnectionManager,
  ) {}

  @Get()
  @PublicRoute()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object', example: {} },
        error: { type: 'object', example: {} },
        details: { type: 'object', example: {} },
      },
    },
  })
  async check(): Promise<HealthResponse> {
    const details: HealthResponse['details'] = {
      database: { status: 'up' },
      redis: { status: 'up' },
    };

    const errors: string[] = [];

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      details.database = { status: 'down', error: 'Database check failed' };
      errors.push('Database check failed');
    }

    const redisHealth = await this.redis.healthCheck();
    if (redisHealth.status !== 'up') {
      details.redis = { status: 'down', error: redisHealth.error ?? 'Redis check failed' };
      errors.push('Redis check failed');
    }

    if (errors.length > 0) {
      throw new AppServiceUnavailableException('Health check failed', errors);
    }

    return {
      status: 'ok',
      info: {
        database: details.database,
        redis: details.redis,
      },
      error: {},
      details,
    };
  }
}
