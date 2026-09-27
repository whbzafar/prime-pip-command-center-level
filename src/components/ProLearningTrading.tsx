import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Target,
  Bot,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  DollarSign,
  Coins,
  Globe,
  Flame,
  ArrowRight,
  Lock,
  Languages,
  ArrowLeftRight,
  BarChart2,
  Building,
  Wheat,
} from 'lucide-react';

type MainSectionTab = 'STRATEGIES' | 'EXECUTION_COURSES' | 'BOTS_AUTOMATION';
type CoursePhaseTab = 'PHASE_1_BASIC' | 'PHASE_2_INTERMEDIATE' | 'PHASE_3_ADVANCED';
type AssetClassType = 'FOREX' | 'STOCKS' | 'INDICES' | 'CRYPTO' | 'COMMODITIES';
type PairClassificationType = 'MAJOR' | 'CROSS' | 'EXOTIC';
type PairAssetCategory = 'FOREX' | 'STOCKS' | 'INDICES' | 'CRYPTO' | 'COMMODITIES';

interface ProLearningTradingProps {
  onNavigateTab?: (tab: string) => void;
}

export const ProLearningTrading: React.FC<ProLearningTradingProps> = ({ onNavigateTab }) => {
  const [activeSection, setActiveSection] = useState<MainSectionTab>('STRATEGIES');
  const [activePhase, setActivePhase] = useState<CoursePhaseTab>('PHASE_1_BASIC');
  const [activeBasicChapter, setActiveBasicChapter] = useState<number>(1);
  const [language, setLanguage] = useState<'EN' | 'UR'>('EN');

  // Interactive Chapter 3 & 4 state
  const [selectedAsset, setSelectedAsset] = useState<AssetClassType>('FOREX');
  const [pairAssetCategory, setPairAssetCategory] = useState<PairAssetCategory>('FOREX');
  const [selectedPairType, setSelectedPairType] = useState<PairClassificationType>('MAJOR');

  // Interactive Chapter 1 Price Discovery Simulator
  const [simQuantity, setSimQuantity] = useState<number>(1);
  const [simBuyPrice, setSimBuyPrice] = useState<number>(2000);
  const [simSellPrice, setSimSellPrice] = useState<number>(2015);

  const profitLoss = (simSellPrice - simBuyPrice) * simQuantity;

  const isUrdu = language === 'UR';

  const handleNavigateSbt = () => {
    if (onNavigateTab) {
      onNavigateTab('SBT_MODELS');
    } else {
      window.dispatchEvent(new CustomEvent('primepipfx_navigate_tab', { detail: { tab: 'SBT_MODELS' } }));
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 px-2 sm:px-4 font-sans text-slate-100">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-r from-slate-950 via-[#0a1428] to-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-mono-code font-bold tracking-[0.2em] uppercase">
              <GraduationCap className="w-4 h-4" />
              <span>{isUrdu ? 'پرائم پپ ایف ایکس اکیڈمی' : 'Prime Pip FX Institutional Academy'}</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] text-cyan-300 font-bold">
                {isUrdu ? 'سرکاری نصاب' : 'OFFICIAL CURRICULUM'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-military font-bold tracking-wide text-white">
              {isUrdu ? 'پرو ٹریڈنگ اور لرننگ اکیڈمی' : 'PRO LEARNING AND TRADING'}
            </h1>
            <p className="max-w-3xl text-xs sm:text-sm leading-6 text-slate-300">
              {isUrdu
                ? 'عالمی تجارتی تاریخ، مارکیٹ کے بنیادی اصول، کرنسی جوڑوں کی ساخت، کینڈل اسٹک کے تجزیے، اور انسٹیٹیوشنل ماڈلز کی مکمل رہنمائی۔'
                : 'The complete institutional education division. Master foundational commerce, market history, currency mechanics, spread arbitrage, SBT model playbooks, and automated trading algorithms.'}
            </p>
          </div>

          {/* Action Toolbar: Language Toggle + Quick Links */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage((prev) => (prev === 'EN' ? 'UR' : 'EN'))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-mono-code text-xs font-bold transition cursor-pointer shadow-md"
              title="Toggle Language (English / Urdu)"
            >
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'EN' ? 'اردو (Urdu Translation)' : 'English Version'}</span>
            </button>

            {/* WhatsApp Community Link */}
            <a
              href="https://chat.whatsapp.com/H9uEqx5DYDEATKXTfi3jlr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
              title="Join Prime Pip FX WhatsApp Group"
            >
              <span>{isUrdu ? 'واٹس ایپ گروپ' : 'WhatsApp Group'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* SBT Models Link */}
            <button
              type="button"
              onClick={handleNavigateSbt}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-cyan-300 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUrdu ? 'ایس بی ٹی ماڈلز' : 'SBT Models Playbook'}</span>
            </button>
          </div>
        </div>

        {/* 3 Main Sections Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-6 mt-6 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSection('STRATEGIES')}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
              activeSection === 'STRATEGIES'
                ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  activeSection === 'STRATEGIES' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-cyan-400'
                }`}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-military font-bold uppercase tracking-wider">
                  {isUrdu ? '1. مکمل ٹریڈنگ حکمت عملی' : '1. Complete Trading Strategies'}
                </div>
                <div className="text-[10px] font-mono-code text-slate-400">
                  {isUrdu ? 'بنیادی مرحلہ (فیز 1) فعال ہے' : 'Phase 1: Basic Foundations'}
                </div>
              </div>
            </div>
            {activeSection === 'STRATEGIES' && <ChevronRight className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Section 2: Execution Courses (Coming Soon with Badge) */}
          <button
            type="button"
            onClick={() => setActiveSection('EXECUTION_COURSES')}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer relative ${
              activeSection === 'EXECUTION_COURSES'
                ? 'bg-blue-500/15 border-blue-400 text-white shadow-lg shadow-blue-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  activeSection === 'EXECUTION_COURSES' ? 'bg-blue-500 text-slate-950 font-bold' : 'bg-slate-800 text-blue-400'
                }`}
              >
                <Target className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="text-xs font-military font-bold uppercase tracking-wider">
                    {isUrdu ? '2. ایگزیکیوشن کورسز' : '2. Execution Courses'}
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono-code font-bold">
                    COMING SOON
                  </span>
                </div>
                <div className="text-[10px] font-mono-code text-slate-400">
                  {isUrdu ? 'کل زونز اور چیک لسٹس' : 'Killzones, Checklists & Psychology'}
                </div>
              </div>
            </div>
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          </button>

          {/* Section 3: Trading Bots & Automation */}
          <button
            type="button"
            onClick={() => setActiveSection('BOTS_AUTOMATION')}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
              activeSection === 'BOTS_AUTOMATION'
                ? 'bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  activeSection === 'BOTS_AUTOMATION' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-400'
                }`}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-military font-bold uppercase tracking-wider">
                  {isUrdu ? '3. ٹریڈنگ بوٹس اور آٹومیشن' : '3. Trading Bots & Automation'}
                </div>
                <div className="text-[10px] font-mono-code text-slate-400">
                  {isUrdu ? 'الگورتھمک لاجک اور ویب ہکس' : 'Algorithmic SBT logic & Webhooks'}
                </div>
              </div>
            </div>
            {activeSection === 'BOTS_AUTOMATION' && <ChevronRight className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </section>

      {/* SECTION 1: COMPLETE TRADING STRATEGIES */}
      {activeSection === 'STRATEGIES' && (
        <div className="space-y-6">
          {/* Phase 1 / Phase 2 / Phase 3 Tabs (Phases 2 & 3 locked with Coming Soon) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActivePhase('PHASE_1_BASIC')}
                className={`px-4 py-2 rounded-xl text-xs font-military font-bold uppercase tracking-wider transition cursor-pointer ${
                  activePhase === 'PHASE_1_BASIC'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isUrdu ? 'فیز 1: بنیادی کورس (ایکٹو)' : 'Phase 1: Basic Course'}
              </button>

              <button
                type="button"
                onClick={() => setActivePhase('PHASE_2_INTERMEDIATE')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-military font-bold uppercase tracking-wider transition cursor-pointer ${
                  activePhase === 'PHASE_2_INTERMEDIATE'
                    ? 'bg-amber-500/20 border border-amber-400 text-amber-300'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Phase 2: Intermediate</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-mono-code font-bold">
                  COMING SOON
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActivePhase('PHASE_3_ADVANCED')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-military font-bold uppercase tracking-wider transition cursor-pointer ${
                  activePhase === 'PHASE_3_ADVANCED'
                    ? 'bg-amber-500/20 border border-amber-400 text-amber-300'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Phase 3: Pro Level</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-mono-code font-bold">
                  COMING SOON
                </span>
              </button>
            </div>

            <span className="text-[11px] font-mono-code text-cyan-400 px-3">
              {activePhase === 'PHASE_1_BASIC' &&
                (isUrdu ? 'بنیادی تصورات • تاریخ • 5 اقسام • اسپریڈ اور کینڈلز' : 'Foundations • History • 5 Trading Types • Mechanics')}
              {activePhase === 'PHASE_2_INTERMEDIATE' && 'Smart Money Concepts • Liquidity • Order Blocks (Coming Soon)'}
              {activePhase === 'PHASE_3_ADVANCED' && 'SBT Models 1–10 • Top-Down Risk Management (Coming Soon)'}
            </span>
          </div>

          {/* PHASE 2: LOCKED NOTICE */}
          {activePhase === 'PHASE_2_INTERMEDIATE' && (
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-950 via-[#0e1628] to-slate-950 p-8 sm:p-12 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono-code text-xs font-bold uppercase">
                {isUrdu ? 'فیز 2 تیاری کے مراحل میں ہے' : 'PHASE 2 IS CURRENTLY LOCKED • COMING SOON'}
              </div>
              <h2 className="text-xl sm:text-3xl font-military font-bold text-white">
                {isUrdu ? 'اسمارٹ منی اور لیکویڈیٹی فریم ورک' : 'Smart Money Concepts & Liquidity Engineering'}
              </h2>
              <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {isUrdu
                  ? 'فیز 2 کے انسٹیٹیوشنل لیکچرز پر کام جاری ہے۔ اس دوران فیز 1 کے تمام بنیادی ابواب مکمل کریں یا براہ راست ایس بی ٹی ماڈل پلے بک کو دریافت کریں۔'
                  : 'Phase 2 is currently locked while institutional materials and video walkthroughs are finalized. Please focus on mastering Phase 1 Basic Foundations below, or access the active SBT Models Playbook.'}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePhase('PHASE_1_BASIC')}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {isUrdu ? 'فیز 1 کی طرف واپس جائیں' : 'Back to Phase 1: Basic'}
                </button>
                <button
                  type="button"
                  onClick={handleNavigateSbt}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  {isUrdu ? 'ایس بی ٹی ماڈل پلے بک دیکھیں' : 'View SBT Models Playbook'}
                </button>
              </div>
            </div>
          )}

          {/* PHASE 3: LOCKED NOTICE */}
          {activePhase === 'PHASE_3_ADVANCED' && (
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-950 via-[#0e1628] to-slate-950 p-8 sm:p-12 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono-code text-xs font-bold uppercase">
                {isUrdu ? 'فیز 3 تیاری کے مراحل میں ہے' : 'PHASE 3 / PRO LEVEL IS LOCKED • COMING SOON'}
              </div>
              <h2 className="text-xl sm:text-3xl font-military font-bold text-white">
                {isUrdu ? 'ایس بی ٹی ماڈلز 1 تا 10 مکمل اسٹریٹیجی' : 'SBT Models 1–10 Complete Execution Strategy'}
              </h2>
              <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {isUrdu
                  ? 'فیز 3 کی جدید اسٹریٹجیز کو عنقریب جاری کیا جائے گا۔ اس وقت تمام 10 ماڈلز ہمارے وقف شدہ SBT ماڈلز کے زمرے میں دستیاب ہیں۔'
                  : 'Phase 3 Advanced Strategy is currently locked and will be unlocked soon. All 10 models are available directly inside the dedicated SBT Models category in the main menu.'}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePhase('PHASE_1_BASIC')}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {isUrdu ? 'فیز 1 بنیادی کورس پڑھیں' : 'Study Phase 1: Basic Course'}
                </button>
                <button
                  type="button"
                  onClick={handleNavigateSbt}
                  className="px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-cyan-300 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  {isUrdu ? 'SBT ماڈلز زمرہ کھولیں' : 'Open SBT Models Category'}
                </button>
              </div>
            </div>
          )}

          {/* PHASE 1: BASIC COURSE CONTENT */}
          {activePhase === 'PHASE_1_BASIC' && (
            <div className="space-y-6">
              {/* Basic Course Chapter Navigation Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono-code">
                {[
                  { num: 1, title: isUrdu ? 'ٹریڈنگ کیا ہے؟' : 'What is Trading?' },
                  { num: 2, title: isUrdu ? 'ٹریڈنگ کی تاریخ' : 'History of Trading' },
                  { num: 3, title: isUrdu ? 'ٹریڈنگ کی 5 اقسام' : 'The 5 Types of Trading' },
                  { num: 4, title: isUrdu ? 'فاریکس جوڑے اور میکینکس' : 'Forex Pairs & Mechanics' },
                  { num: 5, title: isUrdu ? 'اسپریڈ اور بروکرز' : 'Spreads & Brokers' },
                  { num: 6, title: isUrdu ? 'ٹریڈنگ ویو چارٹ فیڈز' : 'TradingView Chart Feeds' },
                  { num: 7, title: isUrdu ? 'کینڈل اسٹک اناٹومی' : 'Candlesticks & Anatomy' },
                  { num: 8, title: isUrdu ? 'مارکیٹ کے سنہری اصول' : 'Market Trends & Golden Rules' },
                ].map((ch) => (
                  <button
                    key={ch.num}
                    type="button"
                    onClick={() => setActiveBasicChapter(ch.num)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap font-bold transition cursor-pointer ${
                      activeBasicChapter === ch.num
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {isUrdu ? `باب ${ch.num}: ${ch.title}` : `Chapter ${ch.num}: ${ch.title}`}
                  </button>
                ))}
              </div>

              {/* Chapter 1: Definition of Trading (With High-Fidelity Visual Graphics & Interactive Simulator) */}
              {(activeBasicChapter === 1 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>{isUrdu ? 'باب 1 • بنیادی تعریف اور میکینکس' : 'CHAPTER 1 • FOUNDATIONAL DEFINITION'}</span>
                    </div>
                    <span className="text-[10px] font-mono-code text-slate-500">Core Axiom</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    {isUrdu ? 'ٹریڈنگ کیا ہے؟ بنیادی اصول اور پرائس ڈسکوری' : 'WHAT IS TRADING? CORE COMMERCE & PRICE DISCOVERY'}
                  </h2>

                  <div className="text-sm leading-7 text-slate-300 space-y-3">
                    <p>
                      {isUrdu ? (
                        <>
                          بنیادی سطح پر، <strong className="text-cyan-300">ٹریڈنگ کا مطلب تجارت، لین دین یا اشیاء کا تبادلہ ہے</strong>۔ اس کا عالمگیر اصول انتہائی سادہ ہے: <em>سستے داموں خریدنا اور منافع پر فروخت کرنا (Buy Low, Sell High)</em>۔
                        </>
                      ) : (
                        <>
                          At its most fundamental level, <strong className="text-cyan-300">trading means commerce, transacting, or exchanging goods</strong>. The core objective is universal: <em>buying low and selling high</em>.
                        </>
                      )}
                    </p>
                  </div>

                  {/* HIGH-FIDELITY GRAPHICAL COMMERCE FLOW DIAGRAM */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/30 shadow-xl space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 border-b border-slate-800 pb-2">
                      <span className="text-cyan-300 font-bold uppercase flex items-center gap-1.5">
                        <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                        {isUrdu ? 'مارکیٹ کا تبادلہ اور پرائس ڈسکوری سائیکل' : 'INSTITUTIONAL MARKET EXCHANGE FLOW'}
                      </span>
                      <span className="text-[10px] text-slate-500">Continuous 2-Way Auction</span>
                    </div>

                    {/* Visual 3-Node Architecture */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center items-center">
                      {/* Node 1: Buyer */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-military font-bold text-emerald-300 uppercase">
                          {isUrdu ? 'خریدار (بِڈ / لانگ)' : 'BUYER (BID ORDER)'}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                          {isUrdu
                            ? 'خریدار مارکیٹ میں سب سے کم قیمت پر اثاثہ خریدنے کی کوشش کرتا ہے۔'
                            : 'Demands an asset at the lowest possible price ($2,000) anticipating appreciation.'}
                        </p>
                      </div>

                      {/* Node 2: Central Liquidity Hub */}
                      <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-2 relative">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded bg-cyan-500 text-slate-950 text-[9px] font-mono-code font-extrabold uppercase">
                          MATCHING ENGINE
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mx-auto">
                          <BarChart2 className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-military font-bold text-cyan-300 uppercase">
                          {isUrdu ? 'مارکیٹ بروکر / لیکویڈیٹی پول' : 'BROKER & SPREAD'}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                          {isUrdu
                            ? 'بروکر خریدار اور بیچنے والے کے درمیان فوری سودا کرواتا ہے اور معمولی اسپریڈ وصول کرتا ہے۔'
                            : 'Matches bid & ask instantly. The difference is the broker spread ($2,000 / $2,001).'}
                        </p>
                      </div>

                      {/* Node 3: Seller */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                          <TrendingDown className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-military font-bold text-rose-300 uppercase">
                          {isUrdu ? 'فروخت کنندہ (آسک / شارٹ)' : 'SELLER (ASK ORDER)'}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                          {isUrdu
                            ? 'بیچنے والا زیادہ سے زیادہ قیمت پر اثاثہ فروخت کر کے منافع کما رہا ہے۔'
                            : 'Offers the asset at the ask price ($2,001) or enters a short speculation.'}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Real-Time Price Discovery Simulator */}
                    <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono-code text-slate-300 font-bold">
                        <span>{isUrdu ? 'تجرباتی پرائس ڈسکوری کیلکولیٹر' : 'INTERACTIVE PRICE DISCOVERY CALCULATOR'}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${profitLoss >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {profitLoss >= 0 ? `+${profitLoss.toFixed(2)} PROFIT` : `${profitLoss.toFixed(2)} LOSS`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code">
                        <div>
                          <label className="text-slate-400 block mb-1 text-[10px]">Buy Entry ($):</label>
                          <input
                            type="number"
                            value={simBuyPrice}
                            onChange={(e) => setSimBuyPrice(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1 text-[10px]">Sell Exit ($):</label>
                          <input
                            type="number"
                            value={simSellPrice}
                            onChange={(e) => setSimSellPrice(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1 text-[10px]">Units / Quantity:</label>
                          <input
                            type="number"
                            min="1"
                            value={simQuantity}
                            onChange={(e) => setSimQuantity(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real World Everyday Examples */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="text-xs font-military font-bold text-amber-300 uppercase">
                        {isUrdu ? 'روزمرہ کی مثال 1: پراپرٹی / ریئل اسٹیٹ' : 'Everyday Example 1: Real Estate'}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        {isUrdu
                          ? 'ایک سرمایہ کار ترقی پذیر علاقے میں سستا پلاٹ خریدتا ہے اور چند سال بعد انفراسٹرکچر بننے پر زیادہ قیمت پر فروخت کرتا ہے۔'
                          : 'An investor purchases a plot of land cheaply during a slow market period and waits for development to sell it at a higher price.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="text-xs font-military font-bold text-cyan-300 uppercase">
                        {isUrdu ? 'روزمرہ کی مثال 2: ہول سیل اور ریٹیل تجارت' : 'Everyday Example 2: Wholesale Commerce'}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        {isUrdu
                          ? 'دکاندار تھوک مارکیٹ سے سستے داموں سامان لے کر اپنی دکان پر عام گاہکوں کو منافع رکھ کر فروخت کرتا ہے۔'
                          : 'A shopkeeper buys goods wholesale at low cost and distributes them to consumers at a fair retail markup.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 2: History of Trading */}
              {(activeBasicChapter === 2 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>{isUrdu ? 'باب 2 • تاریخی ارتقاء' : 'CHAPTER 2 • HISTORICAL EVOLUTION'}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    {isUrdu ? 'تجارت کی مکمل تاریخ: بارٹر سسٹم سے الیکٹرانک مارکیٹ تک' : 'THE COMPLETE HISTORY OF TRADING'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isUrdu
                      ? 'قدیم اشیاء کے تبادلے سے لے کر عالمی فائبر آپٹک الگورتھمز تک کا سفر۔'
                      : 'From ancient physical barter to global fiber-optic algorithmic trading engines.'}
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-xs font-military font-bold text-amber-300 uppercase tracking-wider">
                        1. The Barter System (Ancient Era)
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {isUrdu
                          ? 'شروع میں کوئی رقم نہیں تھی۔ لوگ گندم کے بدلے مکئی یا مویشی کے بدلے کپڑا بدلتے تھے۔ اگر دو فریقین کی ضروریات نہ ملتیں تو تجارت رک جاتی تھی۔'
                          : 'Transactions occurred through direct item-for-item exchange. Required the "coincidence of wants", compelling humanity to invent money.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-xs font-military font-bold text-cyan-300 uppercase tracking-wider">
                        2. The Invention of Coinage (Lydia, 600 BC)
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {isUrdu
                          ? 'سونے اور چاندی کے معیاری سکے شاہِ لیڈیا (موجودہ ترکی) کے دور میں ڈھالے گئے جن پر شاہی شیر کا مونوگرام بنا تھا، جس نے تجارت کو آسان بنایا۔'
                          : 'The first stamped currency system originated in the Kingdom of Lydia (present-day Turkey). King Alyattes minted electrum coins with official lion stamps.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-xs font-military font-bold text-blue-300 uppercase tracking-wider">
                        3. The Birth of Stock Markets (Amsterdam, 1602)
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {isUrdu
                          ? 'ڈچ ایسٹ انڈیا کمپنی (VOC) نے بحری جہازوں اور مہمات کے لیے عوام سے سرمایہ اکٹھا کرنے کے لیے پہلی بار حصص (شیئرز) جاری کیے، جس سے ایمسٹرڈیم اسٹاک ایکسچینج بنی۔'
                          : 'The Dutch East India Company (VOC) publicly offered shares to fund trade voyages, establishing the world’s first formal stock exchange in Amsterdam.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-xs font-military font-bold text-emerald-300 uppercase tracking-wider">
                        4. Digital Trading & The Nasdaq 100 (1971–Present)
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {isUrdu
                          ? '1971 میں نیس ڈیک (Nasdaq) نے کمپیوٹرائزڈ اسکرین ٹریڈنگ کا آغاز کیا، جس سے فزیکل فلور کے بجائے ملی سیکنڈز میں آرڈر میچنگ ممکن ہوئی۔'
                          : 'Electronic trading was pioneered by Nasdaq in 1971, replacing trading pits with automated computer networks.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 3: The 5 Types of Trading (ALL 5 Selectable & Interactive) */}
              {(activeBasicChapter === 3 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                      <Globe className="w-4 h-4" />
                      <span>{isUrdu ? 'باب 3 • مالیاتی منڈیوں کی 5 اقسام' : 'CHAPTER 3 • THE 5 TYPES OF TRADING'}</span>
                    </div>
                    <span className="text-[10px] font-mono-code text-cyan-400">Click Any Market to Inspect</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    {isUrdu ? 'مالیاتی اثاثوں کی کلاسیں (کلک کر کے تفصیل دیکھیں)' : 'THE 5 FINANCIAL ASSET CLASSES'}
                  </h2>

                  {/* 5 Selectable Market Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono-code text-xs">
                    {(
                      [
                        { id: 'FOREX', label: '1. FOREX', icon: Coins, sub: 'Currencies' },
                        { id: 'STOCKS', label: '2. STOCKS', icon: Building, sub: 'Equities' },
                        { id: 'INDICES', label: '3. INDICES', icon: BarChart2, sub: 'Baskets' },
                        { id: 'CRYPTO', label: '4. CRYPTO', icon: Zap, sub: 'Tokens' },
                        { id: 'COMMODITIES', label: '5. COMMODITIES', icon: Wheat, sub: 'Gold / Oil' },
                      ] as const
                    ).map((t) => {
                      const isSelected = selectedAsset === t.id;
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedAsset(t.id)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="font-military font-bold text-xs">{t.label}</span>
                            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`} />
                          </div>
                          <span className="text-[9px] text-slate-400">{t.sub}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Asset Deep Dive Card */}
                  <div className="p-5 rounded-2xl bg-[#080d1a] border border-cyan-500/30 space-y-4">
                    {selectedAsset === 'FOREX' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-military font-bold text-cyan-300">
                            FOREX (FOREIGN EXCHANGE)
                          </h3>
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            $7.5 TRILLION DAILY VOLUME
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                          {isUrdu
                            ? 'فاریکس دنیا کی سب سے بڑی اور سب سے زیادہ مائع (liquid) مارکیٹ ہے جہاں مختلف ممالک کی کرنسیاں آپس میں خریدی اور بیچی جاتی ہیں۔ یہ ہفتے میں 5 دن 24 گھنٹے چلتی ہے۔'
                            : 'Forex is the decentralized global exchange where governments, banks, corporations, and retail traders swap national currencies. Open 24 hours a day, 5 days a week.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono-code">
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Trading Hours:</span>
                            <strong className="text-slate-200">24/5 (Mon–Fri)</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Top Pairs:</span>
                            <strong className="text-cyan-400">EUR/USD, GBP/USD, USD/JPY</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Typical Spreads:</span>
                            <strong className="text-emerald-400">0.0 to 1.2 Pips (Ultra Low)</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAsset === 'STOCKS' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-military font-bold text-amber-300">
                            STOCKS / EQUITIES
                          </h3>
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            PUBLIC CORPORATIONS
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                          {isUrdu
                            ? 'اسٹاک مارکیٹ میں آپ کسی بھی لسٹڈ پبلک کمپنی کے شیئرز (حصص) خریدتے یا بیچتے ہیں، جیسے کہ ٹیسلا (TSLA)، ایپل (AAPL)، یا مائیکروسافٹ (MSFT)۔'
                            : 'Stocks represent fractional equity ownership in publicly traded corporations. Value fluctuates based on quarterly company earnings, revenue, guidance, and macroeconomic health.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono-code">
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Trading Hours:</span>
                            <strong className="text-slate-200">09:30–16:00 EST</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Top Equities:</span>
                            <strong className="text-amber-400">AAPL, TSLA, NVDA, AMZN</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Key Drivers:</span>
                            <strong className="text-slate-300">Earnings (EPS), Balance Sheet</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAsset === 'INDICES' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-military font-bold text-blue-300">
                            INDICES (INDEX CFDs)
                          </h3>
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            WEIGHTED BASKETS
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                          {isUrdu
                            ? 'انڈیکس کسی ایک کمپنی کا نہیں بلکہ بہترین کمپنیوں کا مجموعہ ہوتا ہے۔ مثال کے طور پر Nasdaq 100 امریکہ کی ٹاپ 100 ٹیکنالوجی کمپنیوں کا باسکٹ ہے۔'
                            : 'Indices track the aggregate performance of a basket of top companies representing a country’s economic health, eliminating single-company bankruptcy risk.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono-code">
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Benchmark Baskets:</span>
                            <strong className="text-blue-400">US30 (Dow), NAS100, SPX500, DAX</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Volatility Profile:</span>
                            <strong className="text-amber-300">High Intraday Momentum</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Best Chart Source:</span>
                            <strong className="text-slate-300">FXCM / BlackBull on TradingView</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAsset === 'CRYPTO' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-military font-bold text-emerald-300">
                            CRYPTOCURRENCY
                          </h3>
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            24/7/365 DECENTRALIZED
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                          {isUrdu
                            ? 'بٹ کوائن (BTC) اور دیگر ڈیجیٹل ٹوکنز 24 گھنٹے اور ہفتے کے ساتوں دن چلتے ہیں۔ کرپٹو چارٹس دیکھنے کے لیے ہمیشہ Binance کا فیڈ منتخب کریں۔'
                            : 'Decentralized cryptographic assets operating without central bank intermediaries. Continuous trading 24/7/365 with high retail participation.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono-code">
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Trading Hours:</span>
                            <strong className="text-emerald-400">Never Closes (24/7/365)</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Top Tokens:</span>
                            <strong className="text-slate-200">BTC/USDT, ETH/USDT, SOL/USDT</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Required Chart Feed:</span>
                            <strong className="text-amber-400">BINANCE (Spot)</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAsset === 'COMMODITIES' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-military font-bold text-amber-300">
                            COMMODITIES (METALS & ENERGIES)
                          </h3>
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            HARD VS SOFT
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                          {isUrdu
                            ? 'کموڈیٹیز دو قسم کی ہوتی ہیں: ہارڈ (زمین سے نکالی جانے والی اشیاء جیسے سونا XAU، چاندی XAG، خام تیل Crude Oil) اور سافٹ (زمین پر اگائی جانے والی فصلیں جیسے گندم، چاول، کپاس)۔'
                            : 'Raw physical goods traded globally. Divided into Hard Commodities (extracted minerals like Gold XAU/USD, Silver XAG/USD, Crude Oil WTI) and Soft Commodities (agricultural crops like wheat, coffee, sugar).'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono-code">
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Safe Haven Asset:</span>
                            <strong className="text-amber-400">Gold (XAU/USD)</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Energy Benchmark:</span>
                            <strong className="text-slate-200">WTI Crude Oil (USOIL)</strong>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Macro Confluence:</span>
                            <strong className="text-cyan-400">US Dollar Index (DXY) & Real Yields</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chapter 4: Pair Trading Types & Forex Mechanics (Clean Separation) */}
              {(activeBasicChapter === 4 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                      <Layers className="w-4 h-4" />
                      <span>{isUrdu ? 'باب 4 • پیئر ٹریڈنگ کی اقسام اور فاریکس میکانکس' : 'CHAPTER 4 • PAIR TRADING TYPES & FOREX MECHANICS'}</span>
                    </div>
                    <span className="text-[10px] font-mono-code text-cyan-400">All Asset Classes Selectable</span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                      {isUrdu ? 'پیئر ٹریڈنگ کی اقسام (Forex, Stocks, Indices, Crypto, Commodities)' : 'TYPES OF PAIR TRADING ACROSS MARKETS'}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono-code mt-1">
                      {isUrdu
                        ? 'تمام اہم مالیاتی منڈیوں میں جوڑوں کی ٹریڈنگ کیسے کام کرتی ہے: کسی بھی اثاثہ کلاس پر کلک کریں۔'
                        : 'Explore pair structures, relative strength, and statistical arbitrage across Forex, Equities, Indices, Crypto, and Commodities.'}
                    </p>
                  </div>

                  {/* Asset Class Switcher for Chapter 4 */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono-code text-xs">
                    {(
                      [
                        { id: 'FOREX', label: 'FOREX PAIRS', sub: 'Majors & Crosses' },
                        { id: 'STOCKS', label: 'STOCK PAIRS', sub: 'Stat-Arb & Equities' },
                        { id: 'INDICES', label: 'INDEX SPREADS', sub: 'Tech vs Industrial' },
                        { id: 'CRYPTO', label: 'CRYPTO PAIRS', sub: 'Base / Satoshis' },
                        { id: 'COMMODITIES', label: 'COMMODITY PAIRS', sub: 'Gold/Silver & Oil' },
                      ] as const
                    ).map((cat) => {
                      const isSelected = pairAssetCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPairAssetCategory(cat.id)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-blue-500/20 ring-1 ring-cyan-400/40 font-bold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-xs uppercase font-military">{cat.label}</span>
                          <span className="text-[10px] text-slate-400 mt-1">{cat.sub}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Section A: Categorized Names & Instruments */}
                  <div className="space-y-4">
                    {/* FOREX PAIRS */}
                    {pairAssetCategory === 'FOREX' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {(['MAJOR', 'CROSS', 'EXOTIC'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSelectedPairType(t)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                                selectedPairType === t
                                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                              }`}
                            >
                              {t === 'MAJOR' ? '1. Major Pairs (7)' : t === 'CROSS' ? '2. Cross Pairs (21)' : '3. Exotic Pairs'}
                            </button>
                          ))}
                        </div>

                        {selectedPairType === 'MAJOR' && (
                          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-military font-bold text-cyan-300 uppercase">
                                7 Primary Major Forex Pairs (USD + G8):
                              </span>
                              <span className="text-[10px] font-mono-code text-cyan-400">75%+ of Forex Liquidity</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-code">
                              {[
                                { pair: 'EUR/USD', name: 'Euro / US Dollar', spread: '0.0 - 0.4 pips' },
                                { pair: 'GBP/USD', name: 'British Pound / USD', spread: '0.2 - 0.8 pips' },
                                { pair: 'USD/JPY', name: 'USD / Japanese Yen', spread: '0.1 - 0.5 pips' },
                                { pair: 'USD/CHF', name: 'USD / Swiss Franc', spread: '0.4 - 1.0 pips' },
                                { pair: 'USD/CAD', name: 'USD / Canadian Dollar', spread: '0.3 - 0.9 pips' },
                                { pair: 'AUD/USD', name: 'Aussie / US Dollar', spread: '0.3 - 0.7 pips' },
                                { pair: 'NZD/USD', name: 'Kiwi / US Dollar', spread: '0.5 - 1.1 pips' },
                              ].map((p) => (
                                <div key={p.pair} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                                  <div className="font-bold text-slate-100">{p.pair}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{p.name}</div>
                                  <div className="text-[9px] text-emerald-400 font-bold mt-1">Spread: {p.spread}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedPairType === 'CROSS' && (
                          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-military font-bold text-blue-300 uppercase">
                                Cross Pairs (Primary Currencies Without USD):
                              </span>
                              <span className="text-[10px] font-mono-code text-blue-400">High Volatility Trends</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-code">
                              {[
                                { pair: 'EUR/GBP', name: 'Euro / British Pound' },
                                { pair: 'GBP/JPY', name: 'Pound / Yen (Dragon)' },
                                { pair: 'EUR/JPY', name: 'Euro / Japanese Yen' },
                                { pair: 'AUD/JPY', name: 'Aussie / Yen (Risk Gauge)' },
                                { pair: 'EUR/AUD', name: 'Euro / Aussie' },
                                { pair: 'GBP/AUD', name: 'Pound / Aussie' },
                                { pair: 'AUD/CAD', name: 'Aussie / Loonie' },
                                { pair: 'CAD/JPY', name: 'Loonie / Yen (Oil Play)' },
                              ].map((p) => (
                                <div key={p.pair} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                                  <div className="font-bold text-slate-100">{p.pair}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{p.name}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedPairType === 'EXOTIC' && (
                          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-military font-bold text-amber-300 uppercase">
                                Exotic Pairs (1 Major + 1 Developing Economy):
                              </span>
                              <span className="text-[10px] font-mono-code text-rose-400">High Spread Warning</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-code">
                              {[
                                { pair: 'USD/PKR', name: 'USD / Pakistani Rupee' },
                                { pair: 'USD/TRY', name: 'USD / Turkish Lira' },
                                { pair: 'USD/ZAR', name: 'USD / South African Rand' },
                                { pair: 'USD/MXN', name: 'USD / Mexican Peso' },
                              ].map((p) => (
                                <div key={p.pair} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                                  <div className="font-bold text-slate-100">{p.pair}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{p.name}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STOCKS PAIRS */}
                    {pairAssetCategory === 'STOCKS' && (
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs font-mono-code">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-military font-bold text-amber-300 uppercase">
                            Equity Pairs Trading (Statistical Arbitrage & Sector Spreads):
                          </span>
                          <span className="text-[10px] font-mono-code text-amber-400">Hedge Fund Market-Neutral</span>
                        </div>
                        <p className="text-slate-300 text-xs font-sans">
                          {isUrdu
                            ? 'اسٹاک پیئر ٹریڈنگ میں ٹریڈر ایک ہی شعبے کی دو کمپنیوں کو چنتا ہے: ایک کو خریدتا ہے (Long) اور دوسری کو فروخت کرتا ہے (Short)، جس سے مجموعی مارکیٹ کے کریش کا خطرہ ختم ہو جاتا ہے۔'
                            : 'Traders buy an undervalued stock while simultaneously shorting an overvalued rival in the same sector, profiting from mean reversion regardless of broader market direction.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-cyan-400 block mb-1">AAPL vs MSFT (Big Tech)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">Long Apple / Short Microsoft based on relative cloud vs consumer hardware cycle.</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-amber-400 block mb-1">NVDA vs AMD (Semiconductors)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">Semiconductor AI leadership arbitrage; captures spread divergences.</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-emerald-400 block mb-1">JPM vs BAC (Banking Sector)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">Relative net interest margin divergence between tier-1 Wall Street institutions.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INDICES PAIRS */}
                    {pairAssetCategory === 'INDICES' && (
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs font-mono-code">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-military font-bold text-blue-300 uppercase">
                            Indices Relative Strength Pairs:
                          </span>
                          <span className="text-[10px] font-mono-code text-blue-400">Macro Sector Rotation</span>
                        </div>
                        <p className="text-slate-300 text-xs font-sans">
                          {isUrdu
                            ? 'انڈیکس پیئرز میں آپ ٹیکنالوجی (Nasdaq) بمقابلہ انڈسٹریل (Dow Jones) یا امریکی مارکیٹ بمقابلہ یورپی مارکیٹ کی تقابلی ٹریڈنگ کرتے ہیں۔'
                            : 'Trading the spread between different index benchmarks captures monetary capital rotation between heavy industry and speculative technology.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-cyan-400 block mb-1">NAS100 vs US30 (Tech vs Dow)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">Long Nasdaq / Short Dow during low-interest growth regimes; reverse during rate hike cycles.</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-blue-400 block mb-1">SPX500 vs GER40 (US vs Europe)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">Transatlantic divergence based on Federal Reserve vs European Central Bank rate differentials.</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-emerald-400 block mb-1">UK100 vs US30 (Commodity vs Industrial)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">FTSE100 is energy and materials heavy; out-performs during commodity inflation super-cycles.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CRYPTO PAIRS */}
                    {pairAssetCategory === 'CRYPTO' && (
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs font-mono-code">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-military font-bold text-amber-300 uppercase">
                            Crypto Pair Trading (Base Token / Quote Token):
                          </span>
                          <span className="text-[10px] font-mono-code text-amber-400">Satoshi & Stablecoin Pairs</span>
                        </div>
                        <p className="text-slate-300 text-xs font-sans">
                          {isUrdu
                            ? 'کرپٹو میں دو بنیادی طریقے ہوتے ہیں: اسٹیبل کوائن پیئرز (BTC/USDT) یا بٹ کوائن بیس پیئرز (ETH/BTC) جہاں آپ آلٹ کوائنز کی طاقت کو بٹ کوائن کے مقابلے میں ماپتے ہیں۔'
                            : 'Crypto trading is executed either against fiat stablecoins (USDT/USDC) or against Bitcoin (Satoshi ratio pairs like ETH/BTC and SOL/BTC) to measure altcoin outperformance.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-amber-400 block mb-1">BTC/USDT & ETH/USDT</strong>
                            <p className="text-[11px] text-slate-400 font-sans">Direct dollar purchasing power pairs for the top decentralized network reserves.</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-cyan-400 block mb-1">ETH/BTC (The Ratio Pair)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">The classic institutional gauge of altcoin season vs Bitcoin dominance flight-to-safety.</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-emerald-400 block mb-1">SOL/ETH (Layer-1 Arbitrage)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">Relative throughput, active fee volume, and developer momentum spread.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* COMMODITY PAIRS & RATIOS */}
                    {pairAssetCategory === 'COMMODITIES' && (
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs font-mono-code">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-military font-bold text-amber-300 uppercase">
                            Commodities Crack Spreads & Metal Ratios:
                          </span>
                          <span className="text-[10px] font-mono-code text-amber-400">Physical Economic Arbitrage</span>
                        </div>
                        <p className="text-slate-300 text-xs font-sans">
                          {isUrdu
                            ? 'کموڈیٹیز میں سونے اور چاندی کا تناسب (Gold/Silver Ratio) صدیوں سے سب سے مشہور پیئر ٹریڈ ہے، اسی طرح WTI خام تیل اور برینٹ تیل کا فرق۔'
                            : 'Historical physical arbitrage pairs like the Gold-to-Silver ratio (XAU/XAG) indicate monetary deflation vs industrial expansion.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-amber-400 block mb-1">Gold/Silver Ratio (XAU vs XAG)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">When the ratio exceeds 85, silver is historically undervalued relative to gold; mean-reversion setup.</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-cyan-400 block mb-1">WTI vs Brent Crude Oil</strong>
                            <p className="text-[11px] text-slate-400 font-sans">US inland production (Cushing, OK) vs North Sea seaborn crude delivery spread.</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <strong className="text-emerald-400 block mb-1">Gold vs Copper (Doctor Copper)</strong>
                            <p className="text-[11px] text-slate-400 font-sans">Safe-haven gold demand vs global manufacturing growth pulse captured in copper prices.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section B: Pricing Mechanics of Forex Pair Trading (Clean Dedicated Section) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/25 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-military font-bold uppercase text-cyan-300 flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                        <span>{isUrdu ? '2. فاریکس پیئر ٹریڈنگ کے بنیادی میکانکس' : '2. MECHANICS OF FOREX PAIR TRADING'}</span>
                      </div>
                      <span className="text-[10px] font-mono-code text-cyan-400 font-bold">Base vs Quote Currency</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-center gap-3 text-lg sm:text-2xl font-mono-code font-extrabold flex-wrap">
                        <span className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          EUR (Base Currency)
                        </span>
                        <span className="text-slate-500">/</span>
                        <span className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          USD (Quote Currency)
                        </span>
                        <span className="text-slate-400">=</span>
                        <span className="text-cyan-300 font-bold bg-slate-900 px-3 py-1 rounded border border-cyan-500/30">1.08500</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-slate-300 font-sans pt-1">
                        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                          <strong className="text-emerald-400 block font-mono-code font-bold">1. Base Currency (Left):</strong>
                          <p>
                            {isUrdu
                              ? 'بائیں جانب والی کرنسی بیس کرنسی کہلاتی ہے (اس کی مقدار ہمیشہ 1 یونٹ ہوتی ہے)۔ جب آپ BUY کرتے ہیں، آپ 1 یورو خرید رہے ہوتے ہیں اور امریکی ڈالر فروخت کر رہے ہوتے ہیں۔'
                              : 'The first currency on the left is the base currency (fixed as 1 unit). Executing a BUY order means purchasing 1 Euro while selling the equivalent amount in USD.'}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                          <strong className="text-rose-400 block font-mono-code font-bold">2. Quote Currency (Right):</strong>
                          <p>
                            {isUrdu
                              ? 'دائیں جانب والی کرنسی کوٹ کرنسی کہلاتی ہے۔ یہ بتاتی ہے کہ 1 بیس کرنسی خریدنے کے لیے کتنے امریکی ڈالر ($1.0850) درکار ہیں۔'
                              : 'The second currency on the right specifies how much quote currency (USD) is required to purchase 1 unit of base currency ($1.0850 per 1 Euro).'}
                          </p>
                        </div>
                      </div>

                      {/* Interactive Bid/Ask Spread Mechanics Display */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-mono-code">
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Bid Price (Sell):</span>
                          <strong className="text-rose-400 text-sm">1.08498</strong>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Ask Price (Buy):</span>
                          <strong className="text-emerald-400 text-sm">1.08502</strong>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Broker Spread:</span>
                          <strong className="text-cyan-400 text-sm">0.4 Pips</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 5: Spreads & Brokers */}
              {(activeBasicChapter === 5 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>CHAPTER 5 • SPREADS, COMMISSIONS & BROKERS</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    UNDERSTANDING SPREAD COSTS & SLIPPAGE
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {isUrdu
                      ? 'اسپریڈ بروکر کا منافع ہوتا ہے جو کہ خرید (Ask) اور فروخت (Bid) کی قیمت کے فرق پر مشتمل ہوتا ہے۔ کم اسپریڈ والے ECN بروکرز ہمیشہ محفوظ ٹریڈنگ فراہم کرتے ہیں۔'
                      : 'Spread is the difference between the broker’s Buy (Ask) price and Sell (Bid) price. Lower spreads mean less friction and faster break-even.'}
                  </p>
                </div>
              )}

              {/* Chapter 6: TradingView Chart Recommendations */}
              {(activeBasicChapter === 6 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <ExternalLink className="w-4 h-4" />
                    <span>CHAPTER 6 • VERIFIED TRADINGVIEW CHART FEEDS</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    RECOMMENDED TRADINGVIEW BROKER FEEDS
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono-code pt-1">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold block mb-1">FOREX PAIRS:</span>
                      <strong className="text-white">FXCM or Forex.com</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-amber-400 font-bold block mb-1">COMMODITIES (GOLD/OIL):</span>
                      <strong className="text-white">FXCM or OANDA</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-blue-400 font-bold block mb-1">INDICES (US30/NAS100):</span>
                      <strong className="text-white">FXCM / BlackBull</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-emerald-400 font-bold block mb-1">CRYPTO (BTC/ETH):</span>
                      <strong className="text-white">BINANCE (Spot)</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 7: Candlestick Structure */}
              {(activeBasicChapter === 7 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    <span>CHAPTER 7 • JAPANESE CANDLESTICK STRUCTURE</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    OPEN, HIGH, LOW, CLOSE (OHLC) ANATOMY
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-code">
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                      <div className="font-bold text-emerald-300 text-sm">BULLISH CANDLE (CLOSE &gt; OPEN)</div>
                      <p className="text-slate-300 font-sans">
                        Price opens lower and pushes higher by buyer aggression. The upper wick represents resistance or rejection, while the lower wick shows where buyers defended.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                      <div className="font-bold text-rose-300 text-sm">BEARISH CANDLE (CLOSE &lt; OPEN)</div>
                      <p className="text-slate-300 font-sans">
                        Price opens higher and is overwhelmed by seller distribution. Wicks represent price extremes reached before close.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 8: Golden Rules */}
              {(activeBasicChapter === 8 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <Award className="w-4 h-4" />
                    <span>CHAPTER 8 • 5 GOLDEN RULES OF PRO TRADING</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    INSTITUTIONAL RISK DEFENSE PRINCIPLES
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <strong className="text-cyan-400 font-mono-code block">1. 1% Risk Rule:</strong>
                      <p className="text-slate-400 font-sans">Never risk more than 1% of account equity on any trade.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <strong className="text-emerald-400 font-mono-code block">2. Positive Risk-to-Reward:</strong>
                      <p className="text-slate-400 font-sans">Target minimum 1:2.5 R:R so a 40% win rate yields consistent profits.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <strong className="text-amber-400 font-mono-code block">3. Never Chase News Spikes:</strong>
                      <p className="text-slate-400 font-sans">Wait for liquidity sweeps and displacement confirmation before entering.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <strong className="text-blue-400 font-mono-code block">4. Journal Every Setup:</strong>
                      <p className="text-slate-400 font-sans">Review past setups to eliminate emotional over-trading.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PROFESSIONAL EXECUTION COURSES (COMING SOON WITH SBT LINK) */}
      {activeSection === 'EXECUTION_COURSES' && (
        <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-950 via-[#0a1224] to-slate-950 p-8 sm:p-12 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-cyan-300 font-mono-code text-xs font-bold uppercase tracking-wider">
            FEATURE CURRENTLY LOCKED • COMING SOON
          </div>
          <h2 className="text-xl sm:text-3xl font-military font-bold text-white tracking-wide">
            {isUrdu ? 'پروفیشنل ایگزیکیوشن کورسز جلد دستیاب ہوں گے' : 'PROFESSIONAL EXECUTION COURSES'}
          </h2>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            {isUrdu
              ? 'لندن اور نیویارک کل زونز، ہائی پروببلٹی ایگزیکیوشن چیک لسٹس، اور سائیکولوجیکل ٹریڈ مینجمنٹ کے کورسز تیاری کے حتمی مراحل میں ہیں۔ آپ براہ راست SBT ماڈلز کے 10 انسٹیٹیوشنل پلے بکس دیکھ سکتے ہیں۔'
              : 'Detailed video execution courses covering London Open & NY Killzones, pre-trade rules, and emotional drawdown defense are undergoing institutional calibration. Meanwhile, you can review the 10 active SBT Models.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
            <a
              href="https://chat.whatsapp.com/H9uEqx5DYDEATKXTfi3jlr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <span>{isUrdu ? 'واٹس ایپ کمیونٹی میں شامل ہوں' : 'Join WhatsApp Community'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="https://wa.me/923406671495"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              <span>{isUrdu ? 'اکیڈمی ایڈمن رابطہ' : 'Contact Academy Admin'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={handleNavigateSbt}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isUrdu ? 'SBT ماڈلز پلے بک دیکھیں' : 'Explore SBT Models Category'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('STRATEGIES')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              {isUrdu ? 'بنیادی کورس پڑھیں' : 'Study Basic Course (Phase 1)'}
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: TRADING BOTS & AUTOMATION */}
      {activeSection === 'BOTS_AUTOMATION' && (
        <div className="rounded-2xl border border-amber-500/20 bg-slate-950/90 p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono-code font-bold uppercase tracking-wider">
            <Bot className="w-4 h-4" />
            <span>SECTION 3 • TRADING BOTS & AUTOMATION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
            PRIME PIP FX QUANTITATIVE BOTS & ALGORITHMIC ARCHITECTURE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-xs font-military font-bold text-amber-300 uppercase">
                1. Webhook Alert Execution
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Connect TradingView automated alerts directly to execution endpoints via secure JSON webhooks, triggering instant limit and market orders upon price reaching Fair Value Gaps or Order Blocks.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-xs font-military font-bold text-amber-300 uppercase">
                2. Automated Risk Guardrails
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Algorithmic position sizing based on live account balance and stop loss distance. Auto-killswitch locks execution if daily drawdown reaches 4%, protecting prop firm capital.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
