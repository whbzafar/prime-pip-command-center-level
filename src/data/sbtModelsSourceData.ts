// ============================================================================
// SBT MODELS AUTHORITATIVE SOURCE RECONSTRUCTION
// SOURCE: AUTHORITATIVE SBT PDF (PAGES 1 THROUGH 12)
// STRICT COMPLIANCE: CANDLE COLORS, STRUCTURE, SEQUENCES, ZONES, AND VERBATIM RULES
// ============================================================================

import { SBT_RULES } from './sbtRules';

// SOURCE COLOR LOCK: Exact colors sampled directly from the PDF
export const SBT_SOURCE_COLORS = {
  bullishCandle: '#00A389', // Exact Green / Teal
  bearishCandle: '#DC2626', // Exact Red
  bullishWick: '#00A389',
  bearishWick: '#DC2626',
  zone: '#E2E8F0',          // Exact soft grey zone rectangle
  zoneBorder: '#94A3B8',    // Zone outline
  zoneDark: '#334155',      // For dark theme presentation
  zoneDarkBorder: '#64748B',
  arrow: '#2563EB',         // Exact royal blue pointer arrow
  textDark: '#0F172A',      // Dark text on white canvas
  textLight: '#F1F5F9',     // Crisp text on dark canvas
  bosLine: '#0F172A',       // BOS structural line
} as const;

export interface SbtVectorCandle {
  id: number;
  x: number;
  openY: number;   // Y coordinate in SVG (lower Y = higher price)
  closeY: number;
  highY: number;
  lowY: number;
  type: 'BULLISH' | 'BEARISH';
  bodyColor: string;
  wickColor: string;
  width?: number;
  label?: string;
}

export interface SbtVectorZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
  borderColor?: string;
}

export interface SbtVectorLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  labelX?: number;
  labelY?: number;
  dashed?: boolean;
}

export interface SbtVectorBracket {
  id: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  label: string;
  labelPos?: 'TOP' | 'BOTTOM' | 'CENTER';
}

export interface SbtVectorArrow {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  text: string;
  color?: string;
  textPos?: 'START' | 'END' | 'MIDDLE';
}

export interface SbtModelSourceRecord {
  id: string;
  modelNumber: number;
  sourcePage: number;
  sourceDiagramVersion: string;
  title: string;
  subtitle: string;
  category: 'CONTINUATION' | 'REVERSAL' | 'LIQUIDITY_ENGINEERING' | 'TURTLE_SOUP';
  rules: string[];
  entryCondition: string;
  invalidationCondition: string;
  targetCondition: string;
  viewBox: string;
  candles: SbtVectorCandle[];
  zones: SbtVectorZone[];
  lines: SbtVectorLine[];
  brackets: SbtVectorBracket[];
  arrows: SbtVectorArrow[];
  variations?: {
    id: string;
    name: string;
    sourcePage: number;
    sourceDiagramVersion: string;
    subtitle: string;
    candles: SbtVectorCandle[];
    zones: SbtVectorZone[];
    lines: SbtVectorLine[];
    brackets: SbtVectorBracket[];
    arrows: SbtVectorArrow[];
  }[];
}

const TEAL = SBT_SOURCE_COLORS.bullishCandle;
const RED = SBT_SOURCE_COLORS.bearishCandle;
const BLUE = SBT_SOURCE_COLORS.arrow;

