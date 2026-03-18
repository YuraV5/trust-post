import { AgentActionSelector } from '../consts';
import { AgentActionConfig } from '../types';
import { IAgentProvider } from './agent-provider';

export interface IAgentFactory {
  getAgentForAction(actionType: AgentActionSelector): IAgentProvider;
  getActionConfig(actionType: AgentActionSelector): AgentActionConfig;
}
