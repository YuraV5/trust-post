export enum AgentProvider {
  Gemini = 'gemini',
}

export type AgentActionConfig = {
  agent: AgentProvider;
  model: string;
  prompt: string;
};

export type AgentGenerateOptions = {
  timeoutMs?: number;
  maxOutputTokens?: number;
  temperature?: number;
};

export type AgentModerationResult = {
  isSafe: boolean;
  score: number;
  reason: string | null;
  provider: AgentProvider;
};
