import { AgentProvider } from '../types';
import { IAgentProvider } from './agent-provider';

export interface IAgentFactory {
  getAgent(agentType: AgentProvider): IAgentProvider;
}
