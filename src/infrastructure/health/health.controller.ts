import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckError, HealthCheckService } from '@nestjs/terminus';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicRoute } from '../../common/decorators';
import { PrismaService } from '../../modules/prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
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
  check(): ReturnType<HealthCheckService['check']> {
    return this.health.check([
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;

          return {
            database: {
              status: 'up',
            },
          };
        } catch {
          throw new HealthCheckError('Database check failed', {
            database: {
              status: 'down',
            },
          });
        }
      },
    ]);
  }
}
