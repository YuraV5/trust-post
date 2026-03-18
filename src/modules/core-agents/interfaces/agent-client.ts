import { AgentGenerateOptions } from '../types';

export interface IAgentClient {
  generate(prompt: string, content: string, model: string, opts?: AgentGenerateOptions): Promise<string>;
}
