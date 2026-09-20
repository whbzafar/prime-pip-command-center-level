export interface TraderProfile {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'CUSTOMER';
  isOnline: boolean;
  presenceStatus: 'ACTIVE' | 'OFFLINE' | 'HIDDEN';
  lastSeen: number;
  isNewThisWeek: boolean;
  tradingFocus: string;
  experienceLevel: string;
  traderStatus: string;
}

export const DEFAULT_TRADERS: TraderProfile[] = [
  {
    id: "dev-owner-master",
    username: "primepipfx-admin",
    displayName: "PrimePipFX Developer / Owner",
    role: "ADMIN",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now(),
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC Master Strategy",
    experienceLevel: "Funded Master Trader & Admin",
    traderStatus: "Leading PrimePipFX Terminal"
  },
  {
    id: "student_1789485011620_61j5n",
    username: "mluqman",
    displayName: "Mluqman",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 32000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789485149520_81vea",
    username: "niazali",
    displayName: "Niazali",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 54000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789485257016_mvdyq",
    username: "mazharhussain",
    displayName: "MazharHussain",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 88000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789485320192_jqg7s",
    username: "habib",
    displayName: "Habib",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 110000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789485378031_ozm60",
    username: "nasrullahmirza",
    displayName: "NasrullahMirza",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 140000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789485426463_xcn6p",
    username: "muhammadtanveer",
    displayName: "MuhammadTanveer",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 175000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789485475631_4vilm",
    username: "ammaar",
    displayName: "Ammaar",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 210000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789485524742_i0mue",
    username: "rameeez",
    displayName: "rameeez",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 245000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789486496000_3g60p",
    username: "shamas",
    displayName: "shamas",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 280000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789489282429_59fy1",
    username: "hamzahazim",
    displayName: "hamzahazim",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 310000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789470826648_gi3pa",
    username: "zartab",
    displayName: "zartab",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 340000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789471145662_wua9j",
    username: "rameez",
    displayName: "rameez",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 370000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "cust-1789473180190-x5j2",
    username: "saleem",
    displayName: "saleem",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 410000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "cust-1789473200558-am8x",
    username: "usman",
    displayName: "usman",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 450000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789518787587_k5axh",
    username: "tauqeernasir",
    displayName: "Tauqeernasir",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 480000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789546047379_m03qg",
    username: "samiullah",
    displayName: "samiullah",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 510000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789546155921_us1g4",
    username: "zain",
    displayName: "zain",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 540000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789568247655_ujel8",
    username: "ahmad",
    displayName: "ahmad",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 570000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789568408429_xe3yt",
    username: "umair",
    displayName: "umair",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 600000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "student_1789650836632_u8ov9",
    username: "ali",
    displayName: "ali",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 630000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  },
  {
    id: "cust-1789803678255-k54s",
    username: "noman",
    displayName: "noman",
    role: "CUSTOMER",
    isOnline: true,
    presenceStatus: "ACTIVE",
    lastSeen: Date.now() - 660000,
    isNewThisWeek: false,
    tradingFocus: "ICT / SBT / SMC",
    experienceLevel: "Funded Trader",
    traderStatus: "Active in Command Center"
  }
];

