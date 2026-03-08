import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './services/message.service';
import { MessageRepo } from './repos/message.repo';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [MessageController],
  providers: [MessageService, MessageRepo],
  exports: [MessageService, MessageRepo],
})
export class MessageModule {}
