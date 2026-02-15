import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { RedisConnectionManager } from '../factories/redis-connection.manager';
import { RedisHealth } from '../interfaces';

@ApiTags('Health')
@Controller('redis')
export class HealthController {
  constructor(private redisManager: RedisConnectionManager) {}

  @Get('health')
  @ApiOkResponse({ description: 'Redis health check' })
  async checkRedisHealth(): Promise<RedisHealth> {
    return this.redisManager.healthCheck();
  }
}
