import { Module } from '@nestjs/common';
import { GeminiAgentsService, GeminiClient } from './agents';
import { CoreAgentsService } from './services/core-agents.service';

@Module({
  controllers: [],
  providers: [CoreAgentsService, GeminiAgentsService, GeminiClient],
  exports: [CoreAgentsService],
})
export class CoreAgentsModule {}
