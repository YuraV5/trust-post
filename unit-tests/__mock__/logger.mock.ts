import { IAppLogger } from '../../src/shared/logger/interfaces/interface';

export const StubAppLogger: IAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};
