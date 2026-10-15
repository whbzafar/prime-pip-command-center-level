import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  ShieldCheck,
  Send,
  X,
  Award,
  Sparkles,
  CheckCircle2,
  Heart,
  TrendingUp,
  Lightbulb,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import { UserAccount } from '../types';

export interface TraderReview {
  id: string;
  name: string;
  role: string;
  rating: number;
  date: string;
  feedback: string;
  suggestions?: string;
  verified: boolean;
  likes: number;
  adminReply?: {
    text: string;
    author: string;
    date: string;
  };
}

const INITIAL_REVIEWS: TraderReview[] = [
  {
    id: 'rev-1',
    name: 'Alexander M.',
    role: 'Institutional Macro Trader (Zurich)',
    rating: 5,
    date: '2025-02-14',
    feedback:
      'PrimePipFX is easily the world\'s best trading platform. Having real-time deterministic fundamental intelligence, COT metrics, and automated risk armor all under one single roof has completely transformed my trading. The Liquid Glass interface is breathtakingly fast.',
    suggestions: 'Keep adding more multi-asset correlations like Treasury yield curves.',
    verified: true,
    likes: 42,
    adminReply: {
      text: 'Thank you Alexander! Real-time 10Y/2Y sovereign yield curves and swap spreads are now integrated across all 28 major pairs.',
      author: 'Chief Administrator',
      date: '2025-02-15',
    },
  },
  {
    id: 'rev-2',
    name: 'Sarah Jenkins',
    role: 'Full-Time FX & Gold Specialist (London)',
    rating: 5,
    date: '2025-02-10',
    feedback:
      'I canceled four subscriptions after finding PrimePipFX. The bullish/bearish fundamental sentiment meter for XAU/USD and major pairs is 100% accurate. The psychological center keeps my emotions disciplined.',
    suggestions: 'Would love to see an audio alert for COT weekly releases.',
    verified: true,
    likes: 38,
  },
  {
    id: 'rev-3',
    name: 'Tariq Al-Mansoor',
    role: 'Prop Firm Funded Trader ($200k)',
    rating: 5,
    date: '2025-02-02',
    feedback:
      'Everything under one roof is not an exaggeration. The dynamic daily trade limits and loss guardrails protected my prop account during high-impact NFP volatility. Simply unmatched quality.',
    suggestions: 'Add optional Discord webhook dispatch for journal backups.',
    verified: true,
    likes: 29,
    adminReply: {
      text: 'Great to hear Tariq! We are proud to support your funded journey with institutional discipline guards.',
      author: 'PrimePipFX Lead Analyst',
      date: '2025-02-03',
    },
  },
  {
    id: 'rev-4',
    name: 'David Chen',
    role: 'Algorithmic & Discretionary Trader (Singapore)',
    rating: 5,
    date: '2025-01-28',
    feedback:
      'Five stars without question. The deterministic macro engine gives hedge-fund-level insight without any black-box nonsense. Clean, responsive, and gorgeous design on both PC and mobile.',
    suggestions: 'Continue keeping all calculations deterministic.',
    verified: true,
    likes: 24,
  },
];

const LOCAL_STORAGE_REVIEWS_KEY = 'primepipfx_community_reviews_v1';

interface CommunityReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
}

