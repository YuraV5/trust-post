import { AppInternalServerException } from '../../shared/errors/app-errors';

const MULTIPLIERS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function parseDuration(input: string | number): number {
  if (typeof input === 'number') return input;

  // numeric string → ms
  if (/^\d+$/.test(input)) {
    return Number(input);
  }

  const match = input.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    throw new AppInternalServerException(`Invalid duration format: ${input}`, [
      `Bad format for parseDuration: ${input}`,
    ]);
  }

  const [, value, unit] = match;
  return Number(value) * MULTIPLIERS[unit];
}
