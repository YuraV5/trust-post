export const mockMessageRepo = {
    findChatMember: jest.fn(),
    createMessage: jest.fn(),
    touchChat: jest.fn(),
    findMessages: jest.fn(),
    findMessageById: jest.fn(),
    updateMessageContent: jest.fn(),
    softDeleteMessage: jest.fn(),
    createMessageFile: jest.fn(),
    findFileById: jest.fn(),
    deleteFile: jest.fn(),
  };

export const mockFilesService = {
    upload: jest.fn(),
    delete: jest.fn(),
  };