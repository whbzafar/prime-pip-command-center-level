/**
 * MIND GUIDE — the plain-language + professional knowledge base for the 17 trading mental states.
 *
 * Three depths for every state:
 *   simple  → anyone can understand it (what it is, why it happens, how it shows up)
 *   trader  → the practical playbook a professional trader uses
 *   science → the research behind it, with sources, for coaches, psychologists and academics
 * Plus: a 60-second "do this now", if-then plans, self-talk swaps, habits to build over weeks,
 * journal prompts and a timed guided session.
 *
 * Educational content for performance psychology in trading — not medical advice.
 */
import type { PsychCategoryType } from './psychologyData';

export type StepKind = 'breathe' | 'notice' | 'think' | 'write' | 'plan' | 'move';
export interface GuidedStep { title: string; seconds: number; kind: StepKind; text: string; breath?: 'sigh' | 'box' | '478' | 'slow' }
export interface ScienceNote { point: string; source: string }

export interface MindGuide {
  feeling: string;                 // check-in phrase, first person
  oneLine: string;                 // the whole idea in one sentence
  simple: { what: string; why: string; how: string };
  signs: string[];
  doNow: string[];                 // 60 seconds
  ifThen: string[];                // implementation intentions
  selfTalk: { instead: string; say: string }[];
  build: string[];                 // over weeks
  trader: string[];                // practitioner playbook
  science: ScienceNote[];
  journal: string[];
  session: { title: string; steps: GuidedStep[] };
}

const SIGH: GuidedStep = { title: 'Calm the body first', seconds: 60, kind: 'breathe', breath: 'sigh', text: 'Cyclic sighing: breathe in through the nose, then a second short "top-up" breath, then a long slow exhale through the mouth. Repeat. The long exhale is what slows your heart.' };
const NAME_IT = (feeling: string): GuidedStep => ({ title: 'Name it', seconds: 30, kind: 'notice', text: `Say quietly: "I notice I am feeling ${feeling}." Rate it from 1 to 10. Naming a feeling turns down the brain's alarm — you move from being the feeling to watching it.` });

