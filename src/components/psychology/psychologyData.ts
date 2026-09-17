// Comprehensive Trading Performance Psychology & Emotional Regulation Data
// Covers all 17 critical trading mental states with deep operational rigor

export type PsychCategoryType =
  | 'FEAR'
  | 'GREED'
  | 'FOMO'
  | 'REVENGE_TRADING'
  | 'HESITATION'
  | 'OVERCONFIDENCE'
  | 'BOREDOM_TRADING'
  | 'LOSS_AVERSION'
  | 'ANALYSIS_PARALYSIS'
  | 'PERFECTIONISM'
  | 'IMPATIENCE'
  | 'POST_LOSS_SHAME'
  | 'COMPARISON_ANXIETY'
  | 'BURNOUT'
  | 'PRE_MARKET_ANXIETY'
  | 'POST_WIN_OVERCONFIDENCE'
  | 'DISCIPLINE_FATIGUE';

export type ExerciseType =
  | 'BREATHING_ORB'
  | 'THOUGHT_SORT'
  | 'COGNITIVE_REFRAME'
  | 'SLOW_FOCUS'
  | 'PATTERN_TRACE'
  | 'POST_LOSS_RESET'
  | 'PRE_TRADE_GROUNDING'
  | 'DECISION_PLEDGE';

export interface InteractiveSession {
  id: string;
  title: string;
  durationMinutes: number;
  objective: string;
  defaultTrigger: string;
  tradingProblemExplanation: string;
  exerciseType: ExerciseType;
  exerciseCustomData?: {
    customPrompt?: string;
    thoughtCards?: { text: string; isControl: boolean; explanation: string }[];
    reframeCards?: { distortedThought: string; cognitiveBias: string; rationalPerspective: string }[];
    patternType?: 'INFINITY' | 'WAVE' | 'SPIRAL';
    breathingMode?: 'BOX_4_4_4_4' | 'RELAX_4_7_8' | 'PHYSIOLOGICAL_SIGH';
    checklistItems?: string[];
  };
  practicalDecisionRule: string;
  groundingPrompt: string;
}

export interface PsychologicalCategory {
  id: PsychCategoryType;
  name: string;
  tagline: string;
  iconName: string; // Lucide icon identifier
  colorTheme: {
    accent: string;
    bgGlow: string;
    border: string;
    badge: string;
  };
  whyItHappens: {
    neurochemistry: string;
    evolutionaryRoot: string;
    cognitiveDistortion: string;
  };
  howItAppearsInTrading: string[];
  possibleImpact: {
    capitalRisk: string;
    mentalCapitalLoss: string;
    longTermDrawdown: string;
  };
  warningSigns: {
    physical: string[];
    behavioral: string[];
    mental: string[];
  };
  sessions: InteractiveSession[];
  reflectionPrompts: string[];
}

export interface SessionResultLog {
  id: string;
  categoryId: PsychCategoryType;
  sessionId: string;
  sessionTitle: string;
  timestamp: number;
  dateStr: string;
  timeStr: string;
  initialIntensity: number; // 1-10
  shiftedIntensity: number; // 1-10
  triggerIdentified: string;
  physicalTensionArea: string;
  decisionRulePledged: boolean;
  decisionRuleText: string;
  helpfulnessRating: 'SIGNIFICANT' | 'MODERATE' | 'SLIGHT' | 'NONE';
  reflectionNotes?: string;
  habitPointsEarned: number;
}

export interface HabitProgressState {
  processPoints: number;
  regulationStreak: number;
  lastActiveDate: string;
  categoryMastery: Record<PsychCategoryType, number>; // 0 to 100 percentage
  completedSessionsHistory: SessionResultLog[];
  completedHabitsCount: {
    breathingSessions: number;
    thoughtSorts: number;
    cognitiveReframes: number;
    slowFocusRounds: number;
    patternTraces: number;
    preTradeGroundings: number;
    postLossResets: number;
  };
}

export interface ContextualSuggestion {
  id: string;
  categoryId: PsychCategoryType;
  sessionId: string;
  title: string;
  reason: string;
  calmMessage: string;
  priority: 'URGENT' | 'RECOMMENDED' | 'INFO';
}

