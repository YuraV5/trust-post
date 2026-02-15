import { Module, Global } from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { RedisConnectionManager } from './factories/redis-connection.manager';
import { HealthController } from './controllers/health.controller';

@Global()
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [RedisService, RedisConnectionManager],
  exports: [RedisService],
})
export class CacheModule {}
