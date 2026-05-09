import { Injectable } from '@nestjs/common';
import { AppConfigException } from '../../../shared/errors/app-errors';
import { GeminiAgentsService } from '../agents';
import { IAgentFactory, IAgentProvider } from '../interfaces';
import { AGENT_ACTION_CONFIG, AGENT_ACTION_TYPE, AgentActionKey, AgentActionSelector } from '../consts';
import { AgentActionConfig, AgentModerationResult, AgentProvider } from '../types';

@Injectable()
export class CoreAgentsService implements IAgentFactory {
  private readonly agents: Map<AgentProvider, IAgentProvider>;

  constructor(private readonly geminiAgentsService: GeminiAgentsService) {
    this.agents = new Map<AgentProvider, IAgentProvider>([[AgentProvider.Gemini, this.geminiAgentsService]]);
  }

  getActionConfig(actionType: AgentActionSelector): AgentActionConfig {
    const actionKey = this.resolveActionKey(actionType);

    return AGENT_ACTION_CONFIG[actionKey];
  }

  getAgentForAction(actionType: AgentActionSelector): IAgentProvider {
    const { agent: agentType } = this.getActionConfig(actionType);
    const agent = this.agents.get(agentType);

    if (!agent) {
      throw new AppConfigException(`Unsupported agent provider: ${agentType}`);
    }

    return agent;
  }

  async commentModerate(content: string, actionType: AgentActionSelector): Promise<AgentModerationResult> {
    const actionConfig = this.getActionConfig(actionType);

    return this.getAgentForAction(actionType).commentModerate(content, actionConfig);
  }

  private resolveActionKey(actionType: AgentActionSelector): AgentActionKey {
    if (actionType in AGENT_ACTION_CONFIG) {
      return actionType;
    }

    const actionKey = (Object.keys(AGENT_ACTION_TYPE) as AgentActionKey[]).find(
      (key) => AGENT_ACTION_TYPE[key] === actionType,
    );

    if (!actionKey) {
      throw new AppConfigException(`Unsupported agent action type: ${actionType}`);
    }

    return actionKey;
  }
}
