import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Send,
  CheckCircle2,
  Shield,
  Brain,
  Sliders,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { apiSubmitFeedback } from '../../utils/evolutionClient';

interface HelpImproveModalProps {
  currentUser?: UserAccount;
  onClose: () => void;
}

export const HelpImproveModal: React.FC<HelpImproveModalProps> = ({
  currentUser,
  onClose,
}) => {
  const [category, setCategory] = useState<
    'NEW_FEATURE' | 'WORKFLOW_FRICTION' | 'PSYCHOLOGY_DRILL' | 'RISK_TOOL' | 'BUG_REPORT'
  >('NEW_FEATURE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [painLevel, setPainLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [requestedSolution, setRequestedSolution] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please provide a short title and description.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await apiSubmitFeedback({
        userId: currentUser?.id || 'trader_guest',
        category,
        title,
        description,
        painLevel,
        requestedSolution,
      });
      setSubmitted(true);
    } catch {
      setErrorMsg('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Body scroll lock while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-150">
      <div className="relative bg-[#0D121F] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-military tracking-wider text-slate-100 uppercase">
                Help PRIMEPIPFX Evolve
              </h2>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Feed your trading needs directly into the Autonomous Evolution Engine.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {submitted ? (
          <div className="p-8 text-center space-y-4 font-mono-code">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold font-military text-slate-100 uppercase tracking-wide">
              Insight Registered Into Cycle Pipeline!
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Your feedback has been converted into an autonomous candidate gap. The 5-Agent Consensus Panel will evaluate it during the next evolutionary sandbox cycle.
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold font-military text-xs uppercase tracking-wider transition shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono-code text-xs">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Category selection */}
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-2">
                What type of suggestion is this?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'NEW_FEATURE', label: 'New Feature', icon: Lightbulb },
                  { id: 'WORKFLOW_FRICTION', label: 'Workflow Friction', icon: Sliders },
                  { id: 'PSYCHOLOGY_DRILL', label: 'Mindset Drill', icon: Brain },
                  { id: 'RISK_TOOL', label: 'Risk Protection', icon: Shield },
                  { id: 'BUG_REPORT', label: 'UI Issue / Glitch', icon: AlertCircle },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id as any)}
                      className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                        category === item.id
                          ? 'bg-blue-500/10 border-blue-500 text-amber-300 font-bold'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-cyan-400" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Summary / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Audio countdown during 15-minute news blackout"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Detailed Problem or Workflow Experience
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe where you felt friction, hesitation, or what missing capability would elevate your trading execution..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none resize-none"
                required
              />
            </div>

            {/* Pain / Impact Level */}
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Severity / Impact on Discipline
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPainLevel(level)}
                    className={`py-1.5 px-2 rounded border text-center font-bold text-[10px] tracking-wider transition cursor-pointer ${
                      painLevel === level
                        ? level === 'CRITICAL'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : level === 'HIGH'
                          ? 'bg-blue-500/20 border-blue-500 text-amber-300'
                          : 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Requested Solution (Optional) */}
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                Ideal Solution (Optional)
              </label>
              <input
                type="text"
                value={requestedSolution}
                onChange={(e) => setRequestedSolution(e.target.value)}
                placeholder="How would you like the tool to behave?"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold font-military text-xs uppercase transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold font-military text-xs uppercase tracking-wider transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Transmitting...' : 'Submit to Engine'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
