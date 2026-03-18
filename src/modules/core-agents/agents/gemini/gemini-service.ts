import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigException, AppInternalServerException } from '../../../../shared/errors/app-errors';
import { IAgentProvider } from '../../interfaces';
import { AgentModerationResult, AgentProvider } from '../../types';
import { GeminiClient } from './gemini-client';

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
};

@Injectable()
export class GeminiAgentsService implements IAgentProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly geminiClient: GeminiClient,
  ) {}

  async commentModerate(text: string): Promise<AgentModerationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await this.geminiClient.generate(
        [
          'You moderate user-generated comments for a social platform.',
          'Return JSON only with keys: isSafe, score, reason.',
          'Set isSafe to false for hate, harassment, threats, explicit sexual content, self-harm encouragement, spam, scams, or dangerous/illegal instructions.',
          'Set score as a number from 0 to 1 where higher means higher confidence the content should be blocked.',
          'Set reason to null when the comment is safe.',
        ].join(' '),
        text,
        { timeoutMs: 5000 },
      );

      if (!response) {
        throw new AppInternalServerException('Gemini moderation returned an empty response');
      }

      const moderation = this.parseModerationResponse(response);

      return {
        ...moderation,
        provider: AgentProvider.Gemini,
      };
    } finally {
      clearTimeout(timeout);
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
      throw new AppInternalServerException('Gemini moderation returned invalid JSON');
    }

    const parsed = JSON.parse(normalizedText.slice(jsonStart, jsonEnd + 1)) as Partial<AgentModerationResult>;
    const isSafe = parsed.isSafe;
    const score = parsed.score;

    if (typeof isSafe !== 'boolean' || typeof score !== 'number' || Number.isNaN(score)) {
      throw new AppInternalServerException('Gemini moderation payload is invalid');
    }

    return {
      isSafe,
      score: Math.max(0, Math.min(1, score)),
      reason: typeof parsed.reason === 'string' ? parsed.reason : null,
    };
  }
}
