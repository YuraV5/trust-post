export function generateRandomUsername(): string {
  const randomStr = Math.random().toString(36).substring(2, 10); // випадкові літери та цифри
  return `user_${randomStr}`;
}
