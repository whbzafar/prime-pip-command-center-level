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
    text: "Welcome to the PrimePipFX Command Center Community Hub. Trade with precision, manage your risk, and keep all discussions professional.",
    timestamp: 1789118470538,
    timePkt: "01:30 PM",
    datePkt: "2026-09-11",
    seenBy: [
      {
        userId: "dev-owner-master",
        username: "primepipfx-admin",
        displayName: "PrimePipFX Developer / Owner",
        seenAt: 1789793890281
      }
    ]
  }
];
