// ============================================================================
// SBT RULES (RULE LOCK)
// VERBATIM TRANSCRIPTION FROM THE AUTHORITATIVE SBT PDF (PAGES 1 - 12)
// DO NOT MODIFY, SIMPLIFY, REINTERPRET, OR INVENT RULES.
// ============================================================================

export const SBT_RULES: Record<string, string[]> = {
  // Page 1 - S B T Model (1)
  'SBT-01': [
    '1. We have a Bos.',
    '2. We will mark lowest bearish closing candle around area of 2.',
    '3. From open to lowest wick',
    '4. We will wait for the market to test this zone.',
    '5. Testing candle should not close below area of 2.',
    '6. We will enter Buy at the opening of next candle.',
    '7. Target will be area of 3.',
  ],

  // Page 2 - S B T Model (2)
  'SBT-02': [
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

  // Page 3 - S B T Model (3)
  'SBT-03': [
    '(1) Fair Value Gap',
  ],

  // Page 4 - S B T Model (4)
  'SBT-04': [
    '1. There must be a FVG around area of 2.',
    '2. There must be a BOS.',
    '3. The OB/CISD must be unmitigated.',
    '4. Market should come to test this OB and does not close at all below the area of 2.',
    '5. We will enter buy at the opening of next candle.',
  ],

  // Page 5 - S B T Model (5)
  'SBT-05': [
    '1. There must be a Bos.',
    '2. There must be a bearish OB/CISD, that aligns with Mitigation Block.',
    '3. OB should have to be created before Bos.',
    '4. OB can either be Single candle OB or MCOB.',
    '5. Ob should be unmitigated.',
    '6. The testing candle should not close above MB.',
    '7. Enter sell at the opening of next Candle.',
    '8. First target at 3.',
  ],

  // Page 6 - S B T Model (6) - Reversal Model
  'SBT-06': [
    '1. There must be a unmitigated OB on Daily or Weekly timeframe.',
    '2. This OB doesnt have to be on a structure level.',
    '3. When market comes to this area of unmitigated OB, this is the point where we can look for reversals.',
    '4. We will shift to H1 timeframe.',
    '5. Wait for a MsS on H1 in the direction of HTF OB.',
    '6. If we get to see a MsS on H1, then we will look for reversal trades till the next structural area of HTF.',
    '7. If we are not able to see a H1 MsS and we see 4 candles closing beyond the HTF OB in H1, then this OB will be invalidated and we will continue taking trades on H1.',
  ],

  // Page 7 - S B T Model (7 A)
  'SBT-07A': [
    '1. We have one of those 4 conditions.',
    '2. Prices retrace back to the area around 2.',
    '3. We see prices rising higher above level 2.',
    '4. It creates a support area below which there will be Liquidity getting engineered.',
    '5. Prices either break below that idm or wick through that idm, and test the area of 2.',
    '6. Testing candle should not close below the area of 2.',
    '7. We will enter Buy at the opening of Next candle, targeting 3.',
  ],

  // Page 8 - S B T Model (7 B)
  'SBT-07B': [
    '1. We have one of those 4 conditions.',
    '2. Prices retrace back to the area around 2.',
    '3. We see prices rising higher above level 2.',
    '4. It creates a support area below which there will be Liquidity getting engineered.',
    '5. Prices either break below that idm or wick through that idm, and test the area of 2.',
    '6. Testing candle should not close below the area of 2.',
    '7. We will enter Buy at the opening of Next candle, targeting 3.',
  ],

  // Page 9 - S B T Model (8 A)
  'SBT-08A': [
    '1. We have a Bos break establishing bullish structure.',
    '2. Directly above the Bos level, price creates an engineered support area (IDM-A).',
    '3. Market wicks or breaks through IDM-A into the Mitigation / Bos level zone.',
    '4. Testing candle does not close below the marked Bos zone.',
    '5. We will enter Buy at the opening of next candle.',
    '6. First target will be swing high (Area 3).',
  ],

  // Page 9 - S B T Model (8 B)
  'SBT-08B': [
    '1. We have a Bos break establishing bullish structure.',
    '2. Above the Bos level, price creates an inducement swing low (IDM-B).',
    '3. Market wicks through IDM-B and tests the Bos zone.',
    '4. Testing candle does not close below the marked Bos zone.',
    '5. We will enter Buy at the opening of next candle.',
    '6. First target will be swing high (Area 3).',
  ],

  // Pages 10 & 11 - S B T Model (9)
  'SBT-09': [
    '1. We have one of those conditions.',
    '2. We dont see any Inducement.',
    '3. Market comes to area of 2, we wont buy even if testing candle closes above 2.',
    '4. We will wait for a turtle soup, till next PD array(below 2) which should be unmitigated.',
    '5. Incase of turtle with wick, then we will enter on the opening of next candle.',
    '6. In case of turtle soup with two candles, we will wait for 2nd candle to close back above the area of 2.',
  ],

  // Page 12 - S B T Model (10)
  'SBT-10': [
    '1. We have a Bos establishing structural direction.',
    '2. Market retraces below Bos into an Unmitigated PD Array (OB/SnD/FVG).',
    '3. Price tests the unmitigated PD array and creates a Close Back above Area (1).',
    '4. Enter Buy at the opening of next candle upon successful Close Back above Area (1).',
    '5. Target swing highs / Area 3.',
  ],
};
