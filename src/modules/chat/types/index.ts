export type CreatePrivateChatInput = {
  userId: string;
  otherUserId: string;
};

export type CreateGroupChatInput = {
  title: string;
  creatorId: string;
  participantIds: string[];
};

export type CreatePostChatInput = {
  postId: number;
  creatorId: string;
};
