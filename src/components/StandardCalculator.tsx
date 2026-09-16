import React, { useState, useEffect } from 'react';
import {
  Calculator as CalcIcon,
  Delete,
  RotateCcw,
  Copy,
  Check,
  History,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface CalculationHistory {
  id: string;
  equation: string;
  result: string;
  timestamp: string;
}

interface StandardCalculatorProps {
  standalone?: boolean;
  onClose?: () => void;
}

export const StandardCalculator: React.FC<StandardCalculatorProps> = ({
  standalone = false,
  onClose,
}) => {
  const [display, setDisplay] = useState<string>('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewOperand, setWaitingForNewOperand] = useState<boolean>(false);
  const [equationPreview, setEquationPreview] = useState<string>('');
  const [history, setHistory] = useState<CalculationHistory[]>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_standard_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        inputDigit(e.key);
      } else if (e.key === '.') {
        inputDecimal();
      } else if (e.key === '+') {
        performOperation('+');
      } else if (e.key === '-') {
        performOperation('-');
      } else if (e.key === '*' || e.key === 'x') {
        performOperation('×');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('÷');
      } else if (e.key === '%') {
        performPercent();
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        performEquals();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        clearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, prevValue, operation, waitingForNewOperand]);

  const saveHistoryItem = (eq: string, res: string) => {
    const item: CalculationHistory = {
      id: Date.now().toString(),
      equation: eq,
      result: res,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    const updated = [item, ...history.slice(0, 24)];
    setHistory(updated);
    try {
      localStorage.setItem('primepipfx_standard_calc_history', JSON.stringify(updated));
    } catch {}
  };

  const inputDigit = (digit: string) => {
    if (waitingForNewOperand) {
      setDisplay(digit);
      setWaitingForNewOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForNewOperand) {
      setDisplay('0.');
      setWaitingForNewOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setWaitingForNewOperand(false);
    setEquationPreview('');
  };

  const handleBackspace = () => {
    if (waitingForNewOperand) return;
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const performPercent = () => {
    const currentValue = parseFloat(display);
    if (isNaN(currentValue)) return;
    const result = currentValue / 100;
    setDisplay(String(result));
    setEquationPreview(`${currentValue}% = `);
    saveHistoryItem(`${currentValue}%`, String(result));
  };

  const performOperation = (nextOp: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
      setEquationPreview(`${inputValue} ${nextOp}`);
    } else if (operation) {
      const currentValue = prevValue || 0;
      let computed = currentValue;

      if (operation === '+') computed = currentValue + inputValue;
      else if (operation === '-') computed = currentValue - inputValue;
      else if (operation === '×') computed = currentValue * inputValue;
      else if (operation === '÷') computed = inputValue !== 0 ? currentValue / inputValue : 0;

      // Fix JavaScript floating point rounding
      const formatted = Number(computed.toFixed(8)).toString();
      setPrevValue(Number(formatted));
      setDisplay(formatted);
      setEquationPreview(`${formatted} ${nextOp}`);
    }

    setWaitingForNewOperand(true);
    setOperation(nextOp);
  };

  const performEquals = () => {
    const inputValue = parseFloat(display);

    if (prevValue !== null && operation) {
      let computed = prevValue;
      if (operation === '+') computed = prevValue + inputValue;
      else if (operation === '-') computed = prevValue - inputValue;
      else if (operation === '×') computed = prevValue * inputValue;
      else if (operation === '÷') computed = inputValue !== 0 ? prevValue / inputValue : 0;

      const formatted = Number(computed.toFixed(8)).toString();
      const equationText = `${prevValue} ${operation} ${inputValue} =`;
      setEquationPreview(equationText);
      setDisplay(formatted);
      saveHistoryItem(`${prevValue} ${operation} ${inputValue}`, formatted);

      setPrevValue(null);
      setOperation(null);
      setWaitingForNewOperand(true);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('primepipfx_standard_calc_history');
    } catch {}
  };

  const content = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Calculator Body */}
      <div className="lg:col-span-2 bg-[#0C121E] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Top bar with quick title & actions */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CalcIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-military font-bold text-white tracking-wider uppercase">
                STANDARD CALCULATOR
              </h3>
              <p className="text-[10px] text-slate-400 font-mono-code">
                General arithmetic • Add, Subtract, Multiply, Divide, Percent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title={isFullscreen ? 'Minimize' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-2 py-1 text-xs text-slate-400 hover:text-white transition"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Display Screen */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 text-right space-y-1 shadow-inner relative">
          <div className="text-xs sm:text-sm font-mono-code text-slate-400 h-5 overflow-hidden text-ellipsis">
            {equationPreview || '\u00A0'}
          </div>
          <div className="text-3xl sm:text-4xl font-mono-code font-bold text-amber-400 tracking-wider overflow-x-auto no-scrollbar select-all">
            {display}
          </div>
          <button
            onClick={handleCopy}
            title="Copy current value"
            className="absolute left-3 bottom-3 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-amber-400 text-[11px] font-mono-code flex items-center gap-1 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[10px]">COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">COPY</span>
              </>
            )}
          </button>
        </div>

        {/* Calculator Keypad */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {/* Row 1 */}
          <button
            onClick={clearAll}
            className="p-3.5 sm:p-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-military font-bold text-sm sm:text-base tracking-wider transition active:scale-95 cursor-pointer"
          >
            C
          </button>
          <button
            onClick={handleBackspace}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            onClick={performPercent}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-amber-400 font-mono-code font-bold text-base sm:text-lg transition active:scale-95 cursor-pointer"
          >
            %
          </button>
          <button
            onClick={() => performOperation('÷')}
            className={`p-3.5 sm:p-4 rounded-xl border font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer ${
              operation === '÷'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
            }`}
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            onClick={() => inputDigit('7')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            7
          </button>
          <button
            onClick={() => inputDigit('8')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            8
          </button>
          <button
            onClick={() => inputDigit('9')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            9
          </button>
          <button
            onClick={() => performOperation('×')}
            className={`p-3.5 sm:p-4 rounded-xl border font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer ${
              operation === '×'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
            }`}
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            onClick={() => inputDigit('4')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            4
          </button>
          <button
            onClick={() => inputDigit('5')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            5
          </button>
          <button
            onClick={() => inputDigit('6')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            6
          </button>
          <button
            onClick={() => performOperation('-')}
            className={`p-3.5 sm:p-4 rounded-xl border font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer ${
              operation === '-'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
            }`}
          >
            -
          </button>

          {/* Row 4 */}
          <button
            onClick={() => inputDigit('1')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            1
          </button>
          <button
            onClick={() => inputDigit('2')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            2
          </button>
          <button
            onClick={() => inputDigit('3')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            3
          </button>
          <button
            onClick={() => performOperation('+')}
            className={`p-3.5 sm:p-4 rounded-xl border font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer ${
              operation === '+'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
            }`}
          >
            +
          </button>

          {/* Row 5 */}
          <button
            onClick={() => inputDigit('0')}
            className="col-span-2 p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            0
          </button>
          <button
            onClick={inputDecimal}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 font-mono-code font-bold text-lg sm:text-xl transition active:scale-95 cursor-pointer"
          >
            .
          </button>
          <button
            onClick={performEquals}
            className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-mono-code font-black text-xl sm:text-2xl shadow-lg shadow-amber-500/30 transition active:scale-95 cursor-pointer"
          >
            =
          </button>
        </div>
      </div>

      {/* History Tape */}
      <div className="bg-[#0C121E] border border-slate-800/90 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-military font-bold text-white tracking-wider uppercase">
              CALCULATION HISTORY
            </h4>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-[10px] font-mono-code text-slate-500 hover:text-rose-400 transition cursor-pointer"
            >
              CLEAR
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-mono-code space-y-1">
            <CalcIcon className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <p>No recent calculations</p>
            <p className="text-[10px] text-slate-600">Calculations will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setDisplay(item.result);
                  setEquationPreview(item.equation);
                }}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer group"
                title="Click to load into calculator"
              >
                <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500 mb-0.5">
                  <span>{item.equation}</span>
                  <span>{item.timestamp}</span>
                </div>
                <div className="text-base font-mono-code font-bold text-slate-200 group-hover:text-amber-400 transition text-right">
                  = {item.result}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono-code text-slate-500">
          Tip: You can use your physical keyboard (numbers, +, -, *, /, Enter, Backspace).
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070A11]/95 backdrop-blur-md p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">{content}</div>
      </div>
    );
  }

  return content;
};