export const MIND_GUIDE: Record<PsychCategoryType, MindGuide> = {
  FEAR: {
    feeling: 'I am scared to enter or to hold my trade',
    oneLine: 'Fear is your brain treating a planned, affordable loss like real danger.',
    simple: {
      what: 'Fear is the tight, nervous feeling that something bad is about to happen to your money. In trading it makes you close good trades too early, move your stop, or not take a trade at all.',
      why: 'Your brain is built to keep you safe. Losing money feels to the oldest part of the brain like losing food or shelter, so it sounds the alarm — faster heartbeat, tense muscles, narrow thinking. The alarm is loud even when the loss is small and already planned.',
      how: 'You close at +10 pips when the plan said +40. You watch every tick. You skip a setup that met all your rules, then watch it hit the target without you.',
    },
    signs: ['Fast, shallow breathing or a tight chest', 'Hand hovering over "close"', 'Checking P&L every few seconds', 'Thinking "please don\'t reverse"'],
    doNow: ['Take your hand off the mouse.', 'Do 3 slow breaths with a long exhale (exhale twice as long as the inhale).', 'Read your stop and target out loud and ask: "Has the reason for this trade changed — on the chart, not in my head?" If not, let it work.'],
    ifThen: ['If I feel the urge to close early, then I check one thing only: has price broken my invalidation level? If no, I do nothing.', 'If my checklist is all green, then I enter within one candle — no "one more confirmation".', 'If a trade is open, then I hide the money P&L and look at the chart in R.'],
    selfTalk: [{ instead: '"What if I lose?"', say: '"This loss is already paid for — it is 1R, a cost of doing business."' }, { instead: '"I can\'t afford to be wrong."', say: '"I can afford this exact loss. I sized it so I can."' }],
    build: ['Risk an amount you are truly calm about — if fear is strong, cut size in half for 2 weeks.', 'Back-test or replay 100 trades of your setup so your brain has seen losing streaks before.', 'Journal "fear exits": how many pips each early exit cost you. Seeing the number changes behaviour.'],
    trader: ['Define the loss before entry and accept it in writing — "I accept losing $X on this trade."', 'Measure in R, not money. Money triggers the alarm; R keeps it statistical.', 'Use alerts instead of watching every tick; staring feeds the alarm.', 'Partial at 1R and move to breakeven only if your plan says so — never as a fear reaction.'],
    science: [
      { point: 'Losses weigh about twice as much as equal gains in our minds (loss aversion).', source: 'Kahneman & Tversky (1979); Tversky & Kahneman (1992), Prospect Theory' },
      { point: 'Activity in the anterior insula — a region tied to anxiety and disgust — predicted risk-averse mistakes in a financial choice task.', source: 'Kuhnen & Knutson (2005), Neuron' },
      { point: 'Even professional traders show measurable physiological arousal (skin conductance, heart rate) during volatile market events; less experienced traders react more strongly.', source: 'Lo & Repin (2002), Journal of Cognitive Neuroscience' },
      { point: 'Naming a feeling in words reduces amygdala response ("affect labelling").', source: 'Lieberman et al. (2007), Psychological Science' },
    ],
    journal: ['What exactly was I afraid of — the money, being wrong, or what someone would think?', 'Did the chart change, or only my feeling?', 'What would this trade look like if the money were $1?'],
    session: { title: 'From fear to a calm plan · 5 min', steps: [SIGH, NAME_IT('fear'), { title: 'Shrink the danger', seconds: 60, kind: 'think', text: 'Write the worst realistic outcome in money and in % of your account. Then ask: "Will this matter in a month?" Fear grows in vague pictures and shrinks when it meets real numbers.' }, { title: 'Back to the chart', seconds: 60, kind: 'think', text: 'Look only at structure: where is invalidation? Is price still on the right side of it? If yes, the trade is doing what trades do — moving around.' }, { title: 'Commit', seconds: 45, kind: 'plan', text: 'Say your rule: "I exit only at my stop, my target, or a rule-based exit." Then set an alert and step away for 10 minutes.' }] },
  },

  GREED: {
    feeling: 'I want more — bigger size, more trades, a huge win',
    oneLine: 'Greed is the excitement of a possible reward taking over the steering wheel from your plan.',
    simple: {
      what: 'Greed is the strong pull to get more: more lots, more trades, a bigger target than your plan. It feels like excitement and certainty.',
      why: 'Your brain releases dopamine when it expects a reward — and it releases the most when the reward is possible but not certain. Trading is exactly that, so the "maybe a big win" feeling can become stronger than your rules.',
      how: 'You remove your take profit to "let it run" without a reason. You double the lot size because "this one is sure". You keep adding to a winner until one reversal takes everything back.',
    },
    signs: ['Feeling excited and certain', 'Thinking about what you will buy with the profit', 'Raising lots above your rule', 'Moving the target further away mid-trade'],
    doNow: ['Write down your planned risk and target before touching anything.', 'Ask: "Would I take this exact size if the last 3 trades had been losses?"', 'If the answer is no, go back to your normal size.'],
    ifThen: ['If I feel "this one is sure", then I use my normal risk — certainty is a warning sign, not a signal.', 'If I want to move my target, then I only do it to a level written in my plan.', 'If I hit my daily profit goal, then I stop or cut risk in half for the rest of the day.'],
    selfTalk: [{ instead: '"Just this once, bigger size."', say: '"Consistency pays me, not one trade."' }, { instead: '"It\'s going to the moon."', say: '"My target is my target. I can re-enter if structure gives a new setup."' }],
    build: ['Fixed risk per trade for 30 days — no exceptions, track it.', 'A daily profit cap (for example +2R) after which you stop.', 'Review your biggest giveback trades; greed usually leaves a clear fingerprint.'],
    trader: ['Size is decided by a formula, never by feeling.', 'Scale out by rules (e.g. 50% at 1R, rest at structure) so you are not choosing in the heat of the moment.', 'Separate the "trade idea" from "how much" — the idea can be great while the size stays normal.'],
    science: [
      { point: 'Dopamine neurons fire most for uncertain rewards — the anticipation itself is rewarding.', source: 'Schultz, Dayan & Montague (1997), Science' },
      { point: 'Activity in the nucleus accumbens (reward anticipation) preceded risk-seeking mistakes.', source: 'Kuhnen & Knutson (2005), Neuron' },
      { point: 'Day-traders with the most extreme emotional reactions to gains and losses performed worse.', source: 'Lo, Repin & Steenbarger (2005), American Economic Review P&P' },
    ],
    journal: ['What was I imagining when I raised size?', 'What would my trading look like with zero "special" trades?', 'How much have exceptions to my risk rule cost me?'],
    session: { title: 'Cool the reward rush · 4 min', steps: [SIGH, NAME_IT('greedy / over-excited'), { title: 'Look at the downside', seconds: 60, kind: 'think', text: 'Picture the trade going to your stop with the bigger size. Say the loss in money out loud. The brain under-weights downside when excited — this puts it back on the scale.' }, { title: 'Reset size', seconds: 45, kind: 'plan', text: 'Write: "Risk per trade = X%. Today I trade only X%." Recalculate the lot size with the calculator.' }] },
  },

  FOMO: {
    feeling: 'I am afraid of missing the move',
    oneLine: 'FOMO is chasing a move because watching it go without you hurts more than a planned entry feels good.',
    simple: {
      what: 'Fear Of Missing Out is the panic of seeing price run and feeling you must get in now, even without your setup.',
      why: 'Missing a big move feels like a loss, and your brain hates losses. Social media and seeing others\' profits make it stronger. The urge says "now or never" — but markets always offer new chances.',
      how: 'You buy after a huge green candle, far from any level, with a wide stop. Often price pulls back right after you enter.',
    },
    signs: ['"I\'ll miss it!" thoughts', 'Entering in the middle of a big candle', 'No clear stop location', 'Opening a lower timeframe to find any reason to enter'],
    doNow: ['Say: "If I missed it, I missed it — there will be another."', 'Ask: "Where is my stop and is the reward still 2× the risk from here?" Usually it is not.', 'Set an alert at the level where you would want to enter on a pullback, then step away.'],
    ifThen: ['If price has already moved more than 1R from my entry zone, then I wait for a pullback or skip.', 'If I enter without my checklist, then I close at breakeven or small loss and journal it.', 'If I see a big move on social media, then I wait 10 minutes before opening the chart.'],
    selfTalk: [{ instead: '"Everyone is making money."', say: '"I only need my setups, not every move."' }, { instead: '"Last chance!"', say: '"The market opens again tomorrow, and the day after."' }],
    build: ['Keep a "missed trades" list; review later how many would have hit stop. It is calming.', 'Trade only at planned levels with alerts — no hunting.', 'Limit social media during the session.'],
    trader: ['Plan entries before the move (levels + alerts). The plan is your defence against chasing.', 'Late entries change the maths: the same target with a wider stop = worse R:R.', 'A missed trade costs nothing; a chased trade often costs 1R.'],
    science: [
      { point: 'FOMO is measurable as a stable trait linked with lower mood and more social-media use.', source: 'Przybylski et al. (2013), Computers in Human Behavior' },
      { point: 'Regret over missed gains drives impulsive "catch-up" decisions; anticipated regret shapes choice.', source: 'Zeelenberg (1999), Journal of Behavioral Decision Making' },
    ],
    journal: ['What did I see right before I chased?', 'Would I have taken this trade at this price if I had not seen the move?', 'How many of my "missed" trades would have been winners?'],
    session: { title: 'Let the train go · 4 min', steps: [SIGH, NAME_IT('FOMO'), { title: 'Do the maths', seconds: 60, kind: 'think', text: 'From the current price: where would your stop be? Where is the target? If reward is not at least 2× risk, this is not your trade.' }, { title: 'Set the trap, not the chase', seconds: 45, kind: 'plan', text: 'Mark the pullback level where your setup would appear. Set an alert there. Close the chart for 15 minutes.' }] },
  },

  REVENGE_TRADING: {
    feeling: 'I want to win my loss back right now',
    oneLine: 'Revenge trading is trying to fix a hurt feeling with the market — and it usually makes the hurt bigger.',
    simple: {
      what: 'After a loss you feel angry or embarrassed and jump into another trade (often bigger) to get the money back fast.',
      why: 'A loss feels like a hit to your pride. Anger makes the brain want to act fast and fight back. People also take bigger risks when they are trying to "get back to even" — it is a well-known human pattern.',
      how: 'Two quick losses, then a third trade with double size and no setup. One bad hour wipes out a good week.',
    },
    signs: ['Heat in the face, tight jaw', 'Clicking faster than usual', 'Thinking "the market owes me"', 'Raising lots after a loss'],
    doNow: ['Stop. Close the platform for 15 minutes — set a timer.', 'Stand up, walk, drink water. Anger lives in the body; move it.', 'Write down: today\'s loss, your daily limit, and one sentence about what happened.'],
    ifThen: ['If I have 2 losses in a row, then I stop trading for the day.', 'If I feel anger after a trade, then I take a 15-minute break away from the screen.', 'If I want to increase size after a loss, then I trade half size instead.'],
    selfTalk: [{ instead: '"I need to make it back now."', say: '"The loss is done. My job is the next good decision, not the last trade."' }, { instead: '"The market is against me."', say: '"The market doesn\'t know I exist. I followed or broke my plan — that is all."' }],
    build: ['A hard daily stop (e.g. −2R or 2 losses), written and visible.', 'A post-loss routine you always do (breathe, journal, 15 minutes off).', 'Track "revenge trades" and their cost — the number is a strong motivator.'],
    trader: ['Losses are part of the business; the goal is to keep each one small and planned.', 'After a loss, the next trade must pass a stricter checklist, not a looser one.', 'Recovering a drawdown is done with normal risk over many trades, never in one trade.'],
    science: [
      { point: 'After losses, people take more risk to break even (the "break-even effect").', source: 'Thaler & Johnson (1990), Management Science' },
      { point: 'Reappraising a situation reduces negative emotion more effectively than suppressing it.', source: 'Gross (1998); Gross & John (2003), Journal of Personality and Social Psychology' },
      { point: 'Pre-planned if-then rules strongly increase follow-through on goals (average effect d ≈ 0.65 across 94 studies).', source: 'Gollwitzer & Sheeran (2006), Advances in Experimental Social Psychology' },
    ],
    journal: ['What did I feel in the 10 seconds after the loss?', 'What was I trying to prove?', 'What will I do differently the next time I feel this?'],
    session: { title: 'Break the revenge loop · 6 min', steps: [{ ...SIGH, seconds: 90 }, NAME_IT('angry / wanting revenge'), { title: 'Move it out', seconds: 60, kind: 'move', text: 'Stand up. Shake out your hands, roll your shoulders, walk for one minute. Anger is energy in the body — let it out physically, not on the chart.' }, { title: 'See the pattern', seconds: 60, kind: 'think', text: 'Ask: "What happens next if I trade now in this state?" Picture the double-size loss. Then picture tomorrow starting fresh.' }, { title: 'Close the day', seconds: 45, kind: 'plan', text: 'Write: "Today is finished. I protected my account." Close the platform.' }] },
  },

  HESITATION: {
    feeling: 'I see my setup but I can\'t click',
    oneLine: 'Hesitation is your brain protecting you from the pain of being wrong — at the cost of being right.',
    simple: {
      what: 'Your setup appears, everything matches, but you freeze and wait. Then price runs without you.',
      why: 'Being wrong after acting hurts more than missing out by doing nothing. Your brain prefers "doing nothing" because it feels safer — even when doing nothing is the worse choice.',
      how: 'You wait for "one more candle", enter late with worse risk-to-reward, or don\'t enter at all.',
    },
    signs: ['Waiting for extra confirmation not in your plan', 'Second-guessing a valid setup', 'Feeling relief when price leaves without you', 'Missing many good trades in a row'],
    doNow: ['Read your checklist out loud.', 'If every box is ticked, say "execute" and enter.', 'Remind yourself the loss is pre-defined and small.'],
    ifThen: ['If my checklist is complete, then I enter within one candle.', 'If I notice I\'m waiting for extra confirmation, then I name it: "That is hesitation, not analysis."', 'If I miss a valid trade, then I log it and its result.'],
    selfTalk: [{ instead: '"What if this one fails?"', say: '"Some will fail. My edge plays out over 100 trades, not this one."' }, { instead: '"Let me wait a bit."', say: '"My rules decide, not my nerves."' }],
    build: ['Rehearse entries in bar replay until clicking feels automatic.', 'Start with smaller size to make execution easier, then scale up.', 'Track missed valid trades and their outcomes.'],
    trader: ['Execution is a skill separate from analysis — practise it on purpose.', 'A clear, short checklist (4–6 items) removes room for doubt.', 'Accepting the loss before the trade removes most hesitation.'],
    science: [
      { point: 'People judge harmful actions more harshly than equally harmful inaction (omission bias).', source: 'Ritov & Baron (1990), Journal of Behavioral Decision Making' },
      { point: 'Anticipated regret pushes people towards inaction to avoid feeling responsible.', source: 'Zeelenberg et al. (1996), Organizational Behavior and Human Decision Processes' },
    ],
    journal: ['What exactly did I wait for?', 'Was the extra confirmation in my plan?', 'What did missing this trade cost me?'],
    session: { title: 'From freeze to execute · 4 min', steps: [{ ...SIGH, seconds: 45 }, NAME_IT('hesitant'), { title: 'Rehearse', seconds: 60, kind: 'think', text: 'Close your eyes. See your setup forming, tick each checklist item, see yourself clicking calmly, and see the stop being hit — and you are fine. Repeat once.' }, { title: 'Rule', seconds: 30, kind: 'plan', text: 'Say: "Checklist complete = I click. My job is to execute, the market\'s job is the result."' }] },
  },

  OVERCONFIDENCE: {
    feeling: 'I feel like I can\'t lose',
    oneLine: 'Overconfidence is when feeling skilled replaces checking your rules.',
    simple: {
      what: 'You feel you understand the market so well that rules don\'t apply to you. You trade more, bigger and with less checking.',
      why: 'Our brains remember wins as skill and losses as bad luck. After some success, that story grows — and feels very convincing.',
      how: 'You skip your checklist, trade outside your hours, or argue with price because "you know" where it is going.',
    },
    signs: ['Trading more often than normal', 'Skipping the checklist', 'Holding a losing trade because "I\'m right"', 'Feeling bored by your own rules'],
    doNow: ['Open your checklist and tick it honestly for the next trade.', 'Check: is my size the same as my rule?', 'Ask: "What would make me wrong here?" Write one answer.'],
    ifThen: ['If I feel certain, then I look for the reason I could be wrong before entering.', 'If I trade more than my daily maximum, then I stop for the day.', 'If I want to skip my checklist, then I don\'t trade.'],
    selfTalk: [{ instead: '"I know where it\'s going."', say: '"Nobody knows the next candle. I know my edge and my risk."' }, { instead: '"Rules are for beginners."', say: '"Rules are why professionals last."' }],
    build: ['Track your real win rate and R per setup — data beats feelings.', 'Weekly review with the question "where did luck help me?"', 'Keep size fixed regardless of recent results.'],
    trader: ['Confidence should come from your process statistics, not your last result.', 'Pre-mortem every trade: "If this fails, why?"', 'More trades ≠ more money; overtrading cuts edge through costs and lower quality.'],
    science: [
      { point: 'The most active traders earned the lowest returns; trading costs and overconfidence explained the gap.', source: 'Barber & Odean (2000), Journal of Finance' },
      { point: 'Men traded 45% more than women and reduced their returns more — attributed to overconfidence.', source: 'Barber & Odean (2001), Quarterly Journal of Economics' },
      { point: 'Traders learn to be overconfident by crediting themselves for successes (self-attribution bias).', source: 'Gervais & Odean (2001), Review of Financial Studies' },
    ],
    journal: ['Which of my recent wins involved luck?', 'Where did I bend a rule because I felt sure?', 'What do my statistics say vs what I feel?'],
    session: { title: 'Back to humble and sharp · 4 min', steps: [{ ...SIGH, seconds: 45 }, NAME_IT('overconfident'), { title: 'Pre-mortem', seconds: 75, kind: 'think', text: 'Imagine it is tonight and today went badly. Write the 3 most likely reasons. Usually: too big, too many trades, ignored a level. Those are your guardrails for today.' }, { title: 'Reset', seconds: 30, kind: 'plan', text: 'Write today\'s max trades and risk per trade. Stick it on the screen.' }] },
  },

  BOREDOM_TRADING: {
    feeling: 'I\'m bored and want something to happen',
    oneLine: 'Boredom trading is using the market for entertainment when your setups are not there.',
    simple: {
      what: 'Nothing is happening, you feel restless, and you take trades just to feel involved.',
      why: 'Humans find doing nothing surprisingly hard. The brain craves stimulation, and a trade gives instant excitement — even if it is a bad trade.',
      how: 'Low-quality trades in quiet sessions (like late New York or Asian chop) that slowly eat your profits.',
    },
    signs: ['Scrolling through many pairs looking for "something"', 'Dropping to lower timeframes', 'Trading in sessions you normally avoid', 'Feeling restless or sleepy'],
    doNow: ['Ask: "Is my setup here — yes or no?" If no, close the chart.', 'Set alerts at your levels and walk away.', 'Do something useful: journal, back-test, or rest.'],
    ifThen: ['If there is no setup at my levels, then I set alerts and leave the screen.', 'If I catch myself scrolling pairs, then I stop and do 10 minutes of review instead.', 'If the session is outside my hours, then I don\'t trade.'],
    selfTalk: [{ instead: '"I should be doing something."', say: '"Waiting is part of the job. Professionals are paid to wait."' }],
    build: ['Fixed trading hours and a list of what you do when there\'s no setup.', 'Use the waiting time for skill work: replays, journaling, study.', 'Make the "boring" path rewarding — tick a box each day you only took A+ setups.'],
    trader: ['Your edge exists only in specific conditions. Outside them you are paying spread to gamble.', 'Alerts let the market call you; you do not need to watch.', 'Fewer, better trades usually beat many average ones.'],
    science: [
      { point: 'Many people chose to give themselves mild electric shocks rather than sit alone with their thoughts for 6–15 minutes.', source: 'Wilson et al. (2014), Science' },
      { point: 'Boredom drives sensation-seeking and riskier behaviour.', source: 'Zuckerman (1994), Behavioral Expressions and Biosocial Bases of Sensation Seeking' },
    ],
    journal: ['What was I feeling right before the trade?', 'Did this trade match my setup list?', 'What could I do with waiting time instead?'],
    session: { title: 'Turn waiting into strength · 3 min', steps: [{ ...SIGH, seconds: 45, breath: 'slow' }, NAME_IT('bored / restless'), { title: 'Choose a better action', seconds: 60, kind: 'plan', text: 'Pick one: set alerts and leave, replay 5 trades, or journal yesterday. Do it now — boredom fades when attention has a job.' }] },
  },

  LOSS_AVERSION: {
    feeling: 'I can\'t close my losing trade',
    oneLine: 'Loss aversion makes you hold losers hoping, and cut winners fearing — the exact opposite of what works.',
    simple: {
      what: 'You can\'t accept a loss, so you move your stop or hold a losing trade hoping it comes back. Meanwhile you close winners quickly to "lock in" a small gain.',
      why: 'A loss feels about twice as painful as an equal gain feels good. Closing a loser makes the loss "real", so the brain avoids it.',
      how: 'Small losses grow into big ones. Winners stay small. Even with a good win rate, the account goes down.',
    },
    signs: ['Moving the stop further away', 'Hoping instead of analysing', 'Refusing to look at the trade', 'Adding to a losing position'],
    doNow: ['Look at the original stop. If price passed it, close the trade now.', 'Say: "A small loss is a successful trade if I followed my plan."', 'Check the account P&L less often — once per session is enough.'],
    ifThen: ['If price reaches my stop, then the order closes — I never move it further.', 'If I want to add to a loser, then I close the platform instead.', 'If a winner reaches 1R, then I follow my management rule, not my fear.'],
    selfTalk: [{ instead: '"It will come back."', say: '"Hope is not a strategy. My stop was my decision when I was calm."' }],
    build: ['Hard stops placed with the order, every time.', 'Review trades where you moved the stop; total the extra loss.', 'Look at results weekly in R, not daily in money.'],
    trader: ['Cut losers short, let winners reach targets — the disposition effect is the most common retail leak.', 'Treat a stop-out as information, not failure.', 'Checking P&L too often increases loss aversion — reduce it.'],
    science: [
      { point: 'Investors sell winners too early and hold losers too long (the disposition effect).', source: 'Shefrin & Statman (1985), Journal of Finance; Odean (1998), Journal of Finance' },
      { point: 'Looking at results more frequently increases loss-averse behaviour ("myopic loss aversion").', source: 'Benartzi & Thaler (1995), QJE; Gneezy & Potters (1997), QJE' },
    ],
    journal: ['Where did I move a stop and what did it cost?', 'Which winners did I cut early?', 'How do I feel about losses that followed my plan?'],
    session: { title: 'Make peace with small losses · 4 min', steps: [SIGH, NAME_IT('afraid to take the loss'), { title: 'Two futures', seconds: 60, kind: 'think', text: 'Future A: you take the small, planned loss and stay calm. Future B: you hold, it becomes 3× bigger, and your week is ruined. Which trader do you want to be?' }, { title: 'Act', seconds: 30, kind: 'plan', text: 'If the stop is hit — close it. Then write one line: "I protected my account."' }] },
  },

  ANALYSIS_PARALYSIS: {
    feeling: 'I keep analysing and can\'t decide',
    oneLine: 'More information makes you more confident, not more accurate — past a point it only adds doubt.',
    simple: {
      what: 'You add indicator after indicator, check every timeframe and read every news story — and still can\'t decide.',
      why: 'Too many choices and too much information overload the brain. It feels like being careful, but it is really avoiding the discomfort of a decision.',
      how: 'Charts full of lines, constant second-guessing, missed entries, and tiredness before the session even starts.',
    },
    signs: ['More than 3–4 indicators', 'Checking 6+ timeframes', 'Changing your mind several times', 'Feeling exhausted from analysis'],
    doNow: ['Remove everything that is not in your written plan from the chart.', 'Use maximum two timeframes: one for direction, one for entry.', 'Answer only your checklist questions — yes or no.'],
    ifThen: ['If I have analysed for more than 15 minutes without a decision, then I skip the trade.', 'If a new indicator tempts me, then I test it in replay first, not live.', 'If signals conflict, then there is no trade.'],
    selfTalk: [{ instead: '"I need more confirmation."', say: '"My plan is the confirmation. Extra data is noise."' }],
    build: ['A one-page trading plan with a short checklist.', 'A clean chart template you always use.', 'Practise fast decisions in bar replay with a timer.'],
    trader: ['Simple systems are easier to execute under stress.', 'Information has diminishing returns — set a limit.', 'Conflicting signals = no trade. That is a valid decision.'],
    science: [
      { point: 'More information increased people\'s confidence but not the accuracy of their predictions.', source: 'Tsai, Klayman & Hastie (2008), Organizational Behavior and Human Decision Processes; Oskamp (1965)' },
      { point: 'Too many options reduce the likelihood of choosing at all (choice overload).', source: 'Iyengar & Lepper (2000), Journal of Personality and Social Psychology' },
    ],
    journal: ['Which tools actually changed my decisions last month?', 'What would my chart look like with only what matters?', 'Where am I using analysis to avoid deciding?'],
    session: { title: 'Clear the chart, clear the mind · 4 min', steps: [{ ...SIGH, seconds: 45 }, NAME_IT('overloaded'), { title: 'Declutter', seconds: 90, kind: 'plan', text: 'Remove every line and indicator not in your plan. Keep two timeframes. Notice how your breathing changes when the screen gets simpler.' }, { title: 'Decide', seconds: 30, kind: 'plan', text: 'Answer your checklist with yes/no. All yes = trade. Any no = no trade. Done.' }] },
  },

  PERFECTIONISM: {
    feeling: 'Every trade has to be perfect',
    oneLine: 'Perfectionism demands certainty from a game of probabilities — so it is always disappointed.',
    simple: {
      what: 'You want perfect entries, perfect exits and no losses. Anything less feels like failure.',
      why: 'Perfectionism often comes from linking your self-worth to performance. In trading, randomness guarantees imperfect results, so a perfectionist feels like a failure even on good days.',
      how: 'Missing trades waiting for the perfect entry, beating yourself up over small mistakes, quitting good systems after a few losses.',
    },
    signs: ['Re-living small mistakes for hours', 'Moving the entry to "get a better price" and missing the trade', 'Feeling that a +2R day was bad because it could have been +3R', 'Constantly changing strategy'],
    doNow: ['Grade the trade on process (A/B/C), not on profit.', 'Say: "Good enough and consistent beats perfect and rare."', 'Name one thing you did right.'],
    ifThen: ['If I followed my plan, then the trade is a success — regardless of result.', 'If I catch myself replaying a mistake, then I write one lesson and close the journal.', 'If I want to change my system after a few losses, then I wait for 30+ trades of data.'],
    selfTalk: [{ instead: '"That was terrible, I should have…"', say: '"I followed most of my plan. Next time I improve one thing."' }],
    build: ['Process scores in your journal (did I follow my plan?)', 'Celebrate rule-following, not only profits.', 'Practise self-compassion after mistakes — it improves learning.'],
    trader: ['Your edge is a statistic; individual trades are random.', 'Missing the exact top or bottom is normal — aim for the middle of the move.', 'Process goals reduce pressure and improve execution.'],
    science: [
      { point: 'Perfectionistic concerns (fear of mistakes, self-criticism) are strongly linked to burnout.', source: 'Hill & Curran (2016), Personality and Social Psychology Review' },
      { point: 'Self-compassion after a failure increased motivation to improve more than self-esteem boosts did.', source: 'Breines & Chen (2012), Personality and Social Psychology Bulletin' },
    ],
    journal: ['What standard am I holding myself to, and is it realistic?', 'What did I do well today?', 'Would I speak to a friend the way I speak to myself?'],
    session: { title: 'Good enough is professional · 4 min', steps: [{ ...SIGH, seconds: 45 }, NAME_IT('self-critical'), { title: 'Friend test', seconds: 75, kind: 'think', text: 'Imagine a friend made your exact trade. What would you say to them? Say that to yourself, kindly and honestly.' }, { title: 'One lesson', seconds: 30, kind: 'write', text: 'Write one improvement for next time — just one — and one thing you did right.' }] },
  },

  IMPATIENCE: {
    feeling: 'I can\'t wait for my setup',
    oneLine: 'Impatience is wanting the reward now, even if waiting would pay more.',
    simple: {
      what: 'You enter before the setup is complete, close trades before targets, or switch strategies quickly.',
      why: 'The brain values "now" much more than "later". A small reward today feels bigger than a larger reward tomorrow.',
      how: 'Early entries without confirmation, early exits, and frustration when trades take time.',
    },
    signs: ['Entering before the candle closes', 'Closing because "it\'s taking too long"', 'Checking the trade every minute', 'Restlessness'],
    doNow: ['Wait for the candle close — set a timer.', 'Remind yourself: good trades often need time.', 'Do something else while the trade works.'],
    ifThen: ['If the candle has not closed, then I don\'t enter.', 'If the trade is taking long, then I check structure, not time.', 'If I feel restless, then I walk for 5 minutes.'],
    selfTalk: [{ instead: '"This is taking forever."', say: '"Time in a valid trade is normal. My target doesn\'t care about my clock."' }],
    build: ['Practise waiting in bar replay with higher timeframes.', 'Use alerts so you don\'t stare at the screen.', 'Plan activities for waiting time.'],
    trader: ['Patience is often where the edge is: confirmed setups have better odds.', 'Higher timeframes reduce noise and the urge to act.', 'Measure "time in trade" — impatient exits often look obvious afterwards.'],
    science: [
      { point: 'People strongly over-value immediate rewards (hyperbolic / present-biased discounting).', source: 'Laibson (1997), Quarterly Journal of Economics; Ainslie (1975)' },
    ],
    journal: ['How many early entries or exits did I make this week?', 'What did impatience cost in pips?', 'What helps me wait?'],
    session: { title: 'Train patience · 3 min', steps: [{ ...SIGH, seconds: 45, breath: 'slow' }, NAME_IT('impatient'), { title: 'Slow focus', seconds: 75, kind: 'notice', text: 'Watch a slow breath count of 6 in, 6 out for one minute. Notice the urge to rush — and let it pass. That urge is what you are training to sit with.' }] },
  },

  POST_LOSS_SHAME: {
    feeling: 'I feel ashamed / stupid after a loss',
    oneLine: 'Shame says "I am bad"; a professional says "I made a mistake I can fix".',
    simple: {
      what: 'After a loss you feel embarrassed, stupid or worthless, and you may hide trades, avoid your journal or want to quit.',
      why: 'When we link our value as a person to results, a loss feels like a judgment on who we are. Shame makes people hide; guilt about a specific action makes people fix it.',
      how: 'Not journaling losses, avoiding the platform, harsh self-talk — and then impulsive trades to make the feeling go away.',
    },
    signs: ['Avoiding your journal', 'Hiding results from others', 'Thinking "I\'m not good enough"', 'Wanting to quit after one bad day'],
    doNow: ['Put a hand on your chest and breathe slowly for 30 seconds.', 'Separate: "I made a mistake" is not "I am a failure".', 'Write the trade in your journal anyway — facts only.'],
    ifThen: ['If I feel shame, then I write the facts of the trade and one lesson.', 'If I want to hide a trade, then I journal it first.', 'If I think "I\'m stupid", then I replace it with "I am learning a hard skill".'],
    selfTalk: [{ instead: '"I\'m an idiot."', say: '"I made a decision with the information I had. I can learn from it."' }],
    build: ['A loss routine: journal → lesson → close for the day.', 'Self-compassion practice (talk to yourself like a good coach).', 'Share honestly with a mentor or trading friend.'],
    trader: ['Losses are tuition and inventory cost — every professional has them.', 'A loss that followed the plan is a good trade.', 'Shame leads to avoidance; avoidance stops learning.'],
    science: [
      { point: 'Shame focuses on the self and leads to hiding; guilt focuses on the behaviour and leads to repair.', source: 'Tangney & Dearing (2002), Shame and Guilt' },
      { point: 'Self-compassion after failure increases motivation to improve.', source: 'Breines & Chen (2012), Personality and Social Psychology Bulletin; Neff (2003)' },
    ],
    journal: ['What happened — facts only?', 'What will I do differently?', 'What would a kind coach say to me now?'],
    session: { title: 'From shame to a lesson · 5 min', steps: [{ ...SIGH, seconds: 60 }, NAME_IT('ashamed'), { title: 'Kind hand', seconds: 45, kind: 'notice', text: 'Place a hand on your chest. Feel the warmth. Say: "This is a hard moment. Losses happen to every trader. May I be kind to myself."' }, { title: 'Facts and lesson', seconds: 90, kind: 'write', text: 'Write: what happened, what you controlled, one lesson. Then close the journal — the lesson is captured.' }] },
  },

  COMPARISON_ANXIETY: {
    feeling: 'Others are doing better than me',
    oneLine: 'Comparison measures your behind-the-scenes against someone else\'s highlight reel.',
    simple: {
      what: 'Seeing others\' profits makes you feel behind, so you take more risk or change your strategy.',
      why: 'Humans naturally compare themselves to others to judge their progress. Social media shows only the best results, so comparisons are always unfair.',
      how: 'Copying others\' trades, increasing risk to "catch up", feeling like a failure despite steady progress.',
    },
    signs: ['Checking others\' results often', 'Feeling inadequate after social media', 'Changing strategy after seeing someone win', 'Taking trades because others did'],
    doNow: ['Close social media for the session.', 'Look at your own progress over the last 3 months.', 'Remind yourself: you don\'t see their losses.'],
    ifThen: ['If I see others\' profits, then I return to my plan and my stats.', 'If I want to copy a trade, then I check whether it fits my setups.', 'If I feel behind, then I compare me today to me 3 months ago.'],
    selfTalk: [{ instead: '"Everyone is better than me."', say: '"My only competition is my last month."' }],
    build: ['Limit social media during trading hours.', 'Track your own improvement metrics monthly.', 'Choose one or two trusted sources, not dozens.'],
    trader: ['Others\' results are filtered and often fake; your journal is real.', 'Different strategies have different timelines; copying breaks consistency.', 'Focus on process metrics you control.'],
    science: [
      { point: 'We judge ourselves by comparison to others (social comparison theory).', source: 'Festinger (1954), Human Relations' },
      { point: 'Upward comparison on social media is linked to lower self-esteem.', source: 'Vogel et al. (2014), Psychology of Popular Media Culture' },
    ],
    journal: ['Who am I comparing myself with, and what don\'t I see?', 'How have I improved in 3 months?', 'What does success look like for me?'],
    session: { title: 'Back to your own lane · 3 min', steps: [{ ...SIGH, seconds: 45 }, NAME_IT('behind / compared'), { title: 'Your progress', seconds: 75, kind: 'write', text: 'Write three ways you are better than three months ago — skills, habits, risk control. Real progress is quiet.' }] },
  },

  BURNOUT: {
    feeling: 'I\'m exhausted and don\'t care anymore',
    oneLine: 'Burnout is running on empty: tired, detached and feeling ineffective.',
    simple: {
      what: 'You feel drained, stop caring about your rules, and trading feels heavy or pointless.',
      why: 'Long hours, constant stress and not enough rest wear down your energy. The brain protects itself by detaching.',
      how: 'Sloppy trades, missed sessions, irritability and losing interest in learning.',
    },
    signs: ['Constant tiredness', 'Not caring about results', 'Irritability', 'Trouble sleeping or focusing'],
    doNow: ['Stop trading for today.', 'Drink water, eat, and go outside for 10 minutes.', 'Plan a proper rest day.'],
    ifThen: ['If I slept badly, then I trade half size or not at all.', 'If I feel detached from my rules, then I take a day off.', 'If I trade more than my hours, then I stop at the planned time.'],
    selfTalk: [{ instead: '"I have to push through."', say: '"Rest is part of performance. Tired traders lose money."' }],
    build: ['Fixed trading hours and screen-free time.', 'Sleep, exercise and real breaks.', 'One full rest day a week.'],
    trader: ['Fewer hours of focused trading beat long tired sessions.', 'Recovery is a performance tool, not a reward.', 'Burnout often follows overtrading and drawdowns — reduce both.'],
    science: [
      { point: 'Burnout has three parts: exhaustion, cynicism/detachment and reduced effectiveness.', source: 'Maslach & Leiter (2016), World Psychiatry; WHO ICD-11 (2019) occupational phenomenon' },
      { point: 'Perfectionistic concerns are a strong predictor of burnout.', source: 'Hill & Curran (2016), Personality and Social Psychology Review' },
    ],
    journal: ['When did I last fully rest?', 'What drains me most in trading?', 'What would a sustainable trading week look like?'],
    session: { title: 'Recharge · 5 min', steps: [{ ...SIGH, seconds: 60, breath: 'slow' }, NAME_IT('exhausted'), { title: 'Body scan', seconds: 90, kind: 'notice', text: 'Close your eyes. Move attention slowly from head to feet. Where is tension? Breathe into it and let it soften.' }, { title: 'Plan rest', seconds: 45, kind: 'plan', text: 'Write when your next full rest day is, and one thing that will recharge you today.' }] },
  },

  PRE_MARKET_ANXIETY: {
    feeling: 'I\'m nervous before the session starts',
    oneLine: 'Pre-market nerves are energy — you can turn them into focus.',
    simple: {
      what: 'Before trading you feel nervous, worried about losing, or have a knot in your stomach.',
      why: 'The brain prepares for something important by raising alertness. Without a plan, that energy turns into worry.',
      how: 'Over-checking news, hesitating at the open, or trading too fast to "get it over with".',
    },
    signs: ['Butterflies in the stomach', 'Worry about the day', 'Over-checking news', 'Trouble focusing'],
    doNow: ['Write your worries for 2 minutes.', 'Say: "I feel excited and ready."', 'Run your pre-market checklist.'],
    ifThen: ['If I feel nervous before the session, then I write my worries and run my checklist.', 'If there is red-folder news, then I wait 15 minutes after it.', 'If I can\'t calm down, then I trade half size.'],
    selfTalk: [{ instead: '"I\'m so nervous."', say: '"I\'m excited. My body is getting ready."' }],
    build: ['A fixed morning routine (levels, news, plan, breathing).', 'Expressive writing before important sessions.', 'Prepare the day\'s plan the evening before.'],
    trader: ['Preparation turns anxiety into focus.', 'Know the day\'s news and your levels before the open.', 'A written plan means fewer decisions under pressure.'],
    science: [
      { point: 'Telling yourself "I am excited" (reappraising anxiety as excitement) improved performance more than trying to calm down.', source: 'Brooks (2014), Journal of Experimental Psychology: General' },
      { point: 'Writing about worries for 10 minutes before an exam improved test scores in anxious students.', source: 'Ramirez & Beilock (2011), Science' },
      { point: 'Five minutes a day of cyclic sighing improved mood and reduced breathing rate more than mindfulness meditation.', source: 'Balban et al. (2023), Cell Reports Medicine' },
    ],
    journal: ['What exactly am I worried about today?', 'What is in my control?', 'What is my plan for the key news?'],
    session: { title: 'Pre-market reset · 5 min', steps: [SIGH, { title: 'Empty the worries', seconds: 90, kind: 'write', text: 'Write every worry for 90 seconds, without editing. Getting them on paper frees working memory for the market.' }, { title: 'Reframe', seconds: 30, kind: 'think', text: 'Say out loud: "I am excited. My body is giving me energy for focus."' }, { title: 'Plan', seconds: 60, kind: 'plan', text: 'Check: key levels, news times, max risk today, max trades. Then begin.' }] },
  },

  POST_WIN_OVERCONFIDENCE: {
    feeling: 'I just won big and want more',
    oneLine: 'After a big win, the brain treats profits like "free money" — and risk quietly rises.',
    simple: {
      what: 'After a win or a winning streak you feel unstoppable and take bigger or extra trades.',
      why: 'Winning releases feel-good chemicals and the money starts to feel like "house money" you can play with.',
      how: 'Giving back profits by trading bigger after a big win, or taking low-quality trades right after.',
    },
    signs: ['Feeling euphoric', 'Wanting to trade more right away', 'Increasing size after wins', 'Skipping your checklist'],
    doNow: ['Take a 15-minute break after a big win.', 'Write the win in your journal.', 'Return to your normal size.'],
    ifThen: ['If I have a big win, then I take a 15-minute break.', 'If I reach my daily goal, then I stop or cut risk in half.', 'If I want to increase size, then I wait until the weekly review.'],
    selfTalk: [{ instead: '"I\'m on fire."', say: '"Great execution. Now I protect the profits."' }],
    build: ['Daily profit cap and post-win break.', 'Size changes only at weekly review, based on data.', 'Track trades taken right after big wins.'],
    trader: ['Profits are not house money — they are your money.', 'Winning streaks end; protect gains.', 'Euphoria lowers risk perception — be extra strict after wins.'],
    science: [
      { point: 'After gains, people take more risk with "house money".', source: 'Thaler & Johnson (1990), Management Science' },
      { point: 'Traders\' testosterone rose on days with above-average profits; high levels may increase risk-taking ("winner effect").', source: 'Coates & Herbert (2008), PNAS' },
    ],
    journal: ['What did I do after my last big win?', 'Did I follow my rules after wins?', 'How can I protect profits better?'],
    session: { title: 'Bank the win · 3 min', steps: [{ ...SIGH, seconds: 45, breath: 'slow' }, NAME_IT('euphoric'), { title: 'Protect', seconds: 60, kind: 'plan', text: 'Write: today\'s profit, your daily cap, and "next trade = normal size only". Take 15 minutes away from the screen before anything else.' }] },
  },

  DISCIPLINE_FATIGUE: {
    feeling: 'I know my rules but can\'t follow them',
    oneLine: 'When discipline feels heavy, build systems so you need less willpower, not more.',
    simple: {
      what: 'You know your rules, but after a while following them feels tiring and you start breaking them.',
      why: 'Making many decisions and resisting urges all day is tiring. Relying only on willpower is fragile — good habits and simple rules take the load off.',
      how: 'Breaking rules late in the session, after a long week, or when tired.',
    },
    signs: ['Breaking rules late in the day', 'Thinking "just this once"', 'Skipping the checklist', 'Feeling mentally tired'],
    doNow: ['Stop trading if you have broken a rule today.', 'Simplify: what are your 3 most important rules?', 'Use a physical checklist next to the screen.'],
    ifThen: ['If I break one rule, then I stop trading for the day.', 'If I\'m tired, then I trade only my best setup or not at all.', 'If I think "just this once", then I close the platform.'],
    selfTalk: [{ instead: '"Just this once."', say: '"Every exception becomes the new rule."' }],
    build: ['Fewer, clearer rules.', 'Automate where possible (alerts, hard stops, pre-set lot sizes).', 'Habits take time — about 2 months on average, so be patient.'],
    trader: ['Systems beat willpower.', 'Trade your best hours only.', 'Reduce decisions with checklists and pre-planned levels.'],
    science: [
      { point: 'Forming a habit took a median of 66 days (range 18–254), so consistency matters more than intensity.', source: 'Lally et al. (2010), European Journal of Social Psychology' },
      { point: 'The idea that willpower is a limited fuel ("ego depletion") has failed large replication tests; reducing decisions with rules is more reliable.', source: 'Hagger et al. (2016), Perspectives on Psychological Science' },
      { point: 'If-then plans make good behaviour automatic.', source: 'Gollwitzer & Sheeran (2006)' },
    ],
    journal: ['Which rule do I break most, and when?', 'How can I make that rule easier to follow?', 'What system can replace willpower here?'],
    session: { title: 'Make discipline easy · 4 min', steps: [{ ...SIGH, seconds: 45 }, NAME_IT('tired of the rules'), { title: 'Three rules', seconds: 75, kind: 'write', text: 'Write your 3 most important rules. Keep them short. Put them where you can see them while trading.' }, { title: 'If-then', seconds: 45, kind: 'plan', text: 'For your most-broken rule, write: "If ___, then I ___." Repeat it three times.' }] },
  },
};

