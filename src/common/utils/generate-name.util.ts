export function generateRandomUsername(): string {
  const randomStr = Math.random().toString(36).substring(2, 10); // random alphanumeric characters
  return `user_${randomStr}`;
}
