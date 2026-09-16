import { CapabilityHandler, CrisisCardPayload } from '../types.js';

export const crisisHandler: CapabilityHandler = async (entities, userId) => {
  const payload: CrisisCardPayload = {
    kind: 'CRISIS_RESOURCE',
    title: 'Support & Trader Wellbeing Intervention',
    timestamp: Date.now(),
    confidence: 1.0,
    compassionateMessage:
      'We hear that you are going through immense stress right now. Trading losses can feel completely overwhelming in the moment, but your life, health, and peace of mind are infinitely more valuable than any market fluctuation. Please step away from the charts completely today.',
    helplines: [
      {
        name: 'International Suicide & Crisis Lifeline',
        contact: 'Dial 988 (USA/Canada) or visit findahelpline.com',
        desc: 'Free, confidential, 24/7 compassionate support from trained crisis counselors.',
      },
      {
        name: 'Pakistan Mental Health Helpline (Umang / Rozan)',
        contact: '+92 311 7786264 / 0800 22444',
        desc: 'Free psychological counseling and emotional first aid.',
      },
      {
        name: 'UK Crisis Line (Samaritans)',
        contact: 'Call 116 123 (UK & Ireland)',
        desc: 'Round-the-clock listening service for anyone in severe emotional distress.',
      },
    ],
    recommendedAction:
      'Please close all trading terminals and talk to someone you trust or reach out to a professional counselor right now.',
  };

  return payload;
};
