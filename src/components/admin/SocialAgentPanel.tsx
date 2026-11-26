import React from 'react';
import { AutoStudio } from './AutoStudio';
import { SocialBrainPanel } from './SocialBrainPanel';
import { PosterStudio } from './PosterStudio';

/** Social tools: Brand memory and quality gate, the poster studio and the video studio. The old Social Growth Agent card has been removed. */
export const SocialAgentPanel: React.FC = () => (
  <div className="space-y-4 p-1" data-testid="social-agent-panel">
    <SocialBrainPanel />
    <PosterStudio />
    <AutoStudio />
  </div>
);
