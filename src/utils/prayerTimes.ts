/**
 * Global Islamic Prayer Calculation Engine for PRIMEPIPFX
 * 
 * Features:
 * 1. Global offline astronomical calculations for ANY latitude, longitude, and timezone.
 * 2. Major calculation methods (Karachi, ISNA, MWL, Makkah, Egypt, Dubai, Diyanet, Singapore, Tehran).
 * 3. Juristic Asr methods (Standard: Shafi'i/Maliki/Hanbali vs Hanafi).
 * 4. Online Aladhan API integration with seamless offline fallback.
 * 5. Audio discipline chimes & trading session awareness warnings.
 */

import { getUserTimezone, getAppDate, getAppTime, getUserTimeFormat, formatTo12Hour } from './time';

export interface CalculationMethod {
  id: number;
  name: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaIntervalMinutes?: number;
  description: string;
}

export const CALCULATION_METHODS: CalculationMethod[] = [
  { id: 1, name: 'University of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18, description: 'Pakistan, Bangladesh, India, Afghanistan' },
  { id: 2, name: 'Islamic Society of North America (ISNA)', fajrAngle: 15, ishaAngle: 15, description: 'United States, Canada' },
  { id: 3, name: 'Muslim World League (MWL)', fajrAngle: 18, ishaAngle: 17, description: 'Europe, Far East, parts of America' },
  { id: 4, name: 'Umm Al-Qura University, Makkah', fajrAngle: 18.5, ishaAngle: 0, ishaIntervalMinutes: 90, description: 'Saudi Arabia, Arabian Peninsula' },
  { id: 5, name: 'Egyptian General Authority of Survey', fajrAngle: 19.5, ishaAngle: 17.5, description: 'Egypt, Africa, Syria, Lebanon' },
  { id: 16, name: 'Dubai / UAE Awqaf', fajrAngle: 18.2, ishaAngle: 18.2, description: 'United Arab Emirates' },
  { id: 13, name: 'Diyanet İşleri Başkanlığı, Turkey', fajrAngle: 18, ishaAngle: 17, description: 'Turkey, Southeast Europe' },
  { id: 11, name: 'Majlis Ugama Islam Singapura', fajrAngle: 20, ishaAngle: 18, description: 'Singapore, Malaysia, Brunei' },
  { id: 7, name: 'Institute of Geophysics, Univ. of Tehran', fajrAngle: 17.7, ishaAngle: 14, description: 'Iran, Shia communities' },
];

export type JuristicSchool = 'HANAFI' | 'STANDARD'; // Standard = Shafi'i, Maliki, Hanbali

export interface GlobalCity {
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  defaultMethod: number;
}

export const GLOBAL_CITIES: GlobalCity[] = [
  // Pakistan
  { name: 'Lahore', country: 'Pakistan', lat: 31.5204, lng: 74.3587, timezone: 'Asia/Karachi', defaultMethod: 1 },
  { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lng: 67.0011, timezone: 'Asia/Karachi', defaultMethod: 1 },
  { name: 'Islamabad', country: 'Pakistan', lat: 33.6844, lng: 73.0479, timezone: 'Asia/Karachi', defaultMethod: 1 },
  { name: 'Rawalpindi', country: 'Pakistan', lat: 33.5651, lng: 73.0169, timezone: 'Asia/Karachi', defaultMethod: 1 },
  { name: 'Peshawar', country: 'Pakistan', lat: 34.0151, lng: 71.5249, timezone: 'Asia/Karachi', defaultMethod: 1 },
  { name: 'Quetta', country: 'Pakistan', lat: 30.1798, lng: 66.975, timezone: 'Asia/Karachi', defaultMethod: 1 },
  { name: 'Multan', country: 'Pakistan', lat: 30.1575, lng: 71.5249, timezone: 'Asia/Karachi', defaultMethod: 1 },
  { name: 'Faisalabad', country: 'Pakistan', lat: 31.4504, lng: 73.135, timezone: 'Asia/Karachi', defaultMethod: 1 },
  { name: 'Sialkot', country: 'Pakistan', lat: 32.4945, lng: 74.5229, timezone: 'Asia/Karachi', defaultMethod: 1 },
  { name: 'Gujranwala', country: 'Pakistan', lat: 32.1877, lng: 74.1945, timezone: 'Asia/Karachi', defaultMethod: 1 },

  // Middle East & Gulf
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, timezone: 'Asia/Dubai', defaultMethod: 16 },
  { name: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lng: 54.3773, timezone: 'Asia/Dubai', defaultMethod: 16 },
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, timezone: 'Asia/Riyadh', defaultMethod: 4 },
  { name: 'Makkah', country: 'Saudi Arabia', lat: 21.3891, lng: 39.8579, timezone: 'Asia/Riyadh', defaultMethod: 4 },
  { name: 'Madinah', country: 'Saudi Arabia', lat: 24.5247, lng: 39.5692, timezone: 'Asia/Riyadh', defaultMethod: 4 },
  { name: 'Jeddah', country: 'Saudi Arabia', lat: 21.4858, lng: 39.1925, timezone: 'Asia/Riyadh', defaultMethod: 4 },
  { name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.531, timezone: 'Asia/Qatar', defaultMethod: 4 },
  { name: 'Kuwait City', country: 'Kuwait', lat: 29.3759, lng: 47.9774, timezone: 'Asia/Kuwait', defaultMethod: 4 },
  { name: 'Muscat', country: 'Oman', lat: 23.5859, lng: 58.4059, timezone: 'Asia/Muscat', defaultMethod: 4 },
  { name: 'Manama', country: 'Bahrain', lat: 26.2285, lng: 50.586, timezone: 'Asia/Bahrain', defaultMethod: 4 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, timezone: 'Africa/Cairo', defaultMethod: 5 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784, timezone: 'Europe/Istanbul', defaultMethod: 13 },
  { name: 'Ankara', country: 'Turkey', lat: 39.9334, lng: 32.8597, timezone: 'Europe/Istanbul', defaultMethod: 13 },

  // United Kingdom & Europe
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London', defaultMethod: 3 },
  { name: 'Birmingham', country: 'United Kingdom', lat: 52.4862, lng: -1.8904, timezone: 'Europe/London', defaultMethod: 3 },
  { name: 'Manchester', country: 'United Kingdom', lat: 53.4808, lng: -2.2426, timezone: 'Europe/London', defaultMethod: 3 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris', defaultMethod: 3 },
  { name: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821, timezone: 'Europe/Berlin', defaultMethod: 3 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405, timezone: 'Europe/Berlin', defaultMethod: 3 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041, timezone: 'Europe/Amsterdam', defaultMethod: 3 },

  // North America
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006, timezone: 'America/New_York', defaultMethod: 2 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago', defaultMethod: 2 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles', defaultMethod: 2 },
  { name: 'Houston', country: 'United States', lat: 29.7604, lng: -95.3698, timezone: 'America/Chicago', defaultMethod: 2 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, timezone: 'America/Toronto', defaultMethod: 2 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207, timezone: 'America/Vancouver', defaultMethod: 2 },

  // Asia & Oceania
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.139, lng: 101.6869, timezone: 'Asia/Kuala_Lumpur', defaultMethod: 11 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore', defaultMethod: 11 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456, timezone: 'Asia/Jakarta', defaultMethod: 3 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney', defaultMethod: 3 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631, timezone: 'Australia/Melbourne', defaultMethod: 3 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633, timezone: 'Pacific/Auckland', defaultMethod: 3 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473, timezone: 'Africa/Johannesburg', defaultMethod: 3 },
];

