export interface CandleData {
  id: number;
  open: number;
  high: number;
  low: number;
  close: number;
  type: 'BULLISH' | 'BEARISH';
  label?: string;
  highlight?: boolean;
}

export interface ZoneData {
  id: string;
  name: string;
  yTop: number;
  yBottom: number;
  xStart: number;
  xEnd: number;
  color: string;
  borderColor: string;
  label: string;
  type: 'DEMAND' | 'SUPPLY' | 'MB' | 'FVG' | 'IDM' | 'PD_ARRAY';
}

export interface StructureLine {
  y: number;
  xStart: number;
  xEnd: number;
  label: string;
  color: string;
  dashed?: boolean;
}

export interface SbtModelVariation {
  id: string;
  name: string;
  subtitle: string;
  candles: CandleData[];
  zones: ZoneData[];
  lines: StructureLine[];
  entryArrow?: { x: number; y: number; text: string; dir: 'UP' | 'DOWN' };
  notes: string;
}

export interface SbtModel {
  id: string;
  number: number;
  name: string;
  title: string;
  subtitle: string;
  category: 'CONTINUATION' | 'REVERSAL' | 'LIQUIDITY_ENGINEERING' | 'TURTLE_SOUP';
  rules: string[];
  entryCondition: string;
  targetCondition: string;
  invalidationCondition: string;
  numberedMarkers: {
    marker: number;
    title: string;
    description: string;
  }[];
  variations: SbtModelVariation[];
}