export const PSYCHOLOGY_CATEGORIES: Record<PsychCategoryType, PsychologicalCategory> = {
  FEAR: {
    id: 'FEAR',
    name: 'Fear',
    tagline: 'Hyperactive Amygdala & Risk Dread',
    iconName: 'ShieldAlert',
    colorTheme: {
      accent: 'text-cyan-400',
      bgGlow: 'from-blue-500/10 to-transparent',
      border: 'border-blue-500/30',
      badge: 'bg-blue-500/15 text-amber-300 border-blue-500/30',
    },
    whyItHappens: {
      neurochemistry: 'The amygdala perceives potential capital loss as an immediate mortal threat, flooding the bloodstream with cortisol and norepinephrine.',
      evolutionaryRoot: 'Ancestral loss of vital resources meant starvation. The brain treats red PnL identically to an approaching predator.',
      cognitiveDistortion: 'Catastrophizing: projecting a single probabilistic stop-out into account destruction or personal unworthiness.',
    },
    howItAppearsInTrading: [
      'Exiting winning positions prematurely at the first counter-tick',
      'Moving stop losses to breakeven before technical validation',
      'Sizing down so low that positive risk-to-reward cannot overcome spread and fees',
      'Freezing at execution when high-probability edge signals appear',
    ],
    possibleImpact: {
      capitalRisk: 'Severe underperformance from truncating winners while absorbing full 1R losses.',
      mentalCapitalLoss: 'Constant adrenaline exhaustion and demoralization from watching exited trades hit 3R targets.',
      longTermDrawdown: 'Mathematical death by thousands of scratches and missed asymmetric opportunities.',
    },
    warningSigns: {
      physical: ['Shallow rapid breathing', 'Clenched jaw or tight shoulders', 'Cold fingertips', 'Elevated resting pulse'],
      behavioral: ['Rapidly clicking timeframe toggles', 'Hovering mouse compulsively over Close Position', 'Hesitating at trigger bar'],
      mental: ['Inner monologue: "Please don\'t reverse"', 'Fixating strictly on current floating dollar value instead of market structure'],
    },
    sessions: [
      {
        id: 'fear_session_1',
        title: 'Capital Detachment & Risk Acceptance',
        durationMinutes: 4,
        objective: 'Neurologically decouple self-worth from this single trade outcome.',
        defaultTrigger: 'Entering an execution following a losing session',
        tradingProblemExplanation: 'When you risk money you have not emotionally written off as a cost of doing business, every candlestick fluctuation triggers existential alarm.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'If this trade hits stop loss, it proves my analysis is flawed.',
              cognitiveBias: 'Outcome Bias',
              rationalPerspective: 'A 60% win-rate edge has 40% losses randomly distributed. A stop-out is simply paying the wholesale cost of discovering if this setup works.',
            },
            {
              distortedThought: 'I must close right now with +$40 before it turns back into a loss.',
              cognitiveBias: 'Loss Aversion / Myopic Framing',
              rationalPerspective: 'Cutting winners early mathematically destroys the positive expectancy required to offset unavoidable stop-outs.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: The dollar amount at stop loss is permanently spent at order fill. No moving the stop to breakeven until Structure Level 1 is broken.',
        groundingPrompt: 'Exhale completely. Visualize the stop-loss being hit and your heart rate remaining completely unperturbed.',
      },
      {
        id: 'fear_session_2',
        title: '4-7-8 Parasympathetic Vagus Reset',
        durationMinutes: 3,
        objective: 'Lower heart rate and deactivate sympathetic flight response.',
        defaultTrigger: 'Sudden spike against entry candle',
        tradingProblemExplanation: 'Sympathetic arousal shunts blood away from the prefrontal cortex to major muscles. You literally lose IQ points when panicked.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'RELAX_4_7_8',
        },
        practicalDecisionRule: 'Rule: When feeling panic, remove hands from mouse and perform 4 cycles of 4-7-8 breath before taking any platform action.',
        groundingPrompt: 'Feel your feet solid against the floor. Release the tension in your jaw and behind your eyes.',
      },
      {
        id: 'fear_session_3',
        title: 'Locus of Control Separation',
        durationMinutes: 5,
        objective: 'Segregate actionable trading process from stochastic market randomness.',
        defaultTrigger: 'Anxiety over high-volatility news events or session open',
        tradingProblemExplanation: 'Fear thrives on the illusion that you must control the next 5-minute candle. You only control entry, stop, size, and exit.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'Whether the Federal Reserve comments move EUR/USD 50 pips', isControl: false, explanation: 'Macro volatility is entirely external.' },
            { text: 'My exact position sizing calculated to strictly 1.0% account equity', isControl: true, explanation: 'Your lot size is 100% within your command.' },
            { text: 'Whether this specific trade hits Take Profit 2', isControl: false, explanation: 'Individual trade outcomes are probabilistic.' },
            { text: 'Placing my stop loss at market invalidation prior to clicking buy', isControl: true, explanation: 'Risk definition is your primary job as risk manager.' },
          ],
        },
        practicalDecisionRule: 'Rule: Write down: "I am a risk manager who executes probabilities, not a market prophet."',
        groundingPrompt: 'Notice the sensation of gravity holding you grounded. The market will do what it will do.',
      },
      {
        id: 'fear_session_4',
        title: 'Slow Focus Stabilization',
        durationMinutes: 3,
        objective: 'Break frantic visual scanning and restore calm alpha-band brainwave focus.',
        defaultTrigger: 'Overstimulated from watching 15-second charts',
        tradingProblemExplanation: 'Rapid erratic eye movements stimulate the locus coeruleus to secrete more adrenaline. Calming visual track down-regulates nervous system speed.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: Minimum chart timeframe for execution is 5m. 1m/15s charts locked out during active positions.',
        groundingPrompt: 'Gently track the center orb without straining your eyes. Breathe rhythmically.',
      },
      {
        id: 'fear_session_5',
        title: 'Pre-Trade Fear Defusion Checklist',
        durationMinutes: 4,
        objective: 'Step through an objective 5-stage fear neutralization audit before sending an order.',
        defaultTrigger: 'Hesitating at a confirmed breakout setup',
        tradingProblemExplanation: 'Fear creates irrational hesitation that makes you enter late at a worse price with expanded risk.',
        exerciseType: 'PRE_TRADE_GROUNDING',
        practicalDecisionRule: 'Rule: If all 4 technical criteria match, execute order without second-guessing. Let the math play out over 50 trades.',
        groundingPrompt: 'Anchor your attention to your physical breath. Accept the risk as the price of doing business.',
      },
    ],
    reflectionPrompts: [
      'What is the worst realistic outcome of this trade, and can my account absorb it effortlessly?',
      'Am I reacting to what the chart is actually showing, or a movie playing in my head of what could go wrong?',
      'How would a legendary hedge fund risk manager handle this specific entry without emotional attachment?',
    ],
  },

  GREED: {
    id: 'GREED',
    name: 'Greed',
    tagline: 'Dopamine Chasing & Excessive Risk Expansion',
    iconName: 'Zap',
    colorTheme: {
      accent: 'text-emerald-400',
      bgGlow: 'from-emerald-500/10 to-transparent',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Nucleus accumbens is flooded with dopamine at the prospect of oversized financial rewards, overriding executive risk brakes.',
      evolutionaryRoot: 'Resource hoarding when abundance is sensed. Nature favors opportunism in the wild, but financial markets punish greed ruthlessly.',
      cognitiveDistortion: 'Illusion of Control & Hot Hand Fallacy: feeling that market dynamics can be bent to your personal desire.',
    },
    howItAppearsInTrading: [
      'Doubling position size above playbook risk parameters',
      'Moving take-profit targets further away during a trade without technical reason',
      'Over-leveraging on "sure-thing" fundamental setups',
      'Refusing to bank profits when targets are clearly attained',
    ],
    possibleImpact: {
      capitalRisk: 'Catastrophic single-session drawdowns that wipe out weeks of methodical compounding.',
      mentalCapitalLoss: 'Euphoria followed by devastating emotional crash when open profits evaporate.',
      longTermDrawdown: 'Inability to scale an account sustainably due to periodic blowup cycles.',
    },
    warningSigns: {
      physical: ['Euphoric rush', 'Restlessness', 'Fidgeting', 'Impatience to click order buttons'],
      behavioral: ['Calculating theoretical profits before trade reaches target', 'Checking yacht or luxury purchases', 'Ignoring stop distance'],
      mental: ['Thinking: "This is the one that changes my account balance"', 'Arrogant certainty that price cannot reverse'],
    },
    sessions: [
      {
        id: 'greed_session_1',
        title: 'Asymmetric Compounding vs Account Ruin',
        durationMinutes: 4,
        objective: 'Internalize the mathematical reality that compounding 1.5% consistently beats sporadic oversized gambles.',
        defaultTrigger: 'Urge to increase lot size 3x on an attractive chart setup',
        tradingProblemExplanation: 'Greed blinds the mind to the asymmetric math of drawdown: a 50% loss requires a 100% gain just to break even.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'If I 3x this position, I can make a month\'s target by lunchtime.',
              cognitiveBias: 'Base Rate Neglect / Greed Delusion',
              rationalPerspective: 'If you 3x your position, a standard unexpected slippage or stop-out causes severe psychological trauma and destroys months of discipline.',
            },
            {
              distortedThought: 'Price has so much momentum, it will surely run another 100 pips past target.',
              cognitiveBias: 'Greed-driven Projection',
              rationalPerspective: 'Taking profit at predefined liquidity pools preserves your expectancy. The market owes you nothing past your target.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Max risk per trade is strictly capped at 1.0% of liquid equity. Any oversized order must be immediately trimmed.',
        groundingPrompt: 'Feel satisfaction in small, professional, repeatable execution rather than oversized gambling hits.',
      },
      {
        id: 'greed_session_2',
        title: 'The Take-Profit Locking Ritual',
        durationMinutes: 3,
        objective: 'Defuse the urge to extend take-profit targets out of greed.',
        defaultTrigger: 'Trade reaches 2R target and you want to cancel the TP order',
        tradingProblemExplanation: 'When in profit, greed tricks the trader into turning an objective statistical plan into a lottery ticket.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: Take-profit orders must be set at execution and never pushed back once floating profit exceeds 1R.',
        groundingPrompt: 'Honor the profit you have extracted. The market provides limitless setups tomorrow.',
      },
      {
        id: 'greed_session_3',
        title: 'Thought Sorting: Professional Trader vs Gambler',
        durationMinutes: 5,
        objective: 'Identify and discard gambler thought patterns before submitting an order.',
        defaultTrigger: 'Feeling invincible after a lucrative market session',
        tradingProblemExplanation: 'Dopamine creates an appetite for larger thrills. You must consciously re-anchor to boring institutional execution.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'I need to hit 10k today so I can withdraw money for luxury spending', isControl: false, explanation: 'Gambler mindset: imposing personal monetary demands on the market.' },
            { text: 'I accept whatever the playbook gives me today, whether +$200 or -$100', isControl: true, explanation: 'Professional mindset: detachment from daily outcome.' },
            { text: 'Adding 2 more lots because this candle looks super strong', isControl: false, explanation: 'Unplanned impulsive risk expansion.' },
            { text: 'Sticking strictly to my position calculator size based on current stop distance', isControl: true, explanation: 'Standardized institutional sizing protocol.' },
          ],
        },
        practicalDecisionRule: 'Rule: Run the position size calculator for every single entry without exception.',
        groundingPrompt: 'Breathe slowly. Feel pride in mechanical, unexciting execution.',
      },
      {
        id: 'greed_session_4',
        title: 'Calm Harmonic Wave Tracing',
        durationMinutes: 4,
        objective: 'Cool down elevated central nervous system arousal and dopamine excitement.',
        defaultTrigger: 'Elevated excitement after watching a massive green candle',
        tradingProblemExplanation: 'High dopamine states create tunnel vision. Visual soothing rhythmic tracing restores rational prefrontal cortex control.',
        exerciseType: 'PATTERN_TRACE',
        exerciseCustomData: {
          patternType: 'WAVE',
        },
        practicalDecisionRule: 'Rule: Wait 5 minutes after a large profit before looking at another pair or chart.',
        groundingPrompt: 'Follow the smooth rhythm of the wave. Allow your pulse to return to calm baseline.',
      },
      {
        id: 'greed_session_5',
        title: 'Pre-Trade Greed Guardrail Check',
        durationMinutes: 3,
        objective: 'Audit your motives for this specific trade to verify it is driven by edge, not greed.',
        defaultTrigger: 'Entering an extra position outside trading hours',
        tradingProblemExplanation: 'Greed seeks action for the sake of making money rather than executing an established playbook edge.',
        exerciseType: 'PRE_TRADE_GROUNDING',
        practicalDecisionRule: 'Rule: If this setup is not written in my primary playbook, it is classified as greed theft and forbidden.',
        groundingPrompt: 'Step back from the screen. Ask: "Is this trade in my written business plan?"',
      },
    ],
    reflectionPrompts: [
      'Am I trading this setup because the edge is mathematically verified, or because I crave a large financial rush?',
      'If I cut my position size in half, would I still feel completely satisfied executing this setup?',
      'What would happen to my account over 100 trades if I consistently respected my baseline risk limit?',
    ],
  },

  FOMO: {
    id: 'FOMO',
    name: 'FOMO',
    tagline: 'Fear Of Missing Out & Chasing Extension',
    iconName: 'Flame',
    colorTheme: {
      accent: 'text-orange-400',
      bgGlow: 'from-orange-500/10 to-transparent',
      border: 'border-orange-500/30',
      badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Social comparison circuitry in the anterior cingulate cortex triggers deep panic when seeing price rally without you.',
      evolutionaryRoot: 'Being left behind when the tribe migrates to fertile hunting grounds meant death. Missing out feels like abandonment.',
      cognitiveDistortion: 'Extrapolation Fallacy: assuming that because a move went 50 pips, it will continue indefinitely without retracing.',
    },
    howItAppearsInTrading: [
      'Market-buying at the top of a huge green candle with no logical stop loss',
      'Entering positions without waiting for a retest or pullback',
      'Trading assets you have never researched because they are trending on Twitter or Discord',
      'Abandoning risk management because "there is no time to calculate"',
    ],
    possibleImpact: {
      capitalRisk: 'Buying the exact top or selling the exact bottom right before institutional mean reversion.',
      mentalCapitalLoss: 'Intense self-reproach and rage when the market immediately reverses into stop loss.',
      longTermDrawdown: 'Bleeding out capital across hundreds of low-quality, extended chasing entries.',
    },
    warningSigns: {
      physical: ['Surge of adrenaline', 'Rapid clicking', 'Leaning in close to the monitor', 'Breath holding'],
      behavioral: ['Frantically looking for buy button while price is rocketing', 'Ignoring technical resistance levels'],
      mental: ['Inner voice: "I have to get in NOW or I will regret this forever"', 'Blaming yourself for stepping away for lunch'],
    },
    sessions: [
      {
        id: 'fomo_session_1',
        title: 'The Infinite Market Ocean Reframe',
        durationMinutes: 4,
        objective: 'Realize that the market produces thousands of identical setups every single month.',
        defaultTrigger: 'Seeing a 100-pip breakout that you missed while away from desk',
        tradingProblemExplanation: 'FOMO operates on artificial scarcity. In reality, financial markets are an infinite stream of continuous opportunities.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'I missed the biggest move of the week, I must get some piece of it.',
              cognitiveBias: 'Scarcity Illusion / FOMO',
              rationalPerspective: 'A move without a defined setup is not your move. Chasing an extended candle is simply donating liquidity to smart money.',
            },
            {
              distortedThought: 'Everyone on social media caught this move and is making money except me.',
              cognitiveBias: 'Social Proof / Selective Attribution',
              rationalPerspective: 'Social feeds highlight outliers and fabricated gains. Your only job is executing your own edge with mechanical discipline.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Once price is more than 1 ATR away from technical support/resistance, market entry is strictly prohibited.',
        groundingPrompt: 'Take a deep breath and tell yourself: "The market will be here tomorrow, next week, and next year."',
      },
      {
        id: 'fomo_session_2',
        title: 'Physiological Sigh for Impulse Interruption',
        durationMinutes: 3,
        objective: 'Instantly halt the physiological impulse to hit Market Order.',
        defaultTrigger: 'Sudden breakout candle expanding rapidly on the 1m chart',
        tradingProblemExplanation: 'Two quick inhales through the nose followed by a long slow exhale through the mouth rapidly offloads CO2 and re-engages cognitive brakes.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'PHYSIOLOGICAL_SIGH',
        },
        practicalDecisionRule: 'Rule: Perform 3 physiological sighs before interacting with any chart where price moved > 20 pips in under 5 minutes.',
        groundingPrompt: 'Feel the urge to click dissolve like mist as you exhale completely.',
      },
      {
        id: 'fomo_session_3',
        title: 'Chasing Thought Filter',
        durationMinutes: 4,
        objective: 'Sort impulsive chasing thoughts from valid structural setups.',
        defaultTrigger: 'Urge to jump into a trade because a Telegram channel signaled it',
        tradingProblemExplanation: 'FOMO creates pseudo-arguments to justify entering outside of your validated criteria.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'Price is moving fast so I need to click buy before it goes higher', isControl: false, explanation: 'Classic FOMO chasing instinct.' },
            { text: 'Wait for price to pull back to the 50% discount zone and form a rejection candle', isControl: true, explanation: 'Patient structural playbook execution.' },
            { text: 'If I don\'t enter now, my daily profit target will be ruined', isControl: false, explanation: 'Imposing financial deadlines onto the market.' },
            { text: 'If price does not pull back to my entry zone, I happily let the trade go', isControl: true, explanation: 'High-level professional detachment.' },
          ],
        },
        practicalDecisionRule: 'Rule: No pullback, no trade. We trade value zones, not runaway green candles.',
        groundingPrompt: 'Acknowledge the missed move with gratitude that you are protecting your capital from reckless chases.',
      },
      {
        id: 'fomo_session_4',
        title: 'Calm Focus Stabilization',
        durationMinutes: 4,
        objective: 'Slow down internal temporal perception when market seems to be moving "too fast".',
        defaultTrigger: 'High volatility news candle creating fear of being left out',
        tradingProblemExplanation: 'FOMO speeds up internal time perception, making 10 seconds feel like a life-or-death decision.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: Never enter within 2 minutes of major red-folder news release.',
        groundingPrompt: 'Sync your heartbeat to the gentle movement on screen. You have all the time in the world.',
      },
      {
        id: 'fomo_session_5',
        title: 'The Missed Opportunity Post-Mortem',
        durationMinutes: 4,
        objective: 'Turn the pain of a missed move into constructive statistical documentation.',
        defaultTrigger: 'Trade idea worked out beautifully without you being filled',
        tradingProblemExplanation: 'Ruminating over missed setups leads directly to entering the next setup with reckless impatience.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: When a setup is missed, take a screenshot, log it in the study journal, and log off for 20 minutes.',
        groundingPrompt: 'The fact that the setup moved proves your analysis works. Congratulate your edge and wait for the next bus.',
      },
    ],
    reflectionPrompts: [
      'Did this trade meet 100% of my pre-planned entry rules, or did I enter purely because price was running?',
      'If I enter here, where is my logical invalidation point? Is the stop loss artificially wide?',
      'How many times in the past has chasing a running candle resulted in buying the exact top?',
    ],
  },

  REVENGE_TRADING: {
    id: 'REVENGE_TRADING',
    name: 'Revenge Trading',
    tagline: 'Emotional Retaliation & Tilt Spiraling',
    iconName: 'AlertOctagon',
    colorTheme: {
      accent: 'text-rose-400',
      bgGlow: 'from-rose-500/15 to-transparent',
      border: 'border-rose-500/40',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
    whyItHappens: {
      neurochemistry: 'Sudden loss of status and resources activates the rage circuitry (PAG) and floods the system with adrenaline and anger.',
      evolutionaryRoot: 'When attacked by a competitor or thief, human ancestors retaliated with aggression to recover resources and deter future attacks.',
      cognitiveDistortion: 'Anthropomorphizing the Market: believing the broker or market "stole" from you and you must fight back to win it back.',
    },
    howItAppearsInTrading: [
      'Immediately clicking an opposite or duplicate trade within seconds of being stopped out',
      'Doubling position size to "make back" the loss on a single candle',
      'Ignoring technical setups completely and trading purely on emotional indignation',
      'Refusing to accept a red day, resulting in 5x normal daily trade count',
    ],
    possibleImpact: {
      capitalRisk: 'Full account liquidation; losing 10% to 50% in a single catastrophic afternoon.',
      mentalCapitalLoss: 'Profound feelings of guilt, worthlessness, depression, and self-disgust.',
      longTermDrawdown: 'Destroying months of disciplined compounding in a 45-minute emotional rage blackout.',
    },
    warningSigns: {
      physical: ['Hot flush in face and neck', 'Pounding pulse in ears', 'White-knuckle mouse grip', 'Teeth grinding'],
      behavioral: ['Aggressive, hard mouse clicks', 'Swearing at monitors', 'Disabling risk limits or stop losses in software'],
      mental: ['Thinking: "The market screwed me, I will make it give my money back right now"', 'Cannot bear to look at account balance'],
    },
    sessions: [
      {
        id: 'revenge_session_1',
        title: 'Emergency Tilt Circuit Breaker',
        durationMinutes: 5,
        objective: 'Force an immediate physical and cognitive halt to the retaliatory rage loop.',
        defaultTrigger: '2 or 3 consecutive stop-outs in a single trading session',
        tradingProblemExplanation: 'During acute tilt, the prefrontal cortex is completely offline. You are operating in animal fight-or-flight mode. Any trade placed now has a 90% probability of being a disaster.',
        exerciseType: 'POST_LOSS_RESET',
        practicalDecisionRule: 'Rule: Mandatory 30-minute cooling interval after 2 consecutive stop-outs. Close broker platform immediately.',
        groundingPrompt: 'Place both hands flat on your desk. Feel the cool surface. The market cannot hurt you unless you give it permission.',
      },
      {
        id: 'revenge_session_2',
        title: 'The Neutral Market Reframe',
        durationMinutes: 4,
        objective: 'Eradicate the delusion that the market is targeting you personally.',
        defaultTrigger: 'Being stopped out by 1 pip before price reversed to your target',
        tradingProblemExplanation: 'The market is millions of anonymous participants transacting liquidity. It does not know your name, your entry price, or your account size.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'The market wicked me out on purpose, I\'m going to re-enter with 2x size to get even.',
              cognitiveBias: 'Paranoid Projection / Revenge Tilt',
              rationalPerspective: 'Liquidity pools naturally congregate around obvious swing points. Being wicked out is simply statistical market structure, not personal malice.',
            },
            {
              distortedThought: 'I cannot end today in the red, my ego can\'t take it.',
              cognitiveBias: 'Ego Defensiveness / Sunken Cost Fallacy',
              rationalPerspective: 'Every professional trader has red days. Accepting a -$200 day today is what preserves the account to make +$2,000 next week.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: The day ends when daily max loss is reached. No exceptions, no debate, no "one last trade".',
        groundingPrompt: 'Inhale peace. Exhale the need to be right. You are a professional risk manager.',
      },
      {
        id: 'revenge_session_3',
        title: 'Somatic Rage Release & Box Breathing',
        durationMinutes: 5,
        objective: 'Physically discharge sympathetic adrenaline and reset biological heart rate variability.',
        defaultTrigger: 'Feeling explosive anger after an unfair market slippage',
        tradingProblemExplanation: 'Aggressive energy must be discharged through deep respiration and somatic release, not through clicking order buttons.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'BOX_4_4_4_4',
        },
        practicalDecisionRule: 'Rule: Stand up, walk away from the desk, drink a full glass of cold water, and do not return for 15 minutes.',
        groundingPrompt: 'Relax your clenched fists. Drop your shoulders away from your ears.',
      },
      {
        id: 'revenge_session_4',
        title: 'Revenge Thought Sorting',
        durationMinutes: 4,
        objective: 'Distinguish retaliatory impulses from objective technical market edges.',
        defaultTrigger: 'Urge to flip direction from Long to Short immediately after stop loss',
        tradingProblemExplanation: 'Revenge makes you enter opposite positions at the exact point of market exhaustion.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'I lost $300, I have to make that $300 back right now', isControl: false, explanation: 'Direct retaliatory tilt.' },
            { text: 'My stop loss was triggered, my defined risk was respected, the trade is finished', isControl: true, explanation: 'Disciplined stoic acceptance.' },
            { text: 'I will double my lots so I can recover in half the pips', isControl: false, explanation: 'Gambler ruin trajectory.' },
            { text: 'I step away and let the session close. Tomorrow is a new slate', isControl: true, explanation: 'Preserving capital and mental clarity.' },
          ],
        },
        practicalDecisionRule: 'Rule: Never enter an opposite position within 15 minutes of being stopped out on the same instrument.',
        groundingPrompt: 'Acknowledge the loss as completely settled. The ledger is closed for this session.',
      },
      {
        id: 'revenge_session_5',
        title: 'Account Preservation Contract',
        durationMinutes: 3,
        objective: 'Re-affirm your solemn commitment to protect your capital from your own destructive impulses.',
        defaultTrigger: 'Urge to breach daily drawdown limit',
        tradingProblemExplanation: 'The biggest threat to your financial future is never the market; it is your own inability to stop trading when tilted.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: I solemnly pledge to preserve my account. I will not trade again until tomorrow\'s planned London or NY session.',
        groundingPrompt: 'Look in the mirror. Respect yourself as a professional business owner.',
      },
    ],
    reflectionPrompts: [
      'Am I clicking this button out of cold mathematical logic, or out of boiling anger and hurt pride?',
      'If someone were paying me $100,000 a year to manage their fund, would they fire me on the spot for this behavior?',
      'What will tomorrow feel like if I walk away right now versus if I blow 20% of the account in a rage?',
    ],
  },

  HESITATION: {
    id: 'HESITATION',
    name: 'Hesitation',
    tagline: 'Execution Paralysis & Second-Guessing Valid Edge',
    iconName: 'Clock',
    colorTheme: {
      accent: 'text-indigo-400',
      bgGlow: 'from-indigo-500/10 to-transparent',
      border: 'border-indigo-500/30',
      badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Dopaminergic conflict between reward anticipation and threat avoidance causes the motor cortex to lock up.',
      evolutionaryRoot: 'Freezing when danger is ambiguous. In the wild, remaining motionless avoids detection by predators.',
      cognitiveDistortion: 'Zero-Risk Bias: demanding 100% certainty in a business that is inherently 100% probabilistic.',
    },
    howItAppearsInTrading: [
      'Watching a textbook setup unfold, hovering over buy/sell, and failing to click until price moves 20 pips away',
      'Waiting for "one more confirmation" that never arrives or arrives too late',
      'Entering late with terrible risk-to-reward because the setup moved without you',
      'Constantly asking others in chat rooms "Are you guys buying this?" instead of trusting your own analysis',
    ],
    possibleImpact: {
      capitalRisk: 'Skewed R:R from late entries where the stop loss must be expanded or risk reward drops to 0.5R.',
      mentalCapitalLoss: 'Crippling frustration and erosion of self-trust from repeatedly analyzing winning moves without profiting.',
      longTermDrawdown: 'Under-sampling your edge, meaning you capture the inevitable losses but miss the explosive winners.',
    },
    warningSigns: {
      physical: ['Finger hovering over mouse button without clicking', 'Breath held in chest', 'Tense throat', 'Stiff neck'],
      behavioral: ['Repeatedly re-checking indicators', 'Switching charts to find conflicting opinions', 'Waiting past candle close'],
      mental: ['Internal monologue: "What if it fakes out? What if this is the one that fails?"', 'Doubt in previous backtest data'],
    },
    sessions: [
      {
        id: 'hesitation_session_1',
        title: 'Probabilistic Thinking & The 20-Trade Sample',
        durationMinutes: 4,
        objective: 'Shift focus from this individual trade to a sample size of 20 consecutive executions.',
        defaultTrigger: 'Freezing at an engulfing confirmation candle on key support',
        tradingProblemExplanation: 'Hesitation happens when you treat the next trade as a test of your worth. In reality, any single trade is an insignificant sample of a 100-trade statistical distribution.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'I must be 100% sure this trade will win before I click execute.',
              cognitiveBias: 'Zero-Risk Bias / Deterministic Fallacy',
              rationalPerspective: 'No one on earth knows if the next trade will win. Even the best hedge funds have 45% losses. Your job is simply to execute the edge and let math do the work.',
            },
            {
              distortedThought: 'My last 2 trades were stopped out, so this one will probably lose too.',
              cognitiveBias: 'Gambler\'s Fallacy / Clustering Illusion',
              rationalPerspective: 'Each trade event is independent. A coin does not remember landing on tails twice in a row.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: When the 3 setup criteria flash green, execute within 5 seconds. Do not allow your mind to negotiate.',
        groundingPrompt: 'Release the need for certainty. Embrace the beautiful randomness of the market.',
      },
      {
        id: 'hesitation_session_2',
        title: 'Pre-Execution 5-Second Rule',
        durationMinutes: 3,
        objective: 'Bypass the hesitation loop using Mel Robbins\' neurological countdown.',
        defaultTrigger: 'Candle closing on your entry trigger',
        tradingProblemExplanation: 'Counting down 5-4-3-2-1 interrupts the amygdala\'s threat response and moves neurological control to the motor prefrontal cortex.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: Count: 5-4-3-2-1-EXECUTE. Click order without analysis on 1.',
        groundingPrompt: 'Take a solid breath. Commit to action over perfection.',
      },
      {
        id: 'hesitation_session_3',
        title: 'Pattern Tracing for Flow State',
        durationMinutes: 4,
        objective: 'Transition the brain from hyper-analytical hesitation into fluid motor execution.',
        defaultTrigger: 'Mental paralysis following a difficult trading week',
        tradingProblemExplanation: 'Overthinking locks the motor system. Continuous smooth tracing restores fluid neuro-muscular readiness.',
        exerciseType: 'PATTERN_TRACE',
        exerciseCustomData: {
          patternType: 'INFINITY',
        },
        practicalDecisionRule: 'Rule: If a trade conforms to your checklist, not taking it is a more severe mistake than taking it and losing 1R.',
        groundingPrompt: 'Follow the infinity loop smoothly. Action creates confidence, not the reverse.',
      },
      {
        id: 'hesitation_session_4',
        title: 'Hesitation Thought Sorting',
        durationMinutes: 4,
        objective: 'Filter out imaginary threats from verified technical signals.',
        defaultTrigger: 'Looking for reasons NOT to take a playbook trade',
        tradingProblemExplanation: 'A fearful brain will invent micro-reasons (minor wick on 1m chart) to avoid risking capital.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'Maybe the 1-minute chart looks a little weak, better wait', isControl: false, explanation: 'Micro-timeframe excuse generated by hesitation.' },
            { text: 'Higher timeframe HTF bias is bullish, key liquidity taken, 15m change of character confirmed', isControl: true, explanation: 'Validated structural edge criteria.' },
            { text: 'What if I look foolish on the trade journal if it stops out immediately?', isControl: false, explanation: 'Ego and shame anxiety.' },
            { text: 'My risk is strictly 1% and fully calculated. I execute now', isControl: true, explanation: 'Objective risk management execution.' },
          ],
        },
        practicalDecisionRule: 'Rule: No consulting secondary timeframes once primary entry timeframe triggers.',
        groundingPrompt: 'Stand in your confidence. You have backtested this edge hundreds of times.',
      },
      {
        id: 'hesitation_session_5',
        title: 'Grounding Anchor for Decisive Action',
        durationMinutes: 3,
        objective: 'Establish a somatic anchor for instant, fearless order entry.',
        defaultTrigger: 'Hovering over the button with heart racing',
        tradingProblemExplanation: 'Physical anchors train the nervous system that clicking an order is safe and routine.',
        exerciseType: 'PRE_TRADE_GROUNDING',
        practicalDecisionRule: 'Rule: I accept the risk. I execute the edge. I detach from the outcome.',
        groundingPrompt: 'Press your thumb and forefinger together. Feel your resolve solidify.',
      },
    ],
    reflectionPrompts: [
      'Am I hesitating because my risk size is too large for my current comfort level?',
      'If I don\'t take valid setups when they appear, how can my mathematical edge ever generate profit?',
      'What is the real cost over a year of entering 5 pips late due to hesitation?',
    ],
  },

  OVERCONFIDENCE: {
    id: 'OVERCONFIDENCE',
    name: 'Overconfidence',
    tagline: 'Illusion of Mastery & Risk Blindness',
    iconName: 'Award',
    colorTheme: {
      accent: 'text-amber-300',
      bgGlow: 'from-cyan-400/10 to-transparent',
      border: 'border-cyan-400/30',
      badge: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/30',
    },
    whyItHappens: {
      neurochemistry: 'A string of winning trades floods the brain with testosterone and dopamine, dampening risk sensitivity in the insula.',
      evolutionaryRoot: 'Victorious hunters/warriors gained alpha status, creating temporary neurological invulnerability to pursue further expansion.',
      cognitiveDistortion: 'Self-Serving Attribution Bias: attributing random market wins entirely to superior skill while dismissing losses as bad luck.',
    },
    howItAppearsInTrading: [
      'Skipping your standard pre-trade checklist because you "feel the market in your bones"',
      'Increasing position size by 2x or 3x after a 4-trade winning streak',
      'Taking trades on unanalyzed pairs simply because you feel lucky',
      'Believing you are smarter than institutional algorithms and cannot be wrong',
    ],
    possibleImpact: {
      capitalRisk: 'The classic "Boom-and-Bust" cycle: giving back an entire month\'s profits in two reckless trades.',
      mentalCapitalLoss: 'Sudden shattering of ego leading to extreme depression or severe revenge tilt.',
      longTermDrawdown: 'Inability to achieve long-term professional consistency due to cyclical account drawdowns.',
    },
    warningSigns: {
      physical: ['Swagger', 'Chest puffed out', 'Talking excessively about trading to friends/family', 'Dismissive smirking'],
      behavioral: ['Trading while distracted (on phone, walking, in meetings)', 'Ignoring stop loss placement because "it won\'t hit"'],
      mental: ['Thinking: "I have cracked the market code"', 'Disdain for other traders who manage risk cautiously'],
    },
    sessions: [
      {
        id: 'overconf_session_1',
        title: 'The Humility Calibration: Randomness vs Skill',
        durationMinutes: 4,
        objective: 'Acknowledge that short-term win streaks are heavily influenced by market regime luck.',
        defaultTrigger: 'Winning 4 trades in a row this week',
        tradingProblemExplanation: 'In trading, random distribution ensures everyone experiences win streaks. Overconfidence mistakes market benevolence for personal genius.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'I understand this market better than anyone right now, I can size up.',
              cognitiveBias: 'Illusion of Superiority / Hubris',
              rationalPerspective: 'The market has ruined far better traders than you. Your edge only exists when you remain humble, vigilant, and strictly disciplined.',
            },
            {
              distortedThought: 'I don\'t need my checklist today, I just know where price is going.',
              cognitiveBias: 'Heuristic Drift',
              rationalPerspective: 'Skipping your process is the first step toward catastrophic drawdown. The rules protect you especially when you feel invincible.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: After a 3-trade win streak, position size must remain fixed at 1.0% or be reduced to 0.75% to prevent ego expansion.',
        groundingPrompt: 'Bow internally to the infinite power of the market. You are merely an observer who extracts small probability slices.',
      },
      {
        id: 'overconf_session_2',
        title: 'Slow Focus Ego Grounding',
        durationMinutes: 4,
        objective: 'Quiet dopamine hyperactivity and bring mental state back to calm baseline.',
        defaultTrigger: 'Euphoric feeling after closing a large winning trade',
        tradingProblemExplanation: 'Euphoria is as dangerous to a trader as panic. Both impair objective cognitive risk assessment.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: Never enter another trade within 30 minutes of a maximum profit take.',
        groundingPrompt: 'Feel yourself settling back into quiet, humble equilibrium.',
      },
      {
        id: 'overconf_session_3',
        title: 'Overconfidence Thought Sorting',
        durationMinutes: 4,
        objective: 'Sort arrogant assumptions from systematic risk management.',
        defaultTrigger: 'Urge to place a trade without calculating stop loss distance',
        tradingProblemExplanation: 'Overconfidence encourages sloppy execution and bypassing systematic guardrails.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'I don\'t need a hard stop loss on this trade, I will just watch it manually', isControl: false, explanation: 'Arrogant neglect of flash crash / slippage risk.' },
            { text: 'Every trade must have a hard stop loss set in the broker terminal immediately', isControl: true, explanation: 'Non-negotiable institutional protection rule.' },
            { text: 'I\'m up $1,500 today, so I can afford to gamble with $500 on this breakout', isControl: false, explanation: 'Casino "house money" fallacy.' },
            { text: 'Profits belong to my balance, not to the market to be gambled away', isControl: true, explanation: 'Capital preservation mindset.' },
          ],
        },
        practicalDecisionRule: 'Rule: The concept of "House Money" is banned. All realized profits are your permanent capital to defend.',
        groundingPrompt: 'Breathe deeply. Real success is surviving 10 years in this game, not winning 4 trades in a row.',
      },
      {
        id: 'overconf_session_4',
        title: 'The Post-Win Cooldown Ritual',
        durationMinutes: 3,
        objective: 'Lock in profits and prevent immediate overconfident giveback.',
        defaultTrigger: 'Completing a major winning session',
        tradingProblemExplanation: 'More than 70% of retail trading givebacks happen within 2 hours of hitting a large profit target.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: When daily profit target is reached, close platform and walk away. Trading day is officially concluded.',
        groundingPrompt: 'Celebrate your discipline, not the money. Close the laptop with pride.',
      },
      {
        id: 'overconf_session_5',
        title: 'Somatic Stillness & Humility Breath',
        durationMinutes: 4,
        objective: 'Use Box Breathing to wash away energetic bravado and re-center the ego.',
        defaultTrigger: 'Feeling superior after showing off profits to peers',
        tradingProblemExplanation: 'Bravado elevates sympathetic tone. Breathing brings conscious presence back to humble reality.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'BOX_4_4_4_4',
        },
        practicalDecisionRule: 'Rule: Never post floating PnL or brag in social channels during market hours.',
        groundingPrompt: 'Silent professionals let their audited multi-year equity curves do the talking.',
      },
    ],
    reflectionPrompts: [
      'Am I feeling so smart right now that I am about to take a trade I would never take on a normal day?',
      'How much of this week\'s success is attributable to favorable market trending versus my personal execution?',
      'If I gave back 50% of this week\'s gains today, how would I feel about my self-discipline tonight?',
    ],
  },

  BOREDOM_TRADING: {
    id: 'BOREDOM_TRADING',
    name: 'Boredom Trading',
    tagline: 'Action Addiction & Trading Low-Quality Noise',
    iconName: 'Sparkles',
    colorTheme: {
      accent: 'text-cyan-400',
      bgGlow: 'from-cyan-500/10 to-transparent',
      border: 'border-cyan-500/30',
      badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Dopamine drops during quiet consolidation ranges; the brain seeks stimulation and novelty by clicking buttons.',
      evolutionaryRoot: 'Humans are hardwired to be active; sitting motionless in a cave felt counter-productive to survival.',
      cognitiveDistortion: 'Action Bias: believing that sitting patiently doing nothing is "wasting time" and you must trade to earn your day.',
    },
    howItAppearsInTrading: [
      'Staring at dead Asian or midday consolidation charts and manufacturing low-quality setups',
      'Flipping through 20 different crypto and exotic forex pairs to find "anything moving"',
      'Trading on the 15-second or 1-minute chart during bank holidays or flat market hours',
      'Entering random micro-lot trades "just to have skin in the game"',
    ],
    possibleImpact: {
      capitalRisk: 'Bleeding out capital in spread, commission, and chop wicks during low-liquidity hours.',
      mentalCapitalLoss: 'Mental fatigue when high-probability London/NY setups finally arrive because you wasted energy on chop.',
      longTermDrawdown: 'Lowering overall win-rate from 60% down to 42% due to including dozens of junk trades.',
    },
    warningSigns: {
      physical: ['Slouching', 'Yawning while staring at screen', 'Restless leg bouncing', 'Fidgeting with mouse'],
      behavioral: ['Scrolling social media while charts are open', 'Lowering entry criteria to justify a trade', 'Trading outside core session'],
      mental: ['Thinking: "I\'ve sat here for 2 hours, I need to make at least one trade"', 'Desire for market entertainment'],
    },
    sessions: [
      {
        id: 'boredom_session_1',
        title: 'The Sniper Mindset: Patience as an Edge',
        durationMinutes: 4,
        objective: 'Reframe waiting not as inactivity, but as an active professional skill.',
        defaultTrigger: 'Market consolidating in a tight 8-pip range for over an hour',
        tradingProblemExplanation: 'Professional trading is 90% waiting and 10% execution. You are paid for waiting for your asymmetric edge, not for hours logged clicking.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'Sitting here without trading is a waste of my time. I should just take a quick scalp.',
              cognitiveBias: 'Action Bias / Sunk Cost Fallacy',
              rationalPerspective: 'A lion waiting for hours in the grass without stalking random mice is being efficient. Preserving capital in flat markets IS making money.',
            },
            {
              distortedThought: 'I need to make at least $100 before I leave my desk today.',
              cognitiveBias: 'Imposing Arbitrary Deadlines on Market',
              rationalPerspective: 'The market doesn\'t care about your schedule. If the playbook offers no setup today, taking zero trades is a 100% disciplined victory.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Zero trades taken on a choppy day is a certified A+ execution score in your journal.',
        groundingPrompt: 'Feel the peace of stillness. Let the market do all the hard work while you wait like a sniper.',
      },
      {
        id: 'boredom_session_2',
        title: 'Slow Focus Attention Reset',
        durationMinutes: 5,
        objective: 'Satisfy the brain\'s need for cognitive stimulation through a calm, non-market task.',
        defaultTrigger: 'Restlessness and itchiness to enter a trade during consolidation',
        tradingProblemExplanation: 'Redirecting the brain\'s dopaminergic seeking system away from live capital preserves your balance.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: If no setup triggers within 45 minutes of session start, step away and read or exercise for 20 minutes.',
        groundingPrompt: 'Allow your mind to appreciate slow, calm rhythm without requiring financial adrenaline.',
      },
      {
        id: 'boredom_session_3',
        title: 'Boredom Thought Sorting: Edge vs Entertainment',
        durationMinutes: 4,
        objective: 'Categorize trade motivations: are you trading for profit or for entertainment?',
        defaultTrigger: 'Scanning 15 charts looking for anything that has a candle moving',
        tradingProblemExplanation: 'If you trade for entertainment, the market will charge you the most expensive admission ticket in the world.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'I\'m bored, let me just risk $30 on this random coin to make things fun', isControl: false, explanation: 'Gambling for entertainment.' },
            { text: 'My core playbook pair has not reached the demand zone yet, so I sit patiently', isControl: true, explanation: 'Disciplined professional patience.' },
            { text: 'Maybe I will trade the 1-minute chart while the 1-hour chart sets up', isControl: false, explanation: 'Impatience rationalization.' },
            { text: 'I close the charts and set a price alert at the key structural level', isControl: true, explanation: 'Systematic alert-driven trading.' },
          ],
        },
        practicalDecisionRule: 'Rule: Never stare at flat screens. Set price alerts at key levels and close the charting software.',
        groundingPrompt: 'True edge is calm and boring. If trading feels thrilling, you are doing it wrong.',
      },
      {
        id: 'boredom_session_4',
        title: 'Pattern Tracing Calming Session',
        durationMinutes: 4,
        objective: 'Channel physical fidgeting into rhythmic calming pattern tracing.',
        defaultTrigger: 'Wanting to open trades during low-volume lunchtime chop',
        tradingProblemExplanation: 'Motor tracing calms restless energy and prevents reckless mouse clicks.',
        exerciseType: 'PATTERN_TRACE',
        exerciseCustomData: {
          patternType: 'SPIRAL',
        },
        practicalDecisionRule: 'Rule: Lunchtime zone (12:00-13:30 NY) is a mandatory no-trade zone.',
        groundingPrompt: 'Trace the spiral inward toward stillness and centered focus.',
      },
      {
        id: 'boredom_session_5',
        title: 'The "Patience Is Paid" Commitment',
        durationMinutes: 3,
        objective: 'Pledge to protect your equity from boredom theft.',
        defaultTrigger: 'Urge to trade outside of London or New York primary sessions',
        tradingProblemExplanation: 'Capital preservation during non-optimal hours is the hallmark of elite institutional traders.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: Trading is strictly limited to 2 scheduled trading windows per day. Off-hours are for backtesting or living life.',
        groundingPrompt: 'Remind yourself: "I am a professional businessman, not a video game player seeking sensory hits."',
      },
    ],
    reflectionPrompts: [
      'Am I seeking a trade right now because a proven mathematical setup exists, or because I feel empty and bored?',
      'If I had to pay a $50 cash penalty every time I took a trade without all 4 confluences, would I click this button?',
      'What hobbies outside of trading can I cultivate so I don\'t rely on charts for daily excitement?',
    ],
  },

  LOSS_AVERSION: {
    id: 'LOSS_AVERSION',
    name: 'Loss Aversion',
    tagline: 'Pain of Loss Overwhelming Positive Expectancy',
    iconName: 'TrendingDown',
    colorTheme: {
      accent: 'text-red-400',
      bgGlow: 'from-red-500/10 to-transparent',
      border: 'border-red-500/30',
      badge: 'bg-red-500/15 text-red-300 border-red-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Kahneman & Tversky\'s Prospect Theory: neurological pain of a $100 loss is 2.5x more intense than the pleasure of a $100 gain.',
      evolutionaryRoot: 'Loss of shelter or food in the Paleolithic era could be fatal, while excess gain provided diminishing returns.',
      cognitiveDistortion: 'Ostrich Effect: avoiding looking at losses or refusing to realize a loss in the hope it returns to breakeven.',
    },
    howItAppearsInTrading: [
      'Widening or removing stop losses as price approaches them',
      'Adding to losing positions (averaging down) to lower average entry price',
      'Holding massive underwater swing trades for weeks while cutting winners in 5 minutes',
      'Paralyzed inability to click close on an invalidated position',
    ],
    possibleImpact: {
      capitalRisk: 'Account blowup caused by a single runaway trend moving against an unprotected "hoping" position.',
      mentalCapitalLoss: 'Intense chronic anxiety, sleepless nights, and physical sickness watching floating red PnL grow.',
      longTermDrawdown: 'Mathematical impossibility of positive expectancy when average loss is 5x average win.',
    },
    warningSigns: {
      physical: ['Nausea in stomach', 'Sweating palms', 'Tight constricted throat', 'Insomnia'],
      behavioral: ['Dragging stop loss line down the chart', 'Praying or bargaining with higher powers', 'Hiding screen from partner'],
      mental: ['Thinking: "If I don\'t close it, it\'s not a real loss"', 'Believing price "has to bounce here because it\'s oversold"'],
    },
    sessions: [
      {
        id: 'loss_av_session_1',
        title: 'The Stop Loss as a Guardian Angel Reframe',
        durationMinutes: 4,
        objective: 'Transform your emotional perception of a stop loss from a failure into a business savior.',
        defaultTrigger: 'Price moving within 3 pips of your planned stop loss',
        tradingProblemExplanation: 'A stop loss is not a defeat; it is the boundary that ensures you survive to play the game tomorrow. It is your business insurance policy.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'If I just move my stop down 20 pips, price will reverse and I will save my money.',
              cognitiveBias: 'Loss Aversion / Escalation of Commitment',
              rationalPerspective: 'Moving your stop loss turns a controlled 1R business expense into an open-ended catastrophe. Accept the 1R loss with gratitude that it protected the other 99%.',
            },
            {
              distortedThought: 'Taking this loss means I was wrong and I am a bad trader.',
              cognitiveBias: 'Ego Attachment / Catastrophizing',
              rationalPerspective: 'A stop loss means this specific hypothesis was invalidated. It has zero reflection on your intelligence or your long-term success.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Moving a stop loss further away is classified as a Critical System Violation. Once set, stops can only move TOWARD profit.',
        groundingPrompt: 'Inhale courage. Realize that taking a stop loss cleanly is the highest mark of a disciplined professional.',
      },
      {
        id: 'loss_av_session_2',
        title: 'Physiological Sigh for Loss Acceptance',
        durationMinutes: 3,
        objective: 'Calm the panic reflex when a trade is stopped out so you do not reactively fight back.',
        defaultTrigger: 'Notification sound: "Stop Loss Triggered"',
        tradingProblemExplanation: 'The immediate 60 seconds after a loss are the highest risk for cognitive distortion. Breathing resets the nervous system before bad choices happen.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'PHYSIOLOGICAL_SIGH',
        },
        practicalDecisionRule: 'Rule: Hands off controls for 3 full minutes immediately following any stop-out.',
        groundingPrompt: 'Release the breath with a soft sigh. Let the trade go. It is in the past.',
      },
      {
        id: 'loss_av_session_3',
        title: 'Thought Sorting: Professional Acceptance vs Amateur Denial',
        durationMinutes: 4,
        objective: 'Distinguish healthy loss acceptance from toxic avoidance behaviors.',
        defaultTrigger: 'Floating loss reaching 1.2R due to slippage',
        tradingProblemExplanation: 'Amateurs hide from losses; professionals execute them swiftly and mechanically.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'I will hold this over the weekend because it might gap back in my favor', isControl: false, explanation: 'Reckless weekend gap risk avoidance.' },
            { text: 'The thesis is broken; I close the position at market immediately without hesitation', isControl: true, explanation: 'Disciplined capital protection.' },
            { text: 'I can add another position here to make my breakeven price closer', isControl: false, explanation: 'Martingale averaging down delusion.' },
            { text: 'I log the exact loss in my journal and examine whether I followed my rules', isControl: true, explanation: 'Growth-oriented process review.' },
          ],
        },
        practicalDecisionRule: 'Rule: Never average down on a losing position. If entry was wrong, adding size compounds the error.',
        groundingPrompt: 'Small losses are the bedrock of big wealth. Cut them without remorse.',
      },
      {
        id: 'loss_av_session_4',
        title: 'Post-Loss Somatic Grounding',
        durationMinutes: 4,
        objective: 'Release the physical knot of loss tension in the gut and chest.',
        defaultTrigger: 'Feeling lingering disappointment after a red day',
        tradingProblemExplanation: 'Unprocessed somatic tension from losses accumulates into chronic burnout and fear.',
        exerciseType: 'POST_LOSS_RESET',
        practicalDecisionRule: 'Rule: Rate your execution 1-10 based purely on rule adherence, ignoring the PnL dollar result.',
        groundingPrompt: 'Feel your body supported by the chair. Your worth is completely untouched by a number on a screen.',
      },
      {
        id: 'loss_av_session_5',
        title: 'The Wholesale Cost Pledge',
        durationMinutes: 3,
        objective: 'Formalize your mental model of losses as basic wholesale inventory costs.',
        defaultTrigger: 'Hesitating to close a trade that has clearly invalidated technical structure',
        tradingProblemExplanation: 'A restaurant owner does not weep when buying tomatoes. Losses are simply the inventory cost of trading.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: I joyfully pay my wholesale expenses (stop losses) so that my business can sell retail profits (take profits).',
        groundingPrompt: 'Say aloud: "I accept this small cost as an honorable business expense."',
      },
    ],
    reflectionPrompts: [
      'If I refuse to take this small 1R loss now, what is the maximum drawdown this unmanaged position could inflict on my account?',
      'Have I ever widened a stop loss and ended up losing significantly more than my original risk?',
      'Can I celebrate executing a textbook stop-loss as a triumph of discipline over ego?',
    ],
  },

  ANALYSIS_PARALYSIS: {
    id: 'ANALYSIS_PARALYSIS',
    name: 'Analysis Paralysis',
    tagline: 'Information Overload & Multi-Timeframe Confusion',
    iconName: 'Brain',
    colorTheme: {
      accent: 'text-violet-400',
      bgGlow: 'from-violet-500/10 to-transparent',
      border: 'border-violet-500/30',
      badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Cognitive overload in the working memory buffer of the prefrontal cortex; processing too many conflicting inputs stalls decision synthesis.',
      evolutionaryRoot: 'Too many competing threat stimuli in complex terrain caused ancestors to freeze while assessing predator vectors.',
      cognitiveDistortion: 'Fallacy of Completeness: believing that with enough indicators, news feeds, and timeframes, trading risk can be completely eliminated.',
    },
    howItAppearsInTrading: [
      'Having 10 indicators on a chart (RSI, MACD, Bollinger Bands, ICT, Order Blocks, Elliot Wave) giving conflicting signals',
      'Checking 1m, 5m, 15m, 1h, 4h, Daily, and Weekly charts and finding reasons not to trade on every one',
      'Missing pristine moves because indicator #7 hadn\'t crossed above 50 yet',
      'Spending 4 hours analyzing a chart and ending up too mentally drained to execute when the setup triggers',
    ],
    possibleImpact: {
      capitalRisk: 'Chronic underperformance and taking trades out of frustration after missing clean opportunities.',
      mentalCapitalLoss: 'Severe mental exhaustion and headaches from processing redundant chart data.',
      longTermDrawdown: 'Lack of systematic repeatability because entry criteria shift every single day.',
    },
    warningSigns: {
      physical: ['Tension headache behind temples', 'Eyestrain', 'Stiff neck', 'Brain fog'],
      behavioral: ['Adding new indicators to charts continuously', 'Having 25 open browser tabs of economic news', 'Constantly changing template styles'],
      mental: ['Thinking: "The 15m says buy, but the 1h has a fair value gap, and the 4h is near a trendline, so I don\'t know what to do"'],
    },
    sessions: [
      {
        id: 'ana_par_session_1',
        title: 'Occam\'s Razor: Chart Stripping & Simplification',
        durationMinutes: 4,
        objective: 'Eliminate secondary and tertiary indicator noise to restore intuitive clarity.',
        defaultTrigger: 'Feeling overwhelmed by 4 conflicting technical indicators',
        tradingProblemExplanation: 'Every additional indicator added after your primary edge decreases decision speed and increases noise without adding predictive accuracy.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'I need 5 separate confirmations to be sure this trade will work.',
              cognitiveBias: 'Over-Fitting / Redundancy Bias',
              rationalPerspective: 'Indicators are all derivative lagging calculations of price and volume. Clean market structure and 2 primary confluences provide maximum mathematical efficiency.',
            },
            {
              distortedThought: 'If I miss an obscure macroeconomic metric, this trade will be ruined.',
              cognitiveBias: 'Illusion of Knowledge',
              rationalPerspective: 'Price reflects all known information instantly. Stick to your specific structural edge and let the market absorb macro flows.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Max 2 technical tools allowed on execution charts. Naked candles + key support/resistance + liquidity zone.',
        groundingPrompt: 'Close your eyes. Let your brain clear away the clutter of noisy lines and squiggles.',
      },
      {
        id: 'ana_par_session_2',
        title: 'Slow Focus Mental Decluttering',
        durationMinutes: 4,
        objective: 'Reset cognitive working memory from scattered hyper-analysis back to single-pointed attention.',
        defaultTrigger: 'Staring at 8 different timeframes simultaneously',
        tradingProblemExplanation: 'Tracking an isolated focal point clears the prefrontal cortex queue and restores sharp decision-making speed.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: Stick strictly to the 3-Timeframe rule: Direction (4h), Structure (1h), Execution (15m). All other charts hidden.',
        groundingPrompt: 'Settle into simple, uncluttered awareness.',
      },
      {
        id: 'ana_par_session_3',
        title: 'Thought Sorting: Essential Edge vs Irrelevant Noise',
        durationMinutes: 4,
        objective: 'Sort critical execution criteria from irrelevant second-guessing data.',
        defaultTrigger: 'Hesitating because an indicator on a secondary timeframe looks slightly divergent',
        tradingProblemExplanation: 'Filter out the endless sea of non-essential market opinions.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'Someone on Twitter said Bitcoin might dump to 40k today', isControl: false, explanation: 'External social media noise.' },
            { text: 'My defined 4h key level was reached and formed a 15m bullish market structure shift', isControl: true, explanation: 'Primary verified playbook confluence.' },
            { text: 'The stochastic oscillator on the 30-minute chart is slightly overbought', isControl: false, explanation: 'Lagging secondary indicator noise.' },
            { text: 'My risk is calculated to 1% and stop loss is below swing low', isControl: true, explanation: 'Core execution parameters.' },
          ],
        },
        practicalDecisionRule: 'Rule: No social media, Discord chat, or news feeds allowed open during active trading sessions.',
        groundingPrompt: 'Quiet the external world. Your edge is sufficient.',
      },
      {
        id: 'ana_par_session_4',
        title: 'Pattern Tracing Clarity Reset',
        durationMinutes: 4,
        objective: 'Soothe cognitive strain through fluid visual tracking.',
        defaultTrigger: 'Mental fatigue after analyzing for 2 hours straight',
        tradingProblemExplanation: 'Visual pattern tracing activates the default mode network, allowing the analytical brain to rest and recharge.',
        exerciseType: 'PATTERN_TRACE',
        exerciseCustomData: {
          patternType: 'INFINITY',
        },
        practicalDecisionRule: 'Rule: Max 15 minutes of chart analysis per setup. If no clear confluence, move on.',
        groundingPrompt: 'Flow smoothly along the line. Simplicity is genius.',
      },
      {
        id: 'ana_par_session_5',
        title: 'The Binary Decision Checklist',
        durationMinutes: 3,
        objective: 'Reduce complex multi-variable trading into a clear YES/NO binary matrix.',
        defaultTrigger: 'Stuck in indecision about entering a confirmed setup',
        tradingProblemExplanation: 'Binary logic removes emotional friction and analysis paralysis.',
        exerciseType: 'PRE_TRADE_GROUNDING',
        practicalDecisionRule: 'Rule: If Criteria A, B, and C are YES -> Click Execute. No further thinking allowed.',
        groundingPrompt: 'Simplicity, clarity, execution. Trust your training.',
      },
    ],
    reflectionPrompts: [
      'Am I seeking more information to improve my edge, or to soothe my fear of taking a loss?',
      'If I stripped 70% of the indicators from my chart, would my actual execution quality improve?',
      'What are the 3 non-negotiable things that actually determine whether my setups work?',
    ],
  },

  PERFECTIONISM: {
    id: 'PERFECTIONISM',
    name: 'Perfectionism',
    tagline: 'Need for Flawless Entries & Intolerance of Scratches',
    iconName: 'Target',
    colorTheme: {
      accent: 'text-purple-400',
      bgGlow: 'from-purple-500/10 to-transparent',
      border: 'border-purple-500/30',
      badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Overactive anterior cingulate cortex detecting minor discrepancies as severe errors; dopamine deprivation when results don\'t match idealized perfection.',
      evolutionaryRoot: 'In craft and tool-making, perfection ensured survival. In stochastic financial markets, perfectionism is completely toxic.',
      cognitiveDistortion: 'All-or-Nothing Thinking: viewing any imperfect execution or normal loss as a total failure.',
    },
    howItAppearsInTrading: [
      'Refusing to enter unless price wicks the exact pip of an order block (missing entries by 0.5 pips)',
      'Beating yourself up relentlessly for closing at +2.5R when price later ran to +4R',
      'Feeling like a complete failure despite having a profitable week because one trade was sloppy',
      'Constantly restarting trading accounts or journals to maintain an artificial "100% win rate"',
    ],
    possibleImpact: {
      capitalRisk: 'Missing prime setups due to demanding unattainable precision; holding trades too long demanding maximum profit.',
      mentalCapitalLoss: 'Chronic dissatisfaction, imposter syndrome, and emotional burnout despite making money.',
      longTermDrawdown: 'Abandoning solid, profitable trading systems after 2 normal losses because they aren\'t "perfect".',
    },
    warningSigns: {
      physical: ['Chronic jaw clenching', 'Rigid posture', 'Sighing with frustration after winning trades'],
      behavioral: ['Obsessively calculating the difference between your exit and the absolute peak', 'Deleting journal entries that lost'],
      mental: ['Thinking: "I should have known it would pull back there"', 'Inability to celebrate profitable days'],
    },
    sessions: [
      {
        id: 'perf_session_1',
        title: 'The Messy Edge Acceptance',
        durationMinutes: 4,
        objective: 'Embrace the fundamental truth that trading is inherently messy, imprecise, and probabilistic.',
        defaultTrigger: 'Upset after closing a +2R winner that continued running another 30 pips',
        tradingProblemExplanation: 'No one catches the exact bottom and top consistently. Elite trading is capturing the meat of the curve with positive expectancy, not perfection.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'I left $200 on the table, I am an idiot for closing when I did.',
              cognitiveBias: 'Hindsight Bias / Perfectionism Distortion',
              rationalPerspective: 'You followed your trading plan and banked a +2R target. What happens after your planned exit is completely irrelevant to your discipline.',
            },
            {
              distortedThought: 'My entry was 1.5 pips off from the absolute wick low, my analysis was poor.',
              cognitiveBias: 'False Precision Fallacy',
              rationalPerspective: 'Markets are liquid auctions with spreads and slippage. Demanding sub-pip perfection causes you to miss lucrative asymmetric moves.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Success is measured by adherence to process, NEVER by whether an execution was cosmetically "perfect".',
        groundingPrompt: 'Exhale the crushing weight of perfectionism. Good enough executed consistently generates millions.',
      },
      {
        id: 'perf_session_2',
        title: '4-4-4-4 Box Breathing for Self-Compassion',
        durationMinutes: 4,
        objective: 'Soothe harsh internal criticism and relax rigid perfectionist posture.',
        defaultTrigger: 'Making a minor rule error and engaging in harsh negative self-talk',
        tradingProblemExplanation: 'Berating yourself activates threat circuitry and guarantees a subsequent emotional mistake. Self-compassion restores executive control.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'BOX_4_4_4_4',
        },
        practicalDecisionRule: 'Rule: Treat yourself with the same calm, constructive encouragement you would offer a junior trader you are mentoring.',
        groundingPrompt: 'Soften your shoulders. You are a human being mastering a difficult, high-stakes craft.',
      },
      {
        id: 'perf_session_3',
        title: 'Thought Sorting: Perfectionism vs Professionalism',
        durationMinutes: 4,
        objective: 'Differentiate rigid destructive perfectionism from healthy professional craftsmanship.',
        defaultTrigger: 'Feeling tempted to alter system rules after an imperfect trading day',
        tradingProblemExplanation: 'Perfectionism destroys consistency by constantly changing working systems in search of the Holy Grail.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'I must find a strategy that never has 3 consecutive losses', isControl: false, explanation: 'Unrealistic perfectionist Holy Grail illusion.' },
            { text: 'I accept that my strategy will have drawdown periods, and I execute it faithfully', isControl: true, explanation: 'Professional long-term probabilistic mindset.' },
            { text: 'I feel sick because I didn\'t exit at the exact highest tick of the candle', isControl: false, explanation: 'Toxic perfectionist hindsight expectation.' },
            { text: 'I banked my target at the predetermined resistance zone and I am content', isControl: true, explanation: 'Disciplined execution satisfaction.' },
          ],
        },
        practicalDecisionRule: 'Rule: Allow yourself a 10% "friction buffer" on entries and exits. Precision is secondary to structural edge.',
        groundingPrompt: 'Perfection is an illusion. Mastery is consistency in an imperfect world.',
      },
      {
        id: 'perf_session_4',
        title: 'Pattern Tracing Organic Flow',
        durationMinutes: 4,
        objective: 'Experience the beauty of fluid, imperfect, organic movement.',
        defaultTrigger: 'Obsessive micro-management of open trade charts',
        tradingProblemExplanation: 'Engaging in smooth non-linear tracing frees the mind from rigid binary entrapment.',
        exerciseType: 'PATTERN_TRACE',
        exerciseCustomData: {
          patternType: 'WAVE',
        },
        practicalDecisionRule: 'Rule: Once take profit and stop loss are set, chart must be minimized. Let the trade breathe.',
        groundingPrompt: 'Notice that nature has no straight lines. Allow the trade to unfold organically.',
      },
      {
        id: 'perf_session_5',
        title: 'The "Good Enough" Mastery Pledge',
        durationMinutes: 3,
        objective: 'Commit to being an effective probability operator rather than an uptight perfectionist.',
        defaultTrigger: 'Hesitating on an entry because the candle body is 1mm smaller than ideal',
        tradingProblemExplanation: 'Perfectionism is fear wearing a sophisticated mask. Smash the mask and take action.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: If a setup fulfills 80% of ideal playbook conditions, execute without perfectionist delay.',
        groundingPrompt: 'Done with discipline is infinitely better than perfect in imagination.',
      },
    ],
    reflectionPrompts: [
      'Am I demanding a level of perfection from trading that doesn\'t exist in any other professional discipline on earth?',
      'How much mental energy do I burn agonizing over pips left on the table that were never part of my plan?',
      'Can I be proud of a trade that followed every single rule, even if it ended in a 1R loss?',
    ],
  },

  IMPATIENCE: {
    id: 'IMPATIENCE',
    name: 'Impatience',
    tagline: 'Rushing Trigger Confirmation & Premature Entry',
    iconName: 'Clock',
    colorTheme: {
      accent: 'text-blue-500',
      bgGlow: 'from-amber-600/10 to-transparent',
      border: 'border-amber-600/30',
      badge: 'bg-amber-600/15 text-amber-300 border-amber-600/30',
    },
    whyItHappens: {
      neurochemistry: 'High baseline cortisol combined with low serotonin triggers a sensation of temporal urgency; the brain equates delay with loss of control.',
      evolutionaryRoot: 'Urgency in foraging or hunting before rivals arrived. Speed often won in ancestral skirmishes.',
      cognitiveDistortion: 'Present Bias / Hyperbolic Discounting: valuing immediate action over significantly higher delayed payoffs.',
    },
    howItAppearsInTrading: [
      'Entering 3 minutes before candle close because "it looks like it will close bullish anyway"',
      'Setting limit orders too close to current price instead of waiting for true discount zones',
      'Closing winning trades before they reach target because you can\'t stand waiting another 45 minutes',
      'Constantly checking positions every 30 seconds on your smartphone',
    ],
    possibleImpact: {
      capitalRisk: 'Getting wicked out because the candle reverses in the final 10 seconds before close.',
      mentalCapitalLoss: 'High-frequency anxiety spikes and restlessness throughout the trading day.',
      longTermDrawdown: 'Destroying expectancy by taking entries with poor location and premature invalidation.',
    },
    warningSigns: {
      physical: ['Tapping foot or fingers continuously', 'Looking at the clock repeatedly', 'Bouncing in seat'],
      behavioral: ['Entering before the candle timer reaches 00:00', 'Constantly refreshing phone app', 'Moving TP closer to exit faster'],
      mental: ['Thinking: "Come on, just move already!"', 'Frustration that the market is moving too slowly'],
    },
    sessions: [
      {
        id: 'impatience_session_1',
        title: 'Candle Close Sanctity',
        durationMinutes: 4,
        objective: 'Internalize that an unclosed candlestick contains zero valid institutional information.',
        defaultTrigger: 'Urge to click Buy 45 seconds before the 15-minute candle closes',
        tradingProblemExplanation: 'Institutional algorithms and high-frequency algorithms execute on candle close. Entering before the close is entering on unconfirmed noise.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'The candle looks so strong, if I wait 60 seconds for the close I will miss 4 pips.',
              cognitiveBias: 'Premature Closure / Present Bias',
              rationalPerspective: 'A candle can completely reject and leave a massive wick in the last 15 seconds. Waiting for the close validates that the liquidity was truly accepted.',
            },
            {
              distortedThought: 'This trade is taking too long to hit target, I should just exit now.',
              cognitiveBias: 'Temporal Discounting',
              rationalPerspective: 'Large institutional order flow takes hours or days to absorb. Giving trades time to develop is the price of catching high R:R moves.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Absolutely zero market entries permitted until the candle timer reads 00:00 and the next bar opens.',
        groundingPrompt: 'Settle into the passage of time. Time is your ally, not your competitor.',
      },
      {
        id: 'impatience_session_2',
        title: 'Slow Focus Temporal Expansion',
        durationMinutes: 5,
        objective: 'Surgically slow down your subjective perception of time.',
        defaultTrigger: 'Feeling frantic and restless during an active trade holding period',
        tradingProblemExplanation: 'Calm visual tracking lowers adrenaline, making 5 minutes feel spacious and peaceful rather than agonizingly slow.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: After entry, set alerts at SL and TP, then close the platform and step away for at least 30 minutes.',
        groundingPrompt: 'Let every second expand. There is nowhere you need to rush to.',
      },
      {
        id: 'impatience_session_3',
        title: 'Thought Sorting: Impatience vs Calculated Readiness',
        durationMinutes: 4,
        objective: 'Sort impatient trigger-happy thoughts from patient high-probability execution.',
        defaultTrigger: 'Wanting to jump into a setup before it reaches the key demand zone',
        tradingProblemExplanation: 'Impatience tricks you into accepting inferior trade locations.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'Price came close enough to my zone, let me just enter now so I don\'t miss it', isControl: false, explanation: 'Impatience compromising trade location.' },
            { text: 'I wait for price to touch the exact POI and form the reversal confirmation', isControl: true, explanation: 'Strict entry location discipline.' },
            { text: 'The trade has been floating for 40 minutes, I\'m going to close it for +0.5R to free up margin', isControl: false, explanation: 'Impatience truncating positive expectancy.' },
            { text: 'I give the trade space and time to reach its target or hit its invalidation', isControl: true, explanation: 'Allowing the edge to play out.' },
          ],
        },
        practicalDecisionRule: 'Rule: Price must touch the designated POI. If it misses by 1 pip and runs, it was not your trade.',
        groundingPrompt: 'Patience is the ultimate competitive advantage in markets filled with frantic participants.',
      },
      {
        id: 'impatience_session_4',
        title: '4-7-8 Deep Autonomic Slowdown',
        durationMinutes: 4,
        objective: 'Use extended exhalations to forcefully lower physiological urgency.',
        defaultTrigger: 'Physical restlessness watching 1m candles tick',
        tradingProblemExplanation: 'Exhaling for 8 seconds stimulates the vagus nerve, immediately slowing heart rate and terminating impatience.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'RELAX_4_7_8',
        },
        practicalDecisionRule: 'Rule: Whenever tempted to close a trade early, perform 3 cycles of 4-7-8 breathing before touching the mouse.',
        groundingPrompt: 'Feel the tension drain out through your fingertips and toes.',
      },
      {
        id: 'impatience_session_5',
        title: 'The Bamboo Growth Mindset',
        durationMinutes: 3,
        objective: 'Internalize the Chinese bamboo metaphor: years of root growth before rapid vertical expansion.',
        defaultTrigger: 'Frustration that account balance is not growing fast enough this month',
        tradingProblemExplanation: 'Demanding immediate financial gratification leads to over-trading and account destruction.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: Focus on executing 100 flawless trades. The balance will take care of itself as a byproduct.',
        groundingPrompt: 'Roots first. Capital compounding is an exponential curve, not a sprint.',
      },
    ],
    reflectionPrompts: [
      'Am I jumping into this trade early because I fear missing it, or because my checklist is 100% satisfied right now?',
      'How many times has waiting for the official candle close saved me from a devastating fake-out?',
      'If I gave every winning trade an extra 30 minutes to develop, what would happen to my overall profitability?',
    ],
  },

  POST_LOSS_SHAME: {
    id: 'POST_LOSS_SHAME',
    name: 'Post-Loss Shame',
    tagline: 'Self-Worth Devaluation & Hiding Losses',
    iconName: 'ShieldAlert',
    colorTheme: {
      accent: 'text-rose-500',
      bgGlow: 'from-rose-600/10 to-transparent',
      border: 'border-rose-600/30',
      badge: 'bg-rose-600/15 text-rose-300 border-rose-600/30',
    },
    whyItHappens: {
      neurochemistry: 'Acute drop in dopamine and serotonin accompanied by social pain signaling in the dorsal anterior cingulate cortex (dACC).',
      evolutionaryRoot: 'Shame evolved to prevent ostracization from the tribe. Failing to provide resources felt shameful to early humans.',
      cognitiveDistortion: 'Personalization & Global Labeling: transforming "I experienced a trade loss" into "I am an incompetent failure".',
    },
    howItAppearsInTrading: [
      'Hiding trading losses from spouse, mentor, or trading community out of humiliation',
      'Refusing to log losing trades into the trade journal',
      'Feeling physically dirty, sick, or depressed after a normal 1R stop-out',
      'Desperately taking reckless trades to erase the loss so nobody finds out you had a red day',
    ],
    possibleImpact: {
      capitalRisk: 'Unrecorded losses accumulate silently without behavioral post-mortem analysis.',
      mentalCapitalLoss: 'Severe erosion of self-esteem, chronic depression, and alienation from loved ones.',
      longTermDrawdown: 'Inability to learn from mistakes because the trader cannot bear to look at past trade data.',
    },
    warningSigns: {
      physical: ['Slumped posture', 'Head in hands', 'Heavy sensation in chest', 'Avoiding eye contact'],
      behavioral: ['Closing the journal without logging', 'Lying about daily trading results to family', 'Canceling plans with friends'],
      mental: ['Thinking: "I will never make it as a trader, I am useless"', 'Feeling unworthy of success'],
    },
    sessions: [
      {
        id: 'shame_session_1',
        title: 'Decoupling Identity From Outcome',
        durationMinutes: 5,
        objective: 'Surgically separate your identity as a human being from probabilistic trade results.',
        defaultTrigger: 'Taking a stop loss and feeling intense personal humiliation',
        tradingProblemExplanation: 'A trade outcome is a random draw from a statistical distribution. Conflating it with your human value is a profound cognitive error.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'I took a loss today, which means I am an incompetent fraud who doesn\'t belong here.',
              cognitiveBias: 'Global Labeling / Shame Distortion',
              rationalPerspective: 'The greatest traders in human history have thousands of losing trades every year. A stop-out is simply data, not a referendum on your character.',
            },
            {
              distortedThought: 'If anyone knew I lost $200 today, they would look down on me.',
              cognitiveBias: 'Spotlight Effect / Catastrophizing',
              rationalPerspective: 'Professional trading is a solitary business of risk management. Real professionals respect anyone who takes clean, controlled losses within their plan.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Every loss must be logged in the journal within 15 minutes with a screenshot and written gratitude for the lesson.',
        groundingPrompt: 'Place your hand on your heart. Breathe deeply. You are worthy, intelligent, and capable regardless of today\'s PnL.',
      },
      {
        id: 'shame_session_2',
        title: 'Post-Loss Compassionate Decompression',
        durationMinutes: 5,
        objective: 'Step through an immersive nervous system reset following a painful loss.',
        defaultTrigger: 'Lingering feeling of shame after taking 2 losses today',
        tradingProblemExplanation: 'Unprocessed shame turns into anger or despair. Compassionate reset restores dignity and calm focus.',
        exerciseType: 'POST_LOSS_RESET',
        practicalDecisionRule: 'Rule: Rate today\'s performance on whether you protected capital, not whether the market yielded a green number.',
        groundingPrompt: 'Release the heavy stone of shame from your chest. You did your job as risk manager.',
      },
      {
        id: 'shame_session_3',
        title: 'Thought Sorting: Shame vs Constructive Feedback',
        durationMinutes: 4,
        objective: 'Separate toxic self-flagellation from constructive mechanical review.',
        defaultTrigger: 'Negative inner monologue berating yourself after a mistake',
        tradingProblemExplanation: 'Shame says "I am bad." Constructive review says "The entry was premature, next time wait for candle close."',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'I am so stupid, why do I always mess this up?', isControl: false, explanation: 'Destructive shame self-talk.' },
            { text: 'The stop loss was placed too tight below the equal lows; next time place it beyond the structural liquidity sweep', isControl: true, explanation: 'Objective technical adjustment.' },
            { text: 'I should just quit and give up on my dreams', isControl: false, explanation: 'Catastrophic defeatism.' },
            { text: 'My risk was strictly 1%, the drawdown is completely manageable, I will review the chart calmly tomorrow', isControl: true, explanation: 'Resilient professional perspective.' },
          ],
        },
        practicalDecisionRule: 'Rule: Harsh self-criticism is banned. All post-trade feedback must be written in objective third-person language.',
        groundingPrompt: 'Speak to yourself as a wise, patient coach.',
      },
      {
        id: 'shame_session_4',
        title: 'Pattern Tracing Self-Forgiveness',
        durationMinutes: 4,
        objective: 'Cultivate neuro-somatic self-forgiveness through rhythmic tracing.',
        defaultTrigger: 'Ruminating over a blown challenge or a bad trading session',
        tradingProblemExplanation: 'Self-forgiveness is a prerequisite for consistency. Ruminating anchors the mind in the past and guarantees future errors.',
        exerciseType: 'PATTERN_TRACE',
        exerciseCustomData: {
          patternType: 'SPIRAL',
        },
        practicalDecisionRule: 'Rule: Forgive yourself completely for past mistakes. Today is a fresh slate with 100% disciplined execution.',
        groundingPrompt: 'Trace the path inward toward self-acceptance and quiet strength.',
      },
      {
        id: 'shame_session_5',
        title: 'The Radical Transparency Pledge',
        durationMinutes: 3,
        objective: 'Vanish the power of shame through honest documentation.',
        defaultTrigger: 'Urge to hide a loss from your trading journal',
        tradingProblemExplanation: 'Shame only survives in secrecy. Bringing it into the light of the journal instantly dissolves its emotional grip.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: I document every single loss with complete honesty. I take pride in facing the numbers directly.',
        groundingPrompt: 'Stand tall. True courage is standing in front of your numbers with complete honesty.',
      },
    ],
    reflectionPrompts: [
      'What would I say to my best friend if they were in this exact situation and feeling this shame?',
      'Is beating myself up making me a more profitable trader, or is it draining the energy I need to succeed?',
      'Can I see this loss as the tuition payment required to earn my PhD in market mastery?',
    ],
  },

  COMPARISON_ANXIETY: {
    id: 'COMPARISON_ANXIETY',
    name: 'Comparison Anxiety',
    tagline: 'Social Media Envy & Inadequacy Panic',
    iconName: 'Activity',
    colorTheme: {
      accent: 'text-teal-400',
      bgGlow: 'from-teal-500/10 to-transparent',
      border: 'border-teal-500/30',
      badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Social hierarchy evaluation in the medial prefrontal cortex; seeing peers flash wealth triggers status anxiety and cortisol spikes.',
      evolutionaryRoot: 'In ancestral groups, falling behind in tribal status meant less mating success and less access to shared food.',
      cognitiveDistortion: 'Social Comparison Bias: comparing your unedited behind-the-scenes struggles to someone else\'s fabricated highlight reel.',
    },
    howItAppearsInTrading: [
      'Checking Twitter, Instagram, or Discord and seeing traders flashing +$10,000 days while you made $150',
      'Feeling sudden disgust with your modest, steady compounding gains',
      'Artificially increasing your risk parameters to match the lot sizes of trading influencers',
      'Abandoning your working swing strategy to try a high-risk scalping system you saw on YouTube',
    ],
    possibleImpact: {
      capitalRisk: 'Sizing up irrationally to achieve influencer-level profits, resulting in rapid account blowout.',
      mentalCapitalLoss: 'Loss of joy in legitimate personal trading progress; feeling constantly inadequate.',
      longTermDrawdown: 'Constant strategy hopping leading to perpetual confusion and lack of mastery in any single edge.',
    },
    warningSigns: {
      physical: ['Sinking feeling in chest when scrolling feeds', 'Hollow sensation in gut', 'Irritable mood'],
      behavioral: ['Checking social media during active trading sessions', 'Comparing your account size to strangers online'],
      mental: ['Thinking: "He is 22 and making 50k a month, what is wrong with me?"', 'Feeling that 2% a month is "worthless"'],
    },
    sessions: [
      {
        id: 'comp_session_1',
        title: 'The Highlight Reel Demystification',
        durationMinutes: 4,
        objective: 'Deconstruct the reality of social media trading propaganda and demo account marketing.',
        defaultTrigger: 'Feeling inadequate after seeing an influencer post a massive screenshot of green PnL',
        tradingProblemExplanation: 'Over 90% of social media trading screenshots are demo accounts, stolen photos, or oversized gambles that blew up the next day. Comparing your real capital to fake marketing is financial suicide.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'Everyone else is getting rich quickly in trading while I am compounding slowly.',
              cognitiveBias: 'Survivorship Bias / Social Media Delusion',
              rationalPerspective: '95% of retail traders blow up within 6 months. Slow, steady compounding of 2-5% monthly puts you in the top 1% of fund managers globally over 5 years.',
            },
            {
              distortedThought: 'My +$120 win today is embarrassing compared to what others are making.',
              cognitiveBias: 'Anchoring to External Outliers',
              rationalPerspective: 'Percentage gain and risk management are all that matter. A 2% gain on a $1,000 account requires the exact same psychological skill as a 2% gain on a $1,000,000 account.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Unfollow all trading lifestyle influencers. Total social media blackout during trading hours.',
        groundingPrompt: 'Return your focus to your own journey. Your only competitor is who you were yesterday.',
      },
      {
        id: 'comp_session_2',
        title: 'Slow Focus Solitary Grounding',
        durationMinutes: 4,
        objective: 'Re-anchor your awareness inside your own skin, completely detached from external validation.',
        defaultTrigger: 'Envy and frustration after a trading group discussion',
        tradingProblemExplanation: 'Solitary focus silences the comparison circuitry in the brain and restores calm contentment with your personal process.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: Leave all public trading chat rooms where people post PnL screenshots without verified audits.',
        groundingPrompt: 'Feel the quiet sanctuary of your own trading room. You answer only to your own plan.',
      },
      {
        id: 'comp_session_3',
        title: 'Thought Sorting: My Process vs External Distraction',
        durationMinutes: 4,
        objective: 'Filter out toxic social comparison inputs from your internal growth metrics.',
        defaultTrigger: 'Temptation to size up because someone in a Discord call used a 10-lot position',
        tradingProblemExplanation: 'Trading someone else\'s risk size is the fastest route to account destruction.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'I should use a 5-lot size like that guy in Discord so I can quit my job faster', isControl: false, explanation: 'Disastrous comparison-driven risk creep.' },
            { text: 'I size strictly according to my personal account balance and verified risk tolerance', isControl: true, explanation: 'Self-governed professional management.' },
            { text: 'Look at his fancy sports car, he must be a trading genius', isControl: false, explanation: 'Lifestyle marketing delusion.' },
            { text: 'I judge my trading exclusively by my Sharpe ratio, max drawdown, and rule compliance', isControl: true, explanation: 'Institutional metrics of true mastery.' },
          ],
        },
        practicalDecisionRule: 'Rule: Your account growth curve is private and sacred. Never share PnL with people who judge by dollar amounts.',
        groundingPrompt: 'Celebrate your 1% gains. Wealth is built quietly in the dark.',
      },
      {
        id: 'comp_session_4',
        title: 'Breathing for Contentment and Gratitude',
        durationMinutes: 4,
        objective: 'Cultivate deep contentment with your current phase of development through Box Breathing.',
        defaultTrigger: 'Feeling behind in life compared to other traders',
        tradingProblemExplanation: 'Gratitude neurologically blocks envy and comparison anxiety by flooding the brain with serotonin.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'BOX_4_4_4_4',
        },
        practicalDecisionRule: 'Rule: Write down 3 trading skills you have improved over the past 6 months before opening charts.',
        groundingPrompt: 'Inhale gratitude for your progress. Exhale the toxic need to prove anything to anyone.',
      },
      {
        id: 'comp_session_5',
        title: 'The Solitary Master Pledge',
        durationMinutes: 3,
        objective: 'Commit to running your own race with blinders on.',
        defaultTrigger: 'Urge to copy someone else\'s trades',
        tradingProblemExplanation: 'You cannot succeed long-term on borrowed conviction. You must master your own edge.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: I run my own race with blinders on. I celebrate my steady compounding and ignore the noise of the crowd.',
        groundingPrompt: 'Look inward. The treasure you seek is inside your own discipline.',
      },
    ],
    reflectionPrompts: [
      'If I compounded my current account by 3% each month for the next 5 years, what would the mathematical balance be?',
      'Why am I allowing strangers on the internet to dictate how I feel about my personal progress?',
      'What are the unique personal strengths I bring to trading that cannot be measured in a single day\'s screenshot?',
    ],
  },

  BURNOUT: {
    id: 'BURNOUT',
    name: 'Burnout',
    tagline: 'Exhaustion & Diminished Cognitive Processing',
    iconName: 'HeartPulse',
    colorTheme: {
      accent: 'text-slate-300',
      bgGlow: 'from-slate-500/10 to-transparent',
      border: 'border-slate-500/30',
      badge: 'bg-slate-500/15 text-slate-200 border-slate-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Chronic HPA-axis activation leading to cortisol receptor downregulation, dopamine depletion, and physical prefrontal cortex fatigue.',
      evolutionaryRoot: 'Prolonged stress without recovery forced animals to shut down activity to conserve remaining metabolic resources.',
      cognitiveDistortion: 'Martyrdom Fallacy: believing that the more hours you grind in front of screens, the more money you will extract.',
    },
    howItAppearsInTrading: [
      'Staring at charts for 12 hours a day without taking breaks',
      'Feeling completely apathetic when a trade hits stop loss or take profit',
      'Making silly careless errors (wrong lot size, clicking buy instead of sell, wrong pair)',
      'Severe dread and exhaustion when morning alarms ring before market open',
    ],
    possibleImpact: {
      capitalRisk: 'Massive unforced errors caused by cognitive exhaustion and micro-sleeps during executions.',
      mentalCapitalLoss: 'Clinical depression, loss of passion for trading, strained personal relationships, chronic health issues.',
      longTermDrawdown: 'Completely abandoning trading after suffering severe physical and psychological collapse.',
    },
    warningSigns: {
      physical: ['Chronic fatigue despite sleep', 'Brain fog', 'Heavy eyes', 'Frequent colds or immune drops'],
      behavioral: ['Drinking 5 cups of coffee or energy drinks to stay awake at the desk', 'Irritability with family members'],
      mental: ['Feeling numb, empty, or cynical about trading', 'Difficulty calculating simple risk percentages'],
    },
    sessions: [
      {
        id: 'burnout_session_1',
        title: 'The Athlete Recovery Model',
        durationMinutes: 5,
        objective: 'Reframe sleep, rest, and time away from charts as the primary driver of high performance.',
        defaultTrigger: 'Feeling completely drained and unmotivated while staring at charts',
        tradingProblemExplanation: 'Olympic athletes do not train 14 hours a day; they train with intense focus for 2 hours and dedicate the rest to sleep and recovery. Trading is high-performance cognitive athletics.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'If I leave the charts to take a nap or go to the gym, I am being lazy and will miss money.',
              cognitiveBias: 'Hustle Culture Fallacy / Diminishing Returns',
              rationalPerspective: 'A fatigued brain has the cognitive capacity of an intoxicated person. Stepping away to recharge is the highest form of risk management.',
            },
            {
              distortedThought: 'I must work harder and stare longer to turn this drawdown around.',
              cognitiveBias: 'Sunk Effort Fallacy',
              rationalPerspective: 'Drawdown during burnout is caused by cognitive fatigue. The only cure is stepping away from live trading for 48 hours to restore dopamine baseline.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Max 4 hours of screen time per day. Mandatory 1-hour walk in nature without phones daily.',
        groundingPrompt: 'Allow your body to completely let go of tension. Rest is not a reward; it is a fundamental requirement.',
      },
      {
        id: 'burnout_session_2',
        title: 'Deep Restorative Autonomic Reset',
        durationMinutes: 5,
        objective: 'Induce deep parasympathetic relaxation using the 4-7-8 cadence.',
        defaultTrigger: 'Exhaustion headache after a 6-hour trading block',
        tradingProblemExplanation: 'Slowing the respiration rate allows the nervous system to enter restorative repair mode.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'RELAX_4_7_8',
        },
        practicalDecisionRule: 'Rule: Take a mandatory 15-minute screen-free break every 60 minutes of charting.',
        groundingPrompt: 'Release the tension behind your eyes. Let your brain bathe in restful darkness.',
      },
      {
        id: 'burnout_session_3',
        title: 'Thought Sorting: Essential Tasks vs Energy Vampires',
        durationMinutes: 4,
        objective: 'Prune away 70% of unnecessary trading tasks that are burning out your nervous system.',
        defaultTrigger: 'Feeling overwhelmed by charting 30 different currency pairs',
        tradingProblemExplanation: 'Burnout is caused by doing too many non-essential tasks with high emotional friction.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'Analyze 40 different pairs every morning before the session', isControl: false, explanation: 'Massive cognitive fatigue generator.' },
            { text: 'Focus exclusively on 1 primary instrument (e.g. EUR/USD or Gold) during 1 session', isControl: true, explanation: 'Laser-focused cognitive efficiency.' },
            { text: 'Watch 6 YouTube trading podcasts while actively executing trades', isControl: false, explanation: 'Sensory overload and attention fragmentation.' },
            { text: 'Execute in silence with zero background noise or distractions', isControl: true, explanation: 'Calm, sustainable execution environment.' },
          ],
        },
        practicalDecisionRule: 'Rule: Trade maximum 2 instruments. Remove all other pairs from your watchlist.',
        groundingPrompt: 'Simplicity is energy. Strip away the non-essential.',
      },
      {
        id: 'burnout_session_4',
        title: 'Gentle Organic Wave Tracing',
        durationMinutes: 4,
        objective: 'Provide a soothing, zero-demand cognitive oasis for an exhausted mind.',
        defaultTrigger: 'Feeling burned out and empty inside',
        tradingProblemExplanation: 'Gentle wave tracing requires zero analytical effort, allowing the prefrontal cortex to completely rest.',
        exerciseType: 'PATTERN_TRACE',
        exerciseCustomData: {
          patternType: 'WAVE',
        },
        practicalDecisionRule: 'Rule: Mandatory zero-trading weekend. Do not open trading software from Friday 5 PM to Sunday 5 PM.',
        groundingPrompt: 'Follow the gentle wave like a leaf floating downstream. You are safe to rest.',
      },
      {
        id: 'burnout_session_5',
        title: 'The Sustainable Longevity Contract',
        durationMinutes: 3,
        objective: 'Commit to playing the long game of trading longevity over short-term burnout.',
        defaultTrigger: 'Feeling tempted to trade while physically sick or exhausted',
        tradingProblemExplanation: 'A trader who burns out cannot compound capital. Your health is your primary trading asset.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: If sleep was under 6 hours or sickness is present, trading is strictly prohibited for the day.',
        groundingPrompt: 'Honor your body. Without vibrant health, wealth has zero meaning.',
      },
    ],
    reflectionPrompts: [
      'Am I treating my mind and body like a world-class athlete, or like a piece of disposable machinery?',
      'What would happen if I stepped away from the markets completely for 3 full days?',
      'What are 2 activities outside of trading that genuinely recharge my soul and restore my energy?',
    ],
  },

  PRE_MARKET_ANXIETY: {
    id: 'PRE_MARKET_ANXIETY',
    name: 'Pre-Market Anxiety',
    tagline: 'Anticipatory Dread & Pre-Session Nervousness',
    iconName: 'AlertTriangle',
    colorTheme: {
      accent: 'text-cyan-400',
      bgGlow: 'from-blue-500/10 to-transparent',
      border: 'border-blue-500/30',
      badge: 'bg-blue-500/15 text-amber-300 border-blue-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Cortisol awakening response combined with anticipatory threat priming in the bed nucleus of the stria terminalis (BNST).',
      evolutionaryRoot: 'Preparing for imminent physical combat or dangerous foraging expedition at dawn.',
      cognitiveDistortion: 'Catastrophic Forecasting: assuming before the market opens that the day will inevitably result in disaster or pain.',
    },
    howItAppearsInTrading: [
      'Waking up 30 minutes before London or NY open with stomach in knots and racing pulse',
      'Dreading sitting down at the desk despite loving trading in theory',
      'Checking news headlines frantically for fear of a surprise geopolitical shock',
      'Delaying opening the charting platform out of subconscious avoidance',
    ],
    possibleImpact: {
      capitalRisk: 'Entering the session with depleted nervous system reserves, leading to quick tilt on the first small loss.',
      mentalCapitalLoss: 'Chronic daily anxiety poisoning morning hours and degrading physical health.',
      longTermDrawdown: 'Hesitating on pristine setups because the morning began in an emotional deficit state.',
    },
    warningSigns: {
      physical: ['Nervous stomach / nausea before market open', 'Trembling hands', 'Rapid shallow breathing', 'Sweating'],
      behavioral: ['Pacing around the room', 'Excessive bathroom trips before open', 'Checking the clock obsessively'],
      mental: ['Thinking: "I hope today doesn\'t ruin my week"', 'Dreading what the market might do'],
    },
    sessions: [
      {
        id: 'pre_mkt_session_1',
        title: 'The Pre-Market Grounding & Risk Acceptance Anchor',
        durationMinutes: 5,
        objective: 'Transform anticipatory dread into grounded, professional readiness.',
        defaultTrigger: 'Sitting down at desk 15 minutes before London or New York open',
        tradingProblemExplanation: 'Anxiety is caused by resisting the possibility of loss. Once loss is fully accepted prior to session start, anxiety has no fuel to burn.',
        exerciseType: 'PRE_TRADE_GROUNDING',
        practicalDecisionRule: 'Rule: Complete the 5-point Pre-Market Grounding protocol before launching your trading terminal.',
        groundingPrompt: 'Feel the firmness of your chair. You are completely safe. The market is just numbers dancing on a screen.',
      },
      {
        id: 'pre_mkt_session_2',
        title: 'Physiological Sigh Morning Nervousness Dump',
        durationMinutes: 4,
        objective: 'Expel morning cortisol surge and stabilize resting heart rate.',
        defaultTrigger: 'Heart pounding as market open approaches (07:55 London or 09:25 NY)',
        tradingProblemExplanation: 'The physiological sigh rapidly deflates autonomic hyper-arousal and re-engages the prefrontal cortex.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'PHYSIOLOGICAL_SIGH',
        },
        practicalDecisionRule: 'Rule: Perform 5 cycles of physiological sigh 2 minutes before the opening bell.',
        groundingPrompt: 'Drop your shoulders down. Soften your belly. You are ready.',
      },
      {
        id: 'pre_mkt_session_3',
        title: 'Cognitive Reframe: Threat vs Opportunity',
        durationMinutes: 4,
        objective: 'Shift perception from "the market is a battlefield" to "the market is an infinite opportunity auction".',
        defaultTrigger: 'Fear that today will be a red day before placing a single trade',
        tradingProblemExplanation: 'Anticipatory dread turns trading into torture. Reframing trading as a probability game restores enthusiasm.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'What if today is the day I lose all my profits from this week?',
              cognitiveBias: 'Catastrophizing / Negative Forecasting',
              rationalPerspective: 'Your maximum daily loss is strictly hard-coded at 2%. You can NEVER lose all your profits in one day unless you choose to violate your rules.',
            },
            {
              distortedThought: 'I have to trade perfectly today to maintain my confidence.',
              cognitiveBias: 'Conditional Self-Worth',
              rationalPerspective: 'Your confidence comes from following your system, not from the market giving you a green day. Execute calmly.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Max loss today is strictly fixed. Since the downside is mathematically capped, there is nothing to fear.',
        groundingPrompt: 'Accept the maximum daily loss right now in your mind. Notice how calm you feel once it is accepted.',
      },
      {
        id: 'pre_mkt_session_4',
        title: 'Slow Focus Attunement',
        durationMinutes: 4,
        objective: 'Synchronize visual and mental processing speed with the rhythm of the market.',
        defaultTrigger: 'Scattered, jittery mind before opening charts',
        tradingProblemExplanation: 'Calming visual tracking transitions the brain from high-frequency beta anxiety waves to steady alpha focus.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: Spend 5 minutes in silent focus before touching the keyboard or mouse.',
        groundingPrompt: 'Flow with the gentle rhythm on screen. Be still like water.',
      },
      {
        id: 'pre_mkt_session_5',
        title: 'Pre-Market Readiness Pledge',
        durationMinutes: 3,
        objective: 'Formalize your mental readiness for the upcoming session.',
        defaultTrigger: 'Final 60 seconds before market open',
        tradingProblemExplanation: 'Pledging adherence anchors professional commitment and silences nervous internal chatter.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: I enter this session as a detached probability executor. I accept all outcomes with equal calm.',
        groundingPrompt: 'Take a deep, solid breath. You are prepared, trained, and ready.',
      },
    ],
    reflectionPrompts: [
      'What specific outcome am I afraid of today, and is that outcome completely survivable under my risk rules?',
      'How would I approach this morning if I knew with 100% certainty that over the next 100 trades I would be profitable?',
      'What physical routine (water, light stretching, breathing) can I establish every morning to replace anxious pacing?',
    ],
  },

  POST_WIN_OVERCONFIDENCE: {
    id: 'POST_WIN_OVERCONFIDENCE',
    name: 'Post-Win Overconfidence',
    tagline: 'Euphoria, Risk Creep & Profit Giveback',
    iconName: 'Sparkles',
    colorTheme: {
      accent: 'text-emerald-400',
      bgGlow: 'from-emerald-500/10 to-transparent',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Massive dopaminergic surge post-win blunts the anterior insula (which registers risk and pain), creating temporary psychological invulnerability.',
      evolutionaryRoot: 'Successful hunting triggered exuberant celebratory energy to reward the effort and reinforce hunting behavior.',
      cognitiveDistortion: 'Attribution Bias & Illusion of Control: believing you have "mastered the algorithm" and cannot fail on the next entry.',
    },
    howItAppearsInTrading: [
      'Immediately looking for another trade within 60 seconds of hitting a +3R target',
      'Doubling position size on the next trade because you are "playing with the market\'s money"',
      'Relaxing your strict entry criteria and taking mediocre setups because you feel lucky',
      'Giving back 80% to 100% of your morning gains before the afternoon session ends',
    ],
    possibleImpact: {
      capitalRisk: 'Frequent round-trips: turning a +$2,000 morning into a -$500 afternoon deficit.',
      mentalCapitalLoss: 'Intense self-disgust, anger, and cognitive whiplash from holding winning equity and giving it back.',
      longTermDrawdown: 'Stagnant equity curves that constantly spike and round-trip without long-term compounding.',
    },
    warningSigns: {
      physical: ['Adrenaline buzz', 'Smiling / laughing out loud at screens', 'Restless pacing', 'Urge to spend money online'],
      behavioral: ['Taking screenshots and sending to friends', 'Looking for fast action on lower timeframes', 'Ignoring stop distance'],
      mental: ['Thinking: "I am in the zone, everything I touch turns to gold today"', 'Disdain for cautious risk management'],
    },
    sessions: [
      {
        id: 'post_win_session_1',
        title: 'The Profit Vaulting Protocol',
        durationMinutes: 4,
        objective: 'Mentally and operationally lock your profits into the vault so they cannot be recycled back to the market.',
        defaultTrigger: 'Just closed a major winning trade (+2R or higher)',
        tradingProblemExplanation: 'The biggest threat to a trader is not losing trades; it is the immediate 30 minutes following a massive win. Dopamine blinds you to risk.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: After a +2R or greater winning trade, the trading day is officially declared COMPLETE. Platform must be closed.',
        groundingPrompt: 'Lock the vault door in your mind. The profits belong to your family, not the market.',
      },
      {
        id: 'post_win_session_2',
        title: 'Dopamine Flush Box Breathing',
        durationMinutes: 4,
        objective: 'Rapidly flush euphoric dopamine and restore sober cognitive equilibrium.',
        defaultTrigger: 'Feeling hyped up and energetic after a win',
        tradingProblemExplanation: 'Euphoria and anger are neurologically identical in their ability to impair prefrontal risk calculation. Both require somatic down-regulation.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'BOX_4_4_4_4',
        },
        practicalDecisionRule: 'Rule: Perform 5 cycles of Box Breathing before even logging the trade into your journal.',
        groundingPrompt: 'Feel the excitement dissolve into quiet, sober professional pride.',
      },
      {
        id: 'post_win_session_3',
        title: 'Cognitive Reframe: The "House Money" Delusion',
        durationMinutes: 4,
        objective: 'Eradicate the casino concept of "House Money" that causes massive profit givebacks.',
        defaultTrigger: 'Urge to risk profits on a risky speculative setup',
        tradingProblemExplanation: 'There is no such thing as the market\'s money. The moment a trade is closed, those dollars are your hard-earned capital.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'I made $800 this morning, so I can afford to risk $400 on this quick scalp.',
              cognitiveBias: 'House Money Effect / Mental Accounting',
              rationalPerspective: 'That $800 is your net worth. Treating it with less respect than your starting balance guarantees you will give it all back over time.',
            },
            {
              distortedThought: 'I am seeing the charts so clearly today, I should keep trading all afternoon.',
              cognitiveBias: 'Hot Hand Fallacy',
              rationalPerspective: 'Market conditions shift rapidly between morning and afternoon. Over-staying your welcome turns winning days into frustrating losses.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: The word "House Money" is completely banned. Treat every single dollar with identical defensive respect.',
        groundingPrompt: 'Protect what you have won with the ferocity of a lion guarding its cubs.',
      },
      {
        id: 'post_win_session_4',
        title: 'Slow Focus Humility Reset',
        durationMinutes: 4,
        objective: 'Surgically bring your emotional state back to zero before walking away from desk.',
        defaultTrigger: 'Feeling superior and over-confident after winning multiple days in a row',
        tradingProblemExplanation: 'Humility is the only shield against the inevitable market regime shift.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: Walk away from screens immediately after session. Do not watch price action after closing trades.',
        groundingPrompt: 'Bow respectfully to the market. You took your slice; now step back.',
      },
      {
        id: 'post_win_session_5',
        title: 'The Professional Walk-Away Habit',
        durationMinutes: 3,
        objective: 'Anchor the identity of an elite professional who knows when to bank gains and leave.',
        defaultTrigger: 'Temptation to reopen trading software after lunch',
        tradingProblemExplanation: 'Elite performance is knowing when to stop. Amateur traders trade until the market forcibly stops them.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: Once daily goal is achieved, lock computer screen and engage in life outside trading.',
        groundingPrompt: 'Feel the deep satisfaction of closing in the green and keeping it in the green.',
      },
    ],
    reflectionPrompts: [
      'How many times in my trading history have I turned a beautifully profitable day into a red day by over-trading?',
      'If I closed my platform right now and took the rest of the day off, how proud will I feel tonight when I go to bed?',
      'Am I continuing to trade because there is a genuine A+ edge, or because I am addicted to the dopamine of winning?',
    ],
  },

  DISCIPLINE_FATIGUE: {
    id: 'DISCIPLINE_FATIGUE',
    name: 'Discipline Fatigue',
    tagline: 'Ego Depletion & Willpower Exhaustion',
    iconName: 'ShieldCheck',
    colorTheme: {
      accent: 'text-sky-400',
      bgGlow: 'from-sky-500/10 to-transparent',
      border: 'border-sky-500/30',
      badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    },
    whyItHappens: {
      neurochemistry: 'Glucose and neurotransmitter depletion in the anterior cingulate cortex and dorsolateral prefrontal cortex; willpower is a finite metabolic resource.',
      evolutionaryRoot: 'Continuous suppression of natural impulses consumes extreme energy; the brain eventually forces behavioral relaxation to save fuel.',
      cognitiveDistortion: 'Moral Licensing: believing that because you were disciplined on the last 5 trades, you "deserve" to be reckless on this one.',
    },
    howItAppearsInTrading: [
      'Following your trading plan flawlessly for 4 days, then completely breaking all rules on Friday afternoon',
      'Resisting impulsive trades all morning, then succumbing and taking a terrible trade right before session close',
      'Gradually letting stop losses slip wider and wider as the week progresses',
      'Feeling an overwhelming urge to "just do whatever I want for once"',
    ],
    possibleImpact: {
      capitalRisk: 'The Friday Afternoon Melt-Down: wiping out Monday through Thursday\'s meticulous discipline in a single fatigue trade.',
      mentalCapitalLoss: 'Demoralizing confusion: "Why do I do so well for days and then suddenly destroy everything?"',
      longTermDrawdown: 'Plateaued equity curves that cannot break out of drawdown due to periodic discipline collapse.',
    },
    warningSigns: {
      physical: ['Heavy eyelids', 'Slumping forward', 'Cravings for sugar or junk food', 'Mental exhaustion'],
      behavioral: ['Sighing heavily before looking at charts', 'Skipping standard pre-trade checklist steps', 'Trading later into the day than planned'],
      mental: ['Thinking: "Screw it, I\'ve been good all week, let\'s just see what happens"', 'Feeling tired of being disciplined'],
    },
    sessions: [
      {
        id: 'disc_fat_session_1',
        title: 'The Finite Willpower Reservoir Reframe',
        durationMinutes: 4,
        objective: 'Understand that self-discipline is a finite metabolic battery that must be recharged, not forced.',
        defaultTrigger: 'Feeling worn down after 4 days of intense discipline and wanting to gamble',
        tradingProblemExplanation: 'You cannot rely on brute willpower forever. Systems, automation, and hard rules must protect you when your biological willpower battery is drained.',
        exerciseType: 'COGNITIVE_REFRAME',
        exerciseCustomData: {
          reframeCards: [
            {
              distortedThought: 'I have been so disciplined all week, I deserve to take this fun speculative trade.',
              cognitiveBias: 'Moral Licensing',
              rationalPerspective: 'The market doesn\'t give bonus points for past discipline. A reckless trade on Friday destroys the exact same dollars you earned on Tuesday.',
            },
            {
              distortedThought: 'I am weak for feeling tired of following rules.',
              cognitiveBias: 'Biological Denial',
              rationalPerspective: 'Willpower depletion is physical neuro-metabolic reality. Recognize the low battery and stop trading instead of forcing it.',
            },
          ],
        },
        practicalDecisionRule: 'Rule: Max 3 trading days per week or strict 2-trades-per-day limit to prevent ego depletion.',
        groundingPrompt: 'Honor your brain\'s limits. When the battery is low, the only disciplined move is to shut down.',
      },
      {
        id: 'disc_fat_session_2',
        title: 'Willpower Battery Recharge Breathing',
        durationMinutes: 5,
        objective: 'Replenish prefrontal oxygen and mental energy using Box Breathing.',
        defaultTrigger: 'Late session exhaustion and slipping attention',
        tradingProblemExplanation: 'Deep rhythmic oxygenation restores prefrontal glucose metabolism and delays willpower failure.',
        exerciseType: 'BREATHING_ORB',
        exerciseCustomData: {
          breathingMode: 'BOX_4_4_4_4',
        },
        practicalDecisionRule: 'Rule: Never trade past 12:00 PM local time on Fridays. Weekend starts early.',
        groundingPrompt: 'Inhale fresh clarity. Exhale the fatigue of the week.',
      },
      {
        id: 'disc_fat_session_3',
        title: 'Thought Sorting: Ego Depletion vs Systematic Habit',
        durationMinutes: 4,
        objective: 'Identify sneaky rationalizations that appear when discipline fatigue sets in.',
        defaultTrigger: 'Whispers of "Just this once it won\'t hurt" creeping into your thoughts',
        tradingProblemExplanation: 'When tired, the brain manufactures clever excuses to break rules.',
        exerciseType: 'THOUGHT_SORT',
        exerciseCustomData: {
          thoughtCards: [
            { text: 'It\'s Friday afternoon and the market is moving, let me just throw on 1 lot without a stop', isControl: false, explanation: 'Discipline fatigue trap.' },
            { text: 'I recognize that I am mentally exhausted, so I log off and preserve my week\'s profit', isControl: true, explanation: 'Supreme professional self-awareness.' },
            { text: 'I don\'t feel like filling out the pre-trade checklist this time', isControl: false, explanation: 'Early warning sign of discipline breakdown.' },
            { text: 'No checklist, no trade. Ever. No exceptions for fatigue', isControl: true, explanation: 'Non-negotiable automated rule.' },
          ],
        },
        practicalDecisionRule: 'Rule: If you feel any resistance to filling out your pre-trade checklist, do not trade.',
        groundingPrompt: 'Recognize the temptation as tired chemistry, not your true will.',
      },
      {
        id: 'disc_fat_session_4',
        title: 'Slow Focus Stamina Recovery',
        durationMinutes: 4,
        objective: 'Provide a peaceful, non-taxing visual anchor to prevent late-day breakdown.',
        defaultTrigger: 'Feeling irritable and impatient during the final hour of trading',
        tradingProblemExplanation: 'Slow focus releases mental strain and prevents reckless end-of-session trading.',
        exerciseType: 'SLOW_FOCUS',
        practicalDecisionRule: 'Rule: All open day-trades must be closed 30 minutes before session close.',
        groundingPrompt: 'Let go of the urge to squeeze more from the market today.',
      },
      {
        id: 'disc_fat_session_5',
        title: 'The Friday Preservation Contract',
        durationMinutes: 3,
        objective: 'Lock in your weekly gains and prevent the notorious Friday giveback.',
        defaultTrigger: 'Entering Friday trading session',
        tradingProblemExplanation: 'Friday discipline fatigue is the single most common cause of retail drawdown.',
        exerciseType: 'DECISION_PLEDGE',
        practicalDecisionRule: 'Rule: On Friday, position sizes are halved (0.5% max risk) and trading stops at 11:30 AM.',
        groundingPrompt: 'Finish the week strong by doing less, not more. Protect your peace.',
      },
    ],
    reflectionPrompts: [
      'Have I noticed a recurring pattern of giving back profits on certain days of the week or times of day?',
      'How can I structure my trading environment so that discipline relies on automated rules rather than willpower?',
      'If I stopped trading the moment I noticed the first sign of mental fatigue, what would happen to my equity curve?',
    ],
  },
};

