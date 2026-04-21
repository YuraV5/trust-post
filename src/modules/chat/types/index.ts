import { Chat, ChatMember, Message, PrivateChat } from '@prisma/client';

export type CreatePrivateChatInput = {
  userId: string;
  otherUserId: string;
};

export type CreateGroupChatInput = {
  title: string;
  creatorId: string;
  participantIds?: string[];
};

export type AddMemberByEmailInput = {
  chatId: string;
  requesterId: string;
  email: string;
};

export type AddMemberByEmailResult = {
  message: string;
  chat: ChatWithMembersAndPrivate;
};

export type CreatePostChatInput = {
  postId: number;
  creatorId: string;
};

export type JoinLeaveActionResult = { message: string };

export type ChatUserSummary = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
};

export type ChatUserSummaryNoEmail = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type ChatMessagePreview = Message & {
  sender: ChatUserSummaryNoEmail;
};

export type ChatMemberWithUser = ChatMember & {
  user: ChatUserSummary;
};

export type ChatWithMembers = Chat & {
  members: ChatMemberWithUser[];
};

export type ChatWithMembersAndPrivate = ChatWithMembers & {
  PrivateChat: PrivateChat | null;
};

export type PrivateChatWithChat = PrivateChat & {
  chat: Chat;
};

export type UserChatItem = ChatWithMembers & {
  messages: ChatMessagePreview[];
};

export type UserChatsResult = {
  data: UserChatItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ChatRepoUserChatsResult = {
  data: UserChatItem[];
  total: number;
};

export type ChatEntity = Chat;
export type ChatMemberEntity = ChatMember;
export type PrivateChatEntity = PrivateChat;
