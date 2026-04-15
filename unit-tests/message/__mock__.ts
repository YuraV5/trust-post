export const mockMessageRepo = {
  findChatMember: jest.fn(),
  createMessage: jest.fn(),
  touchChat: jest.fn(),
  findMessages: jest.fn(),
  findMessageById: jest.fn(),
  findMessageWithSenderAndFiles: jest.fn(),
  updateMessageContent: jest.fn(),
  softDeleteMessage: jest.fn(),
  deleteFilesByMessageId: jest.fn(),
  createMessageFile: jest.fn(),
  findFileById: jest.fn(),
  deleteFile: jest.fn(),
};

export const mockFilesService = {
  upload: jest.fn(),
  delete: jest.fn(),
};