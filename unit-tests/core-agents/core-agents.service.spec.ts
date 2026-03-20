import { CoreAgentsService } from '../../src/modules/core-agents/services/core-agents.service';
import { AGENT_ACTION_CONFIG } from '../../src/modules/core-agents/consts';
import { AgentProvider } from '../../src/modules/core-agents/types';

describe('CoreAgentsService', () => {
  const mockGeminiAgentsService = {
    commentModerate: jest.fn(),
  };

  const service = new CoreAgentsService(mockGeminiAgentsService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActionConfig', () => {
    it('returns config for action key selector', () => {
      const result = service.getActionConfig('CommentModeration');

      expect(result).toEqual(AGENT_ACTION_CONFIG.CommentModeration);
    });

    it('returns config for action value selector', () => {
      const result = service.getActionConfig('CommentModeration');

      expect(result.model).toBe(AGENT_ACTION_CONFIG.CommentModeration.model);
    });

    it('throws for unsupported action type', () => {
      expect(() => service.getActionConfig('UnknownAction' as any)).toThrow('Unsupported agent action type');
    });
  });

  describe('getAgentForAction', () => {
    it('returns gemini agent for configured action', () => {
      const result = service.getAgentForAction('CommentModeration');

      expect(result).toBe(mockGeminiAgentsService);
    });

    it('throws when configured provider is not available', () => {
      const fakeService = new CoreAgentsService(mockGeminiAgentsService as any);
      (fakeService as any).agents = new Map([[AgentProvider.Gemini, undefined]]);

      expect(() => fakeService.getAgentForAction('CommentModeration')).toThrow('Unsupported agent provider');
    });
  });

  describe('commentModerate', () => {
    it('delegates moderation to selected provider with action config', async () => {
      const moderationResult = {
        isSafe: true,
        score: 0.99,
        reason: null,
        provider: AgentProvider.Gemini,
      };
      mockGeminiAgentsService.commentModerate.mockResolvedValue(moderationResult);

      const result = await service.commentModerate('Safe comment', 'CommentModeration');

      expect(mockGeminiAgentsService.commentModerate).toHaveBeenCalledWith(
        'Safe comment',
        AGENT_ACTION_CONFIG.CommentModeration,
      );
      expect(result).toEqual(moderationResult);
    });
  });
});
