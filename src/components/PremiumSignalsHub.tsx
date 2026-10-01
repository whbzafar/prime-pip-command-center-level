import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Sparkles,
  ShieldAlert,
  Bell,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Download,
  Copy,
  Check,
  Clock,
  Send,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  Award,
  ChevronRight,
  Calculator,
  X,
  Share2,
  FileText,
  BarChart3,
  Percent,
  Upload,
  Image as ImageIcon,
  Maximize2,
  Eye,
  Paperclip,
} from 'lucide-react';
import { SignalItem, UserAccount } from '../types';
import jsPDF from 'jspdf';
import {
  fetchSignalsFromServer,
  createSignalServer,
  updateSignalStatusServer,
  fetchAnnouncementsServer,
  postAnnouncementServer,
  InAppAnnouncement,
  subscribeToSignalsSync,
} from '../services/signalsService';

interface PremiumSignalsHubProps {
  currentUser?: UserAccount | null;
  isAdmin?: boolean;
  onSelectSignalForTrade?: (signal: SignalItem) => void;
  onOpenLotCalculator?: (pair: string) => void;
}

export const PremiumSignalsHub: React.FC<PremiumSignalsHubProps> = ({
  currentUser,
  isAdmin: propIsAdmin = false,
  onSelectSignalForTrade,
  onOpenLotCalculator,
}) => {
  // Determine if current user has admin rights
  const isAdmin = propIsAdmin || currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER';

  // Signals and Announcements State
  const [activeSignals, setActiveSignals] = useState<SignalItem[]>([]);
  const [closedSignals, setClosedSignals] = useState<SignalItem[]>([]);
  const [announcements, setAnnouncements] = useState<InAppAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sub Tab Navigation: Live Signals, Dedicated Reports (replacing running log), Owner Announcements
  const [activeSubTab, setActiveSubTab] = useState<'LIVE_SIGNALS' | 'REPORTS' | 'OWNER_ANNOUNCEMENTS'>('LIVE_SIGNALS');

  // Reports Filter: All, Daily, Weekly
  const [reportsFilter, setReportsFilter] = useState<'ALL' | 'DAILY' | 'WEEKLY'>('ALL');

  // Modals & UI States
  const [isCreateSignalModalOpen, setIsCreateSignalModalOpen] = useState<boolean>(false);
  const [isCloseSignalModalOpen, setIsCloseSignalModalOpen] = useState<boolean>(false);
  const [selectedSignalToClose, setSelectedSignalToClose] = useState<SignalItem | null>(null);
  const [closeStatusChoice, setCloseStatusChoice] = useState<'TP_HIT' | 'SL_HIT' | 'BREAK_EVEN' | 'DEACTIVATE_LEVEL'>('TP_HIT');
  const [closePriceInput, setClosePriceInput] = useState<string>('');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');

  // Available Setup Timeframes
  const SIGNAL_TIMEFRAMES = [
    'Weekly',
    'Daily',
    'H4',
    'H1',
    'M30',
    'M15',
    'M5',
    'M3',
    'M1',
  ] as const;

  // Create Signal Form State
  const [pairInput, setPairInput] = useState<string>('XAU/USD');
  const [directionInput, setDirectionInput] = useState<'BUY' | 'SELL'>('BUY');
  const [timeframeInput, setTimeframeInput] = useState<string>('H1');
  const [entryPriceInput, setEntryPriceInput] = useState<string>('');
  const [stopLossInput, setStopLossInput] = useState<string>('');
  const [takeProfit1Input, setTakeProfit1Input] = useState<string>('');
  const [takeProfit2Input, setTakeProfit2Input] = useState<string>('');
  const [takeProfit3Input, setTakeProfit3Input] = useState<string>('');
  const [riskPercentInput, setRiskPercentInput] = useState<string>('1.0');
  const [strategyNotesInput, setStrategyNotesInput] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Signal Image / PDF Upload State
  const [signalImageFile, setSignalImageFile] = useState<File | null>(null);
  const [signalImagePreview, setSignalImagePreview] = useState<string | null>(null);
  const [signalImageName, setSignalImageName] = useState<string>('');
  const [signalImageMime, setSignalImageMime] = useState<string>('');
  const [signalImageSize, setSignalImageSize] = useState<string>('');
  const [previewLightboxImage, setPreviewLightboxImage] = useState<{ url: string; name: string; isPdf?: boolean } | null>(null);

  // Announcement Form State
  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementMessage, setAnnouncementMessage] = useState<string>('');
  const [announcementCategory, setAnnouncementCategory] = useState<'SIGNAL_ALERT' | 'MARKET_UPDATE' | 'IMPORTANT_ANNOUNCEMENT'>('SIGNAL_ALERT');
  const [announcementSuccess, setAnnouncementSuccess] = useState<string | null>(null);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load signals & announcements from server on mount with fast live polling and event listeners
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [sigData, annData] = await Promise.all([
          fetchSignalsFromServer(),
          fetchAnnouncementsServer(),
        ]);
        if (isMounted) {
          setActiveSignals(sigData.activeSignals);
          setClosedSignals(sigData.closedSignals);
          setAnnouncements(annData);
          setIsLoading(false);
        }
      } catch (e) {
        console.warn('Error loading signal data:', e);
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    // Fast polling ensures continuous synchronization across tabs/devices
    const interval = setInterval(loadData, 3000);
    const unsubSync = subscribeToSignalsSync(() => loadData());
    const onSignalCreated = () => loadData();
    const onAnnouncementCreated = () => loadData();
    const onStorage = () => loadData();

    window.addEventListener('primepipfx_signal_created', onSignalCreated);
    window.addEventListener('primepipfx_announcement_created', onAnnouncementCreated);
    window.addEventListener('storage', onStorage);

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubSync();
      window.removeEventListener('primepipfx_signal_created', onSignalCreated);
      window.removeEventListener('primepipfx_announcement_created', onAnnouncementCreated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Handle Image/PDF selection and read as base64 for clear preview before activating
  const handleImageSelect = (file: File) => {
    setCreateError(null);
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      setCreateError('Please upload a valid image file (PNG, JPG, WEBP) or PDF document.');
      return;
    }
    const sizeKb = Math.round(file.size / 1024);
    setSignalImageSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
    setSignalImageFile(file);
    setSignalImageName(file.name);
    setSignalImageMime(isPdf ? 'application/pdf' : (file.type || 'image/png'));

    const reader = new FileReader();
    reader.onload = (e) => {
      setSignalImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Create Signal Submission
  const handleSaveSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const cleanPair = pairInput.trim().toUpperCase();
    const entry = parseFloat(entryPriceInput);
    const sl = parseFloat(stopLossInput);
    const tp1 = parseFloat(takeProfit1Input);

    if (!cleanPair) {
      setCreateError('Please enter a currency pair name.');
      return;
    }
    if (isNaN(entry) || entry <= 0) {
      setCreateError('Please enter a valid entry price.');
      return;
    }
    if (isNaN(sl) || sl <= 0) {
      setCreateError('Please enter a valid stop-loss (SL).');
      return;
    }
    if (isNaN(tp1) || tp1 <= 0) {
      setCreateError('Please enter a valid take-profit (TP1).');
      return;
    }

    try {
      const newSignal = await createSignalServer({
        pair: cleanPair,
        direction: directionInput,
        timeframe: timeframeInput,
        entryPrice: entry,
        stopLoss: sl,
        takeProfit1: tp1,
        takeProfit2: takeProfit2Input ? parseFloat(takeProfit2Input) : undefined,
        takeProfit3: takeProfit3Input ? parseFloat(takeProfit3Input) : undefined,
        strategyNotes: strategyNotesInput.trim(),
        recommendedRiskPercent: parseFloat(riskPercentInput) || 1.0,
        imageUrl: signalImagePreview || undefined,
        imageName: signalImageName || undefined,
        imageMimeType: signalImageMime || undefined,
      });

      // Update state immediately
      setActiveSignals((prev) => [newSignal, ...prev.filter((s) => s.id !== newSignal.id)]);
      window.dispatchEvent(new CustomEvent('primepipfx_signal_created', { detail: newSignal }));

      // Auto-post an in-app announcement dispatching this signal
      try {
        const autoAnn = await postAnnouncementServer({
          title: `LIVE SIGNAL: ${cleanPair} ${directionInput} (${timeframeInput})`,
          message: `${cleanPair} ${directionInput} [${timeframeInput}] dispatched at ${entry}. SL: ${sl} | TP1: ${tp1}.${signalImageName ? ' (Setup chart attached)' : ''} ${strategyNotesInput ? 'Setup: ' + strategyNotesInput : ''}`,
          category: 'SIGNAL_ALERT',
          signalId: newSignal.id,
          sender: currentUser?.displayName || currentUser?.email || 'Owner / Chief Institutional Analyst',
        });
        setAnnouncements((prev) => [autoAnn, ...prev]);
        window.dispatchEvent(new CustomEvent('primepipfx_announcement_created', { detail: autoAnn }));
      } catch {}

      // Reset form & close modal
      setPairInput('XAU/USD');
      setTimeframeInput('H1');
      setEntryPriceInput('');
      setStopLossInput('');
      setTakeProfit1Input('');
      setTakeProfit2Input('');
      setTakeProfit3Input('');
      setStrategyNotesInput('');
      setSignalImageFile(null);
      setSignalImagePreview(null);
      setSignalImageName('');
      setSignalImageMime('');
      setSignalImageSize('');
      setIsCreateSignalModalOpen(false);

      // Notify dashboard
      window.dispatchEvent(new CustomEvent('primepipfx_signal_created', { detail: newSignal }));
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to save signal');
    }
  };

  // Direct 1-Click Close at Take Profit Target (TP1)
  const handleDirectCloseAtTP = async (signal: SignalItem) => {
    const isJpy = signal.pair.includes('JPY');
    const pipMultiplier = isJpy ? 100 : 10000;
    const diff = (signal.takeProfit1 - signal.entryPrice) * (signal.direction === 'BUY' ? 1 : -1);
    const resultPips = Math.round(diff * pipMultiplier);
    const resultPercent = 2.0;

    const updated = await updateSignalStatusServer(signal.id, 'TP_HIT', {
      closedPrice: signal.takeProfit1,
      resultPips,
      resultPercent,
      closeReason: 'TP_HIT',
      notes: `🎯 Take Profit Target (${signal.takeProfit1}) Reached! Setup closed in profit.`,
    });

    if (updated) {
      setActiveSignals((prev) => prev.filter((s) => s.id !== signal.id));
      setClosedSignals((prev) => [updated, ...prev.filter((s) => s.id !== updated.id)]);
      window.dispatchEvent(new CustomEvent('primepipfx_signal_closed', { detail: updated }));

      // Broadcast announcement
      try {
        const autoAnn = await postAnnouncementServer({
          title: `🎯 TARGET REACHED: ${signal.pair} TP HIT!`,
          message: `${signal.pair} ${signal.direction} [${signal.timeframe || 'H1'}] hit Take Profit at ${signal.takeProfit1} (+${resultPips} pips). Congratulations traders!`,
          category: 'SIGNAL_ALERT',
          signalId: signal.id,
          sender: currentUser?.displayName || currentUser?.email || 'Owner / Chief Institutional Analyst',
        });
        setAnnouncements((prev) => [autoAnn, ...prev]);
        window.dispatchEvent(new CustomEvent('primepipfx_announcement_created', { detail: autoAnn }));
      } catch {}
    }
  };

  // Open modal to close signal with status
  const handleOpenCloseModal = (signal: SignalItem, statusChoice: 'TP_HIT' | 'SL_HIT' | 'BREAK_EVEN' | 'DEACTIVATE_LEVEL') => {
    setSelectedSignalToClose(signal);
    setCloseStatusChoice(statusChoice);
    setClosePriceInput(
      statusChoice === 'TP_HIT'
        ? String(signal.takeProfit1)
        : statusChoice === 'SL_HIT'
        ? String(signal.stopLoss)
        : String(signal.entryPrice)
    );
    setCloseNotesInput(
      statusChoice === 'TP_HIT'
        ? `🎯 Take Profit Target (${signal.takeProfit1}) Reached! Setup closed in profit.`
        : statusChoice === 'SL_HIT'
        ? `🛑 Stop Loss (${signal.stopLoss}) Triggered. Risk strictly controlled.`
        : statusChoice === 'DEACTIVATE_LEVEL'
        ? `⚠️ Deactivate Level: Setup deactivated and invalidated before execution.`
        : 'Closed at break-even entry level.'
    );
    setIsCloseSignalModalOpen(true);
  };

  // Execute signal close
  const handleExecuteCloseSignal = async () => {
    if (!selectedSignalToClose) return;

    const closedPrice = parseFloat(closePriceInput) || selectedSignalToClose.entryPrice;
    const isGold = selectedSignalToClose.pair.includes('XAU') || selectedSignalToClose.pair.includes('GOLD');
    const isJpy = selectedSignalToClose.pair.includes('JPY');
    const pipMultiplier = isGold ? 10 : isJpy ? 100 : 10000;
    const diff = (closedPrice - selectedSignalToClose.entryPrice) * (selectedSignalToClose.direction === 'BUY' ? 1 : -1);
    const resultPips = closeStatusChoice === 'DEACTIVATE_LEVEL' ? 0 : Math.round(diff * pipMultiplier);
    const resultPercent =
      closeStatusChoice === 'TP_HIT' ? 2.0 : closeStatusChoice === 'SL_HIT' ? -1.0 : 0.0;

    const updated = await updateSignalStatusServer(selectedSignalToClose.id, closeStatusChoice, {
      closedPrice,
      resultPips,
      resultPercent,
      closeReason: closeStatusChoice,
      notes: closeNotesInput,
    });

    if (updated) {
      setActiveSignals((prev) => prev.filter((s) => s.id !== selectedSignalToClose.id));
      setClosedSignals((prev) => [updated, ...prev.filter((s) => s.id !== updated.id)]);
      window.dispatchEvent(new CustomEvent('primepipfx_signal_closed', { detail: updated }));

      // Broadcast announcement
      try {
        const isWin = closeStatusChoice === 'TP_HIT';
        const isDeactivated = closeStatusChoice === 'DEACTIVATE_LEVEL';
        const titleStr = isWin
          ? `🎯 TARGET REACHED: ${selectedSignalToClose.pair} TP HIT!`
          : isDeactivated
          ? `⚠️ LEVEL DEACTIVATED: ${selectedSignalToClose.pair}`
          : closeStatusChoice === 'SL_HIT'
          ? `🛑 STOP LOSS HIT: ${selectedSignalToClose.pair}`
          : `⚖️ BREAK-EVEN: ${selectedSignalToClose.pair}`;

        const autoAnn = await postAnnouncementServer({
          title: titleStr,
          message: isDeactivated
            ? `${selectedSignalToClose.pair} level deactivated / cancelled. Setup invalidated before execution.`
            : `${selectedSignalToClose.pair} ${selectedSignalToClose.direction} [${selectedSignalToClose.timeframe || 'H1'}] closed at ${closedPrice} (${resultPips > 0 ? '+' : ''}${resultPips} pips). Status: ${closeStatusChoice.replace('_', ' ')}.`,
          category: 'SIGNAL_ALERT',
          signalId: selectedSignalToClose.id,
          sender: currentUser?.displayName || currentUser?.email || 'Owner / Chief Institutional Analyst',
        });
        setAnnouncements((prev) => [autoAnn, ...prev]);
        window.dispatchEvent(new CustomEvent('primepipfx_announcement_created', { detail: autoAnn }));
      } catch {}
    }

    setIsCloseSignalModalOpen(false);
    setSelectedSignalToClose(null);
  };

  // Post Announcement Handler
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMessage.trim()) return;

    try {
      const newAnn = await postAnnouncementServer({
        title: announcementTitle.trim() || 'Institutional Announcement',
        message: announcementMessage.trim(),
        category: announcementCategory,
        sender: currentUser?.displayName || currentUser?.email || 'Prime Pip FX Owner',
      });

      setAnnouncements((prev) => [newAnn, ...prev]);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementSuccess('Announcement broadcasted to all students and dashboard successfully!');
      setTimeout(() => setAnnouncementSuccess(null), 4000);

      window.dispatchEvent(new CustomEvent('primepipfx_announcement_created', { detail: newAnn }));
    } catch (e: any) {
      alert(e?.message || 'Failed to post announcement');
    }
  };

  // Copy signal setup to clipboard
  const handleCopySignal = (signal: SignalItem) => {
    const text = `🎯 [PRIME PIP FX INSTITUTIONAL SETUP]
Pair: ${signal.pair}
Action: ${signal.direction}
Entry: ${signal.entryPrice}
Stop Loss: ${signal.stopLoss}
Target 1 (TP1): ${signal.takeProfit1}
${signal.takeProfit2 ? `Target 2 (TP2): ${signal.takeProfit2}\n` : ''}${signal.takeProfit3 ? `Target 3 (TP3): ${signal.takeProfit3}\n` : ''}Recommended Risk: ${signal.recommendedRiskPercent}%
Timeframe: ${signal.timeframe || 'Intraday'}
Strategy Notes: ${signal.strategyNotes || 'SBT Model Confirmation'}
Issued: ${signal.createdAt}`;

    navigator.clipboard.writeText(text);
    setCopiedId(signal.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Share setup via Web Share API or copy
  const handleShareSignal = async (signal: SignalItem) => {
    const text = `🎯 PRIME PIP FX VIP SETUP: ${signal.pair} ${signal.direction} @ ${signal.entryPrice} | SL: ${signal.stopLoss} | TP: ${signal.takeProfit1} | Risk: ${signal.recommendedRiskPercent}%`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Prime Pip FX Signal - ${signal.pair} ${signal.direction}`,
          text,
        });
        return;
      } catch {}
    }
    handleCopySignal(signal);
  };

  // Download individual setup PDF
  const handleDownloadSetup = (signal: SignalItem) => {
    const doc = new jsPDF();
    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, 210, 297, 'F');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(56, 189, 248);
    doc.text('PRIME PIP FX', 20, 25);

    doc.setFontSize(12);
    doc.setTextColor(148, 163, 184);
    doc.text('INSTITUTIONAL SIGNAL SETUP DISPATCH', 20, 33);
    doc.text(`Pakistan Standard Time: ${signal.createdAt}`, 20, 40);

    doc.setDrawColor(56, 189, 248);
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);

    // Box details
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(20, 52, 170, 110, 4, 4, 'F');

    doc.setFontSize(16);
    doc.setTextColor(248, 250, 252);
    doc.text(`${signal.pair} — ${signal.direction}`, 30, 68);

    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184);
    doc.text('Timeframe:', 30, 80);
    doc.setTextColor(255, 255, 255);
    doc.text(`${signal.timeframe || 'M15 / H1'}`, 80, 80);

    doc.setTextColor(148, 163, 184);
    doc.text('Entry Price:', 30, 92);
    doc.setTextColor(56, 189, 248);
    doc.text(`${signal.entryPrice}`, 80, 92);

    doc.setTextColor(148, 163, 184);
    doc.text('Stop Loss (SL):', 30, 104);
    doc.setTextColor(244, 63, 94);
    doc.text(`${signal.stopLoss}`, 80, 104);

    doc.setTextColor(148, 163, 184);
    doc.text('Take Profit (TP1):', 30, 116);
    doc.setTextColor(16, 185, 129);
    doc.text(`${signal.takeProfit1}`, 80, 116);

    if (signal.takeProfit2) {
      doc.setTextColor(148, 163, 184);
      doc.text('Take Profit (TP2):', 30, 128);
      doc.setTextColor(16, 185, 129);
      doc.text(`${signal.takeProfit2}`, 80, 128);
    }

    doc.setTextColor(148, 163, 184);
    doc.text('Max Risk Allowed:', 30, 140);
    doc.setTextColor(245, 158, 11);
    doc.text(`${signal.recommendedRiskPercent}% of Account Equity`, 80, 140);

    doc.setTextColor(148, 163, 184);
    doc.text('Strategy Thesis:', 30, 152);
    doc.setTextColor(203, 213, 225);
    doc.text(`${signal.strategyNotes || 'SBT Structure Model Execution'}`, 80, 152);

    // Disclaimer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DISCLAIMER: Educational institutional setup. Financial trading involves high risk.', 20, 280);

    doc.save(`PrimePipFX_Signal_${signal.pair.replace('/', '_')}_${Date.now()}.pdf`);
  };

  // Download comprehensive reports PDF
  const handleDownloadFullReport = () => {
    const doc = new jsPDF();
    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(56, 189, 248);
    doc.text('PRIME PIP FX', 20, 22);

    doc.setFontSize(12);
    doc.setTextColor(148, 163, 184);
    doc.text('PREMIUM SIGNALS AUDIT & OUTCOME REPORT', 20, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()} (Asia/Karachi PKT)`, 20, 36);

    doc.setDrawColor(56, 189, 248);
    doc.line(20, 40, 190, 40);

    // Summary Box
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(20, 45, 170, 32, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`TOTAL SIGNALS: ${allTrackedSignals.length}`, 30, 55);
    doc.text(`TP HIT (WINS): ${reportStats.tpHit}`, 30, 63);
    doc.text(`SL HIT (LOSSES): ${reportStats.slHit}`, 90, 55);
    doc.text(`BREAK-EVEN: ${reportStats.breakEven}`, 90, 63);
    doc.setTextColor(56, 189, 248);
    doc.text(`WIN RATE: ${reportStats.winRate}%`, 145, 55);
    doc.setTextColor(16, 185, 129);
    doc.text(`ACTIVE: ${activeSignals.length}`, 145, 63);

    // Ledger
    let y = 88;
    doc.setFontSize(10);
    doc.setTextColor(248, 250, 252);
    doc.text('SIGNAL OUTCOME AUDIT LEDGER (CHRONOLOGICAL PKT)', 20, 82);

    allTrackedSignals.slice(0, 15).forEach((sig, idx) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
      const outcome = sig.status === 'ACTIVE' ? 'ACTIVE' : sig.closeReason || sig.status;
      const isWin = outcome === 'TP_HIT';
      const isLoss = outcome === 'SL_HIT';
      
      doc.setFillColor(idx % 2 === 0 ? 15 : 20, 23, 42);
      doc.rect(20, y - 5, 170, 11, 'F');

      doc.setFontSize(9);
      doc.setTextColor(226, 232, 240);
      doc.text(`${sig.pair} (${sig.direction})`, 24, y + 2);
      doc.text(`Entry: ${sig.entryPrice}`, 65, y + 2);
      doc.text(`SL: ${sig.stopLoss} | TP: ${sig.takeProfit1}`, 95, y + 2);

      if (isWin) doc.setTextColor(16, 185, 129);
      else if (isLoss) doc.setTextColor(244, 63, 94);
      else doc.setTextColor(245, 158, 11);

      doc.text(`${outcome}`, 145, y + 2);
      doc.setTextColor(148, 163, 184);
      doc.text(`${sig.createdAt.split(' ')[0]}`, 170, y + 2);
      y += 12;
    });

    // Disclaimer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'DISCLAIMER: Premium signals are educational setups based on institutional structure analysis. Trading carries risk of capital loss.',
      20,
      285
    );

    doc.save(`PrimePipFX_Signals_Report_${Date.now()}.pdf`);
  };

  // Combine and sort all tracked signals with latest at top based on createdAt / updatedAt
  const allTrackedSignals = useMemo(() => {
    const combined = [...activeSignals, ...closedSignals];
    return combined.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
  }, [activeSignals, closedSignals]);

  // Filtered signals for reports
  const filteredReportSignals = useMemo(() => {
    if (reportsFilter === 'ALL') return allTrackedSignals;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    return allTrackedSignals.filter((sig) => {
      if (reportsFilter === 'DAILY') {
        return (sig.createdAt || '').includes(todayStr) || (sig.closedAt || '').includes(todayStr);
      }
      return true; // Weekly or other
    });
  }, [allTrackedSignals, reportsFilter]);

  // Statistics for reports
  const reportStats = useMemo(() => {
    const closed = closedSignals;
    const tpHit = closed.filter((s) => s.status === 'TP_HIT' || s.closeReason === 'TP_HIT').length;
    const slHit = closed.filter((s) => s.status === 'SL_HIT' || s.closeReason === 'SL_HIT').length;
    const breakEven = closed.filter((s) => s.status === 'BREAK_EVEN' || s.closeReason === 'BREAK_EVEN').length;
    const decided = tpHit + slHit;
    const winRate = decided > 0 ? Math.round((tpHit / decided) * 100) : 0;
    const totalPips = closed.reduce((acc, s) => acc + (s.resultPips || 0), 0);
    return { total: allTrackedSignals.length, tpHit, slHit, breakEven, winRate, totalPips };
  }, [allTrackedSignals, closedSignals]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0B0F19] border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Radio className="w-6 h-6 stroke-[2.2] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-military font-bold tracking-wider text-slate-100 uppercase">
                  PREMIUM SIGNALS HUB
                </h1>
                {/* User explicitly requested: Remove 'Soon' and show 'LIVE' badge */}
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-mono-code font-bold text-emerald-400 shadow-sm shadow-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE</span>
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-[10px] font-mono-code font-bold text-cyan-400">
                    ADMIN COMMAND
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Institutional Dispatches • Real-Time Order Flow Setups • Asia/Karachi (PKT UTC+5)
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCreateSignalModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-military font-bold text-xs tracking-wider transition shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>CREATE SIGNAL</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadFullReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-mono-code font-bold transition cursor-pointer"
              title="Download Full Performance & Outcome Audit Report (PDF)"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>DOWNLOAD REPORTS</span>
            </button>
          </div>
        </div>

        {/* 3-Section Navigation Bar: Live Signals, Dedicated Reports (Replaces Running Log), Announcements */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80 overflow-x-auto text-xs font-military font-bold tracking-wider">
          <button
            type="button"
            onClick={() => setActiveSubTab('LIVE_SIGNALS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer shrink-0 ${
              activeSubTab === 'LIVE_SIGNALS'
                ? 'bg-blue-500 text-slate-950 font-bold shadow-md shadow-blue-500/20'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>ACTIVE SIGNALS ({activeSignals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('REPORTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer shrink-0 ${
              activeSubTab === 'REPORTS'
                ? 'bg-blue-500 text-slate-950 font-bold shadow-md shadow-blue-500/20'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>REPORTS & OUTCOMES ({closedSignals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('OWNER_ANNOUNCEMENTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer shrink-0 ${
              activeSubTab === 'OWNER_ANNOUNCEMENTS'
                ? 'bg-blue-500 text-slate-950 font-bold shadow-md shadow-blue-500/20'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>ANNOUNCEMENTS ({announcements.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: ACTIVE SIGNALS                                        */}
      {/* ============================================================ */}
      {activeSubTab === 'LIVE_SIGNALS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-military font-bold tracking-wider text-slate-200 uppercase">
                ACTIVE INSTITUTIONAL SIGNALS ({activeSignals.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono-code text-slate-400">
              Only Admin Creates & Closes • Real-Time Student Feed
            </span>
          </div>

          {activeSignals.length === 0 ? (
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
                <Radio className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-military font-bold text-slate-300 tracking-wider">
                NO ACTIVE SIGNALS AT THIS MOMENT
              </h3>
              <p className="text-xs text-slate-400 font-mono-code max-w-md mx-auto">
                All previously issued mock setups have been cleared. When the administrator dispatches a new trade setup, it will immediately drop down here and appear on the main dashboard for all students in real time.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsCreateSignalModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold transition shadow cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>DISPATCH FIRST SIGNAL</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeSignals.map((signal) => {
                const isBuy = signal.direction === 'BUY';
                return (
                  <div
                    key={signal.id}
                    className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition relative overflow-hidden"
                  >
                    {/* Top Glow Stripe */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        isBuy ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'
                      }`}
                    />

                    <div className="space-y-4">
                      {/* Pair, Direction, Timeframe & Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-military font-bold text-slate-100 tracking-wider">
                            {signal.pair}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-military font-bold uppercase tracking-wider ${
                              isBuy
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {signal.direction}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-sm">
                            <Clock className="w-2.5 h-2.5" />
                            {signal.timeframe || 'H1'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono-code text-slate-400 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {signal.createdAt}
                        </span>
                      </div>

                      {/* Uploaded Chart / Analysis Attachment */}
                      {signal.imageUrl && (
                        <div
                          onClick={() =>
                            setPreviewLightboxImage({
                              url: signal.imageUrl!,
                              name: signal.imageName || `${signal.pair} Setup Analysis`,
                              isPdf:
                                signal.imageMimeType === 'application/pdf' ||
                                signal.imageUrl!.startsWith('data:application/pdf'),
                            })
                          }
                          className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 hover:border-cyan-500/50 transition cursor-pointer group relative"
                        >
                          {signal.imageMimeType === 'application/pdf' ||
                          signal.imageUrl.startsWith('data:application/pdf') ? (
                            <div className="p-3 flex items-center justify-between bg-rose-500/10 border border-rose-500/20 text-rose-300">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">
                                    {signal.imageName || 'Signal Chart Analysis (PDF)'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">Click to view document</div>
                                </div>
                              </div>
                              <Eye className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition" />
                            </div>
                          ) : (
                            <div className="relative aspect-video max-h-44 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                              <img
                                src={signal.imageUrl}
                                alt={signal.imageName || 'Trade Setup Chart'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-mono-code text-cyan-300 flex items-center gap-1 font-bold">
                                  <Maximize2 className="w-3 h-3" /> Click to expand HD chart setup
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-300 font-mono-code border border-slate-700">
                                  HD ATTACHMENT
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Key Price Levels 3-Box */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
                          <span className="text-[9px] font-mono-code text-slate-400 block uppercase">ENTRY</span>
                          <span className="text-xs font-mono-code font-bold text-cyan-400">
                            {signal.entryPrice}
                          </span>
                        </div>
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
                          <span className="text-[9px] font-mono-code text-slate-400 block uppercase">STOP LOSS</span>
                          <span className="text-xs font-mono-code font-bold text-rose-400">
                            {signal.stopLoss}
                          </span>
                        </div>
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
                          <span className="text-[9px] font-mono-code text-slate-400 block uppercase">TAKE PROFIT</span>
                          <span className="text-xs font-mono-code font-bold text-emerald-400">
                            {signal.takeProfit1}
                          </span>
                        </div>
                      </div>

                      {/* Optional TP2 / TP3 */}
                      {(signal.takeProfit2 || signal.takeProfit3) && (
                        <div className="flex items-center justify-between text-[11px] font-mono-code bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/60">
                          {signal.takeProfit2 && (
                            <span className="text-slate-400">
                              TP2: <strong className="text-emerald-400">{signal.takeProfit2}</strong>
                            </span>
                          )}
                          {signal.takeProfit3 && (
                            <span className="text-slate-400">
                              TP3: <strong className="text-emerald-400">{signal.takeProfit3}</strong>
                            </span>
                          )}
                          <span className="text-slate-400">
                            Risk: <strong className="text-amber-400">{signal.recommendedRiskPercent}%</strong>
                          </span>
                        </div>
                      )}

                      {/* Strategy Comments / Notes */}
                      {signal.strategyNotes && (
                        <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 text-xs font-mono-code text-slate-300">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">NOTES</span>
                          <p className="line-clamp-3">{signal.strategyNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2.5">
                      {/* Copy, Download, Share Setup */}
                      <div className="flex items-center gap-1.5 justify-between">
                        <button
                          type="button"
                          onClick={() => handleCopySignal(signal)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono-code border border-slate-800 transition cursor-pointer"
                          title="Copy setup to clipboard"
                        >
                          {copiedId === signal.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-cyan-400" />
                              <span>COPY SETUP</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadSetup(signal)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono-code border border-slate-800 transition cursor-pointer"
                          title="Download Setup PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>DOWNLOAD</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareSignal(signal)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                          title="Share Setup"
                        >
                          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                      </div>

                      {/* Trade Execution Action for Students & Admin */}
                      {onSelectSignalForTrade && (
                        <button
                          type="button"
                          onClick={() => onSelectSignalForTrade(signal)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider transition shadow shadow-blue-500/20 cursor-pointer active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>LOAD INTO TRADE JOURNAL</span>
                        </button>
                      )}

                      {/* Admin-Only Status Closure Controls */}
                      {isAdmin && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono-code uppercase font-bold text-slate-400 block">
                              ADMIN SIGNAL CLOSURE CONTROLS
                            </span>
                            <span className="text-[9px] font-mono-code text-emerald-400 font-bold">
                              TP1: {signal.takeProfit1}
                            </span>
                          </div>

                          {/* Direct 1-Click Take Profit Target Reached */}
                          <button
                            type="button"
                            onClick={() => handleDirectCloseAtTP(signal)}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-military font-bold text-xs tracking-wider transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                            title="Instantly close signal at TP1 and broadcast announcement"
                          >
                            <Target className="w-3.5 h-3.5 fill-current" />
                            <span>🎯 TARGET REACHED: CLOSE AT TP1</span>
                          </button>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCloseModal(signal, 'TP_HIT')}
                              className="px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 font-military font-bold text-[10px] tracking-wider transition cursor-pointer text-center"
                              title="Custom TP Close (TP2, TP3, or custom price)"
                            >
                              CUSTOM TP
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenCloseModal(signal, 'SL_HIT')}
                              className="px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 font-military font-bold text-[10px] tracking-wider transition cursor-pointer text-center"
                              title="Close signal with SL Hit / Closed"
                            >
                              SL HIT
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenCloseModal(signal, 'BREAK_EVEN')}
                              className="px-2 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-cyan-400 font-military font-bold text-[10px] tracking-wider transition cursor-pointer text-center"
                              title="Close signal at Break-Even"
                            >
                              BREAKEVEN
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenCloseModal(signal, 'DEACTIVATE_LEVEL')}
                              className="px-2 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-amber-500/40 text-amber-300 font-military font-bold text-[10px] tracking-wider transition cursor-pointer text-center"
                              title="Deactivate Level: Mark level invalidated before execution"
                            >
                              DEACTIVATE
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: DEDICATED REPORTS SECTION (Replaces Running Log)       */}
      {/* ============================================================ */}
      {activeSubTab === 'REPORTS' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">TOTAL SIGNALS</span>
              <span className="text-xl font-military font-bold text-slate-100">{reportStats.total}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">TP HIT (WINS)</span>
              <span className="text-xl font-military font-bold text-emerald-400">{reportStats.tpHit}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">SL HIT (LOSSES)</span>
              <span className="text-xl font-military font-bold text-rose-400">{reportStats.slHit}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">BREAK-EVEN</span>
              <span className="text-xl font-military font-bold text-cyan-400">{reportStats.breakEven}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">WIN RATE</span>
              <span className="text-xl font-military font-bold text-cyan-400">{reportStats.winRate}%</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">PIPS GAINED</span>
              <span className="text-xl font-military font-bold text-emerald-400">
                {reportStats.totalPips >= 0 ? `+${reportStats.totalPips}` : reportStats.totalPips}
              </span>
            </div>
          </div>

          {/* Filter Bar & Download Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-mono-code">
              <span className="text-slate-400 font-bold uppercase mr-1">Timeframe Filter:</span>
              {(['ALL', 'DAILY', 'WEEKLY'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setReportsFilter(filter)}
                  className={`px-3 py-1 rounded-lg border transition cursor-pointer ${
                    reportsFilter === filter
                      ? 'bg-blue-500 text-slate-950 border-cyan-400 font-bold shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleDownloadFullReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD PDF REPORT</span>
            </button>
          </div>

          {/* Chronological Table (Latest at top based on Pakistan Standard Time) */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-code">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                    <th className="py-3 px-4">SIGNAL / PAIR</th>
                    <th className="py-3 px-4">DIRECTION</th>
                    <th className="py-3 px-4">ENTRY LEVEL</th>
                    <th className="py-3 px-4">STOP LOSS</th>
                    <th className="py-3 px-4">TAKE PROFIT</th>
                    <th className="py-3 px-4">STATUS / OUTCOME</th>
                    <th className="py-3 px-4">RESULT</th>
                    <th className="py-3 px-4 text-right">DATE / PKT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredReportSignals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No signal records tracked yet for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredReportSignals.map((signal) => {
                      const isWin = signal.status === 'TP_HIT' || signal.closeReason === 'TP_HIT';
                      const isLoss = signal.status === 'SL_HIT' || signal.closeReason === 'SL_HIT';
                      const isBe = signal.status === 'BREAK_EVEN' || signal.closeReason === 'BREAK_EVEN';
                      const isActive = signal.status === 'ACTIVE';

                      return (
                        <tr key={signal.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-bold text-slate-200">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{signal.pair}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                {signal.timeframe || 'H1'}
                              </span>
                              {signal.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewLightboxImage({
                                      url: signal.imageUrl!,
                                      name: signal.imageName || `${signal.pair} Setup Chart`,
                                      isPdf:
                                        signal.imageMimeType === 'application/pdf' ||
                                        signal.imageUrl!.startsWith('data:application/pdf'),
                                    })
                                  }
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition cursor-pointer inline-flex items-center gap-0.5"
                                  title="View Setup Chart / Attachment"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span className="text-[9px]">Chart</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-military font-bold uppercase ${
                                signal.direction === 'BUY'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {signal.direction}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-cyan-400 font-bold">{signal.entryPrice}</td>
                          <td className="py-3 px-4 text-rose-400">{signal.stopLoss}</td>
                          <td className="py-3 px-4 text-emerald-400">{signal.takeProfit1}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase ${
                                isActive
                                  ? 'bg-blue-500/20 text-cyan-400 animate-pulse'
                                  : isWin
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isLoss
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-amber-500/20 text-cyan-400'
                              }`}
                            >
                              {isActive ? 'ACTIVE NOW' : isWin ? 'TP HIT' : isLoss ? 'SL HIT' : 'BREAK-EVEN'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold">
                            {isActive ? (
                              <span className="text-slate-500">RUNNING</span>
                            ) : isWin ? (
                              <span className="text-emerald-400">+{signal.resultPips || 150} pips (+2%)</span>
                            ) : isLoss ? (
                              <span className="text-rose-400">-{Math.abs(signal.resultPips || 80)} pips (-1%)</span>
                            ) : (
                              <span className="text-cyan-400">0.0 pips (BE)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                            {signal.closedAt || signal.createdAt}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Institutional Disclaimer */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs font-mono-code text-slate-400">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 uppercase block mb-1">
                INSTITUTIONAL PERFORMANCE DISCLAIMER
              </strong>
              <p>
                All signals, trade logs, and statistical outcome metrics are provided strictly for educational purposes based on institutional market structure models. Trading forex, indices, commodities, and CFDs involves substantial risk of loss and is not appropriate for all traders. Past performance is no guarantee of future returns. Always calculate position size strictly according to your defined risk tolerance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 3: IN-APP ANNOUNCEMENTS                                  */}
      {/* ============================================================ */}
      {activeSubTab === 'OWNER_ANNOUNCEMENTS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-military font-bold tracking-wider text-slate-200 uppercase">
                OFFICIAL ANNOUNCEMENTS FEED
              </h2>
            </div>
            <span className="text-[11px] font-mono-code text-slate-400">
              Synced to Main Dashboard & Push Notifications
            </span>
          </div>

          {/* Admin Announcement Composer */}
          {isAdmin && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-military font-bold text-cyan-400 tracking-wider flex items-center gap-2">
                <Send className="w-3.5 h-3.5" />
                BROADCAST NEW ANNOUNCEMENT (OWNER)
              </h3>

              {announcementSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono-code flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{announcementSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePostAnnouncement} className="space-y-3 text-xs font-mono-code">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-slate-400 block mb-1">Announcement Title / Headline</label>
                    <input
                      type="text"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      placeholder="e.g. 📢 Gold (XAU/USD) Critical Target Update"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Announcement Category</label>
                    <select
                      value={announcementCategory}
                      onChange={(e) => setAnnouncementCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-cyan-400"
                    >
                      <option value="SIGNAL_ALERT">Signal Alert</option>
                      <option value="MARKET_UPDATE">Market Update</option>
                      <option value="IMPORTANT_ANNOUNCEMENT">Important Notice</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Message Body</label>
                  <textarea
                    rows={3}
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Type institutional update, key risk instructions, or session breakdown..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider transition shadow shadow-blue-500/20 cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5 fill-current" />
                    <span>BROADCAST TO STUDENTS & DASHBOARD</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Announcements List */}
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-mono-code">
                No official announcements posted yet. Messages from the administrator will appear here.
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-blue-500/15 text-cyan-400 border border-blue-500/30">
                        <Bell className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider">
                        {ann.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase bg-slate-800 text-slate-300">
                        {ann.category.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-code text-slate-400">{ann.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono-code leading-relaxed pl-8">
                    {ann.message}
                  </p>
                  <div className="pl-8 pt-1 text-[10px] font-mono-code text-slate-500">
                    Dispatched by: <strong className="text-slate-400">{ann.sender}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE SIGNAL (Admin Only)                            */}
      {/* ============================================================ */}
      {isCreateSignalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h3 className="text-base font-military font-bold tracking-wider uppercase">
                  DISPATCH NEW PREMIUM SIGNAL
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSignalModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono-code flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSignal} className="space-y-4 text-xs font-mono-code">
              {/* Field 1: Currency Pair Name & Buy/Sell Option placed right next to it */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Currency Pair Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pairInput}
                    onChange={(e) => setPairInput(e.target.value)}
                    placeholder="e.g. XAU/USD, EUR/USD, GBP/JPY"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-bold outline-none focus:border-cyan-400 uppercase"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Enter any Forex, Metals, Indices or Crypto pair
                  </span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Trade Direction (BUY / SELL) <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirectionInput('BUY')}
                      className={`py-2 rounded-xl font-military font-bold text-xs tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        directionInput === 'BUY'
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>BUY (LONG)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectionInput('SELL')}
                      className={`py-2 rounded-xl font-military font-bold text-xs tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        directionInput === 'SELL'
                          ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>SELL (SHORT)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Field 2: Timeframe Selection (Weekly, Daily, H4, H1, M30, M15, M5, M3, M1) */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Signal Timeframe <span className="text-rose-400">*</span></span>
                  </label>
                  <span className="text-[11px] font-mono-code font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                    Selected: {timeframeInput}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                  {SIGNAL_TIMEFRAMES.map((tf) => {
                    const isSelected = timeframeInput === tf;
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTimeframeInput(tf)}
                        className={`py-1.5 px-1.5 rounded-lg text-[11px] font-mono-code font-bold tracking-wider transition cursor-pointer text-center ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30 border border-cyan-400 scale-[1.03]'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {tf}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Entry Price <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={entryPriceInput}
                    onChange={(e) => setEntryPriceInput(e.target.value)}
                    placeholder="e.g. 2918.50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 font-bold outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Stop-Loss (SL) Box <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={stopLossInput}
                    onChange={(e) => setStopLossInput(e.target.value)}
                    placeholder="e.g. 2908.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-rose-400 font-bold outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Field 4: Take-Profit (TP) Box (TP1 required, TP2/TP3 optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Take-Profit (TP1) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={takeProfit1Input}
                    onChange={(e) => setTakeProfit1Input(e.target.value)}
                    placeholder="e.g. 2932.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Take-Profit 2 (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit2Input}
                    onChange={(e) => setTakeProfit2Input(e.target.value)}
                    placeholder="e.g. 2945.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Risk Allocation (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={riskPercentInput}
                    onChange={(e) => setRiskPercentInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 font-bold outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Field 5: Optional Comments / Notes Box */}
              <div>
                <label className="text-slate-400 block mb-1">
                  Optional Comments / Strategy Rationale
                </label>
                <textarea
                  rows={2}
                  value={strategyNotesInput}
                  onChange={(e) => setStrategyNotesInput(e.target.value)}
                  placeholder="e.g. SBT Model 4: Asian range liquidity sweep into bullish fair value gap (FVG). Target London session high."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>

              {/* Field 6: Image / Chart Setup Upload (PNG, JPG, WEBP, PDF) */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Attach Setup Chart / Analysis (PNG, JPG, PDF)</span>
                  </label>
                  {signalImagePreview && (
                    <span className="text-[10px] text-emerald-400 font-mono-code flex items-center gap-1 font-bold">
                      <Check className="w-3 h-3" /> Attached ({signalImageSize || 'Ready'})
                    </span>
                  )}
                </div>

                {signalImagePreview ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {signalImageMime === 'application/pdf' ? (
                          <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-cyan-400 shrink-0" />
                        )}
                        <span className="text-xs text-slate-200 font-bold truncate max-w-[260px]">
                          {signalImageName || 'Setup Document'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSignalImageFile(null);
                          setSignalImagePreview(null);
                          setSignalImageName('');
                          setSignalImageMime('');
                          setSignalImageSize('');
                        }}
                        className="px-2 py-1 rounded-lg hover:bg-rose-500/20 text-rose-400 text-xs transition cursor-pointer flex items-center gap-1 border border-rose-500/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>

                    {signalImageMime === 'application/pdf' ? (
                      <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                        <span>PDF Document attached: will be clearly visible alongside signal details</span>
                        <span className="text-[10px] font-mono-code text-slate-400">{signalImageSize}</span>
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden max-h-48 border border-slate-800 bg-slate-950 flex items-center justify-center">
                        <img
                          src={signalImagePreview}
                          alt="Setup Chart Preview"
                          className="max-h-48 w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl bg-slate-950/70 hover:bg-slate-900 transition cursor-pointer text-center">
                    <Upload className="w-6 h-6 text-slate-500 mb-1" />
                    <span className="text-xs text-slate-200 font-bold">
                      Click to upload or drag & drop setup screenshot or PDF
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Supports PNG, JPG, WEBP, and PDF files. Preview is visible here before activating.
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageSelect(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Save & Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateSignalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-military font-bold text-xs tracking-wider transition shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95"
                >
                  SAVE & ACTIVATE SIGNAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CLOSE SIGNAL / UPDATE STATUS (Admin Only)              */}
      {/* ============================================================ */}
      {isCloseSignalModalOpen && selectedSignalToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-military font-bold tracking-wider uppercase text-slate-200">
                UPDATE STATUS / CLOSE SIGNAL
              </h3>
              <button
                type="button"
                onClick={() => setIsCloseSignalModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-code space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Pair & Direction:</span>
                <strong className="text-slate-200">{selectedSignalToClose.pair} ({selectedSignalToClose.direction})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entry Level:</span>
                <span className="text-cyan-400">{selectedSignalToClose.entryPrice}</span>
              </div>
            </div>

            {/* Quick Target Level Fill Buttons */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono-code text-slate-400 block font-bold">
                Quick Select Price Level
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCloseStatusChoice('TP_HIT');
                    setClosePriceInput(String(selectedSignalToClose.takeProfit1));
                    setCloseNotesInput(`🎯 TP1 Target (${selectedSignalToClose.takeProfit1}) secured.`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-mono-code font-bold transition cursor-pointer"
                >
                  TP1 ({selectedSignalToClose.takeProfit1})
                </button>
                {selectedSignalToClose.takeProfit2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCloseStatusChoice('TP_HIT');
                      setClosePriceInput(String(selectedSignalToClose.takeProfit2));
                      setCloseNotesInput(`🎯 TP2 Extended Target (${selectedSignalToClose.takeProfit2}) secured.`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-mono-code font-bold transition cursor-pointer"
                  >
                    TP2 ({selectedSignalToClose.takeProfit2})
                  </button>
                )}
                {selectedSignalToClose.takeProfit3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCloseStatusChoice('TP_HIT');
                      setClosePriceInput(String(selectedSignalToClose.takeProfit3));
                      setCloseNotesInput(`🎯 TP3 Maximum Target (${selectedSignalToClose.takeProfit3}) secured.`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-mono-code font-bold transition cursor-pointer"
                  >
                    TP3 ({selectedSignalToClose.takeProfit3})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCloseStatusChoice('SL_HIT');
                    setClosePriceInput(String(selectedSignalToClose.stopLoss));
                    setCloseNotesInput(`🛑 Stop loss (${selectedSignalToClose.stopLoss}) hit.`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 text-xs font-mono-code font-bold transition cursor-pointer"
                >
                  SL ({selectedSignalToClose.stopLoss})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCloseStatusChoice('BREAK_EVEN');
                    setClosePriceInput(String(selectedSignalToClose.entryPrice));
                    setCloseNotesInput(`⚖️ Closed at break-even entry (${selectedSignalToClose.entryPrice}).`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-cyan-400 text-xs font-mono-code font-bold transition cursor-pointer"
                >
                  Entry BE ({selectedSignalToClose.entryPrice})
                </button>
              </div>
            </div>

            {/* Status Options */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono-code text-slate-400 block font-bold">Select Outcome Classification</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCloseStatusChoice('TP_HIT');
                    setClosePriceInput(String(selectedSignalToClose.takeProfit1));
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer text-center ${
                    closeStatusChoice === 'TP_HIT'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900 border border-slate-800 text-emerald-400 hover:border-emerald-500/40'
                  }`}
                >
                  CUSTOM TP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCloseStatusChoice('SL_HIT');
                    setClosePriceInput(String(selectedSignalToClose.stopLoss));
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer text-center ${
                    closeStatusChoice === 'SL_HIT'
                      ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                      : 'bg-slate-900 border border-slate-800 text-rose-400 hover:border-rose-500/40'
                  }`}
                >
                  SL HIT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCloseStatusChoice('BREAK_EVEN');
                    setClosePriceInput(String(selectedSignalToClose.entryPrice));
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer text-center ${
                    closeStatusChoice === 'BREAK_EVEN'
                      ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                      : 'bg-slate-900 border border-slate-800 text-cyan-400 hover:border-blue-500/40'
                  }`}
                >
                  BREAKEVEN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCloseStatusChoice('DEACTIVATE_LEVEL');
                    setClosePriceInput(String(selectedSignalToClose.entryPrice));
                    setCloseNotesInput('⚠️ Deactivate Level: Setup invalidated and deactivated.');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer text-center ${
                    closeStatusChoice === 'DEACTIVATE_LEVEL'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 border border-slate-800 text-amber-400 hover:border-amber-500/40'
                  }`}
                >
                  DEACTIVATE LEVEL
                </button>
              </div>
            </div>

            {/* Exit Price & Live Projected Outcome */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-mono-code text-slate-400 block mb-1">Exit / Closed Price</label>
                <input
                  type="number"
                  step="any"
                  value={closePriceInput}
                  onChange={(e) => setClosePriceInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono-code text-xs outline-none focus:border-cyan-400"
                />
              </div>

              {/* Live Pip Calculation Preview */}
              {(() => {
                const exitVal = parseFloat(closePriceInput) || selectedSignalToClose.entryPrice;
                const isJpy = selectedSignalToClose.pair.includes('JPY');
                const mult = isJpy ? 100 : 10000;
                const diff = (exitVal - selectedSignalToClose.entryPrice) * (selectedSignalToClose.direction === 'BUY' ? 1 : -1);
                const calcPips = Math.round(diff * mult);
                return (
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono-code">
                    <span className="text-slate-400">Calculated Pips & Impact:</span>
                    <span className={`font-bold ${calcPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {calcPips > 0 ? `+${calcPips}` : calcPips} pips ({closeStatusChoice === 'TP_HIT' ? '+2.0% (Target Reached)' : closeStatusChoice === 'SL_HIT' ? '-1.0% (Contained)' : '0.0% (Parity)'})
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Comments */}
            <div>
              <label className="text-xs font-mono-code text-slate-400 block mb-1">Closing Comments</label>
              <input
                type="text"
                value={closeNotesInput}
                onChange={(e) => setCloseNotesInput(e.target.value)}
                placeholder="e.g. Full TP reached at London Open."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono-code text-xs outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCloseSignalModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono-code transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleExecuteCloseSignal}
                className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider transition shadow cursor-pointer active:scale-95"
              >
                CONFIRM & MOVE TO REPORTS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LIGHTBOX: EXPANDED HD CHART / PDF PREVIEW MODAL               */}
      {/* ============================================================ */}
      {previewLightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-5xl w-full p-4 sm:p-5 shadow-2xl space-y-3 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-5 h-5 text-cyan-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-military font-bold tracking-wider text-slate-100 truncate">
                  {previewLightboxImage.name || 'Trade Setup Analysis & Chart'}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewLightboxImage.url}
                  download={previewLightboxImage.name || 'signal-setup.png'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono-code border border-slate-800 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewLightboxImage(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-900/60 rounded-xl overflow-auto p-2 border border-slate-850">
              {previewLightboxImage.isPdf ? (
                <iframe
                  src={previewLightboxImage.url}
                  title="PDF Analysis Document"
                  className="w-full h-[72vh] rounded-lg border border-slate-800"
                />
              ) : (
                <img
                  src={previewLightboxImage.url}
                  alt={previewLightboxImage.name || 'Trade Setup Chart'}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