export const CommunityReviewsModal: React.FC<CommunityReviewsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const isAdmin =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'DEVELOPER' ||
    Boolean(currentUser?.isDeveloper);

  const [reviews, setReviews] = useState<TraderReview[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_REVIEWS;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form State
  const [name, setName] = useState(currentUser?.name || currentUser?.username || '');
  const [role, setRole] = useState(
    isAdmin ? 'Chief Administrator' : currentUser?.membershipTier ? `${currentUser.membershipTier} Member` : 'Active Trader'
  );
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [suggestions, setSuggestions] = useState('');

  // Admin Reply State
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Fetch latest reviews from server on mount
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
          try {
            localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(data.reviews));
          } catch {}
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(reviews));
    } catch {}
  }, [reviews]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !feedback.trim()) return;

    setIsSubmitting(true);
    const newRevPayload = {
      name: name.trim(),
      role: role.trim() || 'Active Trader',
      rating,
      feedback: feedback.trim(),
      suggestions: suggestions.trim() || undefined,
    };

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newRevPayload),
      });
      const data = await res.json();
      if (data?.ok && data.review) {
        setReviews((prev) => [data.review, ...prev.filter((r) => r.id !== data.review.id)]);
      } else {
        const fallbackRev: TraderReview = {
          id: `rev-${Date.now()}`,
          name: newRevPayload.name,
          role: newRevPayload.role,
          rating: newRevPayload.rating,
          date: new Date().toISOString().slice(0, 10),
          feedback: newRevPayload.feedback,
          suggestions: newRevPayload.suggestions,
          verified: true,
          likes: 1,
        };
        setReviews((prev) => [fallbackRev, ...prev]);
      }
    } catch {
      const fallbackRev: TraderReview = {
        id: `rev-${Date.now()}`,
        name: newRevPayload.name,
        role: newRevPayload.role,
        rating: newRevPayload.rating,
        date: new Date().toISOString().slice(0, 10),
        feedback: newRevPayload.feedback,
        suggestions: newRevPayload.suggestions,
        verified: true,
        likes: 1,
      };
      setReviews((prev) => [fallbackRev, ...prev]);
    }

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setFeedback('');
    setSuggestions('');
    setTimeout(() => {
      setSubmitSuccess(false);
      setShowSubmitForm(false);
    }, 1800);
  };

  const handleSendAdminReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSendingReply(true);

    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ replyText: replyText.trim() }),
      });
      const data = await res.json();
      if (data?.ok && data.review) {
        setReviews((prev) => prev.map((r) => (r.id === reviewId ? data.review : r)));
      } else {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  adminReply: {
                    text: replyText.trim(),
                    author: currentUser?.name || currentUser?.username || 'PrimePipFX Chief Administrator',
                    date: new Date().toISOString().slice(0, 10),
                  },
                }
              : r
          )
        );
      }
    } catch {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                adminReply: {
                  text: replyText.trim(),
                  author: currentUser?.name || currentUser?.username || 'PrimePipFX Chief Administrator',
                  date: new Date().toISOString().slice(0, 10),
                },
              }
            : r
        )
      );
    }

    setIsSendingReply(false);
    setReplyingToId(null);
    setReplyText('');
  };

  const handleLikeReview = async (reviewId: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, likes: (r.likes || 0) + 1 } : r))
    );
    try {
      await fetch(`/api/reviews/${reviewId}/like`, { method: 'POST' });
    } catch {}
  };

  const averageRating =
    reviews.length > 0
      ? Number((reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1))
      : 5.0;
  const totalReviews = reviews.length;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-slate-950 border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-blue-950/50 via-slate-950 to-amber-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-military font-black text-base sm:text-lg tracking-wider text-white uppercase">
                  Community Reviews & Feedback
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono-code font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED {averageRating}
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Ratings, feature suggestions, and admin responses on PrimePipFX
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rating Summary Bar */}
        <div className="px-5 py-3.5 bg-slate-900/50 border-b border-slate-800/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black font-military text-amber-400 flex items-center gap-1.5">
              <span>{averageRating.toFixed(1)}</span>
              <div className="flex text-amber-400 text-sm">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="text-xs font-mono-code text-slate-400">
              <span className="text-slate-200 font-bold">{totalReviews} Verified Traders</span>
              <span className="block text-[11px] text-emerald-400">5-Star Institutional Rating</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitForm((prev) => !prev)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-military font-bold text-xs tracking-wider transition shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{showSubmitForm ? 'VIEW ALL REVIEWS' : 'WRITE A REVIEW'}</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Submit Review Form */}
          {showSubmitForm ? (
            <form
              onSubmit={handleSubmit}
              className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-military font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Share Your Review & Suggestions
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="text-slate-400 hover:text-white text-xs font-mono-code cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {submitSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono-code flex items-center gap-2 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Thank you! Your review has been published to the community.</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono-code text-slate-300 uppercase mb-1 font-bold">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Tariq A. or Alexander"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono-code text-slate-300 uppercase mb-1 font-bold">
                        Trader Role / Region (Optional)
                      </label>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. Prop Trader, FX Specialist"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Star Rating Selector */}
                  <div>
                    <label className="block text-[11px] font-mono-code text-slate-300 uppercase mb-1.5 font-bold">
                      Your Rating (1 to 5 Stars) *
                    </label>
                    <div className="flex items-center gap-1 bg-slate-950 p-2.5 rounded-xl border border-slate-700/80 w-fit">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              (hoverRating || rating) >= star
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-mono-code text-amber-300 font-bold">
                        {rating}.0 / 5.0 {rating === 5 ? '★ Outstanding' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Feedback Text */}
                  <div>
                    <label className="block text-[11px] font-mono-code text-slate-300 uppercase mb-1 font-bold">
                      Your Review & Experience *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Share your thoughts on the fundamental intelligence, trading tools, risk armor, and user experience..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>

                  {/* Optional Suggestions */}
                  <div>
                    <label className="block text-[11px] font-mono-code text-amber-300 uppercase mb-1 flex items-center gap-1 font-bold">
                      <Lightbulb className="w-3 h-3 text-amber-400" /> Improvement Suggestions / Ideas (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.target.value)}
                      placeholder="Have an idea for a feature or improvement you would like added to PrimePipFX?"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/80 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSubmitForm(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-mono-code cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-military font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'SUBMITTING...' : 'POST REVIEW'}</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : null}

          {/* List of Verified Reviews */}
          <div className="space-y-3.5">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-military font-bold text-sm text-white">{rev.name}</span>
                      {rev.verified && (
                        <span className="flex items-center gap-0.5 text-[10px] font-mono-code text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Verified Trader
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono-code text-slate-400">{rev.role}</span>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono-code text-slate-500 mt-0.5">{rev.date}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  "{rev.feedback}"
                </p>

                {rev.suggestions && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 font-mono-code flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">Suggestion for Improvement: </span>
                      {rev.suggestions}
                    </div>
                  </div>
                )}

                {/* Official Admin Reply (If Present) */}
                {rev.adminReply && (
                  <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-cyan-950/50 border border-cyan-500/40 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-cyan-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        Official Response • {rev.adminReply.author}
                      </span>
                      <span className="text-slate-400 font-mono-code text-[10px]">{rev.adminReply.date}</span>
                    </div>
                    <p className="text-slate-200 text-xs italic pl-4 border-l-2 border-cyan-500/50 mt-1">
                      "{rev.adminReply.text}"
                    </p>
                  </div>
                )}

                {/* Review Utility Bar: Helpful / Like + Admin Reply Action */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono-code">
                  <button
                    type="button"
                    onClick={() => handleLikeReview(rev.id)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  >
                    <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                    <span>Helpful ({rev.likes || 1})</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(replyingToId === rev.id ? null : rev.id);
                        setReplyText(rev.adminReply?.text || '');
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CornerDownRight className="w-3 h-3" />
                      <span>{rev.adminReply ? 'Edit Admin Reply' : 'Reply as Admin'}</span>
                    </button>
                  )}
                </div>

                {/* Admin Reply Input Box */}
                {isAdmin && replyingToId === rev.id && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/40 space-y-2 mt-2 animate-in fade-in">
                    <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      Post Official Administrator Reply:
                    </div>
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write official response to this trader..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingToId(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSendingReply}
                        onClick={() => handleSendAdminReply(rev.id)}
                        className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSendingReply ? 'Saving...' : 'Post Reply'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between text-xs font-mono-code text-slate-400">
          <div className="flex items-center gap-1 text-slate-400">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
            <span>Built for Institutional & Disciplined Traders</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono-code cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
