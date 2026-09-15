// PrimePipFX Central Feature Registry
// Authoritative map of what PRIMEPIPFX currently knows how to do (Section 17)

export interface RegisteredFeature {
  feature_id: string;
  name: string;
  description: string;
  version: string;
  status: 'ACTIVE' | 'EXPERIMENTAL' | 'STAGED' | 'ROLLED_BACK';
  audience: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  dependencies: string[];
  created_by: string;
  created_at: number;
  last_updated: number;
  usage: string;
  success_metrics: string;
  rollback_version: string;
  evolution_source: string;
}

export class FeatureRegistry {
  private registry: Map<string, RegisteredFeature> = new Map();

  constructor() {
    this.seedInitialRegistry();
  }

  private seedInitialRegistry(): void {
    const defaultFeatures: RegisteredFeature[] = [
      {
        feature_id: 'feat-lot-bridge',
        name: 'Pre-Trade Lot Size Direct Memory Bridge',
        description: 'Auto-populates pre-trade order tickets with calculated lot sizes and stop loss pips.',
        version: '1.2.0',
        status: 'ACTIVE',
        audience: ['ALL_TRADERS'],
        risk_level: 'LOW',
        dependencies: ['react', 'localStorage'],
        created_by: 'Autonomous Evolution Engine (Cycle 41)',
        created_at: Date.now() - 604800000,
        last_updated: Date.now() - 86400000,
        usage: '94% of active order preparations',
        success_metrics: '-62% Ticket Setup Time, Zero Keying Errors',
        rollback_version: '1.0.0-manual-entry',
        evolution_source: 'Friction Anomaly Detection (Bounce Reduction)',
      },
      {
        feature_id: 'feat-cooldown-shield',
        name: 'Post-Loss Cool-Down Shield (PLCS)',
        description: 'Enforces a 10-minute mental reflection interlock with breathing guide post-loss.',
        version: '1.0.4',
        status: 'ACTIVE',
        audience: ['MANUAL_TRADERS', 'PROP_TRADERS'],
        risk_level: 'MEDIUM',
        dependencies: ['react', 'lucide-react'],
        created_by: 'Autonomous Evolution Engine (Cycle 42)',
        created_at: Date.now() - 172800000,
        last_updated: Date.now() - 3600000,
        usage: '88% of daily stop triggers',
        success_metrics: '-35% Tilt Re-Entries, +18% Trader Recovery Rating',
        rollback_version: '0.9.0-unrestricted',
        evolution_source: 'Psychological Drift Anomaly Detection',
      },
      {
        feature_id: 'feat-news-spike-guard',
        name: 'Real-Time News Spike Spread Guard',
        description: 'Monitors economic releases and warns of spread expansion hazard on entry tickets.',
        version: '1.1.0',
        status: 'ACTIVE',
        audience: ['ALL_TRADERS'],
        risk_level: 'LOW',
        dependencies: ['economicCalendarService'],
        created_by: 'Autonomous Evolution Engine (Cycle 42)',
        created_at: Date.now() - 86400000,
        last_updated: Date.now() - 3600000,
        usage: 'Triggered during Tier-1 data releases',
        success_metrics: '-40% News Spread Slippage Complaints',
        rollback_version: '1.0.0-silent-calendar',
        evolution_source: 'Slippage Anomaly Cluster Detection',
      },
    ];

    for (const feat of defaultFeatures) {
      this.registry.set(feat.feature_id, feat);
    }
  }

  public getAllFeatures(): RegisteredFeature[] {
    return Array.from(this.registry.values());
  }

  public getFeature(id: string): RegisteredFeature | undefined {
    return this.registry.get(id);
  }

  public registerFeature(feature: RegisteredFeature): void {
    this.registry.set(feature.feature_id, feature);
  }

  public updateStatus(id: string, status: 'ACTIVE' | 'EXPERIMENTAL' | 'STAGED' | 'ROLLED_BACK'): boolean {
    const feat = this.registry.get(id);
    if (!feat) return false;
    feat.status = status;
    feat.last_updated = Date.now();
    return true;
  }
}
