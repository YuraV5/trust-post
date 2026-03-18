export enum AgentProvider {
  Gemini = 'gemini',
}

export type AgentModerationResult = {
  isSafe: boolean;
  score: number;
  reason: string | null;
  provider: string;
};

export { AgentProvider as AegntProvider };
