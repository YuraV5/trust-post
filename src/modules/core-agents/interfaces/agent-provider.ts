import { AgentActionConfig, AgentModerationResult } from '../types';

export interface IAgentProvider {
  commentModerate(text: string, config: AgentActionConfig): Promise<AgentModerationResult>;
}
