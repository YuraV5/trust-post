export function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return '—';

  if (ip.includes('.')) {
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.xxx.xxx` : ip;
  }

  if (ip.includes(':')) {
    return ip.split(':').slice(0, 3).join(':') + ':****';
  }

  return ip;
}
