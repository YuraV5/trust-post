import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAgentClient } from '../../interfaces/agent-client';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/interfaces/interface';
import { GoogleGenAI } from '@google/genai';
import { AgentGenerateOptions } from '../../types';
import { AgentClientConfigException, AgentEmptyResponseException, AgentRequestFailedException } from '../../errors';

@Injectable()
export class GeminiClient implements IAgentClient {
  private readonly ai: GoogleGenAI;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('gemini.apiKey');

    if (!apiKey) {
      throw new AgentClientConfigException('Missing Gemini API key');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  async generate(prompt: string, content: string, model: string, opts?: AgentGenerateOptions): Promise<string> {
    try {
      const ai = this.ai;

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ text: content }],
          },
        ],
        config: {
          systemInstruction: {
            parts: [{ text: prompt }],
          },
          temperature: opts?.temperature ?? 0,
          maxOutputTokens: opts?.maxOutputTokens ?? 1024,
          httpOptions: opts?.timeoutMs ? { timeout: opts.timeoutMs } : undefined,
        },
      });

      const text = response.text?.trim();

      if (!text) {
        throw new AgentEmptyResponseException('Gemini returned an empty text response');
      }

      return text;
    } catch (error: unknown) {
      if (
        error instanceof AgentClientConfigException ||
        error instanceof AgentEmptyResponseException ||
        error instanceof AgentRequestFailedException
      ) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown Gemini error';
      this.logger.error('Gemini generation error', { error: message, model });
      throw new AgentRequestFailedException('Failed to generate content with Gemini', [message]);
    }
  }
}
