import React from 'react';
import { Activity, Crosshair, Gauge, Radio, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

type Props = {
  account: any;
  metrics: any;
  currentUser: any;
  activeTab: string;
};

export function CommandCenterAtmosphere({ account, metrics, currentUser, activeTab }: Props) {
  const pnl = Number(metrics?.netProfit ?? metrics?.totalProfit ?? 0);
  const score = Number(metrics?.performanceScores?.overallTradingScore ?? 0);
  const tradesToday = Number(metrics?.tradesToday ?? 0);
  const maxTrades = Number(account?.maxDailyTrades ?? 2);
  const balance = Number(account?.currentBalance ?? account?.initialBalance ?? 0);
  const currency = account?.currency || 'USD';
  const role = currentUser?.role || (currentUser ? 'TRADER' : 'PREVIEW');

  return (
    <section className="prime-cinematic-stage" aria-label="Prime Pip FX command telemetry">
      <div className="prime-cinematic-grid" aria-hidden="true" />
      <div className="prime-cinematic-orbit prime-cinematic-orbit-a" aria-hidden="true" />
      <div className="prime-cinematic-orbit prime-cinematic-orbit-b" aria-hidden="true" />
      <div className="prime-cinematic-scanline" aria-hidden="true" />

      <div className="prime-stage-topline">
        <div className="prime-stage-brand">
          <span className="prime-stage-kicker"><Sparkles size={11} /> PRIME PIP FX</span>
          <span className="prime-stage-divider" />
          <span className="prime-stage-mode">{activeTab.replaceAll('_', ' ')}</span>
        </div>
        <div className="prime-stage-live">
          <span className="prime-status-dot" />
          <Radio size={11} />
          LIVE COMMAND LINK
        </div>
      </div>

      <div className="prime-floating-cluster">
        <div className="prime-float-card prime-float-card-left">
          <div className="prime-float-icon"><Gauge size={15} /></div>
          <div>
            <span>EXECUTION SCORE</span>
            <strong>{score.toFixed(0)}<small>/100</small></strong>
          </div>
          <div className="prime-signal-bar"><i style={{ width: `${Math.min(100, Math.max(0, score))}%` }} /></div>
        </div>

        <div className="prime-float-card prime-float-card-right">
          <div className="prime-float-icon positive"><TrendingUp size={15} /></div>
          <div>
            <span>SESSION P&amp;L</span>
            <strong className={pnl >= 0 ? 'is-positive' : 'is-negative'}>
              {pnl >= 0 ? '+' : '-'}{currency} {Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <div className="prime-float-card prime-float-card-bottom-left">
          <Crosshair size={13} />
          <span>{tradesToday}/{maxTrades} EXECUTIONS</span>
        </div>

        <div className="prime-float-card prime-float-card-bottom-right">
          <ShieldCheck size={13} />
          <span>{role} ACCESS • {balance.toLocaleString()} {currency}</span>
        </div>
      </div>

      <div className="prime-stage-core">
        <div className="prime-core-ring prime-core-ring-1" />
        <div className="prime-core-ring prime-core-ring-2" />
        <div className="prime-core-glow" />
        <div className="prime-core-label">
          <span>MARKET COMMAND</span>
          <strong>PRECISION MODE</strong>
          <em>Risk-first execution environment</em>
        </div>
      </div>
    </section>
  );
}