export const DEFAULT_COMMUNITY_MESSAGES = [
  {
    id: "msg-welcome-owner",
    userId: "dev-owner-master",
    username: "primepipfx-admin",
    userRole: "ADMIN" as const,
    displayName: "PrimePipFX Developer / Owner",
    text: "Welcome to the PrimePipFX Command Center Community Feed. Live institutional dispatches, high-conviction ICT/SMC setups, and real-time execution logs are shared here. Keep risk under 1-2% per setup.",
    timestamp: Date.now() - 3600000 * 5,
    timePkt: "09:30 AM",
    datePkt: "2026-09-20",
    category: "GENERAL",
    reactions: { "🔥": 12, "🎯": 8, "💎": 15 },
    seenBy: [
      {
        userId: "dev-owner-master",
        username: "primepipfx-admin",
        displayName: "PrimePipFX Developer / Owner",
        seenAt: Date.now() - 3600000 * 4
      }
    ]
  },
  {
    id: "msg-setup-gold-master",
    userId: "dev-owner-master",
    username: "primepipfx-admin",
    userRole: "ADMIN" as const,
    displayName: "PrimePipFX Developer / Owner",
    text: "GOLD (XAUUSD) 15m Fair Value Gap retest after London liquidity raid. Asian High taken out, looking for premium-to-discount expansion into New York Open.",
    timestamp: Date.now() - 3600000 * 3,
    timePkt: "11:15 AM",
    datePkt: "2026-09-20",
    category: "SIGNAL",
    reactions: { "🚀": 18, "🔥": 22, "🎯": 14, "💎": 9 },
    tradeSetup: {
      pair: "XAUUSD",
      type: "BUY" as const,
      entry: "2642.50",
      stopLoss: "2635.80",
      takeProfit: "2662.00",
      riskReward: "1:2.9",
      timeframe: "M15",
      status: "ACTIVE" as const
    }
  },
  {
    id: "msg-dispatch-luqman",
    userId: "student_1789485011620_61j5n",
    username: "mluqman",
    userRole: "CUSTOMER" as const,
    displayName: "Mluqman",
    text: "EURUSD London killzone sweep confirmed! Clean Market Structure Shift on M5 with strong volume displacement above 1.0920. Stop loss placed safely below the manipulation wick.",
    timestamp: Date.now() - 3600000 * 2,
    timePkt: "12:40 PM",
    datePkt: "2026-09-20",
    category: "SIGNAL",
    reactions: { "🔥": 9, "📈": 11, "🎯": 7 },
    tradeSetup: {
      pair: "EURUSD",
      type: "BUY" as const,
      entry: "1.0925",
      stopLoss: "1.0908",
      takeProfit: "1.0975",
      riskReward: "1:2.9",
      timeframe: "M5 / M15",
      status: "ACTIVE" as const
    }
  },
  {
    id: "msg-update-niazali",
    userId: "student_1789485149520_81vea",
    username: "niazali",
    userRole: "CUSTOMER" as const,
    displayName: "Niazali",
    text: "GBPJPY update: Take Profit 1 and Take Profit 2 secured! +68 pips banked into the account. Remaining 20% position trailed to breakeven +10 pips. PrimePipFX risk calculator kept the lot size on point.",
    timestamp: Date.now() - 3600000 * 1.5,
    timePkt: "01:20 PM",
    datePkt: "2026-09-20",
    category: "ANALYSIS",
    reactions: { "💎": 16, "🎯": 12, "🚀": 14 },
    tradeSetup: {
      pair: "GBPJPY",
      type: "SELL" as const,
      entry: "196.20",
      stopLoss: "196.65",
      takeProfit: "195.10",
      riskReward: "1:2.4",
      timeframe: "H1",
      status: "TARGET_HIT" as const
    }
  },
  {
    id: "msg-intel-mazhar",
    userId: "student_1789485257016_mvdyq",
    username: "mazharhussain",
    userRole: "CUSTOMER" as const,
    displayName: "MazharHussain",
    text: "US30 Dow Jones approaching major 4H breaker block at 42,150. Highly advise against front-running the New York opening bell. Wait for the 9:30 AM EST 5-minute candle close before confirming momentum.",
    timestamp: Date.now() - 3600000 * 0.8,
    timePkt: "02:05 PM",
    datePkt: "2026-09-20",
    category: "ANALYSIS",
    reactions: { "👀": 14, "🎯": 8, "🔥": 6 }
  },
  {
    id: "msg-intel-ammaar",
    userId: "student_1789485475631_4vilm",
    username: "ammaar",
    userRole: "CUSTOMER" as const,
    displayName: "Ammaar",
    text: "BTCUSD holding the 63,400 liquidity pool nicely. Funding rates have reset to neutral across major exchanges. If 4-hour holds above 63.8k, expect rapid test of 65k.",
    timestamp: Date.now() - 3600000 * 0.3,
    timePkt: "02:45 PM",
    datePkt: "2026-09-20",
    category: "ANALYSIS",
    reactions: { "🚀": 11, "📈": 9, "💎": 7 }
  }
];