export const PAKISTAN_CITIES = GLOBAL_CITIES.filter((c) => c.country === 'Pakistan');

export interface PrayerSettings {
  cityName: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  methodId: number;
  juristicSchool: JuristicSchool;
  remindersEnabled: boolean;
  soundEnabled: boolean;
  warningMinutesBefore: number; // e.g. 15
}

export function getDefaultPrayerSettings(): PrayerSettings {
  return {
    cityName: 'Lahore',
    country: 'Pakistan',
    lat: 31.5204,
    lng: 74.3587,
    timezone: 'Asia/Karachi',
    methodId: 1,
    juristicSchool: 'HANAFI',
    remindersEnabled: true,
    soundEnabled: true,
    warningMinutesBefore: 15,
  };
}

export function getPrayerSettings(): PrayerSettings {
  if (typeof window === 'undefined') return getDefaultPrayerSettings();
  try {
    const raw = localStorage.getItem('primepipfx_prayer_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...getDefaultPrayerSettings(), ...parsed };
    }
  } catch {}
  return getDefaultPrayerSettings();
}

export function savePrayerSettings(settings: PrayerSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('primepipfx_prayer_settings', JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('primepipfx_prayer_settings_changed', { detail: settings }));
}

export interface PrayerTimeSchedule {
  city: string;
  country: string;
  dateStr: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  nextPrayer: {
    key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    name: string;
    time: string;
    timeRemainingMins: number;
    timeRemainingStr: string;
    isImminentWarning: boolean; // within warningMinutesBefore
  } | null;
  source: 'ONLINE_VERIFIED' | 'LOCAL_CALCULATED';
}

