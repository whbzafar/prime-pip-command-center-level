import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Moon,
  MapPin,
  Compass,
  Check,
  Search,
  Sliders,
  Volume2,
  X,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  GLOBAL_CITIES,
  CALCULATION_METHODS,
  PrayerSettings,
  getPrayerSettings,
  savePrayerSettings,
  JuristicSchool,
  playPrayerChime,
} from '../utils/prayerTimes';

interface PrayerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrayerSettingsModal: React.FC<PrayerSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<PrayerSettings>(() => getPrayerSettings());
  const [citySearch, setCitySearch] = useState('');
  const [isCustomCoordMode, setIsCustomCoordMode] = useState(false);
  const [customLat, setCustomLat] = useState(String(settings.lat));
  const [customLng, setCustomLng] = useState(String(settings.lng));
  const [chimeTested, setChimeTested] = useState(false);

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return GLOBAL_CITIES;
    const q = citySearch.toLowerCase();
    return GLOBAL_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    );
  }, [citySearch]);

  const handleSelectCity = (c: typeof GLOBAL_CITIES[0]) => {
    const updated: PrayerSettings = {
      ...settings,
      cityName: c.name,
      country: c.country,
      lat: c.lat,
      lng: c.lng,
      timezone: c.timezone,
      methodId: c.defaultMethod,
    };
    setSettings(updated);
    savePrayerSettings(updated);
  };

  const handleAutoDetectLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || settings.timezone;

          const updated: PrayerSettings = {
            ...settings,
            cityName: 'Current Location',
            country: 'Detected GPS',
            lat,
            lng,
            timezone: tz,
          };
          setSettings(updated);
          savePrayerSettings(updated);
        },
        () => {
          // If denied, fallback to browser timezone match
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const match = GLOBAL_CITIES.find((c) => c.timezone === tz);
          if (match) {
            handleSelectCity(match);
          }
        }
      );
    }
  };

  const handleSaveCustomCoords = () => {
    const latNum = parseFloat(customLat);
    const lngNum = parseFloat(customLng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      const updated: PrayerSettings = {
        ...settings,
        cityName: `Custom (${latNum.toFixed(2)}, ${lngNum.toFixed(2)})`,
        lat: latNum,
        lng: lngNum,
      };
      setSettings(updated);
      savePrayerSettings(updated);
      setIsCustomCoordMode(false);
    }
  };

  const handleMethodChange = (id: number) => {
    const updated = { ...settings, methodId: id };
    setSettings(updated);
    savePrayerSettings(updated);
  };

  const handleSchoolChange = (school: JuristicSchool) => {
    const updated = { ...settings, juristicSchool: school };
    setSettings(updated);
    savePrayerSettings(updated);
  };

  const handleTestChime = () => {
    playPrayerChime();
    setChimeTested(true);
    setTimeout(() => setChimeTested(false), 2000);
  };

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-150">
      <div className="relative bg-[#0D121F] border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-cyan-400 shrink-0">
              <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-military font-bold text-slate-100 flex items-center gap-2">
                <span>GLOBAL ISLAMIC PRAYER CALCULATION SETTINGS</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono-code mt-0.5">
                Configure astronomical calculation methods, juristic schools, and location-aware prayer reminders.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 font-mono-code text-xs">
          {/* Current Config summary */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between font-mono-code text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>
              Active Location:{' '}
              <strong className="text-amber-300">
                {settings.cityName}, {settings.country}
              </strong>{' '}
              <span className="text-slate-400">
                ({settings.lat.toFixed(2)}°, {settings.lng.toFixed(2)}°)
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutoDetectLocation}
            className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>AUTO-DETECT GPS</span>
          </button>
        </div>

        {/* City Selector */}
        <div className="space-y-2 font-mono-code">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase">SELECT GLOBAL CITY</label>
            <button
              type="button"
              onClick={() => setIsCustomCoordMode(!isCustomCoordMode)}
              className="text-xs text-cyan-400 hover:underline"
            >
              {isCustomCoordMode ? 'Cancel Custom Lat/Lng' : 'Manual Coordinates Fallback'}
            </button>
          </div>

          {isCustomCoordMode ? (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Latitude (-90 to +90)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono-code"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Longitude (-180 to +180)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono-code"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveCustomCoords}
                className="px-4 py-1.5 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                APPLY CUSTOM COORDINATES
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Search city or country (e.g., London, New York, Dubai, Lahore, Riyadh)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono-code focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                {filteredCities.map((c) => {
                  const isSelected = c.name === settings.cityName;
                  return (
                    <button
                      key={`${c.name}-${c.country}`}
                      type="button"
                      onClick={() => handleSelectCity(c)}
                      className={`p-2 rounded-xl border text-left text-xs transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-blue-500/15 border-blue-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div className="font-bold truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{c.country}</div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Calculation Method Selection */}
        <div className="space-y-2 font-mono-code">
          <label className="text-xs font-bold text-slate-200 uppercase">
            CALCULATION CONVENTION & PARAMETERS
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {CALCULATION_METHODS.map((m) => {
              const isSelected = m.id === settings.methodId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMethodChange(m.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-500/15 border-blue-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="pr-2">
                    <div className="font-bold">{m.name}</div>
                    <div className="text-[10px] text-slate-400">{m.description}</div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Juristic School (Asr Calculation) */}
        <div className="space-y-2 font-mono-code">
          <label className="text-xs font-bold text-slate-200 uppercase">
            ASR JURISTIC SCHOOL
          </label>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => handleSchoolChange('HANAFI')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                settings.juristicSchool === 'HANAFI'
                  ? 'bg-blue-500/15 border-blue-500 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="font-bold">HANAFI SCHOOL</div>
              <div className="text-[10px] text-slate-400 mt-1">
                Shadow factor = 2 (Asr time begins later when shadow length equals twice the object)
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSchoolChange('STANDARD')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                settings.juristicSchool === 'STANDARD'
                  ? 'bg-blue-500/15 border-blue-500 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="font-bold">STANDARD (SHAFI'I / MALIKI / HANBALI)</div>
              <div className="text-[10px] text-slate-400 mt-1">
                Shadow factor = 1 (Asr time begins earlier when shadow length equals object)
              </div>
            </button>
          </div>
        </div>

        {/* Discipline & Reminders Options */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono-code text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">Pre-Prayer Position Check Warning:</span>
            </div>
            <select
              value={settings.warningMinutesBefore}
              onChange={(e) => {
                const updated = { ...settings, warningMinutesBefore: parseInt(e.target.value, 10) };
                setSettings(updated);
                savePrayerSettings(updated);
              }}
              className="bg-slate-950 border border-slate-700 text-slate-200 px-2 py-1 rounded-lg text-xs font-mono-code"
            >
              <option value="10">10 Minutes Before</option>
              <option value="15">15 Minutes Before (Recommended)</option>
              <option value="20">20 Minutes Before</option>
              <option value="30">30 Minutes Before</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-900">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-200">Peaceful Audio Chime:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestChime}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[11px] transition cursor-pointer"
              >
                {chimeTested ? 'Chiming...' : 'Test Chime'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, soundEnabled: !settings.soundEnabled };
                  setSettings(updated);
                  savePrayerSettings(updated);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  settings.soundEnabled ? 'bg-blue-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {settings.soundEnabled ? 'ENABLED' : 'MUTED'}
              </button>
            </div>
          </div>
        </div>

        </div>

        {/* Actions Footer */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-800 bg-slate-950/60 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs transition cursor-pointer"
          >
            SAVE & APPLY GLOBALLY
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