/** Quick check-in phrases → category, for the "How do you feel right now?" router. */
export const CHECK_IN: { id: PsychCategoryType; label: string; emoji: string }[] = [
  { id: 'FEAR', label: 'Scared to enter or hold', emoji: '😟' },
  { id: 'REVENGE_TRADING', label: 'Want to win my loss back', emoji: '😤' },
  { id: 'FOMO', label: 'Afraid of missing the move', emoji: '🏃' },
  { id: 'GREED', label: 'Want more — bigger size', emoji: '🤑' },
  { id: 'HESITATION', label: 'Can\'t click my setup', emoji: '🫥' },
  { id: 'OVERCONFIDENCE', label: 'Feel like I can\'t lose', emoji: '😎' },
  { id: 'POST_WIN_OVERCONFIDENCE', label: 'Just won big, want more', emoji: '🚀' },
  { id: 'POST_LOSS_SHAME', label: 'Ashamed after a loss', emoji: '😔' },
  { id: 'LOSS_AVERSION', label: 'Can\'t close my loser', emoji: '🙈' },
  { id: 'IMPATIENCE', label: 'Can\'t wait for my setup', emoji: '⏳' },
  { id: 'BOREDOM_TRADING', label: 'Bored, want action', emoji: '🥱' },
  { id: 'ANALYSIS_PARALYSIS', label: 'Overthinking, can\'t decide', emoji: '🌀' },
  { id: 'PERFECTIONISM', label: 'Nothing is good enough', emoji: '🎯' },
  { id: 'PRE_MARKET_ANXIETY', label: 'Nervous before the open', emoji: '😬' },
  { id: 'COMPARISON_ANXIETY', label: 'Others are doing better', emoji: '👀' },
  { id: 'DISCIPLINE_FATIGUE', label: 'Can\'t follow my rules', emoji: '🔋' },
  { id: 'BURNOUT', label: 'Exhausted, don\'t care', emoji: '🫠' },
];
