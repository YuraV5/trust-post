export function hasUpdatableFields(payload: Record<string, unknown>): boolean {
  return Object.values(payload).some((v) => v !== undefined && v !== '');
}