function format12Hour(hours: number, minutes: number): string {
  const roundedMin = Math.round(minutes) % 60;
  let finalHours = Math.floor(hours) + Math.floor(minutes / 60);
  finalHours = (finalHours % 24 + 24) % 24;

  const period = finalHours >= 12 ? 'PM' : 'AM';
  let displayHour = finalHours % 12;
  if (displayHour === 0) displayHour = 12;
  const hourStr = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;
  const minStr = roundedMin < 10 ? `0${roundedMin}` : `${roundedMin}`;
  return `${hourStr}:${minStr} ${period}`;
}

export function convertTo12Hour(time24: string): string {
  if (!time24) return '';
  const clean = time24.split(' ')[0];
  const [hStr, mStr] = clean.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  return format12Hour(h, m);
}

/**
 * Universal astronomical solar prayer calculations for ANY coordinate on Earth
 */
export function calculateUniversalPrayers(
  lat: number,
  lng: number,
  timezone: string,
  methodId: number = 1,
  school: JuristicSchool = 'HANAFI',
  date = new Date()
): { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string } {
  const method = CALCULATION_METHODS.find((m) => m.id === methodId) || CALCULATION_METHODS[0];

  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) /
      (24 * 60 * 60 * 1000)
  );

  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const declination = (23.45 * Math.sin(B) * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  // Compute timezone offset in hours for target timezone
  let tzOffsetHours = 5.0;
  try {
    const tzDate = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    const offsetPart = tzDate.find((p) => p.type === 'timeZoneName');
    if (offsetPart) {
      const match = offsetPart.value.match(/GMT([+-]\d{1,2}):?(\d{2})?/);
      if (match) {
        const sign = match[1].startsWith('-') ? -1 : 1;
        const h = Math.abs(parseInt(match[1], 10));
        const m = match[2] ? parseInt(match[2], 10) / 60 : 0;
        tzOffsetHours = sign * (h + m);
      }
    }
  } catch {
    tzOffsetHours = 5.0;
  }

  // Solar noon in hours
  const solarNoon = 12 + tzOffsetHours - lng / 15 - EoT / 60;

  const getHourAngle = (angleDegrees: number) => {
    const angleRad = (angleDegrees * Math.PI) / 180;
    const cosHA =
      (Math.sin((-angleDegrees * Math.PI) / 180) - Math.sin(latRad) * Math.sin(declination)) /
      (Math.cos(latRad) * Math.cos(declination));
    if (cosHA > 1) return 0;
    if (cosHA < -1) return Math.PI;
    return Math.acos(cosHA);
  };

  // Fajr
  const fajrHA = getHourAngle(method.fajrAngle);
  const fajrTime = solarNoon - (fajrHA * (180 / Math.PI)) / 15;

  // Dhuhr (+2 min buffer after zenith)
  const dhuhrTime = solarNoon + 3 / 60;

  // Asr: shadow factor = 2 for Hanafi, 1 for Standard
  const shadowFactor = school === 'HANAFI' ? 2 : 1;
  const noonZenith = Math.abs(latRad - declination);
  const asrAltRad = Math.atan(1 / (shadowFactor + Math.tan(noonZenith)));
  const cosAsrHA =
    (Math.sin(asrAltRad) - Math.sin(latRad) * Math.sin(declination)) /
    (Math.cos(latRad) * Math.cos(declination));
  const asrHA = Math.acos(Math.min(1, Math.max(-1, cosAsrHA)));
  const asrTime = solarNoon + (asrHA * (180 / Math.PI)) / 15;

  // Maghrib: sunset at 0.833° below horizon + 2 min buffer
  const sunsetHA = getHourAngle(0.833);
  const maghribTime = solarNoon + (sunsetHA * (180 / Math.PI)) / 15 + 2 / 60;

  // Isha
  let ishaTime = 0;
  if (method.ishaIntervalMinutes && method.ishaIntervalMinutes > 0) {
    ishaTime = maghribTime + method.ishaIntervalMinutes / 60;
  } else {
    const ishaHA = getHourAngle(method.ishaAngle);
    ishaTime = solarNoon + (ishaHA * (180 / Math.PI)) / 15;
  }

  const toHoursAndMinutes = (decimalHours: number) => {
    let totalMinutes = decimalHours * 60;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes = totalMinutes % (24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return format12Hour(h, m);
  };

  return {
    fajr: toHoursAndMinutes(fajrTime),
    dhuhr: toHoursAndMinutes(dhuhrTime),
    asr: toHoursAndMinutes(asrTime),
    maghrib: toHoursAndMinutes(maghribTime),
    isha: toHoursAndMinutes(ishaTime),
  };
}

/**
 * Calculate next prayer and countdown
 */
export function computeNextPrayer(
  times: { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string },
  timezone: string,
  warningMinutes: number = 15,
  now = new Date()
): PrayerTimeSchedule['nextPrayer'] {
  const prayers: Array<{ key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; name: string; time: string }> = [
    { key: 'fajr', name: 'Fajr', time: times.fajr },
    { key: 'dhuhr', name: 'Dhuhr', time: times.dhuhr },
    { key: 'asr', name: 'Asr', time: times.asr },
    { key: 'maghrib', name: 'Maghrib', time: times.maghrib },
    { key: 'isha', name: 'Isha', time: times.isha },
  ];

  // Convert time strings into minutes from midnight in target timezone
  const parseTimeToMinutes = (timeStr: string): number => {
    const isPM = timeStr.toUpperCase().includes('PM');
    const timeOnly = timeStr.replace(/AM|PM/gi, '').trim();
    const [hStr, mStr] = timeOnly.split(':');
    let h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  };

  // Get current minutes from midnight in target timezone
  let currentMinutes = 0;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    currentMinutes = h * 60 + m;
  } catch {
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  for (const p of prayers) {
    const pMins = parseTimeToMinutes(p.time);
    if (pMins > currentMinutes) {
      const remaining = pMins - currentMinutes;
      const h = Math.floor(remaining / 60);
      const m = remaining % 60;
      const timeRemainingStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
      return {
        key: p.key,
        name: p.name,
        time: p.time,
        timeRemainingMins: remaining,
        timeRemainingStr,
        isImminentWarning: remaining <= warningMinutes,
      };
    }
  }

  // If passed Isha, next is Fajr tomorrow
  const fajrMins = parseTimeToMinutes(times.fajr);
  const remaining = 24 * 60 - currentMinutes + fajrMins;
  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  return {
    key: 'fajr',
    name: 'Fajr',
    time: times.fajr,
    timeRemainingMins: remaining,
    timeRemainingStr: `${h}h ${m}m`,
    isImminentWarning: remaining <= warningMinutes,
  };
}

/**
 * Fetch verified online prayer times with Aladhan API fallback
 */
export async function getGlobalPrayerSchedule(customSettings?: PrayerSettings): Promise<PrayerTimeSchedule> {
  const settings = customSettings || getPrayerSettings();
  const date = new Date();
  const dateStr = getAppDate(date, settings.timezone);

  const localTimes = calculateUniversalPrayers(
    settings.lat,
    settings.lng,
    settings.timezone,
    settings.methodId,
    settings.juristicSchool,
    date
  );

  let finalTimes = localTimes;
  let source: PrayerTimeSchedule['source'] = 'LOCAL_CALCULATED';

  // Attempt online Aladhan fetch
  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const schoolParam = settings.juristicSchool === 'HANAFI' ? 1 : 0;
      const url = `https://api.aladhan.com/v1/timings?latitude=${settings.lat}&longitude=${settings.lng}&method=${settings.methodId}&school=${schoolParam}`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.data?.timings) {
          const t = data.data.timings;
          finalTimes = {
            fajr: convertTo12Hour(t.Fajr),
            dhuhr: convertTo12Hour(t.Dhuhr),
            asr: convertTo12Hour(t.Asr),
            maghrib: convertTo12Hour(t.Maghrib),
            isha: convertTo12Hour(t.Isha),
          };
          source = 'ONLINE_VERIFIED';
        }
      }
    } catch {
      // Offline fallback
    }
  }

  const nextPrayer = computeNextPrayer(finalTimes, settings.timezone, settings.warningMinutesBefore, date);

  return {
    city: settings.cityName,
    country: settings.country,
    dateStr,
    fajr: finalTimes.fajr,
    dhuhr: finalTimes.dhuhr,
    asr: finalTimes.asr,
    maghrib: finalTimes.maghrib,
    isha: finalTimes.isha,
    nextPrayer,
    source,
  };
}

