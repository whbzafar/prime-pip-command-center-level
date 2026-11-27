import { describe, expect, it } from 'vitest';
import { noFree } from './noFree';
describe('noFree', () => {
  it('removes free wording', () => { expect(noFree('Bilkul free try karein.')).toBe('try karein.'); expect(noFree('100% free live data')).toBe('live data'); expect(noFree('یہ بالکل مفت ہے۔')).toBe('یہ ہے۔'); });
  it('keeps unrelated words', () => { expect(noFree('A free-flowing canvas')).toBe('A free-flowing canvas'); expect(noFree('ٹائم فریم چیک')).toBe('ٹائم فریم چیک'); });
});
