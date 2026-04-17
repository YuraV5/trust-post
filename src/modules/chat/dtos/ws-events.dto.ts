import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class WsChatActionDto {
  @IsUUID('4')
  chatId: string;
}

export class WsSendMessageDto {
  @IsUUID('4')
  chatId: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class WsEditMessageDto {
  @IsUUID('4')
  messageId: string;

  @IsNotEmpty()
  @IsString()
  newContent: string;
}

export class WsDeleteMessageDto {
  @IsUUID('4')
  messageId: string;
}

export class WsTypingDto {
  @IsUUID('4')
  chatId: string;

  @IsBoolean()
  isTyping: boolean;
}
