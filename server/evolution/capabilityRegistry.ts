// PrimePipFX Dynamic Capability Registry (Section 21 & 22)
// Authoritative directory of system capabilities, integrations, AI models, data sources, tools, and APIs

export interface CapabilityItem {
  id: string;
  category: 'CORE_FEATURE' | 'INTEGRATION' | 'AI_MODEL' | 'DATA_SOURCE' | 'TOOL' | 'API' | 'MISSING_GAP';
  name: string;
  version: string;
  status: 'SUPPORTED' | 'ACTIVE' | 'PLANNED' | 'EXPERIMENTAL';
  description: string;
  provider?: string;
  endpoints?: string[];
  combinatorialSynergies?: string[];
  evolutionLevel: number; // 0 to 5
}

export class DynamicCapabilityRegistry {
  private capabilities: CapabilityItem[] = [];

  constructor() {
    this.seedRegistry();
  }

  private seedRegistry(): void {
    this.capabilities = [
      // Tools & Features
      {
        id: 'cap-trade-journal',
        category: 'CORE_FEATURE',
        name: 'High-Precision Trade Journal',
        version: '2.4.0',
        status: 'ACTIVE',
        description: 'Complete trade execution recording with multi-timeframe tagging, emotional ratings, and PnL metrics.',
        evolutionLevel: 4,
        combinatorialSynergies: ['cap-analytics', 'cap-psychology', 'cap-pretrade-plan'],
      },
      {
        id: 'cap-risk-management',
        category: 'CORE_FEATURE',
        name: '1% Capital Preservation Risk Guardian',
        version: '2.1.0',
        status: 'ACTIVE',
        description: 'Hard mathematical enforcement of maximum 1% per-trade risk and 2% daily loss interlock with audio chime alerts.',
        evolutionLevel: 4,
        combinatorialSynergies: ['cap-lot-calc', 'cap-calendar', 'cap-psychology'],
      },
      {
        id: 'cap-psychology',
        category: 'CORE_FEATURE',
        name: 'Psychological Command Center',
        version: '1.9.0',
        status: 'ACTIVE',
        description: 'Tilt detection, CBT cognitive restructuring, ACT exercises, recovery routines, and state reflection.',
        evolutionLevel: 3,
        combinatorialSynergies: ['cap-trade-journal', 'cap-analytics', 'cap-audio-alerts'],
      },
      {
        id: 'cap-lot-calc',
        category: 'TOOL',
        name: 'Lot Size & Pip Value Calculator',
        version: '1.8.2',
        status: 'ACTIVE',
        description: 'Dynamic currency conversion, stop-loss distance calculation, and contract sizing for FX, Metals, and Indices.',
        evolutionLevel: 2,
        combinatorialSynergies: ['cap-risk-management', 'cap-pretrade-plan'],
      },
      {
        id: 'cap-pretrade-plan',
        category: 'TOOL',
        name: 'Pre-Trade Plan Checklist & Ticket Builder',
        version: '1.5.0',
        status: 'ACTIVE',
        description: 'Rules-based pre-trade verification checklist ensuring technical validity prior to broker order execution.',
        evolutionLevel: 3,
        combinatorialSynergies: ['cap-lot-calc', 'cap-risk-management'],
      },
      {
        id: 'cap-calendar',
        category: 'DATA_SOURCE',
        name: 'High-Impact Fundamental Calendar',
        version: '1.4.0',
        status: 'ACTIVE',
        description: 'Real-time macroeconomic news feed with impact weighting (USD, EUR, GBP, JPY, CAD) and countdown timers.',
        evolutionLevel: 2,
        combinatorialSynergies: ['cap-risk-management', 'cap-pretrade-plan'],
      },
      {
        id: 'cap-freehand',
        category: 'TOOL',
        name: 'Freehand Technical Canvas Workspace',
        version: '1.3.0',
        status: 'ACTIVE',
        description: 'Interactive diagramming workspace with candlestick charting, trendlines, geometric overlays, and risk zones.',
        evolutionLevel: 2,
      },
      {
        id: 'cap-audio-alerts',
        category: 'INTEGRATION',
        name: 'Tactical Audio Alert Synthesizer',
        version: '1.2.0',
        status: 'ACTIVE',
        description: 'Web Audio API procedural sound engine generating discrete chimes, warning klaxons, and discipline pulses.',
        evolutionLevel: 2,
      },
      {
        id: 'cap-webrtc',
        category: 'INTEGRATION',
        name: 'Encrypted WebRTC P2P Video & Voice Calling',
        version: '1.1.0',
        status: 'ACTIVE',
        description: 'Direct browser-to-browser encrypted audio/video stream for 1-on-1 institutional mentorship sessions.',
        evolutionLevel: 4,
      },
      // AI Models & Abstractions
      {
        id: 'cap-ai-gemini',
        category: 'AI_MODEL',
        name: 'Google Gemini 2.5 Flash Multi-Modal Engine',
        version: '2.5.0',
        status: 'ACTIVE',
        description: 'Server-side high-throughput reasoning engine powering Chart Scanner, AI Coach, and Opportunity Synthesis.',
        provider: 'Google GenAI SDK (@google/genai)',
        evolutionLevel: 5,
      },
      {
        id: 'cap-ai-statistical',
        category: 'AI_MODEL',
        name: 'Client-Side Statistical Anomaly Estimator',
        version: '1.2.0',
        status: 'ACTIVE',
        description: 'Zero-latency local Bayesian probability model detecting friction loops and risk degradation patterns.',
        evolutionLevel: 3,
      },
      // APIs
      {
        id: 'cap-api-evolution',
        category: 'API',
        name: 'Autonomous Evolution Engine REST API',
        version: '1.0.0',
        status: 'ACTIVE',
        description: 'Telemetry ingestion, cycle dispatch, consensus quorums, explainability manifests, and rollback endpoints.',
        endpoints: ['/api/evolution/status', '/api/evolution/cycle', '/api/evolution/rollback', '/api/evolution/roadmap'],
        evolutionLevel: 5,
      },
      {
        id: 'cap-api-trades',
        category: 'API',
        name: 'Encrypted Trade Records & Database API',
        version: '2.0.0',
        status: 'ACTIVE',
        description: 'Atomic storage with local-first IndexedDB replication and encrypted server backups.',
        endpoints: ['/api/trades', '/api/accounts', '/api/backup'],
        evolutionLevel: 4,
      },
      // Missing Capabilities & Autonomous Targets
      {
        id: 'cap-missing-correlation',
        category: 'MISSING_GAP',
        name: 'Simultaneous USD Currency Exposure Matrix',
        version: '0.1.0-planned',
        status: 'PLANNED',
        description: 'Cross-instrument correlation tracker warning if open positions compound hidden dollar risk across pairs.',
        evolutionLevel: 4,
      },
      {
        id: 'cap-missing-voice-journal',
        category: 'MISSING_GAP',
        name: 'Voice-to-Text Trade Reflection Dictation',
        version: '0.1.0-planned',
        status: 'PLANNED',
        description: 'Hands-free voice notes transcription directly into the trading journal with emotional sentiment tagging.',
        evolutionLevel: 3,
      },
    ];
  }

  public getAllCapabilities(): CapabilityItem[] {
    return this.capabilities;
  }

  public getSupported(): CapabilityItem[] {
    return this.capabilities.filter((c) => c.status === 'ACTIVE' || c.status === 'SUPPORTED');
  }

  public getMissing(): CapabilityItem[] {
    return this.capabilities.filter((c) => c.category === 'MISSING_GAP' || c.status === 'PLANNED');
  }

  public getByEvolutionLevel(level: number): CapabilityItem[] {
    return this.capabilities.filter((c) => c.evolutionLevel === level);
  }

  public registerCapability(item: CapabilityItem): void {
    const idx = this.capabilities.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      this.capabilities[idx] = item;
    } else {
      this.capabilities.push(item);
    }
  }
}
