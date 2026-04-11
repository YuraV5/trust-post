import { Inject, Injectable } from '@nestjs/common';
import { IAgentProvider } from '../../interfaces';
import { AgentActionConfig, AgentModerationResult, AgentProvider } from '../../types';
import { GeminiClient } from './gemini-client';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/interfaces/interface';
import { AgentInvalidResponseException } from '../../errors';

@Injectable()
export class GeminiAgentsService implements IAgentProvider {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly geminiClient: GeminiClient,
  ) {}

  async commentModerate(text: string, config: AgentActionConfig): Promise<AgentModerationResult> {
    try {
      const response = await this.geminiClient.generate(config.prompt, text, config.model, { timeoutMs: 30000 });

      const moderation = this.parseModerationResponse(response);

      return {
        ...moderation,
        provider: config.agent || AgentProvider.Gemini,
      };
    } catch (error: unknown) {
      this.logger.error('Error during Gemini moderation', { error: error as Error, content: text });
      if (error instanceof SyntaxError) {
        throw new AgentInvalidResponseException('Failed to parse Gemini moderation response', [error.message]);
      }
      throw error;
    }
  }

  private parseModerationResponse(candidateText: string): Omit<AgentModerationResult, 'provider'> {
    const normalizedText = candidateText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '');
    const jsonStart = normalizedText.indexOf('{');
    const jsonEnd = normalizedText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new AgentInvalidResponseException('Gemini moderation returned invalid JSON');
    }

    const parsed = JSON.parse(normalizedText.slice(jsonStart, jsonEnd + 1)) as Partial<AgentModerationResult>;
    const isSafe = parsed.isSafe;
    const score = parsed.score;

    if (typeof isSafe !== 'boolean' || typeof score !== 'number' || Number.isNaN(score)) {
      throw new AgentInvalidResponseException('Gemini moderation payload is invalid');
    }

    return {
      isSafe,
      score: Math.max(0, Math.min(1, score)),
      reason: typeof parsed.reason === 'string' ? parsed.reason : null,
    };
  }
}