// ============================================================================
// MODEL 1: S B T Model (1) - Page 1
// ============================================================================
const MODEL_1_CANDLES: SbtVectorCandle[] = [
  // Initial swing up to BOS
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // Swing High (BOS origin)
  // Pullback into Area 2
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Lowest bearish candle (Area 2 zone base: 190 to 235)
  // Expansion breaking BOS to Area 3
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // BOS Break Peak (Area 3)
  // Retracement testing Area 2
  { id: 12, x: 260, openY: 105, closeY: 135, highY: 95, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 135, closeY: 160, highY: 132, lowY: 165, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 300, openY: 160, closeY: 185, highY: 158, lowY: 190, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 15, x: 320, openY: 185, closeY: 205, highY: 182, lowY: 210, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 16, x: 340, openY: 205, closeY: 218, highY: 203, lowY: 232, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Testing candle: taps zone (low 232 within 190-235), body closes inside zone
];

// ============================================================================
// MODEL 2: S B T Model (2) - Page 2 (Mitigation Block & Demand Overlap)
// ============================================================================
const MODEL_2_CANDLES: SbtVectorCandle[] = [
  // Initial leg
  { id: 1, x: 45, openY: 265, closeY: 240, highY: 235, lowY: 270, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 65, openY: 240, closeY: 215, highY: 210, lowY: 245, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 85, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 105, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // BOS Peak
  // Demand candle forming before BOS
  { id: 5, x: 125, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 145, openY: 180, closeY: 205, highY: 178, lowY: 210, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 165, openY: 205, closeY: 185, highY: 182, lowY: 210, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 185, openY: 185, closeY: 220, highY: 183, lowY: 225, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Pullback base
  // Bullish BOS expansion
  { id: 9, x: 205, openY: 220, closeY: 185, highY: 180, lowY: 225, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 225, openY: 185, closeY: 150, highY: 145, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 245, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // Area 3
  // Retracement testing MB (Mitigation Block zone at y=145-165)
  { id: 12, x: 265, openY: 105, closeY: 130, highY: 100, lowY: 135, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 285, openY: 130, closeY: 152, highY: 128, lowY: 155, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 305, openY: 152, closeY: 160, highY: 150, lowY: 165, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Testing MB (low touches 165, closes above MB base)
];

// ============================================================================
// MODEL 3: S B T Model (3) - Page 3 (Fair Value Gap)
// ============================================================================
const MODEL_3_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 45, openY: 265, closeY: 240, highY: 235, lowY: 270, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 65, openY: 240, closeY: 215, highY: 210, lowY: 245, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 85, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 105, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 125, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 145, openY: 180, closeY: 205, highY: 178, lowY: 210, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 165, openY: 205, closeY: 185, highY: 182, lowY: 210, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 185, openY: 185, closeY: 220, highY: 183, lowY: 225, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // FVG Displacing through BOS: FVG between candle 9 high (180) and candle 11 low (155) across candle 10 (150-185)
  { id: 9, x: 205, openY: 220, closeY: 185, highY: 180, lowY: 225, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 225, openY: 185, closeY: 145, highY: 140, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // FVG body
  { id: 11, x: 245, openY: 145, closeY: 110, highY: 100, lowY: 150, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // Retracement testing the FVG zone (y=150 to 180)
  { id: 12, x: 265, openY: 110, closeY: 135, highY: 105, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 285, openY: 135, closeY: 160, highY: 130, lowY: 165, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 305, openY: 160, closeY: 172, highY: 158, lowY: 178, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Testing candle inside FVG
];

// ============================================================================
// MODEL 4: S B T Model (4) - Page 4 (FVG Around Area 2 + Unmitigated OB)
// ============================================================================
const MODEL_4_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Unmitigated OB at Area 2
  // Break of structure with FVG around area 2
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // Pullback testing unmitigated OB
  { id: 12, x: 260, openY: 105, closeY: 135, highY: 95, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 135, closeY: 160, highY: 132, lowY: 165, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 300, openY: 160, closeY: 185, highY: 158, lowY: 190, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 15, x: 320, openY: 185, closeY: 205, highY: 182, lowY: 210, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 16, x: 340, openY: 205, closeY: 220, highY: 202, lowY: 232, type: 'BEARISH', bodyColor: RED, wickColor: RED },
];

// ============================================================================
// MODEL 5: S B T Model (5) - Page 5 (Two Variations: Single OB & MCOB)
// ============================================================================
const MODEL_5_SINGLE_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 35, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 55, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 75, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 95, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 115, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 135, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 155, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 175, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // Single Candle OB (Un Test)
  { id: 9, x: 195, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 215, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // Un Test candle at BOS
  { id: 11, x: 235, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // Pullback and BUY
  { id: 12, x: 255, openY: 105, closeY: 135, highY: 95, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 275, openY: 135, closeY: 155, highY: 132, lowY: 160, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 295, openY: 155, closeY: 170, highY: 153, lowY: 175, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // BUY point
];

const MODEL_5_MCOB_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 35, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 55, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 75, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 95, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 115, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 135, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 155, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 175, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // Multi-candle block MCOB before BOS
  { id: 9, x: 195, openY: 230, closeY: 205, highY: 200, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 215, openY: 205, closeY: 180, highY: 175, lowY: 210, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 235, openY: 180, closeY: 145, highY: 140, lowY: 185, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // Un Test MCOB
  { id: 12, x: 255, openY: 145, closeY: 110, highY: 100, lowY: 150, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // Pullback and BUY
  { id: 13, x: 275, openY: 110, closeY: 135, highY: 105, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 295, openY: 135, closeY: 158, highY: 130, lowY: 165, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // BUY point
];

// ============================================================================
// MODEL 6: S B T Model (6) - Page 6 (Reversal Model with Daily/Weekly OB)
// ============================================================================
const MODEL_6_CANDLES: SbtVectorCandle[] = [
  // Rise from HTF Daily/Weekly OB
  { id: 1, x: 40, openY: 280, closeY: 255, highY: 250, lowY: 285, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 255, closeY: 230, highY: 225, lowY: 260, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 230, closeY: 245, highY: 228, lowY: 250, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 4, x: 100, openY: 245, closeY: 195, highY: 190, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // FVG origin
  { id: 5, x: 120, openY: 195, closeY: 160, highY: 155, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 6, x: 140, openY: 160, closeY: 130, highY: 125, lowY: 165, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // High rejection and H1 MSS formation
  { id: 7, x: 160, openY: 130, closeY: 155, highY: 120, lowY: 160, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 8, x: 180, openY: 155, closeY: 180, highY: 150, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 9, x: 200, openY: 180, closeY: 160, highY: 158, lowY: 185, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 160, closeY: 130, highY: 125, lowY: 165, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 130, closeY: 165, highY: 128, lowY: 170, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // Deep downward retest into Daily/Weekly OB
  { id: 12, x: 260, openY: 165, closeY: 200, highY: 162, lowY: 205, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 200, closeY: 235, highY: 198, lowY: 240, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 300, openY: 235, closeY: 260, highY: 232, lowY: 265, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 15, x: 320, openY: 260, closeY: 275, highY: 258, lowY: 282, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Tests Daily/Weekly OB
];

// ============================================================================
// MODEL 7A & 7B: S B T Model (7 A & 7 B) - Pages 7 & 8
// ============================================================================
const MODEL_7A_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Area 2 base
  // BOS break
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // Retracement and IDM-A consolidation shelf
  { id: 12, x: 260, openY: 105, closeY: 135, highY: 95, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 135, closeY: 175, highY: 132, lowY: 180, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 300, openY: 175, closeY: 190, highY: 172, lowY: 195, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // IDM-A shelf 1
  { id: 15, x: 316, openY: 190, closeY: 180, highY: 178, lowY: 195, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // IDM-A shelf 2
  { id: 16, x: 332, openY: 180, closeY: 192, highY: 178, lowY: 195, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // IDM-A shelf 3
  { id: 17, x: 348, openY: 192, closeY: 182, highY: 180, lowY: 195, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // IDM-A shelf 4
  { id: 18, x: 368, openY: 182, closeY: 225, highY: 180, lowY: 232, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Sweep through IDM-A into Area 2 -> BUY
];

const MODEL_7B_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // OB/SnD/Two Candle
  // BOS break
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // IDM-B swing low formation
  { id: 12, x: 260, openY: 105, closeY: 135, highY: 95, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 135, closeY: 180, highY: 132, lowY: 190, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // IDM-B swing low
  { id: 14, x: 300, openY: 180, closeY: 160, highY: 155, lowY: 185, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // bounce above IDM-B
  { id: 15, x: 320, openY: 160, closeY: 190, highY: 158, lowY: 195, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 16, x: 340, openY: 190, closeY: 225, highY: 188, lowY: 232, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Sweep through IDM-B into OB/SnD/Two Candle -> BUY
];

// ============================================================================
// MODEL 8A & 8B: S B T Model (8 A & 8 B) - Page 9
// ============================================================================
const MODEL_8A_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // BOS break
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // IDM-A shelf directly above BOS level (y=150)
  { id: 12, x: 260, openY: 105, closeY: 130, highY: 100, lowY: 135, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 276, openY: 130, closeY: 142, highY: 128, lowY: 145, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 292, openY: 142, closeY: 135, highY: 132, lowY: 145, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 15, x: 308, openY: 135, closeY: 144, highY: 132, lowY: 145, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 16, x: 328, openY: 144, closeY: 158, highY: 140, lowY: 162, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Sweeps IDM-A into BOS zone -> BUY
];

const MODEL_8B_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // BOS break
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // IDM-B swing low formation at BOS level
  { id: 12, x: 260, openY: 105, closeY: 130, highY: 100, lowY: 135, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 130, closeY: 148, highY: 128, lowY: 150, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // IDM-B swing low
  { id: 14, x: 300, openY: 148, closeY: 135, highY: 130, lowY: 150, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 15, x: 320, openY: 135, closeY: 158, highY: 132, lowY: 164, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Sweeps IDM-B into BOS zone -> BUY
];

// ============================================================================
// MODEL 9: S B T Model (9) - Pages 10 & 11 (Turtle Soup: Single Wick vs Two Candle)
// ============================================================================
const MODEL_9_SINGLE_WICK_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // BOS break
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // Pullback: No inducement present -> market comes to Area 2, wicks through to lower PD array
  { id: 12, x: 260, openY: 105, closeY: 135, highY: 95, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 135, closeY: 165, highY: 130, lowY: 170, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 300, openY: 165, closeY: 185, highY: 160, lowY: 190, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 15, x: 320, openY: 185, closeY: 175, highY: 170, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 16, x: 340, openY: 175, closeY: 195, highY: 172, lowY: 250, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Single Wick Turtle Soup: body closes in Area 2 (195), long lower wick wicks down to 250 into lower unmitigated PD array!
];

const MODEL_9_TWO_CANDLE_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // BOS break
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // Pullback: Two Candle Turtle Soup
  { id: 12, x: 260, openY: 105, closeY: 135, highY: 95, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 135, closeY: 165, highY: 130, lowY: 170, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 14, x: 300, openY: 165, closeY: 185, highY: 160, lowY: 190, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 15, x: 320, openY: 185, closeY: 175, highY: 170, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 16, x: 340, openY: 175, closeY: 245, highY: 172, lowY: 250, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Candle 1: Closes below Area 2 in lower PD array
  { id: 17, x: 360, openY: 245, closeY: 180, highY: 175, lowY: 248, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // Candle 2: Closes BACK ABOVE Area 2 -> BUY
];

// ============================================================================
// MODEL 10: S B T Model (10) - Page 12 (Close Back Area 1 on Unmitigated PD Array)
// ============================================================================
const MODEL_10_VAR1_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // BOS break
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // Retracement and Close Back Area (1)
  { id: 12, x: 260, openY: 105, closeY: 135, highY: 95, lowY: 140, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 135, closeY: 175, highY: 130, lowY: 225, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Wicks down into PD Array (225), body closes at 175 back above Area 1!
  { id: 14, x: 300, openY: 175, closeY: 145, highY: 140, lowY: 178, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // BUY expansion
];

const MODEL_10_VAR2_CANDLES: SbtVectorCandle[] = [
  { id: 1, x: 40, openY: 270, closeY: 245, highY: 240, lowY: 275, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 2, x: 60, openY: 245, closeY: 215, highY: 210, lowY: 250, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 3, x: 80, openY: 215, closeY: 185, highY: 180, lowY: 220, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 4, x: 100, openY: 185, closeY: 155, highY: 150, lowY: 190, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 5, x: 120, openY: 155, closeY: 180, highY: 152, lowY: 185, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 6, x: 140, openY: 180, closeY: 210, highY: 178, lowY: 215, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 7, x: 160, openY: 210, closeY: 190, highY: 188, lowY: 215, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 8, x: 180, openY: 190, closeY: 230, highY: 188, lowY: 235, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  // BOS break
  { id: 9, x: 200, openY: 230, closeY: 195, highY: 190, lowY: 235, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 10, x: 220, openY: 195, closeY: 150, highY: 145, lowY: 200, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  { id: 11, x: 240, openY: 150, closeY: 105, highY: 98, lowY: 155, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL },
  // Pullback and Close Back Area (1) with green testing candle
  { id: 12, x: 260, openY: 105, closeY: 145, highY: 95, lowY: 148, type: 'BEARISH', bodyColor: RED, wickColor: RED },
  { id: 13, x: 280, openY: 145, closeY: 180, highY: 142, lowY: 225, type: 'BEARISH', bodyColor: RED, wickColor: RED }, // Taps PD Array
  { id: 14, x: 300, openY: 180, closeY: 150, highY: 146, lowY: 182, type: 'BULLISH', bodyColor: TEAL, wickColor: TEAL }, // Closes back above Area 1 -> BUY
];

// ============================================================================
// ALL 10 AUTHORITATIVE SBT MODEL RECORDS
// ============================================================================
export const AUTHORITATIVE_SBT_MODELS: SbtModelSourceRecord[] = [
  // --------------------------------------------------------------------------
  // MODEL 1 (Page 1)
  // --------------------------------------------------------------------------
  {
    id: 'SBT-01',
    modelNumber: 1,
    sourcePage: 1,
    sourceDiagramVersion: 'SBT-01-v1',
    title: 'S B T Model (1)',
    subtitle: 'Lowest bearish closing candle around area of 2 from open to lowest wick',
    category: 'CONTINUATION',
    rules: SBT_RULES['SBT-01'],
    entryCondition: 'We will enter Buy at the opening of next candle after testing candle respects Area 2.',
    invalidationCondition: 'Testing candle closes below area of 2.',
    targetCondition: 'Target will be area of 3.',
    viewBox: '0 0 460 330',
    candles: MODEL_1_CANDLES,
    zones: [
      { id: 'z1', x: 170, y: 190, width: 220, height: 45, label: 'Area of 2' },
    ],
    lines: [
      { id: 'bos1', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 150, labelY: 142 },
    ],
    brackets: [],
    arrows: [],
  },

  // --------------------------------------------------------------------------
  // MODEL 2 (Page 2)
  // --------------------------------------------------------------------------
  {
    id: 'SBT-02',
    modelNumber: 2,
    sourcePage: 2,
    sourceDiagramVersion: 'SBT-02-v1',
    title: 'S B T Model (2)',
    subtitle: 'Mitigation Block with overlapping demand candle formed before Bos',
    category: 'CONTINUATION',
    rules: SBT_RULES['SBT-02'],
    entryCondition: 'We will enter Buy at the opening or start of next candle.',
    invalidationCondition: 'Testing candle closes below the area of MB.',
    targetCondition: 'First target will be area of 3.',
    viewBox: '0 0 460 330',
    candles: MODEL_2_CANDLES,
    zones: [
      { id: 'z_mb', x: 95, y: 145, width: 250, height: 25, label: 'Mitigation Block (MB)' },
    ],
    lines: [
      { id: 'bos2', x1: 100, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 160, labelY: 142 },
    ],
    brackets: [],
    arrows: [],
  },

  // --------------------------------------------------------------------------
  // MODEL 3 (Page 3)
  // --------------------------------------------------------------------------
  {
    id: 'SBT-03',
    modelNumber: 3,
    sourcePage: 3,
    sourceDiagramVersion: 'SBT-03-v1',
    title: 'S B T Model (3)',
    subtitle: 'Fair Value Gap (FVG) creation on BOS impulse and clean retest',
    category: 'CONTINUATION',
    rules: SBT_RULES['SBT-03'],
    entryCondition: 'Enter Buy once the testing candle taps the Fair Value Gap without closing below.',
    invalidationCondition: 'Candle closes fully below the Fair Value Gap zone.',
    targetCondition: 'Target swing highs created by the BOS expansion.',
    viewBox: '0 0 460 330',
    candles: MODEL_3_CANDLES,
    zones: [
      { id: 'z_fvg', x: 215, y: 150, width: 140, height: 28, label: 'Fair Value Gap' },
    ],
    lines: [
      { id: 'bos3', x1: 100, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 155, labelY: 142 },
    ],
    brackets: [
      { id: 'br_fvg', x1: 215, x2: 235, y1: 150, y2: 180, label: 'FVG', labelPos: 'BOTTOM' },
    ],
    arrows: [],
  },

  // --------------------------------------------------------------------------
  // MODEL 4 (Page 4)
  // --------------------------------------------------------------------------
  {
    id: 'SBT-04',
    modelNumber: 4,
    sourcePage: 4,
    sourceDiagramVersion: 'SBT-04-v1',
    title: 'S B T Model (4)',
    subtitle: 'FVG around area of 2 with unmitigated OB/CISD test after BOS',
    category: 'CONTINUATION',
    rules: SBT_RULES['SBT-04'],
    entryCondition: 'We will enter buy at the opening of next candle.',
    invalidationCondition: 'Market closes at all below the area of 2.',
    targetCondition: 'Target recent swing highs.',
    viewBox: '0 0 460 330',
    candles: MODEL_4_CANDLES,
    zones: [
      { id: 'z_ob4', x: 170, y: 190, width: 200, height: 45, label: 'OB/CISD Unmitigated' },
    ],
    lines: [
      { id: 'bos4', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 150, labelY: 142 },
    ],
    brackets: [
      { id: 'br_fvg4', x1: 170, x2: 215, y1: 195, y2: 210, label: 'FVG', labelPos: 'BOTTOM' },
    ],
    arrows: [],
  },

  // --------------------------------------------------------------------------
  // MODEL 5 (Page 5) - Single OB & MCOB
  // --------------------------------------------------------------------------
  {
    id: 'SBT-05',
    modelNumber: 5,
    sourcePage: 5,
    sourceDiagramVersion: 'SBT-05-v1-Single',
    title: 'S B T Model (5)',
    subtitle: 'Bearish OB/CISD aligned with Mitigation Block (Single OB or MCOB)',
    category: 'CONTINUATION',
    rules: SBT_RULES['SBT-05'],
    entryCondition: 'Enter at the opening of next Candle upon respecting the MB/OB level.',
    invalidationCondition: 'The testing candle closes beyond the MB zone.',
    targetCondition: 'First target at 3.',
    viewBox: '0 0 460 330',
    candles: MODEL_5_SINGLE_CANDLES,
    zones: [
      { id: 'z_mb5', x: 90, y: 145, width: 230, height: 25, label: 'Mitigation Block' },
    ],
    lines: [
      { id: 'bos5', x1: 90, y1: 150, x2: 225, y2: 150, label: 'Bos', labelX: 145, labelY: 142 },
    ],
    brackets: [
      { id: 'br_fvg5a', x1: 165, x2: 205, y1: 195, y2: 215, label: 'FVG', labelPos: 'BOTTOM' },
      { id: 'br_fvg5b', x1: 205, x2: 245, y1: 145, y2: 160, label: 'FVG', labelPos: 'BOTTOM' },
    ],
    arrows: [
      { id: 'a_untest', fromX: 180, fromY: 110, toX: 210, toY: 145, text: 'Un Test', color: BLUE },
      { id: 'a_buy5', fromX: 335, fromY: 220, toX: 300, toY: 180, text: 'BUY', color: BLUE },
    ],
    variations: [
      {
        id: '5-SINGLE',
        name: 'Single Candle OB (Un Test)',
        sourcePage: 5,
        sourceDiagramVersion: 'SBT-05-v1-Single',
        subtitle: 'Page 5 Left: Single candle OB created before BOS with FVG alignment',
        candles: MODEL_5_SINGLE_CANDLES,
        zones: [{ id: 'z_mb5a', x: 90, y: 145, width: 230, height: 25, label: 'Mitigation Block' }],
        lines: [{ id: 'bos5a', x1: 90, y1: 150, x2: 225, y2: 150, label: 'Bos', labelX: 145, labelY: 142 }],
        brackets: [
          { id: 'br_fvg5a1', x1: 165, x2: 205, y1: 195, y2: 215, label: 'FVG', labelPos: 'BOTTOM' },
          { id: 'br_fvg5a2', x1: 205, x2: 245, y1: 145, y2: 160, label: 'FVG', labelPos: 'BOTTOM' },
        ],
        arrows: [
          { id: 'a_untest1', fromX: 180, fromY: 110, toX: 210, toY: 145, text: 'Un Test', color: BLUE },
          { id: 'a_buy5a', fromX: 335, fromY: 220, toX: 300, toY: 180, text: 'BUY', color: BLUE },
        ],
      },
      {
        id: '5-MCOB',
        name: 'MCOB (Un Test Mcob)',
        sourcePage: 5,
        sourceDiagramVersion: 'SBT-05-v1-MCOB',
        subtitle: 'Page 5 Right: Multi-Candle Order Block (MCOB) formed before BOS',
        candles: MODEL_5_MCOB_CANDLES,
        zones: [{ id: 'z_mb5b', x: 90, y: 145, width: 230, height: 25, label: 'MCOB Zone' }],
        lines: [{ id: 'bos5b', x1: 90, y1: 150, x2: 245, y2: 150, label: 'Bos', labelX: 145, labelY: 142 }],
        brackets: [
          { id: 'br_fvg5b1', x1: 225, x2: 265, y1: 145, y2: 160, label: 'FVG', labelPos: 'BOTTOM' },
        ],
        arrows: [
          { id: 'a_untest2', fromX: 200, fromY: 110, toX: 230, toY: 145, text: 'Un Test Mcob', color: BLUE },
          { id: 'a_buy5b', fromX: 335, fromY: 220, toX: 300, toY: 180, text: 'BUY', color: BLUE },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // MODEL 6 (Page 6) - Reversal Model
  // --------------------------------------------------------------------------
  {
    id: 'SBT-06',
    modelNumber: 6,
    sourcePage: 6,
    sourceDiagramVersion: 'SBT-06-v1',
    title: 'S B T Model (6)',
    subtitle: 'Reversal Model: Unmitigated HTF Daily/Weekly OB with H1 MSS shift',
    category: 'REVERSAL',
    rules: SBT_RULES['SBT-06'],
    entryCondition: 'Shift to H1 and enter upon seeing an MsS on H1 in the direction of the HTF OB.',
    invalidationCondition: '4 candles closing beyond the HTF OB in H1 invalidates the zone.',
    targetCondition: 'Reversal trades till the next structural area of HTF.',
    viewBox: '0 0 460 330',
    candles: MODEL_6_CANDLES,
    zones: [
      { id: 'z_htf_ob', x: 30, y: 250, width: 330, height: 40, label: 'Daily/Weekly OB' },
    ],
    lines: [],
    brackets: [
      { id: 'br_fvg6', x1: 85, x2: 125, y1: 220, y2: 240, label: 'FVG', labelPos: 'BOTTOM' },
    ],
    arrows: [
      { id: 'a_htf', fromX: 140, fromY: 310, toX: 75, toY: 280, text: 'Daily/Weekly OB', color: BLUE },
    ],
  },

  // --------------------------------------------------------------------------
  // MODEL 7 (Pages 7 & 8) - 7A and 7B
  // --------------------------------------------------------------------------
  {
    id: 'SBT-07',
    modelNumber: 7,
    sourcePage: 7,
    sourceDiagramVersion: 'SBT-07A-v1',
    title: 'S B T Model (7 A & 7 B)',
    subtitle: 'Liquidity Engineering: IDM-A Support Consolidation & IDM-B Swing Low',
    category: 'LIQUIDITY_ENGINEERING',
    rules: SBT_RULES['SBT-07A'],
    entryCondition: 'We will enter Buy at the opening of Next candle, targeting 3.',
    invalidationCondition: 'Testing candle should not close below the area of 2.',
    targetCondition: 'Target will be Area of 3.',
    viewBox: '0 0 460 330',
    candles: MODEL_7A_CANDLES,
    zones: [
      { id: 'z7a', x: 170, y: 190, width: 220, height: 45, label: 'Area around 2' },
    ],
    lines: [
      { id: 'bos7a', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 150, labelY: 142 },
      { id: 'idm7a', x1: 295, y1: 195, x2: 355, y2: 195, label: 'IDM-A', labelX: 310, labelY: 208 },
    ],
    brackets: [],
    arrows: [
      { id: 'a_buy7a', fromX: 385, fromY: 270, toX: 368, toY: 230, text: 'BUY', color: BLUE },
    ],
    variations: [
      {
        id: '7-A',
        name: 'SBT Model (7 A)',
        sourcePage: 7,
        sourceDiagramVersion: 'SBT-07A-v1',
        subtitle: 'Page 7: Support area consolidation below which liquidity is engineered (IDM-A)',
        candles: MODEL_7A_CANDLES,
        zones: [{ id: 'z7a_v', x: 170, y: 190, width: 220, height: 45, label: 'Area around 2' }],
        lines: [
          { id: 'bos7a_v', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 150, labelY: 142 },
          { id: 'idm7a_v', x1: 295, y1: 195, x2: 355, y2: 195, label: 'IDM-A', labelX: 310, labelY: 208 },
        ],
        brackets: [],
        arrows: [
          { id: 'a_buy7a_v', fromX: 385, fromY: 270, toX: 368, toY: 230, text: 'BUY', color: BLUE },
        ],
      },
      {
        id: '7-B',
        name: 'SBT Model (7 B)',
        sourcePage: 8,
        sourceDiagramVersion: 'SBT-07B-v1',
        subtitle: 'Page 8: IDM-B swing low with OB/SnD/Two Candle zone testing',
        candles: MODEL_7B_CANDLES,
        zones: [{ id: 'z7b_v', x: 170, y: 190, width: 220, height: 45, label: 'Area around 2' }],
        lines: [
          { id: 'bos7b_v', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 150, labelY: 142 },
          { id: 'idm7b_v', x1: 275, y1: 190, x2: 325, y2: 190, label: 'IDM-B', labelX: 285, labelY: 203 },
        ],
        brackets: [],
        arrows: [
          { id: 'a_ob_two', fromX: 250, fromY: 270, toX: 195, toY: 220, text: 'OB/SnD/Two Candle', color: BLUE },
          { id: 'a_buy7b_v', fromX: 365, fromY: 270, toX: 342, toY: 230, text: 'BUY', color: BLUE },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // MODEL 8 (Page 9) - 8A and 8B
  // --------------------------------------------------------------------------
  {
    id: 'SBT-08',
    modelNumber: 8,
    sourcePage: 9,
    sourceDiagramVersion: 'SBT-08A-v1',
    title: 'S B T Model (8 A & 8 B)',
    subtitle: 'BOS Level Inducement: IDM-A Support Shelf & IDM-B Swing Low above BOS',
    category: 'LIQUIDITY_ENGINEERING',
    rules: SBT_RULES['SBT-08A'],
    entryCondition: 'Enter Buy at opening of next candle after market sweeps IDM and tests BOS zone.',
    invalidationCondition: 'Testing candle closes below the marked BOS / Mitigation zone.',
    targetCondition: 'Target swing highs (Area 3).',
    viewBox: '0 0 460 330',
    candles: MODEL_8A_CANDLES,
    zones: [
      { id: 'z8a', x: 95, y: 145, width: 260, height: 22, label: 'BOS / Mitigation Level' },
    ],
    lines: [
      { id: 'bos8a', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 145, labelY: 142 },
      { id: 'idm8a', x1: 270, y1: 145, x2: 315, y2: 145, label: 'IDM-A', labelX: 280, labelY: 158 },
    ],
    brackets: [],
    arrows: [
      { id: 'a_buy8a', fromX: 365, fromY: 210, toX: 330, toY: 165, text: 'BUY', color: BLUE },
    ],
    variations: [
      {
        id: '8-A',
        name: 'SBT Model (8 A)',
        sourcePage: 9,
        sourceDiagramVersion: 'SBT-08A-v1',
        subtitle: 'Page 9 Left: IDM-A consolidation shelf directly above BOS line',
        candles: MODEL_8A_CANDLES,
        zones: [{ id: 'z8a_v', x: 95, y: 145, width: 260, height: 22, label: 'BOS Level' }],
        lines: [
          { id: 'bos8a_v', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 145, labelY: 142 },
          { id: 'idm8a_v', x1: 270, y1: 145, x2: 315, y2: 145, label: 'IDM-A', labelX: 280, labelY: 158 },
        ],
        brackets: [],
        arrows: [
          { id: 'a_buy8a_v', fromX: 365, fromY: 210, toX: 330, toY: 165, text: 'BUY', color: BLUE },
        ],
      },
      {
        id: '8-B',
        name: 'SBT Model (8 B)',
        sourcePage: 9,
        sourceDiagramVersion: 'SBT-08B-v1',
        subtitle: 'Page 9 Right: IDM-B swing low formed directly above BOS line',
        candles: MODEL_8B_CANDLES,
        zones: [{ id: 'z8b_v', x: 95, y: 145, width: 260, height: 22, label: 'BOS Level' }],
        lines: [
          { id: 'bos8b_v', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 145, labelY: 142 },
          { id: 'idm8b_v', x1: 275, y1: 150, x2: 320, y2: 150, label: 'IDM-B', labelX: 285, labelY: 162 },
        ],
        brackets: [],
        arrows: [
          { id: 'a_buy8b_v', fromX: 365, fromY: 210, toX: 325, toY: 165, text: 'BUY', color: BLUE },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // MODEL 9 (Pages 10 & 11) - Turtle Soup Single Wick vs Two Candle
  // --------------------------------------------------------------------------
  {
    id: 'SBT-09',
    modelNumber: 9,
    sourcePage: 10,
    sourceDiagramVersion: 'SBT-09-v1-SingleWick',
    title: 'S B T Model (9)',
    subtitle: 'Turtle Soup: No Inducement at Area 2; Sweeps into Lower Unmitigated PD Array',
    category: 'TURTLE_SOUP',
    rules: SBT_RULES['SBT-09'],
    entryCondition: 'Single wick: enter at opening of next candle. Two candles: enter once 2nd candle closes back above Area 2.',
    invalidationCondition: 'Price closes decisively through and beyond the lower PD array without reversing.',
    targetCondition: 'Target swing highs (Area 3).',
    viewBox: '0 0 460 330',
    candles: MODEL_9_SINGLE_WICK_CANDLES,
    zones: [
      { id: 'z9_area2', x: 170, y: 185, width: 220, height: 25, label: 'Area of 2' },
      { id: 'z9_pd', x: 95, y: 235, width: 280, height: 30, label: 'PD array Unmitigated OB/SnD/FVG' },
    ],
    lines: [
      { id: 'bos9', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 150, labelY: 142 },
    ],
    brackets: [],
    arrows: [
      { id: 'a_pd9', fromX: 85, fromY: 310, toX: 120, toY: 265, text: 'PD array Unmitigated OB/SnD/FVG', color: BLUE },
      { id: 'a_buy9', fromX: 380, fromY: 260, toX: 345, toY: 210, text: 'BUY', color: BLUE },
    ],
    variations: [
      {
        id: '9-SINGLE_WICK',
        name: 'Single Wick Turtle Soup',
        sourcePage: 10,
        sourceDiagramVersion: 'SBT-09-v1-SingleWick',
        subtitle: 'Page 10: Candle wicks down through Area 2 into lower PD array with long lower shadow',
        candles: MODEL_9_SINGLE_WICK_CANDLES,
        zones: [
          { id: 'z9_area2_v', x: 170, y: 185, width: 220, height: 25, label: 'Area of 2' },
          { id: 'z9_pd_v', x: 95, y: 235, width: 280, height: 30, label: 'PD array Unmitigated' },
        ],
        lines: [
          { id: 'bos9_v', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 150, labelY: 142 },
        ],
        brackets: [],
        arrows: [
          { id: 'a_pd9_v', fromX: 85, fromY: 310, toX: 120, toY: 265, text: 'PD array Unmitigated OB/SnD/FVG', color: BLUE },
          { id: 'a_buy9_v', fromX: 380, fromY: 260, toX: 345, toY: 210, text: 'BUY', color: BLUE },
        ],
      },
      {
        id: '9-TWO_CANDLE',
        name: 'Two Candle Turtle Soup',
        sourcePage: 11,
        sourceDiagramVersion: 'SBT-09-v1-TwoCandle',
        subtitle: 'Page 11: 1st candle closes in lower PD array; 2nd candle closes back above Area 2',
        candles: MODEL_9_TWO_CANDLE_CANDLES,
        zones: [
          { id: 'z9_area2_2', x: 170, y: 185, width: 220, height: 25, label: 'Area of 2' },
          { id: 'z9_pd_2', x: 95, y: 235, width: 280, height: 30, label: 'PD array Unmitigated' },
        ],
        lines: [
          { id: 'bos9_2', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 150, labelY: 142 },
        ],
        brackets: [],
        arrows: [
          { id: 'a_pd9_2', fromX: 85, fromY: 310, toX: 120, toY: 265, text: 'PD array Unmitigated OB/SnD/FVG', color: BLUE },
          { id: 'a_buy9_2', fromX: 395, fromY: 260, toX: 362, toY: 200, text: 'BUY', color: BLUE },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // MODEL 10 (Page 12) - Close Back Area 1 on Unmitigated PD Array
  // --------------------------------------------------------------------------
  {
    id: 'SBT-10',
    modelNumber: 10,
    sourcePage: 12,
    sourceDiagramVersion: 'SBT-10-v1-Var1',
    title: 'S B T Model (10)',
    subtitle: 'Close Back Area (1) upon tapping Unmitigated PD Array (OB/SnD/FVG)',
    category: 'TURTLE_SOUP',
    rules: SBT_RULES['SBT-10'],
    entryCondition: 'Enter Buy at opening of next candle after Close Back above Area (1).',
    invalidationCondition: 'Price closes below the Unmitigated PD Array zone.',
    targetCondition: 'Target swing high / Area 3.',
    viewBox: '0 0 460 330',
    candles: MODEL_10_VAR1_CANDLES,
    zones: [
      { id: 'z10_pd', x: 110, y: 215, width: 220, height: 25, label: 'PD array Unmitigated OB/SnD/FVG' },
    ],
    lines: [
      { id: 'bos10', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 145, labelY: 142 },
      { id: 'closeback10', x1: 250, y1: 175, x2: 340, y2: 175, label: 'Area (1)', labelX: 275, labelY: 170 },
    ],
    brackets: [],
    arrows: [
      { id: 'a_cb1', fromX: 340, fromY: 130, toX: 282, toY: 172, text: 'Close Back area (1)', color: BLUE },
      { id: 'a_pd10', fromX: 230, fromY: 270, toX: 180, toY: 225, text: 'PD array Unmitigated OB/SnD/FVG', color: BLUE },
      { id: 'a_buy10', fromX: 350, fromY: 180, toX: 305, toY: 160, text: 'BUY', color: BLUE },
    ],
    variations: [
      {
        id: '10-VAR1',
        name: 'Model 10 - Variation 1',
        sourcePage: 12,
        sourceDiagramVersion: 'SBT-10-v1-Var1',
        subtitle: 'Page 12 Left: Bearish wick into PD Array with immediate close back above Area 1',
        candles: MODEL_10_VAR1_CANDLES,
        zones: [{ id: 'z10_pd_v1', x: 110, y: 215, width: 220, height: 25, label: 'PD array Unmitigated' }],
        lines: [
          { id: 'bos10_v1', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 145, labelY: 142 },
          { id: 'closeback10_v1', x1: 250, y1: 175, x2: 340, y2: 175, label: 'Area (1)' },
        ],
        brackets: [],
        arrows: [
          { id: 'a_cb1_v1', fromX: 340, fromY: 130, toX: 282, toY: 172, text: 'Close Back area (1)', color: BLUE },
          { id: 'a_pd10_v1', fromX: 230, fromY: 270, toX: 180, toY: 225, text: 'PD array Unmitigated OB/SnD/FVG', color: BLUE },
          { id: 'a_buy10_v1', fromX: 350, fromY: 180, toX: 305, toY: 160, text: 'BUY', color: BLUE },
        ],
      },
      {
        id: '10-VAR2',
        name: 'Model 10 - Variation 2',
        sourcePage: 12,
        sourceDiagramVersion: 'SBT-10-v1-Var2',
        subtitle: 'Page 12 Right: Green candle close back confirmation after PD array touch',
        candles: MODEL_10_VAR2_CANDLES,
        zones: [{ id: 'z10_pd_v2', x: 110, y: 215, width: 220, height: 25, label: 'PD array Unmitigated' }],
        lines: [
          { id: 'bos10_v2', x1: 95, y1: 150, x2: 235, y2: 150, label: 'Bos', labelX: 145, labelY: 142 },
          { id: 'closeback10_v2', x1: 250, y1: 175, x2: 340, y2: 175, label: 'Area (1)' },
        ],
        brackets: [],
        arrows: [
          { id: 'a_cb1_v2', fromX: 340, fromY: 130, toX: 282, toY: 172, text: 'Close Back area (1)', color: BLUE },
          { id: 'a_pd10_v2', fromX: 230, fromY: 270, toX: 180, toY: 225, text: 'PD array Unmitigated OB/SnD/FVG', color: BLUE },
          { id: 'a_buy10_v2', fromX: 350, fromY: 180, toX: 305, toY: 160, text: 'BUY', color: BLUE },
        ],
      },
    ],
  },
];
