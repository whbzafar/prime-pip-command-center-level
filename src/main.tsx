import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyInterfaceTemplate } from './data/interfaceTemplates';

try {
  const savedTheme = localStorage.getItem('primepipfx_theme') || 'midnight';
  const savedBrightness = Number(localStorage.getItem('primepipfx_brightness') || '100');
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
