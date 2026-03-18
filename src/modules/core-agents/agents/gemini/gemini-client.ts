import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigException } from '../../../../shared/errors/app-errors';
import { IAgentClient } from '../../interfaces/agent-client';

@Injectable()
export class GeminiClient implements IAgentClient {
  constructor(private config: ConfigService) {}

  async generate(prompt: string, contetnt: string, opts?: { timeoutMs?: number }) {
    const apiKey = this.config.get<string>('commentModeration.gemini.apiKey');
    const model = this.config.get<string>('commentModeration.gemini.model') || 'gemini-2.0-flash';
    const baseUrl = this.config.get<string>('commentModeration.gemini.baseUrl');
    const temperature = 0;

    if (!apiKey) throw new AppConfigException('Missing API key');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 5000);

    try {
      const res = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        body: JSON.stringify({
          systemInstruction: { role: 'system', parts: [{ text: prompt }] },
          contents: [{ role: 'user', parts: [{ text: contetnt }] }],
          generationConfig: { temperature, responseMimeType: 'application/json' },
          signal: controller.signal,
        }),
      });

      if (!res.ok) throw new Error('Gemini error');

      const json = await res.json();

      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } finally {
      clearTimeout(timeout);
    }
  }
}
