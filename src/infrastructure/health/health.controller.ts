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

type LivenessResponse = {
  status: 'ok';
};

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisConnectionManager,
  ) {}

  /** Liveness — process is alive, no external dependency checks. */
  @Get('liveness')
  @PublicRoute()
  @ApiOperation({ summary: 'Liveness check — confirms the process is running' })
  @ApiOkResponse({
    description: 'Process is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  liveness(): LivenessResponse {
    return { status: 'ok' };
  }

  /** Readiness — verifies all external dependencies are reachable. */
  @Get('readiness')
  @PublicRoute()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check — verifies database and redis connectivity' })
  @ApiOkResponse({
    description: 'Service is ready to accept traffic',
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
  async readiness(): Promise<HealthResponse> {
    return this.runDependencyChecks();
  }

  /**
   * @deprecated Use GET /health/readiness instead.
   * Kept for backward compatibility.
   */
  @Get()
  @PublicRoute()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check (deprecated — use /health/readiness)' })
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
    return this.runDependencyChecks();
  }

  private async runDependencyChecks(): Promise<HealthResponse> {
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
