import { AgentActionType } from '../../../../core-agents/consts';

export type ModerateCommentJobData = {
  commentId: number;
  postId: number;
  content: string;
  actionType: AgentActionType;
};
