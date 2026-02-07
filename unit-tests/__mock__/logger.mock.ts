import { IAppLogger } from '../../src/shared/logger/intefaces/interface';

export class StubAppLogger implements IAppLogger {
  info = jest.fn();
  warn = jest.fn();
  debug = jest.fn();
  error = jest.fn();
}
