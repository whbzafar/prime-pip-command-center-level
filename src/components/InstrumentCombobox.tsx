import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Sparkles } from 'lucide-react';

export interface InstrumentSpec {
  symbol: string;
  name: string;
  category: 'FOREX' | 'METALS' | 'INDICES' | 'COMMODITIES' | 'CRYPTO' | 'CUSTOM';
  defaultPipValue: number; // $ per pip or point for 1 standard lot
  contractSize: number;
  tickSize: number;
  tickValue: number;
}

export const COMMON_INSTRUMENTS: InstrumentSpec[] = [
  // Metals
  { symbol: 'XAUUSD', name: 'Gold vs US Dollar', category: 'METALS', defaultPipValue: 10, contractSize: 100, tickSize: 0.01, tickValue: 1 },
  { symbol: 'XAGUSD', name: 'Silver vs US Dollar', category: 'METALS', defaultPipValue: 50, contractSize: 5000, tickSize: 0.001, tickValue: 5 },
  // Forex Majors
  { symbol: 'EURUSD', name: 'Euro vs US Dollar', category: 'FOREX', defaultPipValue: 10, contractSize: 100000, tickSize: 0.00001, tickValue: 1 },
  { symbol: 'GBPUSD', name: 'British Pound vs US Dollar', category: 'FOREX', defaultPipValue: 10, contractSize: 100000, tickSize: 0.00001, tickValue: 1 },
  { symbol: 'USDJPY', name: 'US Dollar vs Japanese Yen', category: 'FOREX', defaultPipValue: 6.7, contractSize: 100000, tickSize: 0.001, tickValue: 0.67 },
  { symbol: 'AUDUSD', name: 'Australian Dollar vs US Dollar', category: 'FOREX', defaultPipValue: 10, contractSize: 100000, tickSize: 0.00001, tickValue: 1 },
  { symbol: 'USDCAD', name: 'US Dollar vs Canadian Dollar', category: 'FOREX', defaultPipValue: 7.4, contractSize: 100000, tickSize: 0.00001, tickValue: 0.74 },
  { symbol: 'USDCHF', name: 'US Dollar vs Swiss Franc', category: 'FOREX', defaultPipValue: 11.2, contractSize: 100000, tickSize: 0.00001, tickValue: 1.12 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar vs US Dollar', category: 'FOREX', defaultPipValue: 10, contractSize: 100000, tickSize: 0.00001, tickValue: 1 },
  { symbol: 'EURJPY', name: 'Euro vs Japanese Yen', category: 'FOREX', defaultPipValue: 6.7, contractSize: 100000, tickSize: 0.001, tickValue: 0.67 },
  { symbol: 'GBPJPY', name: 'British Pound vs Japanese Yen', category: 'FOREX', defaultPipValue: 6.7, contractSize: 100000, tickSize: 0.001, tickValue: 0.67 },
  // Indices
  { symbol: 'NAS100', name: 'Nasdaq 100 Index', category: 'INDICES', defaultPipValue: 1, contractSize: 1, tickSize: 0.25, tickValue: 0.25 },
  { symbol: 'US30', name: 'Dow Jones Industrial 30', category: 'INDICES', defaultPipValue: 1, contractSize: 1, tickSize: 1.0, tickValue: 1.0 },
  { symbol: 'SPX500', name: 'S&P 500 Index', category: 'INDICES', defaultPipValue: 5, contractSize: 50, tickSize: 0.1, tickValue: 5 },
  { symbol: 'GER40', name: 'German DAX 40', category: 'INDICES', defaultPipValue: 1.08, contractSize: 1, tickSize: 1.0, tickValue: 1.08 },
  // Commodities & Energy
  { symbol: 'USOIL', name: 'WTI Crude Oil', category: 'COMMODITIES', defaultPipValue: 10, contractSize: 1000, tickSize: 0.01, tickValue: 10 },
  { symbol: 'UKOIL', name: 'Brent Crude Oil', category: 'COMMODITIES', defaultPipValue: 10, contractSize: 1000, tickSize: 0.01, tickValue: 10 },
  // Crypto
  { symbol: 'BTCUSD', name: 'Bitcoin vs US Dollar', category: 'CRYPTO', defaultPipValue: 1, contractSize: 1, tickSize: 0.1, tickValue: 0.1 },
  { symbol: 'ETHUSD', name: 'Ethereum vs US Dollar', category: 'CRYPTO', defaultPipValue: 1, contractSize: 1, tickSize: 0.01, tickValue: 0.01 },
];

interface InstrumentComboboxProps {
  value: string;
  onChange: (instrument: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const InstrumentCombobox: React.FC<InstrumentComboboxProps> = ({
  value,
  onChange,
  placeholder = 'Type or select instrument (e.g. XAUUSD)...',
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter options based on typed search
  const query = inputValue.trim().toUpperCase();
  const filtered = COMMON_INSTRUMENTS.filter(
    (item) =>
      item.symbol.toUpperCase().includes(query) ||
      item.name.toUpperCase().includes(query) ||
      item.category.toUpperCase().includes(query)
  );

  const isExactMatch = COMMON_INSTRUMENTS.some(
    (item) => item.symbol.toUpperCase() === query
  );

  const handleSelect = (symbol: string) => {
    setInputValue(symbol);
    onChange(symbol);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value.toUpperCase();
    setInputValue(nextVal);
    onChange(nextVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0 && query.length > 0 && !isExactMatch) {
        // If there's an exact match in filtered or top suggestion
        const topMatch = filtered[0].symbol;
        if (topMatch.toUpperCase() === query) {
          handleSelect(topMatch);
        } else {
          // Commit custom symbol
          handleSelect(query);
        }
      } else if (query.length > 0) {
        handleSelect(query);
      }
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-3 pr-8 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-amber-400 font-bold text-xs focus:border-amber-400 outline-none transition uppercase tracking-wider placeholder:normal-case placeholder:text-slate-600 placeholder:font-normal"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          tabIndex={-1}
          className="absolute right-2 text-slate-500 hover:text-amber-400 transition"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[#0B0F19] border border-slate-700/80 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto font-mono-code text-xs divide-y divide-slate-800/60">
          {/* Custom Typed Option Notice if not in list */}
          {query.length > 0 && !isExactMatch && (
            <div
              onClick={() => handleSelect(query)}
              className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center justify-between cursor-pointer border-b border-amber-500/30"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Use Custom Instrument: <strong className="text-amber-400 font-bold">{query}</strong>
                </span>
              </div>
              <span className="text-[10px] uppercase bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400 border border-amber-500/30">
                CUSTOM
              </span>
            </div>
          )}

          {/* Filtered Suggestions */}
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const isSelected = item.symbol.toUpperCase() === query;
              return (
                <div
                  key={item.symbol}
                  onClick={() => handleSelect(item.symbol)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/70 transition ${
                    isSelected ? 'bg-slate-800/90 text-amber-400' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">{item.symbol}</span>
                    <span className="text-[11px] text-slate-400 font-sans truncate max-w-[170px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {item.category}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </div>
              );
            })
          ) : query.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-[11px]">
              Start typing any pair or choose a common instrument below...
            </div>
          ) : (
            <div className="p-3 text-center text-slate-400 text-[11px]">
              No predefined pairs match "{query}". Press Enter to use as custom instrument.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
