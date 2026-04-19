import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RedisConnectionManager } from '../factories/redis-connection.manager';
import { RedisHealth } from '../interfaces';

@ApiTags('redis')
@Controller('redis')
export class HealthController {
  constructor(private redisManager: RedisConnectionManager) {}

  @Get('health')
  @ApiOperation({ summary: 'Redis dependency health check' })
  @ApiOkResponse({
    description: 'Redis connectivity status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'up' },
        error: { type: 'string', nullable: true, example: null },
      },
    },
  })
  async checkRedisHealth(): Promise<RedisHealth> {
    return this.redisManager.healthCheck();
  }
}
