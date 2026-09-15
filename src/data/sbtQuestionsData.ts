export type QuestionType =
  | 'MODEL_ID'
  | 'GRAPHICAL_MC'
  | 'RULE_ID'
  | 'ENTRY_TARGET'
  | 'SEQUENCE'
  | 'TRUE_FALSE'
  | 'MATCHING';

export type QuestionDifficulty = 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED' | 'MASTER';

export interface SbtQuestion {
  id: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  modelId?: string; // e.g. 'SBT-01', or undefined for multi-model questions
  prompt: string;
  subtext?: string;
  diagramModelId?: string; // if graphical, render the model diagram
  diagramVariationId?: string;
  options: string[];
  correctAnswerIndex: number; // 0-based index of correct option
  sequenceCorrectOrder?: string[]; // for sequence type
  matchingPairs?: { left: string; right: string }[]; // for matching type
  explanation: string;
  sourceRuleCitation: string;
}

export const SBT_QUESTIONS: SbtQuestion[] = [
  // ==========================================
  // MODEL 1 QUESTIONS
  // ==========================================
  {
    id: 'Q-01',
    type: 'RULE_ID',
    difficulty: 'FOUNDATION',
    modelId: 'SBT-01',
    prompt: 'In SBT Model (1), exactly how is the order block zone around Area 2 marked?',
    subtext: 'Reference the official PDF rules for Model 1',
    options: [
      'From the highest wick of the swing to the lowest body close',
      'From the open to the lowest wick of the lowest bearish closing candle',
      'From the 50% equilibrium level of the displacement impulse candle',
      'From the close of the bullish BOS candle to the nearest swing low',
    ],
    correctAnswerIndex: 1,
    explanation: 'According to SBT Model (1) Rule 2 & 3: "We will mark lowest bearish closing candle around area of 2. From open to lowest wick."',
    sourceRuleCitation: 'SBT Model 1, Rules 2 & 3',
  },
  {
    id: 'Q-02',
    type: 'ENTRY_TARGET',
    difficulty: 'INTERMEDIATE',
    modelId: 'SBT-01',
    prompt: 'Where is the exact entry taken and what is the primary target in SBT Model (1)?',
    options: [
      'Enter limit order at 50% of the zone; Target is 1:1 risk-reward',
      'Enter Buy at the opening of the next candle after the test; Target is Area 3 (the swing high)',
      'Enter immediately on the first touch of the zone; Target is the next HTF level',
      'Enter after 3 consecutive bullish candle closes above Area 2; Target is open-ended',
    ],
    correctAnswerIndex: 1,
    explanation: 'Rule 6 & 7: "We will enter Buy at the opening of next candle. Target will be area of 3."',
    sourceRuleCitation: 'SBT Model 1, Rules 6 & 7',
  },
  {
    id: 'Q-03',
    type: 'TRUE_FALSE',
    difficulty: 'FOUNDATION',
    modelId: 'SBT-01',
    prompt: 'True or False: In SBT Model (1), the testing candle is allowed to close below the lower boundary of Area 2 as long as the wick sweeps liquidity.',
    options: ['True', 'False'],
    correctAnswerIndex: 1,
    explanation: 'False! Rule 5 strictly states: "Testing candle should not close below area of 2." Any candle closure below Area 2 invalidates the model.',
    sourceRuleCitation: 'SBT Model 1, Rule 5',
  },

  // ==========================================
  // MODEL 2 QUESTIONS
  // ==========================================
  {
    id: 'Q-04',
    type: 'RULE_ID',
    difficulty: 'INTERMEDIATE',
    modelId: 'SBT-02',
    prompt: 'In SBT Model (2), what is the mandatory requirement for the demand candle relative to the BOS and the Mitigation Block (MB)?',
    options: [
      'Demand candle must form after the BOS and sit below the MB',
      'Demand candle must form before the BOS and must overlap with the MB',
      'Demand candle must be a doji candle formed at the exact midpoint of the MB',
      'Demand candle must be unmitigated on the Daily timeframe only',
    ],
    correctAnswerIndex: 1,
    explanation: 'SBT Model (2) Rule 2 & 3: "Market creates a demand zone which must overlap with MB. Demand candle must form before Bos."',
    sourceRuleCitation: 'SBT Model 2, Rules 2 & 3',
  },
  {
    id: 'Q-05',
    type: 'TRUE_FALSE',
    difficulty: 'INTERMEDIATE',
    modelId: 'SBT-02',
    prompt: 'In SBT Model (2), must the testing candle be bullish to enter the trade?',
    options: [
      'True — it must be a bullish rejection candle',
      'False — the testing candle can be either bullish or bearish as long as it does not close below the MB',
    ],
    correctAnswerIndex: 1,
    explanation: 'Rule 7 explicitly states: "Testing candle can either be bullish or bearish and it can close anywhere except below the MB."',
    sourceRuleCitation: 'SBT Model 2, Rule 7',
  },

  // ==========================================
  // MODEL 3 & 4 QUESTIONS
  // ==========================================
  {
    id: 'Q-06',
    type: 'MODEL_ID',
    difficulty: 'FOUNDATION',
    modelId: 'SBT-03',
    prompt: 'Which SBT Model is defined primarily by an unmitigated Fair Value Gap (FVG) formed at the structural break level during an impulsive BOS?',
    options: [
      'SBT Model (1)',
      'SBT Model (3)',
      'SBT Model (6)',
      'SBT Model (9)',
    ],
    correctAnswerIndex: 1,
    explanation: 'SBT Model (3) is specifically the Fair Value Gap (FVG) retest model.',
    sourceRuleCitation: 'SBT Model 3, Rule 1',
  },
  {
    id: 'Q-07',
    type: 'RULE_ID',
    difficulty: 'INTERMEDIATE',
    modelId: 'SBT-04',
    prompt: 'In SBT Model (4), what two critical structural elements must align around the area of 2?',
    options: [
      'A trendline and a 200 EMA crossover',
      'An unmitigated OB/CISD with a Fair Value Gap (FVG) around Area 2',
      'Equal highs and a volume divergence indicator',
      'A double bottom with an unmitigated weekly wick',
    ],
    correctAnswerIndex: 1,
    explanation: 'SBT Model 4 Rules 1, 2 & 3: "There must be a FVG around area of 2. There must be a BOS. The OB/CISD must be unmitigated."',
    sourceRuleCitation: 'SBT Model 4, Rules 1-3',
  },

  // ==========================================
  // MODEL 5 QUESTIONS
  // ==========================================
  {
    id: 'Q-08',
    type: 'RULE_ID',
    difficulty: 'INTERMEDIATE',
    modelId: 'SBT-05',
    prompt: 'In SBT Model (5), what two types of order blocks can align with the Mitigation Block?',
    options: [
      'Only 1-minute order blocks',
      'Single candle OB or Multiple Candle Order Block (MCOB)',
      'Breaker blocks and volume imbalance blocks only',
      'Rejection blocks and vacuum blocks only',
    ],
    correctAnswerIndex: 1,
    explanation: 'SBT Model 5 Rule 4 explicitly specifies: "OB can either be Single candle OB or MCOB."',
    sourceRuleCitation: 'SBT Model 5, Rule 4',
  },

  // ==========================================
  // MODEL 6 QUESTIONS (HTF REVERSAL)
  // ==========================================
  {
    id: 'Q-09',
    type: 'RULE_ID',
    difficulty: 'ADVANCED',
    modelId: 'SBT-06',
    prompt: 'In SBT Model (6) (Reversal Model), what is the exact rule for INVALIDATION if no H1 MSS appears?',
    subtext: 'Check Rule 7 from the authoritative PDF',
    options: [
      'Invalidated if price touches the 50% equilibrium line',
      'Invalidated if 4 candles close beyond the HTF OB on the H1 timeframe',
      'Invalidated if a red news event occurs during the session',
      'Invalidated after 24 hours have elapsed without a break',
    ],
    correctAnswerIndex: 1,
    explanation: 'SBT Model (6) Rule 7 verbatim: "If we are not able to see a H1 MsS and we see 4 candles closing beyond the HTF OB in H1, then this OB will be invalidated and we will continue taking trades on H1."',
    sourceRuleCitation: 'SBT Model 6, Rule 7',
  },
  {
    id: 'Q-10',
    type: 'TRUE_FALSE',
    difficulty: 'INTERMEDIATE',
    modelId: 'SBT-06',
    prompt: 'True or False: In SBT Model (6), the unmitigated Daily or Weekly OB MUST be situated directly on a major structure level.',
    options: [
      'True — it must align with a prior swing high or swing low',
      'False — Rule 2 states "This OB doesnt have to be on a structure level"',
    ],
    correctAnswerIndex: 1,
    explanation: 'False! Rule 2 explicitly clarifies: "This OB doesnt have to be on a structure level."',
    sourceRuleCitation: 'SBT Model 6, Rule 2',
  },

  // ==========================================
  // MODEL 7 & 8 QUESTIONS (LIQUIDITY & INDUCEMENT)
  // ==========================================
  {
    id: 'Q-11',
    type: 'RULE_ID',
    difficulty: 'ADVANCED',
    modelId: 'SBT-07',
    prompt: 'In SBT Model (7), why does the market create a support area (IDM) before testing Area 2?',
    options: [
      'To signal a guaranteed trend reversal to the downside',
      'To engineer liquidity below which retail stop losses gather before the sweep into Area 2',
      'To satisfy a moving average convergence condition',
      'To allow institutional algorithms to take a planned recess',
    ],
    correctAnswerIndex: 1,
    explanation: 'Rule 4 states: "It creates a support area below which there will be Liquidity getting engineered." This liquidity is swept into Area 2 before the true expansion to Area 3.',
    sourceRuleCitation: 'SBT Model 7, Rule 4',
  },
  {
    id: 'Q-12',
    type: 'MODEL_ID',
    difficulty: 'INTERMEDIATE',
    modelId: 'SBT-08',
    prompt: 'In SBT Model (8), where does the price sweep directly into after taking out the engineered inducement (IDM-A / IDM-B)?',
    options: [
      'Directly into the previous swing low origin',
      'Directly into the previous BOS level acting as mitigation support',
      'Directly into an unmitigated weekly imbalance',
      'Directly into the Asian session midpoint',
    ],
    correctAnswerIndex: 1,
    explanation: 'In SBT Model (8), price sweeps the inducement (IDM-A or IDM-B) directly into the prior BOS level which acts as support/mitigation.',
    sourceRuleCitation: 'SBT Model 8, Rules 1-4',
  },

  // ==========================================
  // MODEL 9 & 10 QUESTIONS (TURTLE SOUP & CLOSE BACK)
  // ==========================================
  {
    id: 'Q-13',
    type: 'RULE_ID',
    difficulty: 'MASTER',
    modelId: 'SBT-09',
    prompt: 'In SBT Model (9), if the market reaches Area 2 but NO Inducement was formed, what must the trader do?',
    options: [
      'Buy immediately because the demand zone is pristine',
      'Do NOT buy Area 2 even if the testing candle closes above 2; wait for a turtle soup into the unmitigated PD array below',
      'Switch timeframes to M1 and scalp aggressively',
      'Enter a counter-trend short position',
    ],
    correctAnswerIndex: 1,
    explanation: 'SBT Model 9 Rule 2, 3 & 4: "We dont see any Inducement. Market comes to area of 2, we wont buy even if testing candle closes above 2. We will wait for a turtle soup, till next PD array(below 2) which should be unmitigated."',
    sourceRuleCitation: 'SBT Model 9, Rules 2-4',
  },
  {
    id: 'Q-14',
    type: 'ENTRY_TARGET',
    difficulty: 'MASTER',
    modelId: 'SBT-09',
    prompt: 'What are the two execution variations for the Turtle Soup in SBT Model (9)?',
    options: [
      'Stop entry vs limit entry at equilibrium',
      'Single wick turtle: enter on opening of next candle; Two-candle turtle: wait for 2nd candle to close back above Area 2',
      'Breakout candle entry vs retest candle entry',
      'Fixed pip offset entry vs trailing stop entry',
    ],
    correctAnswerIndex: 1,
    explanation: 'Rules 5 & 6: "Incase of turtle with wick, then we will enter on the opening of next candle. In case of turtle soup with two candles, we will wait for 2nd candle to close back above the area of 2."',
    sourceRuleCitation: 'SBT Model 9, Rules 5 & 6',
  },
  {
    id: 'Q-15',
    type: 'RULE_ID',
    difficulty: 'MASTER',
    modelId: 'SBT-10',
    prompt: 'In SBT Model (10), what is the key confirmation required after price sweeps the unmitigated PD array sitting below structure?',
    options: [
      'Price must form 3 green candles',
      'Price must Close Back above Area (1)',
      'Price must create a new higher high immediately',
      'RSI must exit the oversold region',
    ],
    correctAnswerIndex: 1,
    explanation: 'SBT Model 10 is titled "Close Back area (1)". Price sweeps the unmitigated PD array below structure and must close back above Area (1) to validate the entry.',
    sourceRuleCitation: 'SBT Model 10, Page 12',
  },
];
