import net from 'net';

export function maskIp(ip: string | null | undefined): string {
  if (!ip || ip.toLowerCase() === 'unknown') return '—';

  const type = net.isIP(ip);
  if (type === 4) {
    // IPv4: show first 2 octets
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }

  if (type === 6) {
    // IPv6: show first 3 blocks
    const blocks = ip.split(':');
    const visibleBlocks = blocks.slice(0, 3);
    return visibleBlocks.join(':') + ':****';
  }

  // If no IPv4 or IPv6 "—" returned for invalid IPs
  return '—';
}