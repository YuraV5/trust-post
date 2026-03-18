import { AgentModerationResult } from '../types';

export interface IAgentProvider {
  commentModerate(text: string): Promise<AgentModerationResult>;
}