// Backwards compatibility alias
export async function getPrayerSchedule(cityName = 'Lahore'): Promise<PrayerTimeSchedule> {
  const settings = getPrayerSettings();
  const cityMatch = GLOBAL_CITIES.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
  if (cityMatch) {
    settings.cityName = cityMatch.name;
    settings.country = cityMatch.country;
    settings.lat = cityMatch.lat;
    settings.lng = cityMatch.lng;
    settings.timezone = cityMatch.timezone;
    settings.methodId = cityMatch.defaultMethod;
  }
  return getGlobalPrayerSchedule(settings);
}

// Legacy export compatibility
export function calculateKarachiMethodPrayers(city: { name: string; lat: number; lng: number }): PrayerTimeSchedule {
  const times = calculateUniversalPrayers(city.lat, city.lng, 'Asia/Karachi', 1, 'HANAFI');
  const dateStr = getAppDate(new Date(), 'Asia/Karachi');
  const nextPrayer = computeNextPrayer(times, 'Asia/Karachi', 15);
  return {
    city: city.name,
    country: 'Pakistan',
    dateStr,
    ...times,
    nextPrayer,
    source: 'LOCAL_CALCULATED',
  };
}

// Daily prayer record tracking
export interface DailyPrayerRecord {
  date: string;
  prayed: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  };
}

export function getTodayPrayerRecord(): DailyPrayerRecord {
  const today = getAppDate();
  const key = `primepipfx_prayer_${today}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    date: today,
    prayed: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
  };
}

export function savePrayerRecord(record: DailyPrayerRecord): void {
  const key = `primepipfx_prayer_${record.date}`;
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {}
}

/**
 * Play a soothing, harmonic adhan chime tone using the Web Audio API
 */
export function playPrayerChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [293.66, 369.99, 440.0, 587.33]; // D major gentle peaceful chord
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.18);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.18);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.18 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.18 + 2.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.18);
      osc.stop(ctx.currentTime + idx * 0.18 + 2.4);
    });
  } catch {
    // Audio context may be restricted before user gesture
  }
}
