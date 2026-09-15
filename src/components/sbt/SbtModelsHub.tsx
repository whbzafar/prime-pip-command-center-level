import React, { useState } from 'react';
import {
  AUTHORITATIVE_SBT_MODELS,
  SbtModelSourceRecord,
  SBT_SOURCE_COLORS,
} from '../../data/sbtModelsSourceData';
import { SbtDeterministicChart } from './SbtDeterministicChart';
import { SbtQuizEngine } from './SbtQuizEngine';
import {
  Layers,
  BookOpen,
  HelpCircle,
  Award,
  Search,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Target,
  AlertTriangle,
  Flame,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export type SbtHubView =
  | 'ALL_MODELS'
  | 'SBT-01'
  | 'SBT-02'
  | 'SBT-03'
  | 'SBT-04'
  | 'SBT-05'
  | 'SBT-06'
  | 'SBT-07'
  | 'SBT-08'
  | 'SBT-09'
  | 'SBT-10'
  | 'SBT_QA'
  | 'SBT_PROGRESS';

export const SbtModelsHub: React.FC = () => {
  const [activeView, setActiveView] = useState<SbtHubView>('ALL_MODELS');
  const [activeVariationId, setActiveVariationId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Persisted studied models tracking
  const [studiedModels, setStudiedModels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sbt_authoritative_studied');
      return saved ? JSON.parse(saved) : ['SBT-01', 'SBT-02'];
    } catch {
      return ['SBT-01', 'SBT-02'];
    }
  });

  const toggleModelStudied = (id: string) => {
    const updated = studiedModels.includes(id)
      ? studiedModels.filter((m) => m !== id)
      : [...studiedModels, id];
    setStudiedModels(updated);
    localStorage.setItem('sbt_authoritative_studied', JSON.stringify(updated));
  };

  // Resolve current active model if an individual model is selected
  const activeModel = AUTHORITATIVE_SBT_MODELS.find((m) => m.id === activeView);

  // Filtered models for "ALL_MODELS" grid view
  const filteredModels = AUTHORITATIVE_SBT_MODELS.filter((m) => {
    if (categoryFilter !== 'ALL' && m.category !== categoryFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = m.title.toLowerCase().includes(q);
      const matchSub = m.subtitle.toLowerCase().includes(q);
      const matchRule = m.rules.some((r) => r.toLowerCase().includes(q));
      if (!matchName && !matchSub && !matchRule) return false;
    }
    return true;
  });

  // Calculate overall mastery percentage
  const masteryPercent = Math.round((studiedModels.length / AUTHORITATIVE_SBT_MODELS.length) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/30 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-lg shadow-teal-500/10">
            <Layers className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wider">
                SBT MODELS
              </h1>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-400" />
                SOURCE VERIFIED (PDF PAGES 1-12)
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400">
              Deterministic Vector Models & Verbatim Execution Rules Transcribed Directly from Source
            </p>
          </div>
        </div>

        {/* Progress Tracker Pill */}
        <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2">
          <div className="text-right font-mono-code">
            <div className="text-[10px] text-slate-500">AUTHORITATIVE MASTERY</div>
            <div className="text-xs font-bold text-teal-400">
              {studiedModels.length} / {AUTHORITATIVE_SBT_MODELS.length} Models Verified
            </div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-teal-500/30 flex items-center justify-center font-mono-code text-xs font-bold text-slate-200">
            {masteryPercent}%
          </div>
        </div>
      </div>

      {/* Primary Navigation Hierarchy */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs font-mono-code">
        <button
          type="button"
          onClick={() => {
            setActiveView('ALL_MODELS');
            setActiveVariationId(undefined);
          }}
          className={`px-3 py-2 rounded-lg font-bold transition shrink-0 cursor-pointer ${
            activeView === 'ALL_MODELS'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          All Models
        </button>

        {AUTHORITATIVE_SBT_MODELS.map((m) => {
          const isSelected = activeView === m.id;
          const isStudied = studiedModels.includes(m.id);

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setActiveView(m.id as SbtHubView);
                setActiveVariationId(m.variations ? m.variations[0].id : undefined);
              }}
              className={`px-3 py-2 rounded-lg font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>Model {m.modelNumber}</span>
              {isStudied && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
            </button>
          );
        })}

        <div className="w-px h-5 bg-slate-800 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => setActiveView('SBT_QA')}
          className={`px-3.5 py-2 rounded-lg font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeView === 'SBT_QA'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-800/60'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>SBT Q&A</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('SBT_PROGRESS')}
          className={`px-3.5 py-2 rounded-lg font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeView === 'SBT_PROGRESS'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-purple-400/80 hover:text-purple-300 hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>SBT Progress</span>
        </button>
      </div>

      {/* VIEW 1: ALL MODELS (Catalog Overview) */}
      {activeView === 'ALL_MODELS' && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models by name, rule, or mechanism (e.g., FVG, Turtle Soup, IDM)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs font-mono-code text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">All Categories</option>
                <option value="CONTINUATION">Continuation Models</option>
                <option value="REVERSAL">Reversal Models</option>
                <option value="LIQUIDITY_ENGINEERING">Liquidity Engineering</option>
                <option value="TURTLE_SOUP">Turtle Soup</option>
              </select>
            </div>
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map((m) => {
              const isStudied = studiedModels.includes(m.id);

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setActiveView(m.id as SbtHubView);
                    setActiveVariationId(m.variations ? m.variations[0].id : undefined);
                  }}
                  className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-xl p-4 sm:p-5 transition cursor-pointer flex flex-col justify-between shadow-sm group space-y-4"
                >
                  <div className="space-y-3">
                    {/* Card Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-mono-code font-bold">
                          PDF Page {m.sourcePage}
                        </span>
                        <span className="text-slate-500 font-mono-code text-[10px]">
                          {m.sourceDiagramVersion}
                        </span>
                      </div>
                      {isStudied && (
                        <span className="flex items-center gap-1 text-[10px] font-mono-code text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-base font-military font-bold text-slate-100 group-hover:text-teal-300 transition leading-snug">
                        {m.title}
                      </h3>
                      <p className="text-xs font-mono-code text-slate-400 line-clamp-2 mt-1">
                        {m.subtitle}
                      </p>
                    </div>

                    {/* Mini Vector Thumbnail Preview */}
                    <div className="w-full h-32 rounded-lg border border-slate-800 bg-[#090D16] overflow-hidden flex items-center justify-center p-1 pointer-events-none select-none">
                      <svg
                        viewBox={m.viewBox}
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {m.zones.map((z) => (
                          <rect
                            key={z.id}
                            x={z.x}
                            y={z.y}
                            width={z.width}
                            height={z.height}
                            fill="rgba(71, 85, 105, 0.4)"
                            stroke="#64748B"
                            strokeWidth="1"
                          />
                        ))}
                        {m.lines.map((l) => (
                          <line
                            key={l.id}
                            x1={l.x1}
                            y1={l.y1}
                            x2={l.x2}
                            y2={l.y2}
                            stroke="#CBD5E1"
                            strokeWidth="1.2"
                          />
                        ))}
                        {m.candles.map((c) => {
                          const w = c.width || 10;
                          const top = Math.min(c.openY, c.closeY);
                          const h = Math.max(Math.abs(c.openY - c.closeY), 2);
                          return (
                            <g key={c.id}>
                              <line
                                x1={c.x}
                                y1={c.highY}
                                x2={c.x}
                                y2={c.lowY}
                                stroke={c.wickColor}
                                strokeWidth="1.2"
                              />
                              <rect
                                x={c.x - w / 2}
                                y={top}
                                width={w}
                                height={h}
                                fill={c.bodyColor}
                              />
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Rules Preview count */}
                    <div className="text-[11px] font-mono-code text-slate-400">
                      <strong>{m.rules.length}</strong> verbatim rules locked from source
                    </div>
                  </div>

                  {/* Open Model CTA */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono-code text-teal-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>Inspect Model & Rules</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL MODEL INSPECTION */}
      {activeModel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Deterministic Vector SVG Chart */}
          <div className="lg:col-span-7 space-y-4">
            {/* Sub-variation Selector (for models with variations like 7A/7B, 8A/8B, 5 Single/MCOB, 9 SingleWick/TwoCandle, 10 Var1/Var2) */}
            {activeModel.variations && activeModel.variations.length > 1 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono-code text-slate-400 px-2 font-semibold">
                  Source Variation:
                </span>
                {activeModel.variations.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveVariationId(v.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer border ${
                      activeVariationId === v.id
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}

            {/* Authoritative Vector Chart */}
            <SbtDeterministicChart
              model={activeModel}
              selectedVariationId={activeVariationId}
            />

            {/* Execution Criteria Quick Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-teal-400 font-bold">
                  <Target className="w-3.5 h-3.5" />
                  <span>ENTRY CONDITION</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {activeModel.entryCondition}
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-red-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>INVALIDATION</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {activeModel.invalidationCondition}
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>TARGET CRITERIA</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {activeModel.targetCondition}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Verbatim PDF Rules & Execution Actions */}
          <div className="lg:col-span-5 space-y-4">
            {/* Model Card Detail */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-mono-code font-bold">
                      MODEL {activeModel.modelNumber}
                    </span>
                    <span className="text-slate-400 font-mono-code text-[11px]">
                      PDF Page {activeModel.sourcePage}
                    </span>
                  </div>
                  <h2 className="text-lg font-military font-bold text-slate-100 mt-1">
                    {activeModel.title}
                  </h2>
                  <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                    {activeModel.subtitle}
                  </p>
                </div>

                {/* Mark as Studied Button */}
                <button
                  type="button"
                  onClick={() => toggleModelStudied(activeModel.id)}
                  className={`p-2 rounded-lg border transition cursor-pointer shrink-0 ${
                    studiedModels.includes(activeModel.id)
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                  title={
                    studiedModels.includes(activeModel.id)
                      ? 'Model marked as verified'
                      : 'Mark model as verified'
                  }
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>

              {/* Verbatim Rules Locked from Source */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    VERBATIM PDF RULES (RULE LOCK)
                  </span>
                  <span className="text-[10px] text-teal-400">AUTHORITATIVE</span>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 space-y-2.5">
                  {activeModel.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs font-mono-code text-slate-200 leading-relaxed"
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-teal-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rule.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code">
                <button
                  type="button"
                  onClick={() => setActiveView('SBT_QA')}
                  className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Test Knowledge on this Model</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleModelStudied(activeModel.id)}
                  className={`px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                    studiedModels.includes(activeModel.id)
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {studiedModels.includes(activeModel.id) ? 'Verified' : 'Mark as Studied'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: SBT Q&A / KNOWLEDGE ENGINE */}
      {activeView === 'SBT_QA' && (
        <div className="space-y-4">
          <SbtQuizEngine />
        </div>
      )}

      {/* VIEW 4: SBT PROGRESS TRACKER */}
      {activeView === 'SBT_PROGRESS' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-military font-bold text-slate-100">
                SBT AUTHORITATIVE MASTERY RECORD
              </h2>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Full-spectrum audit of your comprehension against the verified 12-page PDF
              </p>
            </div>
            <div className="text-right font-mono-code">
              <span className="text-2xl font-bold text-teal-400">{masteryPercent}%</span>
              <span className="text-xs text-slate-500 block">Overall Mastery</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {AUTHORITATIVE_SBT_MODELS.map((m) => {
              const isStudied = studiedModels.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => setActiveView(m.id as SbtHubView)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                    isStudied
                      ? 'bg-teal-500/10 border-teal-500/40 text-teal-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">Model {m.modelNumber}</span>
                    {isStudied ? (
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-700" />
                    )}
                  </div>
                  <div className="text-[11px] font-mono line-clamp-2">{m.title}</div>
                  <span className="text-[10px] font-mono text-slate-500">
                    PDF Page {m.sourcePage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
