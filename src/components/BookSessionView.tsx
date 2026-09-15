import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { getKarachiDate, getKarachiTime } from '../utils/time';
import { getStoredToken } from '../utils/authClient';
import {
  Calendar,
  Clock,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  User,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface MentorshipPackageItem {
  id: string;
  title: string;
  price: number;
  durationLabel: string;
  durationMinutes: number;
  description: string;
}

const MENTORSHIP_OPTIONS: MentorshipPackageItem[] = [
  {
    id: 'general-standard',
    title: 'General / Standard Mentorship',
    price: 10,
    durationLabel: '1 hour',
    durationMinutes: 60,
    description: 'Foundational strategy review, risk parameters check, and trade alignment.',
  },
  {
    id: '1-on-1-tactical',
    title: 'One-on-One Tactical Mentorship',
    price: 20,
    durationLabel: '1 hour',
    durationMinutes: 60,
    description: 'Personalized trade review, institutional liquidity analysis, and private mentoring.',
  },
  {
    id: 'live-execution-audit',
    title: 'Live Execution / Journal Audit',
    price: 10,
    durationLabel: '1 hour',
    durationMinutes: 60,
    description: 'In-depth audit of recent journal entries, mistakes, and execution quality.',
  },
  {
    id: 'sbt-deep-dive',
    title: 'SBT Model Deep Dive',
    price: 100,
    durationLabel: '3 months',
    durationMinutes: 0,
    description: 'Comprehensive 3-month mentorship program mastering all 10 SBT algorithmic models.',
  },
  {
    id: 'psychology-reset',
    title: 'Psychology / Emotion Reset',
    price: 30,
    durationLabel: '2 hours',
    durationMinutes: 120,
    description: 'Targeted psychological restructuring, revenge trading cooldown, and cognitive tools.',
  },
  {
    id: 'risk-optimization',
    title: 'Risk Protocol Optimization',
    price: 30,
    durationLabel: '1 hour',
    durationMinutes: 60,
    description: 'Capital preservation engineering, drawdown defense, and lot sizing protocols.',
  },
];

interface BookSessionViewProps {
  currentUser?: UserAccount | null;
  onOpenLogin?: () => void;
}

export const BookSessionView: React.FC<BookSessionViewProps> = ({ currentUser, onOpenLogin }) => {
  const [selectedPkg, setSelectedPkg] = useState<MentorshipPackageItem>(MENTORSHIP_OPTIONS[0]);
  const [selectedDate, setSelectedDate] = useState<string>(getKarachiDate());
  const [selectedTime, setSelectedTime] = useState<string>('04:00 PM');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [currency] = useState<string>('USD');
  const [availableSlots] = useState<string[]>([
    '02:00 PM',
    '04:00 PM',
    '06:00 PM',
    '08:00 PM',
    '10:00 PM',
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [myBookings, setMyBookings] = useState<any[]>([]);

  const fetchMyBookings = async () => {
    if (!currentUser) return;
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/appointments', { headers });
      if (res.ok) {
        const data = await res.json();
        setMyBookings(data.appointments || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchMyBookings();
  }, [currentUser]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      return;
    }

    setIsSubmitting(true);
    const token = getStoredToken();

    const payload = {
      userId: currentUser.id,
      customerName: currentUser.name || currentUser.username,
      customerUsername: currentUser.username,
      sessionType: selectedPkg.title,
      preferredDate: selectedDate,
      preferredTime: `${selectedTime} PKT`,
      durationMinutes: selectedPkg.durationMinutes,
      price: selectedPkg.price,
      currency,
      notes: sessionNotes.trim(),
      status: 'REQUESTED',
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setBookingSuccess(data.appointment);
        setSessionNotes('');
        fetchMyBookings();
      }
    } catch (err) {
      alert('Failed to submit appointment request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateWhatsAppLink = (booking: any) => {
    const text = `Hello PrimePipFX Developer / Owner,\nI have requested a 1-on-1 session on the Command Center.\n\nSession: ${booking.sessionType}\nDate: ${booking.preferredDate}\nTime: ${booking.preferredTime}\nPrice: ${booking.currency} ${booking.price}\nStudent: ${booking.customerName} (@${booking.customerUsername})`;
    return `https://wa.me/923406671495?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-military font-bold tracking-wider text-slate-100 flex items-center gap-2">
                <span>BOOK A SESSION — DIRECT OWNER MENTORSHIP</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  VERIFIED DIRECT ACCESS
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                One-on-one live technical breakdown • Execution audit • Personal trading psychology reset
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl font-mono-code text-xs text-right">
          <div className="text-[10px] text-slate-500 uppercase">Direct WhatsApp</div>
          <div className="text-sm font-bold text-amber-400">03406671495</div>
        </div>
      </div>

      {/* Confirmation View */}
      {bookingSuccess ? (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-military font-bold text-slate-100">
            SESSION REQUEST SUBMITTED TO OWNER
          </h3>
          <p className="text-xs text-slate-300 font-mono-code max-w-md mx-auto leading-relaxed">
            Your request for <strong>{bookingSuccess.sessionType}</strong> on{' '}
            <strong>{bookingSuccess.preferredDate} ({bookingSuccess.preferredTime})</strong> has been received.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={generateWhatsAppLink(bookingSuccess)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-military font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
            >
              <MessageCircle className="w-4 h-4" />
              <span>NOTIFY OWNER ON WHATSAPP (03406671495)</span>
            </a>
            <button
              onClick={() => setBookingSuccess(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-military text-xs"
            >
              BOOK ANOTHER SESSION
            </button>
          </div>
        </div>
      ) : (
        /* Booking Form */
        <form onSubmit={handleSubmitBooking} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <h3 className="text-sm font-military font-bold text-slate-200 uppercase flex items-center gap-2">
            <span>SELECT SESSION PARAMETERS</span>
          </h3>

          {/* Mentorship Type Selection with exact prices and durations */}
          <div>
            <label className="text-xs font-mono-code text-slate-400 uppercase block mb-2">
              Select Mentorship Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono-code text-xs">
              {MENTORSHIP_OPTIONS.map((pkg) => {
                const isSelected = selectedPkg.id === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPkg(pkg)}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-slate-100 text-sm leading-snug">{pkg.title}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {pkg.durationLabel}
                      </span>
                      <span className="text-sm font-bold text-amber-400">
                        ${pkg.price}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono-code text-xs">
            <div>
              <label className="text-slate-400 uppercase block mb-1">
                Preferred Date (PKT)
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400 uppercase block mb-1">
                Preferred Time Slot (PKT)
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500"
              >
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot} PKT
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes for Owner */}
          <div>
            <label className="text-xs font-mono-code text-slate-400 uppercase block mb-1">
              Specific Objectives / Challenges to Address (Optional)
            </label>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="e.g. I want to review my Gold trade entries from this week and identify why I hesitated on Wednesday's London open."
              rows={3}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono-code focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Price & Duration Summary Bar */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 font-mono-code">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Session Duration</div>
              <div className="text-sm font-bold text-slate-200">{selectedPkg.durationLabel}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Investment</div>
              <div className="text-base font-bold text-amber-400">
                {currency} {selectedPkg.price}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <span>{isSubmitting ? 'SUBMITTING REQUEST...' : 'CONFIRM & REQUEST SESSION'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Existing Appointments List */}
      {myBookings.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-military font-bold text-slate-200 uppercase">
            MY APPOINTMENT HISTORY & STATUS
          </h3>
          <div className="space-y-2 font-mono-code text-xs">
            {myBookings.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-slate-200">{b.sessionType}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {b.preferredDate} • {b.preferredTime} • {b.currency} {b.price}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      b.status === 'CONFIRMED'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : b.status === 'RESCHEDULED'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : b.status === 'CANCELLED'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                        : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                    }`}
                  >
                    {b.status}
                  </span>

                  <a
                    href={generateWhatsAppLink(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 text-[11px] transition flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
