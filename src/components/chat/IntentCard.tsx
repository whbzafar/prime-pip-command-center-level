import React from 'react';
import { IntentCardPayload } from './types';
import { CalendarCard } from './CalendarCard';
import { SessionClockCard } from './SessionClockCard';
import { LotSizeCard } from './LotSizeCard';
import { CrisisCard } from './CrisisCard';
import { AlertCircle } from 'lucide-react';

interface IntentCardProps {
  payload?: IntentCardPayload;
  card?: IntentCardPayload;
}

export const IntentCard: React.FC<IntentCardProps> = ({ payload, card }) => {
  const activePayload = payload || card;
  if (!activePayload || !activePayload.kind) return null;

  switch (activePayload.kind) {
    case 'ECONOMIC_CALENDAR':
      return <CalendarCard payload={activePayload} />;
    case 'SESSION_CLOCK':
      return <SessionClockCard payload={activePayload} />;
    case 'LOT_SIZE':
      return <LotSizeCard payload={activePayload} />;
    case 'CRISIS_RESOURCE':
      return <CrisisCard payload={activePayload} />;
    case 'UNKNOWN':
    default:
      return (
        <div className="mt-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono-code text-slate-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-500" />
          <span>Capability temporarily unavailable or unclassified.</span>
        </div>
      );
  }
};
