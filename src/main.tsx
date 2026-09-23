import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './community-layout-fix.css';
import './styles/liquid-glass-ui-kit.css';
import { applyInterfaceTemplate } from './data/interfaceTemplates';

try {
  const savedTheme = localStorage.getItem('primepipfx_theme') || 'liquid-glass-neon';
  const rawBrightness = localStorage.getItem('primepipfx_brightness');
  // Brightness controls intentionally support the full 60%-160% range.
  // The previous 90%-110% clamp made the +/- buttons appear to respond while
  // silently snapping the application back into the narrow range.
  const num = rawBrightness ? Number(rawBrightness) : NaN;
  const savedBrightness = !isNaN(num) && num >= 60 && num <= 160 ? num : 104;
  applyInterfaceTemplate(savedTheme, savedBrightness);
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register PWA service worker safely
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Graceful offline fallback
    });
  });
}
