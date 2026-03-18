import { Injectable } from '@nestjs/common';
import { AppConfigException } from '../../../shared/errors/app-errors';
import { GeminiAgentsService } from '../agents';
import { IAgentFactory, IAgentProvider } from '../interfaces';
import { AgentProvider } from '../types';

@Injectable()
export class CoreAgentsService implements IAgentFactory {
  private readonly agents: Map<AgentProvider, IAgentProvider>;

  constructor(private readonly geminiAgentsService: GeminiAgentsService) {
    this.agents = new Map<AgentProvider, IAgentProvider>([[AgentProvider.Gemini, this.geminiAgentsService]]);
  }

  getAgent(agentType: AgentProvider): IAgentProvider {
    const agent = this.agents.get(agentType);

    if (!agent) {
      throw new AppConfigException(`Unsupported agent provider: ${agentType}`);
    }

    return agent;
  }
}
