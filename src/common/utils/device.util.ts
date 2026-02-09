import { UAParser } from 'ua-parser-js';

export function getDeviceName(userAgent?: string): string {
  if (!userAgent) return 'Unknown device';

  const parser = new UAParser();
  parser.setUA(userAgent);

  const { browser, os, device } = parser.getResult();

  // Mobile
  if (device.vendor || device.model) {
    return [browser.name, 'on', os.name, os.version, device.vendor, device.model].filter(Boolean).join(' ');
  }

  // Desktop
  if (browser.name || os.name) {
    return [browser.name, 'on', os.name, os.version].filter(Boolean).join(' ');
  }

  return 'unknown';
}