export const CATEGORY_LIST: PsychologicalCategory[] = Object.values(PSYCHOLOGY_CATEGORIES);

// Default Habit Progress State
export const INITIAL_HABIT_STATE: HabitProgressState = {
  processPoints: 120,
  regulationStreak: 3,
  lastActiveDate: new Date().toISOString().split('T')[0],
  categoryMastery: {
    FEAR: 35,
    GREED: 25,
    FOMO: 40,
    REVENGE_TRADING: 50,
    HESITATION: 30,
    OVERCONFIDENCE: 20,
    BOREDOM_TRADING: 35,
    LOSS_AVERSION: 45,
    ANALYSIS_PARALYSIS: 25,
    PERFECTIONISM: 30,
    IMPATIENCE: 35,
    POST_LOSS_SHAME: 40,
    COMPARISON_ANXIETY: 20,
    BURNOUT: 30,
    PRE_MARKET_ANXIETY: 35,
    POST_WIN_OVERCONFIDENCE: 25,
    DISCIPLINE_FATIGUE: 40,
  },
  completedSessionsHistory: [],
  completedHabitsCount: {
    breathingSessions: 4,
    thoughtSorts: 2,
    cognitiveReframes: 3,
    slowFocusRounds: 2,
    patternTraces: 1,
    preTradeGroundings: 5,
    postLossResets: 2,
  },
};
