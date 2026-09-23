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
  // Calibrated brightness (104%) for optimal institutional clarity without washing out UI
  const num = rawBrightness ? Number(rawBrightness) : NaN;
  const savedBrightness = !isNaN(num) && num >= 90 && num <= 110 ? num : 104;
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
