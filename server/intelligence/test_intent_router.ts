import {
  matchDeterministicLexicon,
  redactSensitiveData,
  isDistressSignal,
} from './intentRouter.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

console.log('--- Running Chat Intelligence Intent Router Tests ---');

// Test 1: Economic Calendar match
const cal1 = matchDeterministicLexicon('What high impact news is today for USD?');
assert(cal1 !== null && cal1.capability === 'ECONOMIC_CALENDAR' && cal1.entities.currency === 'USD', 'Economic Calendar USD match');

const cal2 = matchDeterministicLexicon('Is NFP coming out this week?');
assert(cal2 !== null && cal2.capability === 'ECONOMIC_CALENDAR', 'NFP event query match');

// Test 3: Session Clock match
const sess1 = matchDeterministicLexicon('Is London open right now?');
assert(sess1 !== null && sess1.capability === 'SESSION_CLOCK', 'Session Clock London match');

const sess2 = matchDeterministicLexicon('Show session clock and overlap');
assert(sess2 !== null && sess2.capability === 'SESSION_CLOCK', 'Session Clock general match');

// Test 4: Lot Size match
const lot1 = matchDeterministicLexicon('Calculate lot size for EUR/USD with 20 pips stop loss on 10000 balance');
assert(lot1 !== null && lot1.capability === 'LOT_SIZE' && lot1.entities.pair === 'EUR/USD', 'Lot size calculation match');

// Test 5: Crisis / Distress Detection
const crisis1 = matchDeterministicLexicon('I lost everything in this crash, I can not take this anymore');
assert(crisis1 !== null && crisis1.capability === 'CRISIS_RESOURCE' && crisis1.isDistressed === true, 'Distress detection match');

assert(isDistressSignal('I blew my entire life savings and want to die'), 'Crisis signal detected');

// Test 6: Privacy Redaction
const sensitiveInput = 'My email is trader123@gmail.com and phone is +1-555-019-2834, check my account 9876543210 at https://mybroker.com';
const redacted = redactSensitiveData(sensitiveInput);
assert(!redacted.includes('trader123@gmail.com'), 'Email redacted');
assert(!redacted.includes('+1-555-019-2834'), 'Phone redacted');
assert(!redacted.includes('9876543210'), 'Account digits redacted');
assert(!redacted.includes('https://mybroker.com'), 'URL redacted');

// Test 7: Non-matching chit chat
const nonMatch = matchDeterministicLexicon('Hello good morning traders how are you');
assert(nonMatch === null, 'General chitchat returns null for deterministic');

console.log(`\nTests finished: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);
