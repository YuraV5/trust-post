import { AsyncLocalStorage } from 'node:async_hooks';
import { ExecutionContext } from './execution-context';

const als = new AsyncLocalStorage<ExecutionContext>();

export const Context = {
  run<T>(ctx: ExecutionContext, fn: () => T): T {
    return als.run(ctx, fn);
  },

  get(): ExecutionContext | undefined {
    return als.getStore();
  },

  getRequired(): ExecutionContext {
    const ctx = als.getStore();
    if (!ctx) {
      throw new Error('ExecutionContext is not available');
    }
    return ctx;
  },
};
