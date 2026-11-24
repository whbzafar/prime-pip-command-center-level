import { describe, it, expect } from 'vitest';
import { describeDevice } from '../deviceInfo';
describe('describeDevice', () => {
  it('uses client hints for frozen Android UA', () => {
    const d = describeDevice({ 'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36', 'sec-ch-ua-model': '"SM-A546E"', 'sec-ch-ua-platform': '"Android"', 'sec-ch-ua-platform-version': '"14.0.0"' });
    expect(d.startsWith('SM-A546E · Android 14 · Chrome 131')).toBe(true);
  });
  it('windows 11 + edge', () => expect(describeDevice({ 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131 Safari/537.36 Edg/131.0', 'sec-ch-ua-platform': '"Windows"', 'sec-ch-ua-platform-version': '"15.0.0"' })).toMatch(/^Windows 11 · Edge 131/));
  it('iphone', () => expect(describeDevice({ 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Version/17.5 Mobile/15E148 Safari/604.1' })).toMatch(/^iPhone iOS 17\.5 · Safari 17/));
});
