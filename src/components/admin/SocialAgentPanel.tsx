import React from 'react';
import { AutoStudio } from './AutoStudio';

/** Content Studio only: live tour video recording (category and aspect ratio pickers, Urdu voice-over, captions) and the full category list. */
export const SocialAgentPanel: React.FC = () => (
  <div className="space-y-4 p-1" data-testid="social-agent-panel">
    <AutoStudio />
  </div>
);
