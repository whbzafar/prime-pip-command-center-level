/**
 * Readable device description from the User-Agent plus Chromium client hints.
 * Modern Chrome on Android sends a frozen UA ("Linux; Android 10; K"), so the real phone model and
 * Android version only arrive in the Sec-CH-UA-* headers, which the server asks for with Accept-CH.
 */
export const ACCEPT_CH = 'Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Mobile';
const q = (v: any) => String(Array.isArray(v) ? v[0] : v || '').replace(/^"|"$/g, '').trim();

export function describeDevice(headers: Record<string, any>): string {
  const ua = q(headers['user-agent']);
  const model = q(headers['sec-ch-ua-model']);
  const platform = q(headers['sec-ch-ua-platform']);
  const pver = q(headers['sec-ch-ua-platform-version']);
  const brands = q(headers['sec-ch-ua-full-version-list']);
  let os = '';
  if (platform === 'Android' || /Android/.test(ua)) os = `Android ${pver ? pver.split('.')[0] : (/Android ([\d.]+)/.exec(ua)?.[1] || '')}`.trim();
  else if (/iPhone|iPad/.test(ua)) os = `${/iPad/.test(ua) ? 'iPad' : 'iPhone'} iOS ${(/OS ([\d_]+)/.exec(ua)?.[1] || '').replace(/_/g, '.')}`.trim();
  else if (platform === 'Windows' || /Windows/.test(ua)) os = pver ? (Number(pver.split('.')[0]) >= 13 ? 'Windows 11' : 'Windows 10') : 'Windows';
  else if (platform === 'macOS' || /Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  let phone = model;
  if (!phone) { const m = /Android [\d.]+; ([^;)]+)\)/.exec(ua); if (m && m[1].trim() !== 'K') phone = m[1].replace(/ Build\/.*/, '').trim(); }
  const b = /"(Google Chrome|Microsoft Edge|Opera|Brave|Samsung Internet)";v="(\d+)/.exec(brands);
  const browser = b ? `${b[1].replace('Google ', '')} ${b[2]}`
    : /SamsungBrowser\/(\d+)/.exec(ua) ? `Samsung Internet ${/SamsungBrowser\/(\d+)/.exec(ua)![1]}`
    : /Edg\/(\d+)/.exec(ua) ? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}` : /OPR\/(\d+)/.exec(ua) ? `Opera ${/OPR\/(\d+)/.exec(ua)![1]}`
    : /Firefox\/(\d+)/.exec(ua) ? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}` : /CriOS\/(\d+)|Chrome\/(\d+)/.exec(ua) ? `Chrome ${(/CriOS\/(\d+)|Chrome\/(\d+)/.exec(ua)!.slice(1).find(Boolean))}`
    : /Version\/([\d.]+).*Safari/.exec(ua) ? `Safari ${/Version\/(\d+)/.exec(ua)![1]}` : '';
  const head = [phone, os, browser].filter(Boolean).join(' · ');
  return head ? `${head} — ${ua}`.slice(0, 300) : ua.slice(0, 300);
}
