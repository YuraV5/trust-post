export interface IAgentClient {
  generate(propt: string, content: string, opts?: { timeoutMs?: number }): Promise<string>;
}
