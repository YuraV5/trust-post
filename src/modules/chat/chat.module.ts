import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './services/chat.service';
import { ChatGateway } from './chat.gateway';
import { MessageModule } from '../message/message.module';
import { ChatRepo } from './repos';
import { SocketModule } from '../socket/socket.module';
import { SecurityModule } from '../security/security.module';
import { SocketAuthGuard } from '../../common/guards';

@Module({
  imports: [MessageModule, SocketModule, SecurityModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatRepo, SocketAuthGuard],
  exports: [ChatService, ChatRepo],
})
export class ChatModule {}
