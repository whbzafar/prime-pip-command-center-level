import { getStoredToken } from './authClient';

/** After sign-in, offers the browser's own location (GPS / Wi-Fi) so the admin map shows the real town instead of the internet provider's hub city.
 *  The browser asks the person first; if they say no we never ask again on this device. */
export function sendPreciseLocation(): void {
  try {
    const tok = getStoredToken(); if (!tok || !navigator.geolocation) return;
    const mark = tok.slice(-12);
    if (localStorage.getItem('ppfx_geo_denied') === '1' || sessionStorage.getItem('ppfx_geo_sent') === mark) return;
    sessionStorage.setItem('ppfx_geo_sent', mark);
    navigator.geolocation.getCurrentPosition(
      (pos) => { void fetch('/api/auth/precise-location', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }) }).catch(() => undefined); },
      (err) => { if (err.code === 1) { try { localStorage.setItem('ppfx_geo_denied', '1'); } catch { /* ignore */ } } },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  } catch { /* location is optional */ }
}
