import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisConnectionManager } from '@app/modules/cache/factories/redis-connection.manager';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RedisConnectionManager],
})
export class HealthModule {}
