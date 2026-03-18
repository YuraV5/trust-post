import { AgentProvider } from '../types';

// Centralized constants and types for agent actions
export const AGENT_ACTION_TYPE = {
  CommentModeration: 'CommentModeration',
  PostAnalysis: 'PostAnalysis',
} as const;

export type AgentActionKey = keyof typeof AGENT_ACTION_TYPE; // 'CommentModeration' | 'PostAnalysis'
export type AgentActionType = (typeof AGENT_ACTION_TYPE)[AgentActionKey]; // same string values
export type AgentActionSelector = AgentActionKey | AgentActionType;

// backward-compatible alias
export type AGENT_ACTION_TYPE = AgentActionType;

// Type configuration for actions
export interface AgentActionConfig {
  model: string;
  prompt: string;
  agent: AgentProvider;
}

const COMMENT_CATEGORIES = [
  'spam', // non-sensical content, advertisements
  'harassment', // bullying, hate speech
  'threat', // threats of violence or harm
  'self-harm', // content promoting self-injury
  'sexual', // sexually explicit content
  'political', // extremist or highly polarizing political content
  'scam', //   fraudulent schemes or phishing
  'misinformation', // false or misleading information, especially on important topics
];

// Configuration mapping for each action key
export const AGENT_ACTION_CONFIG: Record<AgentActionKey, AgentActionConfig> = {
  CommentModeration: {
    model: 'gemini-2.5-flash',
    prompt: `
      You are a content moderator. Evaluate the user comment and return JSON only with keys:
      - isSafe (boolean)
      - score (0-1)
      - reason (string or null)
      - categories (array of strings or empty array) — classify unsafe content, e.g., [${COMMENT_CATEGORIES.join(', ')}]
      - urgency (string) — "low", "medium", "high", indicating how quickly it should be reviewed
      - flaggedWords (array of strings) — list words or phrases that triggered the block
      If the comment is unsafe, reason must be **one concise sentence** explaining why. 
      Do not include extra text or commentary.
  `,
    agent: AgentProvider.Gemini,
  },
  PostAnalysis: {
    model: 'gemini-1.5-pro',
    prompt: `
You are an analyst. 
Read the post and return JSON only with keys: summary (string), keyPoints (array of strings), sentiment (positive/neutral/negative). 
Keep all responses concise and factual, without extra commentary.
    `,
    agent: AgentProvider.Gemini,
  },
};