export const SBT_MODELS: SbtModel[] = [
  // =========================================================================
  // MODEL 1
  // =========================================================================
  {
    id: 'SBT-01',
    number: 1,
    name: 'SBT Model (1)',
    title: 'Lowest Bearish Order Block Retest After BOS',
    subtitle: 'Mark lowest bearish closing candle from open to lowest wick after Bullish BOS; enter buy on retest',
    category: 'CONTINUATION',
    rules: [
      '1. We have a Bos.',
      '2. We will mark lowest bearish closing candle around area of 2.',
      '3. From open to lowest wick.',
      '4. We will wait for the market to test this zone.',
      '5. Testing candle should not close below area of 2.',
      '6. We will enter Buy at the opening of next candle.',
      '7. Target will be area of 3.',
    ],
    entryCondition: 'Enter Buy at the opening of next candle once testing candle respects the zone without closing below Area 2.',
    targetCondition: 'Target will be Area 3 (the swing high created by the BOS impulse).',
    invalidationCondition: 'Testing candle closes below the marked Area 2 zone (below the lowest wick).',
    numberedMarkers: [
      { marker: 1, title: 'Break of Structure (BOS)', description: 'Bullish BOS confirmed by clear body closure above swing high.' },
      { marker: 2, title: 'Lowest Bearish Candle (Area 2)', description: 'Mark the lowest bearish candle from open to lowest wick at the pullback base.' },
      { marker: 3, title: 'Target Area (Area 3)', description: 'High of the expansion leg that established the BOS.' },
      { marker: 4, title: 'Testing Candle', description: 'Candle retracing into Area 2 that does NOT close below the zone.' },
      { marker: 5, title: 'Buy Execution', description: 'Enter Buy at the exact opening of the candle following the test.' },
    ],
    variations: [
      {
        id: '1-DEFAULT',
        name: 'Standard Model 1',
        subtitle: 'Bullish BOS followed by clean retest of lowest bearish candle',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 50, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 50, close: 68, high: 70, low: 48, type: 'BULLISH' }, // Swing High
          { id: 4, open: 68, close: 52, high: 70, low: 50, type: 'BEARISH' },
          { id: 5, open: 52, close: 36, high: 53, low: 34, type: 'BEARISH' }, // Lowest Bearish Candle (Area 2)
          { id: 6, open: 36, close: 55, high: 58, low: 34, type: 'BULLISH' },
          { id: 7, open: 55, close: 76, high: 78, low: 54, type: 'BULLISH' }, // Breaks BOS
          { id: 8, open: 76, close: 95, high: 98, low: 75, type: 'BULLISH' }, // Peak Area 3
          { id: 9, open: 95, close: 80, high: 96, low: 78, type: 'BEARISH' },
          { id: 10, open: 80, close: 65, high: 82, low: 63, type: 'BEARISH' },
          { id: 11, open: 65, close: 50, high: 66, low: 48, type: 'BEARISH' },
          { id: 12, open: 50, close: 38, high: 52, low: 35, type: 'BEARISH' }, // Tests zone without closing below
          { id: 13, open: 38, close: 60, high: 63, low: 37, type: 'BULLISH', highlight: true }, // Entry Buy
        ],
        zones: [
          {
            id: 'z-m1-ob',
            name: 'Area 2 — Lowest Bearish Candle',
            yTop: 52,
            yBottom: 34,
            xStart: 4.5,
            xEnd: 14.5,
            color: 'rgba(148, 163, 184, 0.25)',
            borderColor: 'rgba(148, 163, 184, 0.6)',
            label: 'Area 2 (Open to Lowest Wick)',
            type: 'DEMAND',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 12.8, y: 38, text: 'BUY', dir: 'UP' },
        notes: 'Strict source rule: from open of candle 5 to lowest wick forms Area 2. Testing candle 12 cannot close below Area 2.',
      },
    ],
  },

  // =========================================================================
  // MODEL 2
  // =========================================================================
  {
    id: 'SBT-02',
    number: 2,
    name: 'SBT Model (2)',
    title: 'Mitigation Block (MB) Overlapping with Demand Zone',
    subtitle: 'Demand zone created before BOS overlapping with Mitigation Block; enter on retest',
    category: 'CONTINUATION',
    rules: [
      '1. We mark mitigation Block.',
      '2. Market creates a demand zone which must overlap with MB.',
      '3. Demand candle must form before Bos.',
      '4. We have a Bullish Bos.',
      '5. Market comes back to test MB.',
      '6. Testing candle should not close below the area of MB.',
      '7. Testing candle can either be bullish or bearish and it can close anywhere except below the MB.',
      '8. We will enter Buy at the opening or start of next candle.',
      '9. First target will be area of 3.',
    ],
    entryCondition: 'Enter Buy at the opening or start of next candle after testing candle respects the MB area without closing below it.',
    targetCondition: 'First target will be Area 3 (swing high created during the impulse).',
    invalidationCondition: 'Testing candle closes below the area of the Mitigation Block (MB).',
    numberedMarkers: [
      { marker: 1, title: 'Mitigation Block (MB)', description: 'Previous structural level marked as the Mitigation Block.' },
      { marker: 2, title: 'Demand Zone Overlap', description: 'Demand candle formed before the BOS that directly overlaps with the MB.' },
      { marker: 3, title: 'Bullish BOS', description: 'Market breaks structure to the upside creating Area 3 high.' },
      { marker: 4, title: 'Test of MB', description: 'Market retraces to test MB; testing candle can be bullish or bearish but cannot close below MB.' },
      { marker: 5, title: 'Buy Execution', description: 'Enter Buy at start of next candle.' },
    ],
    variations: [
      {
        id: '2-DEFAULT',
        name: 'Standard Model 2',
        subtitle: 'Demand zone overlapping with MB retested for bullish continuation',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 50, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 50, close: 68, high: 70, low: 48, type: 'BULLISH' }, // Swing High 1
          { id: 4, open: 68, close: 54, high: 70, low: 52, type: 'BEARISH' },
          { id: 5, open: 54, close: 38, high: 55, low: 36, type: 'BEARISH' },
          { id: 6, open: 38, close: 56, high: 58, low: 36, type: 'BULLISH' },
          { id: 7, open: 56, close: 68, high: 70, low: 55, type: 'BULLISH' }, // Demand candle overlapping MB
          { id: 8, open: 68, close: 88, high: 90, low: 67, type: 'BULLISH' }, // BOS break
          { id: 9, open: 88, close: 104, high: 106, low: 86, type: 'BULLISH' }, // Area 3
          { id: 10, open: 104, close: 86, high: 105, low: 84, type: 'BEARISH' },
          { id: 11, open: 86, close: 68, high: 88, low: 67, type: 'BEARISH' }, // Retest of MB
          { id: 12, open: 68, close: 85, high: 88, low: 67, type: 'BULLISH', highlight: true }, // Buy Entry
        ],
        zones: [
          {
            id: 'z-m2-mb',
            name: 'Mitigation Block (MB) & Demand Overlap',
            yTop: 72,
            yBottom: 66,
            xStart: 2.8,
            xEnd: 12.5,
            color: 'rgba(148, 163, 184, 0.35)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            label: 'MB / Demand Overlap',
            type: 'MB',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 8.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 11.8, y: 68, text: 'BUY', dir: 'UP' },
        notes: 'Rule 7: Testing candle can be either bullish or bearish and close anywhere except below MB.',
      },
    ],
  },

  // =========================================================================
  // MODEL 3
  // =========================================================================
  {
    id: 'SBT-03',
    number: 3,
    name: 'SBT Model (3)',
    title: 'Fair Value Gap (FVG) Retest Model',
    subtitle: 'Price forms an impulsive BOS creating a clean FVG at the structural break level; retested for continuation',
    category: 'CONTINUATION',
    rules: [
      '1. Market creates a Bullish Bos.',
      '2. Clean Fair Value Gap (FVG) formed at/around the BOS displacement level.',
      '3. Price pulls back into the unmitigated FVG.',
      '4. Retest of FVG confirms continuation without closing through the imbalance.',
      '5. Enter Buy on opening of next candle targeting swing high.',
    ],
    entryCondition: 'Enter Buy on opening of next candle once price taps the FVG and rejects cleanly.',
    targetCondition: 'Target recent swing high established by the expansion leg.',
    invalidationCondition: 'Price closes completely below the lower boundary of the Fair Value Gap.',
    numberedMarkers: [
      { marker: 1, title: 'Break of Structure (BOS)', description: 'Bullish BOS with explosive displacement candle.' },
      { marker: 2, title: 'Fair Value Gap (FVG)', description: '3-candle imbalance between candle 1 high and candle 3 low at BOS.' },
      { marker: 3, title: 'Pullback into FVG', description: 'Controlled pullback retracing directly into the imbalance.' },
      { marker: 4, title: 'Buy Execution', description: 'Enter Buy as FVG holds and next candle opens.' },
    ],
    variations: [
      {
        id: '3-DEFAULT',
        name: 'Standard Model 3 (FVG)',
        subtitle: 'Fair Value Gap retest at the structural break level',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 50, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 50, close: 68, high: 70, low: 48, type: 'BULLISH' }, // Swing High
          { id: 4, open: 68, close: 52, high: 70, low: 50, type: 'BEARISH' },
          { id: 5, open: 52, close: 38, high: 54, low: 36, type: 'BEARISH' },
          { id: 6, open: 38, close: 58, high: 60, low: 36, type: 'BULLISH' },
          { id: 7, open: 58, close: 78, high: 80, low: 57, type: 'BULLISH' }, // Candle 1 of FVG
          { id: 8, open: 78, close: 96, high: 98, low: 78, type: 'BULLISH' }, // Candle 2 (Displacement across BOS)
          { id: 9, open: 96, close: 84, high: 97, low: 82, type: 'BEARISH' }, // Candle 3 (Pullback, creates FVG)
          { id: 10, open: 84, close: 72, high: 85, low: 70, type: 'BEARISH' }, // Retest inside FVG
          { id: 11, open: 72, close: 88, high: 90, low: 71, type: 'BULLISH', highlight: true }, // Continuation
        ],
        zones: [
          {
            id: 'z-m3-fvg',
            name: 'Fair Value Gap (FVG)',
            yTop: 76,
            yBottom: 68,
            xStart: 6.8,
            xEnd: 11.5,
            color: 'rgba(148, 163, 184, 0.3)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            label: 'FVG',
            type: 'FVG',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 8.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 10.8, y: 72, text: 'BUY', dir: 'UP' },
        notes: 'Verbatim PDF Page 3: "S B T Model (3) (Rules) (1) Fair Value Gap". Price respects FVG at the BOS level.',
      },
    ],
  },

  // =========================================================================
  // MODEL 4
  // =========================================================================
  {
    id: 'SBT-04',
    number: 4,
    name: 'SBT Model (4)',
    title: 'Unmitigated OB/CISD with FVG around Area of 2',
    subtitle: 'FVG around area 2 + unmitigated OB/CISD; market must not close at all below area 2',
    category: 'CONTINUATION',
    rules: [
      '1. There must be a FVG around area of 2.',
      '2. There must be a BOS.',
      '3. The OB/CISD must be unmitigated.',
      '4. Market should come to test this OB and does not close at all below the area of 2.',
      '5. We will enter buy at the opening of next candle.',
    ],
    entryCondition: 'Enter Buy at opening of next candle once market tests the unmitigated OB without closing at all below Area 2.',
    targetCondition: 'Target previous swing high established by the BOS expansion.',
    invalidationCondition: 'Testing candle closes below the area of 2.',
    numberedMarkers: [
      { marker: 1, title: 'FVG Around Area 2', description: 'A clean Fair Value Gap forms around Area 2.' },
      { marker: 2, title: 'Break of Structure (BOS)', description: 'Price breaks structure with confirmed body close.' },
      { marker: 3, title: 'Unmitigated OB/CISD', description: 'The Order Block / Change in State of Delivery remains pristine and unmitigated.' },
      { marker: 4, title: 'Test of OB', description: 'Price retraces into OB without closing at all below Area 2.' },
      { marker: 5, title: 'Buy Execution', description: 'Enter Buy on open of subsequent candle.' },
    ],
    variations: [
      {
        id: '4-DEFAULT',
        name: 'Standard Model 4',
        subtitle: 'Unmitigated OB/CISD with FVG alignment retested cleanly',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 50, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 50, close: 68, high: 70, low: 48, type: 'BULLISH' }, // Swing High
          { id: 4, open: 68, close: 52, high: 70, low: 50, type: 'BEARISH' },
          { id: 5, open: 52, close: 36, high: 53, low: 34, type: 'BEARISH' }, // OB / CISD
          { id: 6, open: 36, close: 56, high: 58, low: 35, type: 'BULLISH' },
          { id: 7, open: 56, close: 76, high: 78, low: 55, type: 'BULLISH' }, // BOS break
          { id: 8, open: 76, close: 96, high: 98, low: 75, type: 'BULLISH' }, // Peak
          { id: 9, open: 96, close: 82, high: 97, low: 80, type: 'BEARISH' },
          { id: 10, open: 82, close: 68, high: 83, low: 66, type: 'BEARISH' },
          { id: 11, open: 68, close: 54, high: 69, low: 52, type: 'BEARISH' },
          { id: 12, open: 54, close: 40, high: 55, low: 36, type: 'BEARISH' }, // Tests OB
          { id: 13, open: 40, close: 62, high: 65, low: 39, type: 'BULLISH', highlight: true }, // Buy Entry
        ],
        zones: [
          {
            id: 'z-m4-ob',
            name: 'Unmitigated OB/CISD (Area 2)',
            yTop: 52,
            yBottom: 34,
            xStart: 4.8,
            xEnd: 13.5,
            color: 'rgba(148, 163, 184, 0.28)',
            borderColor: 'rgba(148, 163, 184, 0.65)',
            label: 'Unmitigated OB / Area 2',
            type: 'DEMAND',
          },
          {
            id: 'z-m4-fvg',
            name: 'FVG around Area 2',
            yTop: 66,
            yBottom: 56,
            xStart: 5.8,
            xEnd: 7.5,
            color: 'rgba(245, 158, 11, 0.15)',
            borderColor: 'rgba(245, 158, 11, 0.4)',
            label: 'FVG',
            type: 'FVG',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 12.8, y: 40, text: 'BUY', dir: 'UP' },
        notes: 'Strict rule: OB/CISD must be unmitigated and market cannot close at all below Area 2.',
      },
    ],
  },

  // =========================================================================
  // MODEL 5 (Single Candle OB vs MCOB Variations preserved)
  // =========================================================================
  {
    id: 'SBT-05',
    number: 5,
    name: 'SBT Model (5)',
    title: 'Bearish OB/CISD Aligned with Mitigation Block (Single OB & MCOB)',
    subtitle: 'OB created before BOS aligning with Mitigation Block; supports Single Candle OB or Multiple Candle OB',
    category: 'CONTINUATION',
    rules: [
      '1. There must be a Bos.',
      '2. There must be a bearish OB/CISD, that aligns with Mitigation Block.',
      '3. OB should have to be created before Bos.',
      '4. OB can either be Single candle OB or MCOB.',
      '5. Ob should be unmitigated.',
      '6. The testing candle should not close above MB (or below MB for buy setups).',
      '7. Enter trade at the opening of next Candle.',
      '8. First target at 3.',
    ],
    entryCondition: 'Enter at opening of next candle once testing candle respects the MB alignment.',
    targetCondition: 'First target at Area 3.',
    invalidationCondition: 'Testing candle closes beyond the Mitigation Block boundary.',
    numberedMarkers: [
      { marker: 1, title: 'Break of Structure', description: 'Confirmed structural break.' },
      { marker: 2, title: 'OB Aligned with MB', description: 'Bearish OB/CISD formed before BOS that aligns with the Mitigation Block.' },
      { marker: 3, title: 'Single OB / MCOB', description: 'Can be single candle or multiple candle order block (MCOB).' },
      { marker: 4, title: 'Testing Candle', description: 'Tests the zone without closing through MB.' },
      { marker: 5, title: 'Execution', description: 'Enter trade on opening of next candle.' },
    ],
    variations: [
      {
        id: '5A-SINGLE',
        name: 'Model 5 — Single Candle OB',
        subtitle: 'Single candle order block aligning with Mitigation Block',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 52, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 52, close: 68, high: 70, low: 50, type: 'BULLISH' },
          { id: 4, open: 68, close: 54, high: 70, low: 52, type: 'BEARISH' },
          { id: 5, open: 54, close: 38, high: 55, low: 36, type: 'BEARISH' },
          { id: 6, open: 38, close: 56, high: 58, low: 36, type: 'BULLISH' },
          { id: 7, open: 56, close: 72, high: 74, low: 55, type: 'BULLISH' }, // Single OB aligning with MB
          { id: 8, open: 72, close: 92, high: 95, low: 70, type: 'BULLISH' }, // BOS break
          { id: 9, open: 92, close: 105, high: 108, low: 90, type: 'BULLISH' },
          { id: 10, open: 105, close: 90, high: 106, low: 88, type: 'BEARISH' },
          { id: 11, open: 90, close: 74, high: 91, low: 72, type: 'BEARISH' }, // Retest
          { id: 12, open: 74, close: 90, high: 92, low: 73, type: 'BULLISH', highlight: true }, // Buy
        ],
        zones: [
          {
            id: 'z-m5a-mb',
            name: 'Mitigation Block & Single OB',
            yTop: 74,
            yBottom: 68,
            xStart: 2.8,
            xEnd: 12.5,
            color: 'rgba(148, 163, 184, 0.35)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            label: 'MB / Single OB',
            type: 'MB',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 8.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 11.8, y: 74, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 5 (Left diagram): "Un Test" Single candle OB with FVG aligning with MB.',
      },
      {
        id: '5B-MCOB',
        name: 'Model 5 — Multiple Candle OB (MCOB)',
        subtitle: 'Multiple candle order block (MCOB) aligning with Mitigation Block',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 52, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 52, close: 68, high: 70, low: 50, type: 'BULLISH' },
          { id: 4, open: 68, close: 54, high: 70, low: 52, type: 'BEARISH' },
          { id: 5, open: 54, close: 38, high: 55, low: 36, type: 'BEARISH' },
          { id: 6, open: 38, close: 56, high: 58, low: 36, type: 'BULLISH' },
          { id: 7, open: 56, close: 65, high: 68, low: 54, type: 'BULLISH' }, // Candle 1 of MCOB
          { id: 8, open: 65, close: 74, high: 76, low: 64, type: 'BULLISH' }, // Candle 2 of MCOB
          { id: 9, open: 74, close: 94, high: 96, low: 73, type: 'BULLISH' }, // BOS break
          { id: 10, open: 94, close: 108, high: 110, low: 93, type: 'BULLISH' },
          { id: 11, open: 108, close: 92, high: 109, low: 90, type: 'BEARISH' },
          { id: 12, open: 92, close: 76, high: 93, low: 74, type: 'BEARISH' }, // Retest
          { id: 13, open: 76, close: 92, high: 94, low: 75, type: 'BULLISH', highlight: true }, // Buy
        ],
        zones: [
          {
            id: 'z-m5b-mcob',
            name: 'MCOB Aligned with MB',
            yTop: 76,
            yBottom: 68,
            xStart: 2.8,
            xEnd: 13.5,
            color: 'rgba(148, 163, 184, 0.35)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            label: 'Un Test Mcob',
            type: 'MB',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 9.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 12.8, y: 76, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 5 (Right diagram): "Un Test Mcob". Multi-candle order block aligning with MB.',
      },
    ],
  },

  // =========================================================================
  // MODEL 6 (HTF Reversal Model)
  // =========================================================================
  {
    id: 'SBT-06',
    number: 6,
    name: 'SBT Model (6)',
    title: 'Reversal Model — Unmitigated Daily/Weekly OB to H1 MSS',
    subtitle: 'HTF unmitigated OB tested; shift to H1 for Market Structure Shift (MSS); 4 candles beyond invalidates',
    category: 'REVERSAL',
    rules: [
      '1. There must be a unmitigated OB on Daily or Weekly timeframe.',
      '2. This OB doesnt have to be on a structure level.',
      '3. When market comes to this area of unmitigated OB, this is the point where we can look for reversals.',
      '4. We will shift to H1 timeframe.',
      '5. Wait for a MsS on H1 in the direction of HTF OB.',
      '6. If we get to see a MsS on H1, then we will look for reversal trades till the next structural area of HTF.',
      '7. If we are not able to see a H1 MsS and we see 4 candles closing beyond the HTF OB in H1, then this OB will be invalidated and we will continue taking trades on H1.',
    ],
    entryCondition: 'Shift to H1 timeframe upon test of Daily/Weekly unmitigated OB; enter in direction of HTF OB once H1 Market Structure Shift (MSS) confirms.',
    targetCondition: 'Target the next structural area of the Higher Time Frame (HTF).',
    invalidationCondition: 'Rule 7: If no H1 MSS occurs and 4 candles close beyond the HTF OB in H1, the setup is invalidated.',
    numberedMarkers: [
      { marker: 1, title: 'Daily/Weekly Unmitigated OB', description: 'Higher timeframe order block (does not have to be on a structure level).' },
      { marker: 2, title: 'Price Reaches HTF OB', description: 'Market taps into the unmitigated HTF zone.' },
      { marker: 3, title: 'Shift to H1 Timeframe', description: 'Trader switches to H1 to observe internal microstructure.' },
      { marker: 4, title: 'H1 MSS Confirmation', description: 'Market Structure Shift (MSS) on H1 in direction of HTF OB.' },
      { marker: 5, title: 'Invalidation Rule', description: '4 candles closing beyond HTF OB on H1 invalidates the reversal.' },
    ],
    variations: [
      {
        id: '6-DEFAULT',
        name: 'HTF Reversal Model',
        subtitle: 'Daily/Weekly unmitigated OB tapped, followed by H1 reversal confirmation',
        candles: [
          { id: 1, open: 15, close: 30, high: 32, low: 14, type: 'BULLISH' }, // Daily/Weekly OB origin
          { id: 2, open: 30, close: 48, high: 50, low: 28, type: 'BULLISH' },
          { id: 3, open: 48, close: 70, high: 72, low: 46, type: 'BULLISH' },
          { id: 4, open: 70, close: 92, high: 95, low: 68, type: 'BULLISH' },
          { id: 5, open: 92, close: 114, high: 116, low: 90, type: 'BULLISH' }, // HTF High
          { id: 6, open: 114, close: 98, high: 115, low: 96, type: 'BEARISH' },
          { id: 7, open: 98, close: 80, high: 99, low: 78, type: 'BEARISH' },
          { id: 8, open: 80, close: 62, high: 82, low: 60, type: 'BEARISH' },
          { id: 9, open: 62, close: 44, high: 64, low: 42, type: 'BEARISH' },
          { id: 10, open: 44, close: 28, high: 45, low: 26, type: 'BEARISH' }, // Taps Daily/Weekly OB
          { id: 11, open: 28, close: 52, high: 55, low: 27, type: 'BULLISH', highlight: true }, // H1 MSS Reversal
        ],
        zones: [
          {
            id: 'z-m6-htf',
            name: 'Daily/Weekly Unmitigated OB',
            yTop: 32,
            yBottom: 14,
            xStart: 0.8,
            xEnd: 11.5,
            color: 'rgba(148, 163, 184, 0.35)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            label: 'Daily / Weekly OB',
            type: 'DEMAND',
          },
        ],
        lines: [],
        entryArrow: { x: 10.8, y: 28, text: 'H1 MSS BUY', dir: 'UP' },
        notes: 'Verbatim PDF Page 6: OB does not have to be on structure level. Invalidation is 4 candles closing beyond HTF OB on H1.',
      },
    ],
  },

  // =========================================================================
  // MODEL 7 (Variations 7A & 7B preserved)
  // =========================================================================
  {
    id: 'SBT-07',
    number: 7,
    name: 'SBT Model (7)',
    title: 'Engineered Liquidity (IDM-A & IDM-B) Sweep into Area 2',
    subtitle: 'Price forms support liquidity pool (IDM); sweeps through IDM into Area 2 demand without closing below',
    category: 'LIQUIDITY_ENGINEERING',
    rules: [
      '1. We have one of those 4 conditions.',
      '2. Prices retrace back to the area around 2.',
      '3. We see prices rising higher above level 2.',
      '4. It creates a support area below which there will be Liquidity getting engineered.',
      '5. Prices either break below that idm or wick through that idm, and test the area of 2.',
      '6. Testing candle should not close below the area of 2.',
      '7. We will enter Buy at the opening of Next candle, targeting 3.',
    ],
    entryCondition: 'Enter Buy at the opening of Next candle once testing candle sweeps through IDM, tests Area 2, and closes without breaking below Area 2.',
    targetCondition: 'Target Area 3 (the swing high).',
    invalidationCondition: 'Testing candle closes below the boundary of Area 2.',
    numberedMarkers: [
      { marker: 1, title: 'Break of Structure (BOS)', description: 'Bullish BOS established.' },
      { marker: 2, title: 'Retrace to Area 2', description: 'Price retraces near Area 2 and rises higher.' },
      { marker: 3, title: 'Engineered Liquidity (IDM)', description: 'Creates a support area where retail liquidity is engineered.' },
      { marker: 4, title: 'Sweep through IDM', description: 'Prices break or wick through IDM to test Area 2.' },
      { marker: 5, title: 'Execution & Target', description: 'Enter Buy on next candle targeting Area 3.' },
    ],
    variations: [
      {
        id: '7A',
        name: 'Model 7A — IDM-A Support Pool Sweep',
        subtitle: 'Multi-candle support pool engineered liquidity swept into Area 2',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 52, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 52, close: 68, high: 70, low: 50, type: 'BULLISH' }, // Swing High
          { id: 4, open: 68, close: 52, high: 70, low: 50, type: 'BEARISH' },
          { id: 5, open: 52, close: 36, high: 53, low: 34, type: 'BEARISH' }, // Area 2 base
          { id: 6, open: 36, close: 56, high: 58, low: 35, type: 'BULLISH' },
          { id: 7, open: 56, close: 76, high: 78, low: 55, type: 'BULLISH' }, // BOS
          { id: 8, open: 76, close: 94, high: 96, low: 75, type: 'BULLISH' }, // Area 3
          { id: 9, open: 94, close: 78, high: 95, low: 76, type: 'BEARISH' },
          { id: 10, open: 78, close: 55, high: 80, low: 54, type: 'BEARISH' }, // Retrace toward 2
          { id: 11, open: 55, close: 64, high: 66, low: 54, type: 'BULLISH' }, // Creates IDM-A support
          { id: 12, open: 64, close: 55, high: 65, low: 54, type: 'BEARISH' }, // Equal low 1
          { id: 13, open: 55, close: 63, high: 65, low: 54, type: 'BULLISH' }, // Equal low 2
          { id: 14, open: 63, close: 38, high: 64, low: 35, type: 'BEARISH' }, // Sweeps IDM-A into Area 2!
          { id: 15, open: 38, close: 62, high: 65, low: 37, type: 'BULLISH', highlight: true }, // Buy Entry
        ],
        zones: [
          {
            id: 'z-m7a-area2',
            name: 'Area 2 Demand Zone',
            yTop: 52,
            yBottom: 34,
            xStart: 4.8,
            xEnd: 15.5,
            color: 'rgba(148, 163, 184, 0.3)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            label: 'Area 2',
            type: 'DEMAND',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
          { y: 54, xStart: 10.5, xEnd: 13.5, label: 'IDM-A', color: '#000000', dashed: true },
        ],
        entryArrow: { x: 14.8, y: 38, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 7: IDM-A represents support area with engineered liquidity. Sweep into Area 2 triggers buy.',
      },
      {
        id: '7B',
        name: 'Model 7B — IDM-B with OB/SnD/Two Candle Below',
        subtitle: 'Engineered IDM-B with dedicated OB/SnD/Two-Candle zone sitting below',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 52, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 52, close: 68, high: 70, low: 50, type: 'BULLISH' },
          { id: 4, open: 68, close: 48, high: 70, low: 46, type: 'BEARISH' }, // Retrace
          { id: 5, open: 48, close: 40, high: 49, low: 38, type: 'BEARISH' }, // OB / SnD / Two Candle
          { id: 6, open: 40, close: 58, high: 60, low: 39, type: 'BULLISH' },
          { id: 7, open: 58, close: 78, high: 80, low: 57, type: 'BULLISH' }, // BOS
          { id: 8, open: 78, close: 96, high: 98, low: 77, type: 'BULLISH' }, // Area 3
          { id: 9, open: 96, close: 76, high: 97, low: 74, type: 'BEARISH' },
          { id: 10, open: 76, close: 62, high: 77, low: 60, type: 'BEARISH' }, // IDM-B support
          { id: 11, open: 62, close: 72, high: 74, low: 61, type: 'BULLISH' },
          { id: 12, open: 72, close: 42, high: 73, low: 39, type: 'BEARISH' }, // Sweeps IDM-B into OB/SnD
          { id: 13, open: 42, close: 66, high: 68, low: 41, type: 'BULLISH', highlight: true }, // Buy Entry
        ],
        zones: [
          {
            id: 'z-m7b-obsnd',
            name: 'OB / SnD / Two Candle Zone',
            yTop: 48,
            yBottom: 38,
            xStart: 4.5,
            xEnd: 13.5,
            color: 'rgba(148, 163, 184, 0.3)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            label: 'OB/SnD/Two Candle',
            type: 'DEMAND',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
          { y: 60, xStart: 9.8, xEnd: 11.5, label: 'IDM-B', color: '#000000', dashed: true },
        ],
        entryArrow: { x: 12.8, y: 42, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 8: IDM-B sits above OB/SnD/Two Candle. Sweep through IDM-B into the zone triggers buy.',
      },
    ],
  },

  // =========================================================================
  // MODEL 8 (Variations 8A & 8B preserved)
  // =========================================================================
  {
    id: 'SBT-08',
    number: 8,
    name: 'SBT Model (8)',
    title: 'Inducement (IDM-A & IDM-B) Sweep Direct to BOS Mitigation',
    subtitle: 'Engineered inducement swept directly down into the previous BOS level acting as support',
    category: 'LIQUIDITY_ENGINEERING',
    rules: [
      '1. Market creates a Bullish BOS.',
      '2. Inducement (IDM-A / IDM-B) is engineered above the BOS level.',
      '3. Price breaks or wicks through the inducement directly into the BOS level.',
      '4. Testing candle respects the BOS level and does not close below it.',
      '5. Enter Buy at opening of next candle, targeting the recent highs.',
    ],
    entryCondition: 'Enter Buy at opening of next candle once IDM is swept and testing candle respects the BOS mitigation line.',
    targetCondition: 'Target recent swing highs.',
    invalidationCondition: 'Testing candle closes below the BOS line.',
    numberedMarkers: [
      { marker: 1, title: 'Break of Structure (BOS)', description: 'Bullish BOS line established at previous high.' },
      { marker: 2, title: 'Engineered Liquidity', description: 'IDM-A (pool of candles) or IDM-B (two-candle pause) forms above BOS.' },
      { marker: 3, title: 'Direct Sweep to BOS', description: 'Price sweeps through IDM straight into the BOS level.' },
      { marker: 4, title: 'Buy Execution', description: 'Enter Buy at opening of candle following the test.' },
    ],
    variations: [
      {
        id: '8A',
        name: 'Model 8A — IDM-A Sweep to BOS',
        subtitle: 'Multi-candle IDM-A swept straight into BOS level',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 52, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 52, close: 68, high: 70, low: 50, type: 'BULLISH' }, // Swing High
          { id: 4, open: 68, close: 52, high: 70, low: 50, type: 'BEARISH' },
          { id: 5, open: 52, close: 36, high: 53, low: 34, type: 'BEARISH' },
          { id: 6, open: 36, close: 56, high: 58, low: 35, type: 'BULLISH' },
          { id: 7, open: 56, close: 76, high: 78, low: 55, type: 'BULLISH' }, // BOS break
          { id: 8, open: 76, close: 96, high: 98, low: 75, type: 'BULLISH' }, // High
          { id: 9, open: 96, close: 80, high: 97, low: 78, type: 'BEARISH' },
          { id: 10, open: 80, close: 76, high: 82, low: 74, type: 'BEARISH' }, // IDM-A
          { id: 11, open: 76, close: 80, high: 82, low: 74, type: 'BULLISH' }, // IDM-A
          { id: 12, open: 80, close: 76, high: 82, low: 74, type: 'BEARISH' }, // IDM-A
          { id: 13, open: 76, close: 70, high: 78, low: 68, type: 'BEARISH' }, // Sweeps IDM-A to BOS
          { id: 14, open: 70, close: 88, high: 90, low: 69, type: 'BULLISH', highlight: true }, // Buy
        ],
        zones: [
          {
            id: 'z-m8a-bos',
            name: 'BOS Mitigation Level',
            yTop: 72,
            yBottom: 68,
            xStart: 2.8,
            xEnd: 14.5,
            color: 'rgba(148, 163, 184, 0.3)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            label: 'BOS Retest Area',
            type: 'MB',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
          { y: 74, xStart: 9.8, xEnd: 12.5, label: 'IDM-A', color: '#000000', dashed: true },
        ],
        entryArrow: { x: 13.8, y: 70, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 9 (Left): Model 8A. IDM-A swept straight into the BOS level.',
      },
      {
        id: '8B',
        name: 'Model 8B — IDM-B Sweep to BOS',
        subtitle: 'Two-candle consolidation IDM-B swept straight into BOS level',
        candles: [
          { id: 1, open: 20, close: 35, high: 38, low: 18, type: 'BULLISH' },
          { id: 2, open: 35, close: 52, high: 54, low: 34, type: 'BULLISH' },
          { id: 3, open: 52, close: 68, high: 70, low: 50, type: 'BULLISH' },
          { id: 4, open: 68, close: 52, high: 70, low: 50, type: 'BEARISH' },
          { id: 5, open: 52, close: 36, high: 53, low: 34, type: 'BEARISH' },
          { id: 6, open: 36, close: 56, high: 58, low: 35, type: 'BULLISH' },
          { id: 7, open: 56, close: 76, high: 78, low: 55, type: 'BULLISH' }, // BOS break
          { id: 8, open: 76, close: 98, high: 100, low: 75, type: 'BULLISH' }, // High
          { id: 9, open: 98, close: 82, high: 99, low: 80, type: 'BEARISH' },
          { id: 10, open: 82, close: 78, high: 84, low: 76, type: 'BEARISH' }, // IDM-B
          { id: 11, open: 78, close: 84, high: 86, low: 77, type: 'BULLISH' }, // IDM-B
          { id: 12, open: 84, close: 70, high: 85, low: 68, type: 'BEARISH' }, // Sweeps IDM-B to BOS
          { id: 13, open: 70, close: 90, high: 92, low: 69, type: 'BULLISH', highlight: true }, // Buy
        ],
        zones: [
          {
            id: 'z-m8b-bos',
            name: 'BOS Mitigation Level',
            yTop: 72,
            yBottom: 68,
            xStart: 2.8,
            xEnd: 13.5,
            color: 'rgba(148, 163, 184, 0.3)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            label: 'BOS Retest Area',
            type: 'MB',
          },
        ],
        lines: [
          { y: 70, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
          { y: 77, xStart: 9.8, xEnd: 11.5, label: 'IDM-B', color: '#000000', dashed: true },
        ],
        entryArrow: { x: 12.8, y: 70, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 9 (Right): Model 8B. IDM-B swept straight into the BOS level.',
      },
    ],
  },

  // =========================================================================
  // MODEL 9 (Single Wick vs Two-Candle Turtle Soup Variations preserved)
  // =========================================================================
  {
    id: 'SBT-09',
    number: 9,
    name: 'SBT Model (9)',
    title: 'No Inducement Turtle Soup Model (Single Wick & Two-Candle)',
    subtitle: 'No inducement at Area 2; wait for turtle soup into unmitigated PD array below Area 2',
    category: 'TURTLE_SOUP',
    rules: [
      '1. We have one of those conditions.',
      '2. We dont see any Inducement.',
      '3. Market comes to area of 2, we wont buy even if testing candle closes above 2.',
      '4. We will wait for a turtle soup, till next PD array(below 2) which should be unmitigated.',
      '5. Incase of turtle with wick, then we will enter on the opening of next candle.',
      '6. In case of turtle soup with two candles, we will wait for 2nd candle to close back above the area of 2.',
    ],
    entryCondition: 'Single Wick Turtle: Enter on opening of next candle after wick sweeps PD array. Two Candle Turtle: Wait for 2nd candle to close back above Area 2, then enter Buy.',
    targetCondition: 'Target recent highs or next opposing structural level.',
    invalidationCondition: 'Candle closes fully below the unmitigated PD array.',
    numberedMarkers: [
      { marker: 1, title: 'No Inducement Detected', description: 'Rule 2: Market lacks inducement; do NOT buy Area 2 even if testing candle closes above 2.' },
      { marker: 2, title: 'Wait for Turtle Soup', description: 'Rule 4: Wait for liquidity sweep down to the next unmitigated PD array sitting below Area 2.' },
      { marker: 3, title: 'PD Array Unmitigated', description: 'Unmitigated OB/SnD/FVG positioned beneath Area 2.' },
      { marker: 4, title: 'Single Wick Variation', description: 'Rule 5: Wick taps unmitigated PD array; enter on opening of next candle.' },
      { marker: 5, title: 'Two Candle Variation', description: 'Rule 6: 2nd candle closes back above Area 2; enter on confirmation.' },
    ],
    variations: [
      {
        id: '9A-WICK',
        name: 'Model 9 — Single Wick Turtle Soup',
        subtitle: 'Wick sweeps through Area 2 into unmitigated PD array below; enter on next candle open',
        candles: [
          { id: 1, open: 15, close: 28, high: 30, low: 14, type: 'BULLISH' }, // Origin PD array
          { id: 2, open: 28, close: 46, high: 48, low: 26, type: 'BULLISH' },
          { id: 3, open: 46, close: 66, high: 68, low: 44, type: 'BULLISH' }, // Swing High
          { id: 4, open: 66, close: 54, high: 68, low: 52, type: 'BEARISH' },
          { id: 5, open: 54, close: 44, high: 55, low: 42, type: 'BEARISH' }, // Area 2
          { id: 6, open: 44, close: 62, high: 64, low: 43, type: 'BULLISH' },
          { id: 7, open: 62, close: 82, high: 84, low: 60, type: 'BULLISH' }, // BOS break
          { id: 8, open: 82, close: 100, high: 102, low: 80, type: 'BULLISH' }, // High
          { id: 9, open: 100, close: 84, high: 101, low: 82, type: 'BEARISH' },
          { id: 10, open: 84, close: 68, high: 85, low: 66, type: 'BEARISH' },
          { id: 11, open: 68, close: 52, high: 70, low: 50, type: 'BEARISH' },
          { id: 12, open: 52, close: 56, high: 58, low: 50, type: 'BULLISH' }, // In Area 2, NO BUY
          { id: 13, open: 56, close: 46, high: 57, low: 22, type: 'BEARISH' }, // WICK sweeps to PD array!
          { id: 14, open: 46, close: 68, high: 70, low: 45, type: 'BULLISH', highlight: true }, // Buy Entry
        ],
        zones: [
          {
            id: 'z-m9a-area2',
            name: 'Area 2 (Do Not Buy Without Inducement)',
            yTop: 54,
            yBottom: 44,
            xStart: 4.8,
            xEnd: 14.5,
            color: 'rgba(148, 163, 184, 0.25)',
            borderColor: 'rgba(148, 163, 184, 0.6)',
            label: 'Area 2',
            type: 'DEMAND',
          },
          {
            id: 'z-m9a-pd',
            name: 'PD Array Unmitigated OB/SnD/FVG',
            yTop: 30,
            yBottom: 14,
            xStart: 0.8,
            xEnd: 14.5,
            color: 'rgba(148, 163, 184, 0.35)',
            borderColor: 'rgba(148, 163, 184, 0.75)',
            label: 'PD array Unmitigated OB/SnD/FVG',
            type: 'PD_ARRAY',
          },
        ],
        lines: [
          { y: 68, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 13.8, y: 46, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 10: Rule 5. In case of turtle with wick, enter on opening of next candle.',
      },
      {
        id: '9B-TWOCANDLE',
        name: 'Model 9 — Two-Candle Turtle Soup',
        subtitle: 'Candle 1 closes into PD array; Candle 2 closes back above Area 2 for entry',
        candles: [
          { id: 1, open: 15, close: 28, high: 30, low: 14, type: 'BULLISH' }, // Origin PD array
          { id: 2, open: 28, close: 46, high: 48, low: 26, type: 'BULLISH' },
          { id: 3, open: 46, close: 66, high: 68, low: 44, type: 'BULLISH' },
          { id: 4, open: 66, close: 54, high: 68, low: 52, type: 'BEARISH' },
          { id: 5, open: 54, close: 44, high: 55, low: 42, type: 'BEARISH' }, // Area 2
          { id: 6, open: 44, close: 62, high: 64, low: 43, type: 'BULLISH' },
          { id: 7, open: 62, close: 82, high: 84, low: 60, type: 'BULLISH' }, // BOS break
          { id: 8, open: 82, close: 100, high: 102, low: 80, type: 'BULLISH' },
          { id: 9, open: 100, close: 84, high: 101, low: 82, type: 'BEARISH' },
          { id: 10, open: 84, close: 68, high: 85, low: 66, type: 'BEARISH' },
          { id: 11, open: 68, close: 52, high: 70, low: 50, type: 'BEARISH' },
          { id: 12, open: 52, close: 56, high: 58, low: 50, type: 'BULLISH' },
          { id: 13, open: 56, close: 26, high: 57, low: 24, type: 'BEARISH' }, // Candle 1 closes down into PD array
          { id: 14, open: 26, close: 58, high: 60, low: 25, type: 'BULLISH', highlight: true }, // Candle 2 closes back above Area 2!
        ],
        zones: [
          {
            id: 'z-m9b-area2',
            name: 'Area 2',
            yTop: 54,
            yBottom: 44,
            xStart: 4.8,
            xEnd: 14.5,
            color: 'rgba(148, 163, 184, 0.25)',
            borderColor: 'rgba(148, 163, 184, 0.6)',
            label: 'Area 2',
            type: 'DEMAND',
          },
          {
            id: 'z-m9b-pd',
            name: 'PD Array Unmitigated OB/SnD/FVG',
            yTop: 30,
            yBottom: 14,
            xStart: 0.8,
            xEnd: 14.5,
            color: 'rgba(148, 163, 184, 0.35)',
            borderColor: 'rgba(148, 163, 184, 0.75)',
            label: 'PD array Unmitigated OB/SnD/FVG',
            type: 'PD_ARRAY',
          },
        ],
        lines: [
          { y: 68, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 13.8, y: 58, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 11: Rule 6. Two-candle turtle soup: wait for 2nd candle to close back above Area 2.',
      },
    ],
  },

  // =========================================================================
  // MODEL 10 (Single Wick vs Two Candle Close Back Variations preserved)
  // =========================================================================
  {
    id: 'SBT-10',
    number: 10,
    name: 'SBT Model (10)',
    title: 'Unmitigated PD Array Sweep & Close Back Area (1)',
    subtitle: 'Price sweeps into unmitigated PD array below Area 1; enter buy upon confirmed Close Back Area (1)',
    category: 'TURTLE_SOUP',
    rules: [
      '1. Bullish BOS confirmed.',
      '2. Below the structure sits a clean PD array unmitigated OB/SnD/FVG.',
      '3. Price retraces and sweeps into the unmitigated PD array below structure Area 1.',
      '4. Price must close back above Area (1).',
      '5. Enter Buy upon verified close back above Area (1).',
      '6. Invalidation: Candle body closing below the unmitigated PD array.',
    ],
    entryCondition: 'Enter Buy upon confirmed close back above Area 1 (either via single-candle wick sweep with close back, or 2nd candle closing back above).',
    targetCondition: 'Target recent highs or next opposing liquidity pool.',
    invalidationCondition: 'Candle closes below the unmitigated PD array.',
    numberedMarkers: [
      { marker: 1, title: 'Break of Structure (BOS)', description: 'Bullish BOS confirmed.' },
      { marker: 2, title: 'Structure Area (1)', description: 'Structure level Area 1.' },
      { marker: 3, title: 'PD Array Unmitigated', description: 'Unmitigated OB/SnD/FVG sitting below Area 1.' },
      { marker: 4, title: 'Liquidity Sweep', description: 'Market sweeps down into the unmitigated PD array.' },
      { marker: 5, title: 'Close Back Area (1)', description: 'Price closes back above Area 1, triggering Buy.' },
    ],
    variations: [
      {
        id: '10A-WICK',
        name: 'Model 10 — Single Wick Sweep & Close Back',
        subtitle: 'Single wick sweeps into unmitigated PD array and closes back above Area 1',
        candles: [
          { id: 1, open: 15, close: 28, high: 30, low: 14, type: 'BULLISH' }, // PD array origin
          { id: 2, open: 28, close: 46, high: 48, low: 26, type: 'BULLISH' },
          { id: 3, open: 46, close: 66, high: 68, low: 44, type: 'BULLISH' }, // Swing High
          { id: 4, open: 66, close: 52, high: 68, low: 50, type: 'BEARISH' },
          { id: 5, open: 52, close: 38, high: 53, low: 36, type: 'BEARISH' }, // Area 1
          { id: 6, open: 38, close: 58, high: 60, low: 37, type: 'BULLISH' },
          { id: 7, open: 58, close: 78, high: 80, low: 57, type: 'BULLISH' }, // BOS break
          { id: 8, open: 78, close: 96, high: 98, low: 76, type: 'BULLISH' }, // High
          { id: 9, open: 96, close: 80, high: 97, low: 78, type: 'BEARISH' },
          { id: 10, open: 80, close: 54, high: 82, low: 22, type: 'BEARISH' }, // WICK sweeps to PD array, body closes back above Area 1!
          { id: 11, open: 54, close: 74, high: 76, low: 53, type: 'BULLISH', highlight: true }, // Buy Entry
        ],
        zones: [
          {
            id: 'z-m10a-area1',
            name: 'Structure Area (1)',
            yTop: 52,
            yBottom: 48,
            xStart: 4.8,
            xEnd: 11.5,
            color: 'rgba(148, 163, 184, 0.25)',
            borderColor: 'rgba(148, 163, 184, 0.6)',
            label: 'Close Back area (1)',
            type: 'DEMAND',
          },
          {
            id: 'z-m10a-pd',
            name: 'PD array Unmitigated OB/SnD/FVG',
            yTop: 30,
            yBottom: 14,
            xStart: 0.8,
            xEnd: 11.5,
            color: 'rgba(148, 163, 184, 0.35)',
            borderColor: 'rgba(148, 163, 184, 0.75)',
            label: 'PD array Unmitigated OB/SnD/FVG',
            type: 'PD_ARRAY',
          },
        ],
        lines: [
          { y: 68, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 10.8, y: 54, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 12 (Left diagram): Single wick sweeps PD array, candle closes back above Area 1.',
      },
      {
        id: '10B-TWOCANDLE',
        name: 'Model 10 — Two-Candle Sweep & Close Back',
        subtitle: 'Two candles sweep into unmitigated PD array with 2nd candle closing back above Area 1',
        candles: [
          { id: 1, open: 15, close: 28, high: 30, low: 14, type: 'BULLISH' },
          { id: 2, open: 28, close: 46, high: 48, low: 26, type: 'BULLISH' },
          { id: 3, open: 46, close: 66, high: 68, low: 44, type: 'BULLISH' },
          { id: 4, open: 66, close: 52, high: 68, low: 50, type: 'BEARISH' },
          { id: 5, open: 52, close: 38, high: 53, low: 36, type: 'BEARISH' }, // Area 1
          { id: 6, open: 38, close: 58, high: 60, low: 37, type: 'BULLISH' },
          { id: 7, open: 58, close: 78, high: 80, low: 57, type: 'BULLISH' }, // BOS break
          { id: 8, open: 78, close: 96, high: 98, low: 76, type: 'BULLISH' },
          { id: 9, open: 96, close: 80, high: 97, low: 78, type: 'BEARISH' },
          { id: 10, open: 80, close: 32, high: 82, low: 24, type: 'BEARISH' }, // Candle 1 enters PD array
          { id: 11, open: 32, close: 56, high: 58, low: 30, type: 'BULLISH' }, // Candle 2 closes back above Area 1!
          { id: 12, open: 56, close: 76, high: 78, low: 55, type: 'BULLISH', highlight: true }, // Buy Entry
        ],
        zones: [
          {
            id: 'z-m10b-area1',
            name: 'Structure Area (1)',
            yTop: 52,
            yBottom: 48,
            xStart: 4.8,
            xEnd: 12.5,
            color: 'rgba(148, 163, 184, 0.25)',
            borderColor: 'rgba(148, 163, 184, 0.6)',
            label: 'Close Back area (1)',
            type: 'DEMAND',
          },
          {
            id: 'z-m10b-pd',
            name: 'PD array Unmitigated OB/SnD/FVG',
            yTop: 30,
            yBottom: 14,
            xStart: 0.8,
            xEnd: 12.5,
            color: 'rgba(148, 163, 184, 0.35)',
            borderColor: 'rgba(148, 163, 184, 0.75)',
            label: 'PD array Unmitigated OB/SnD/FVG',
            type: 'PD_ARRAY',
          },
        ],
        lines: [
          { y: 68, xStart: 2.8, xEnd: 7.5, label: 'Bos', color: '#000000' },
        ],
        entryArrow: { x: 11.8, y: 56, text: 'BUY', dir: 'UP' },
        notes: 'PDF Page 12 (Right diagram): Two candles sweep PD array, 2nd candle closes back above Area 1.',
      },
    ],
  },
];
