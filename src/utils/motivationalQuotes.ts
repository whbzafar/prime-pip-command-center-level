// Motivational & Discipline Mindset System
// 100% offline-first collection of trading discipline, risk management, and capital preservation reminders.

export interface MotivationalQuote {
  id: string;
  text: string;
  category: 'DISCIPLINE' | 'EXECUTION' | 'RISK' | 'LOSS_RECOVERY' | 'STREAK' | 'OVERCONFIDENCE';
  author?: string;
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 'q-welcome-1',
    text: 'Welcome back. Today, focus on execution, not prediction.',
    category: 'EXECUTION',
    author: 'Tactical Rule',
  },
  {
    id: 'q-welcome-2',
    text: 'One disciplined decision can be more valuable than one profitable trade.',
    category: 'DISCIPLINE',
    author: 'Discipline Creed',
  },
  {
    id: 'q-welcome-3',
    text: 'Your edge is not in taking more trades. It is in taking better decisions.',
    category: 'DISCIPLINE',
    author: 'Edge Axiom',
  },
  {
    id: 'q-welcome-4',
    text: 'Losses teach. Discipline decides whether you learn.',
    category: 'DISCIPLINE',
    author: 'Risk Command',
  },
  {
    id: 'q-welcome-5',
    text: 'Protect your capital. Opportunities will return.',
    category: 'RISK',
    author: 'Capital Defense Principle',
  },
  {
    id: 'q-welcome-6',
    text: 'Today, follow your process.',
    category: 'EXECUTION',
    author: 'Daily Habit',
  },
  {
    id: 'q-welcome-7',
    text: 'Do not chase the market. Wait for your setup.',
    category: 'EXECUTION',
    author: 'Patient Sniper Rule',
  },
  {
    id: 'q1',
    text: 'One disciplined trade is better than ten emotional trades.',
    category: 'DISCIPLINE',
    author: 'Tactical Rule',
  },
  {
    id: 'q2',
    text: 'Your goal today is not to predict. Your goal is to execute your plan.',
    category: 'EXECUTION',
    author: 'Mark Douglas Paradigm',
  },
  {
    id: 'q5',
    text: 'Consistency is built one disciplined decision at a time.',
    category: 'DISCIPLINE',
    author: 'PrimePipFX Mindset',
  },
  {
    id: 'q7',
    text: 'Your trading plan is stronger than temporary emotion.',
    category: 'DISCIPLINE',
    author: 'Psychology Standard',
  },
  {
    id: 'q8',
    text: 'Today is another opportunity to become more disciplined.',
    category: 'DISCIPLINE',
    author: 'Daily Ritual',
  },
  {
    id: 'q9',
    text: 'The market rewards patience, precision, and unwavering risk defense.',
    category: 'RISK',
    author: 'Execution Creed',
  },
  {
    id: 'q10',
    text: 'Professional traders focus on controlling downside; profits take care of themselves.',
    category: 'RISK',
    author: 'Paul Tudor Jones Doctrine',
  },
  {
    id: 'q11',
    text: 'Accept risk before clicking execute. Once placed, let your probabilities play out without micromanagement.',
    category: 'EXECUTION',
    author: 'Trade Architecture',
  },
  {
    id: 'q12',
    text: 'A setup missed is zero dollars lost. A forced setup is capital jeopardized.',
    category: 'DISCIPLINE',
    author: 'Defense Protocol',
  },
];

export const POST_LOSS_SUPPORT_MESSAGES: MotivationalQuote[] = [
  {
    id: 'loss-1',
    text: 'A loss does not define your ability as a trader. Review the trade and return to your process.',
    category: 'LOSS_RECOVERY',
  },
  {
    id: 'loss-2',
    text: 'Do not try to recover a loss emotionally. Follow your risk plan.',
    category: 'LOSS_RECOVERY',
  },
  {
    id: 'loss-3',
    text: 'Take a pause, review your rules, and protect your capital.',
    category: 'LOSS_RECOVERY',
  },
  {
    id: 'loss-4',
    text: 'Your next decision matters more than your previous loss.',
    category: 'LOSS_RECOVERY',
  },
  {
    id: 'loss-5',
    text: 'Every master trader experiences losing trades. Elite traders protect equity and maintain emotional neutrality.',
    category: 'LOSS_RECOVERY',
  },
];

export const OVERCONFIDENCE_WARNINGS: MotivationalQuote[] = [
  {
    id: 'oc-1',
    text: 'A winning trade is not permission to increase risk or relax your execution criteria.',
    category: 'OVERCONFIDENCE',
  },
  {
    id: 'oc-2',
    text: 'Euphoria is as dangerous as despair. Treat every new setup as independent of the previous outcome.',
    category: 'OVERCONFIDENCE',
  },
  {
    id: 'oc-3',
    text: 'Maintain identical position sizing after wins. Capital preservation is a lifelong game.',
    category: 'OVERCONFIDENCE',
  },
];

export function getRandomMotivationalQuote(): MotivationalQuote {
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[index];
}

export function getRandomLossSupportMessage(): MotivationalQuote {
  const index = Math.floor(Math.random() * POST_LOSS_SUPPORT_MESSAGES.length);
  return POST_LOSS_SUPPORT_MESSAGES[index];
}

export function getRandomOverconfidenceMessage(): MotivationalQuote {
  const index = Math.floor(Math.random() * OVERCONFIDENCE_WARNINGS.length);
  return OVERCONFIDENCE_WARNINGS[index];
}
