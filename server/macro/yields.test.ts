import { describe, it, expect } from 'vitest';
import { parseBoc, parseEcb, parseMof, parseRba, parseSnb, parseBoe } from './sources/yields.js';

describe('government yield parsers', () => {
  it('Bank of Canada Valet', () => {
    const r = parseBoc({ observations: [{ d: '2026-11-17', 'BD.CDN.2YR.DQ.YLD': { v: '3.30' }, 'BD.CDN.10YR.DQ.YLD': { v: '3.81' } }] });
    expect(r.two.get('2026-11-17')).toBe(3.3); expect(r.ten.get('2026-11-17')).toBe(3.81);
  });
  it('ECB csvdata', () => {
    const m = parseEcb('KEY,FREQ,TIME_PERIOD,OBS_VALUE,OBS_STATUS\nYC.X,B,2026-11-18,2.71,A\nYC.X,B,2026-11-19,2.75,A\n');
    expect(m.get('2026-11-19')).toBe(2.75);
  });
  it('Japan MoF', () => {
    const r = parseMof('Interest Rate (%)\nDate,1Y,2Y,3Y,10Y\n2026/11/18,0.7,0.95,1.0,1.9\n');
    expect(r.two.get('2026-11-18')).toBe(0.95); expect(r.ten.get('2026-11-18')).toBe(1.9);
  });
  it('Japan MoF Japanese file with Reiwa dates', () => {
    const r = parseMof('国債金利情報(令和8年11月)\n基準日,1年,2年,10年\nR8.11.18,0.7,0.95,1.9\n');
    expect(r.two.get('2026-11-18')).toBe(0.95); expect(r.ten.get('2026-11-18')).toBe(1.9);
  });
  it('RBA F2', () => {
    const r = parseRba('F2 CAPITAL MARKET YIELDS\nTitle,Australian Government 2 year bond,Australian Government 10 year bond\nSeries ID,FCMYGBAG2D,FCMYGBAG10D\n18-Nov-2026,3.80,4.40\n');
    expect(r.two.get('2026-11-18')).toBe(3.8); expect(r.ten.get('2026-11-18')).toBe(4.4);
  });
  it('SNB cube', () => {
    const r = parseSnb('"CubeId";"rendoblid"\n"Date";"D0";"Value"\n"2026-11-18";"10J";"0.35"\n"2026-11-18";"2J";"0.02"\n');
    expect(r.ten.get('2026-11-18')).toBe(0.35); expect(r.two.get('2026-11-18')).toBe(0.02);
  });
  it('Bank of England', () => {
    expect(parseBoe('DATE,IUDMNPY\n18 Nov 2026,4.52\n').get('2026-11-18')).toBe(4.52);
  });
});
