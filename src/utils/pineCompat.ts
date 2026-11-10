/**
 * Compatibility pass applied to Pine source before it runs in the app's Pine engine.
 *
 * The engine mis-evaluates one construct: a logical expression (`and` / `or`) passed DIRECTLY as a
 * function-call argument from inside a function, when an operand is a bare object field
 * (`f(t, on and e.ok)` arrives as false). TradingView evaluates it correctly. The same expression
 * as a ternary condition is evaluated correctly by the engine, so every such argument is rewritten
 *     f(a and b)      →      f(((a and b) ? true : false))
 * which has exactly the same value. Nothing else in the script is touched: comments, strings,
 * function definitions and every non-logical argument stay as written.
 */
const isId = (c: string) => /[A-Za-z0-9_.]/.test(c);
const KEYWORDS = new Set(['if', 'while', 'for', 'switch', 'and', 'or', 'not', 'else', 'in', 'to', 'by', 'return']);

/** Index just past the string / comment starting at i, or i when none starts there. */
function skipLiteral(s: string, i: number): number {
  const c = s[i];
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < s.length && s[j] !== c) { if (s[j] === '\\') j++; j++; }
    return Math.min(s.length, j + 1);
  }
  if (c === '/' && s[i + 1] === '/') { const n = s.indexOf('\n', i); return n < 0 ? s.length : n; }
  return i;
}

/** Index of the bracket closing the one at `open`, or -1. */
function matchClose(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const j = skipLiteral(s, i);
    if (j !== i) { i = j - 1; continue; }
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function splitArgs(s: string): string[] {
  const out: string[] = []; let depth = 0; let start = 0;
  for (let i = 0; i < s.length; i++) {
    const j = skipLiteral(s, i);
    if (j !== i) { i = j - 1; continue; }
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out;
}

/** True when the expression is a logical one at its top level (has and/or, and is not a ternary). */
function isLogical(expr: string): boolean {
  let depth = 0; let logical = false;
  for (let i = 0; i < expr.length; i++) {
    const j = skipLiteral(expr, i);
    if (j !== i) { if (expr[i] === '/') return false; i = j - 1; continue; } // a comment inside the argument: leave it alone
    const c = expr[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0) {
      if (c === '?') return false;
      if ((c === 'a' || c === 'o') && (i === 0 || !isId(expr[i - 1]))) {
        const w = expr.startsWith('and', i) ? 3 : expr.startsWith('or', i) ? 2 : 0;
        if (w && !isId(expr[i + w] || ' ')) logical = true;
      }
    }
  }
  return logical;
}

function fixArg(arg: string): string {
  const named = arg.match(/^(\s*[A-Za-z_]\w*\s*=(?!=))([\s\S]*)$/);
  const head = named ? named[1] : '';
  const body = fix(named ? named[2] : arg);
  if (!isLogical(body)) return head + body;
  const lead = body.match(/^\s*/)![0]; const trail = body.match(/\s*$/)![0];
  return `${head}${lead}((${body.trim()}) ? true : false)${trail}`;
}

function fix(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const j = skipLiteral(s, i);
    if (j !== i) { out += s.slice(i, j); i = j - 1; continue; }
    if (s[i] !== '(') { out += s[i]; continue; }
    const close = matchClose(s, i);
    if (close < 0) { out += s.slice(i); break; }
    const inner = s.slice(i + 1, close);
    let k = i - 1; while (k >= 0 && isId(s[k])) k--;
    const name = s.slice(k + 1, i);
    const isCall = name !== '' && !/^[0-9.]/.test(name) && !KEYWORDS.has(name);
    const isDefinition = /^[ \t]*=>/.test(s.slice(close + 1, close + 12));
    if (isDefinition) out += `(${inner})`;
    else if (isCall) out += `(${splitArgs(inner).map(fixArg).join(',')})`;
    else out += `(${fix(inner)})`;
    i = close;
  }
  return out;
}

export function pineCompat(source: string): string {
  try { const f = fix(String(source || '').replace(/\r\n/g, '\n')); return guardLoops(f) ?? f; } catch { return source; }
}

/**
 * Safety guard for one loop in the script's SBT 8B scan: `for k = <start> to i`. When <start> is the
 * candle AFTER the newest one (start = i + 1), Pine counts DOWN and reads a candle that does not
 * exist yet, which stops the whole script with "Index out of bounds". The guard skips the loop in
 * exactly that case (there is nothing to check yet); every other case is unchanged. It cannot change a result: without it that case can only stop the script.
 */
export function guardLoops(src: string): string | null {
  const lines = src.split('\n');
  const at = lines.findIndex((l) => /^\s+for k = \(s\.tst \? s\.next : math\.max\(s\.next, sI\)\) to i\b/.test(l));
  if (at < 0) return null;
  const indent = lines[at].match(/^\s+/)![0];
  let end = at + 1;
  while (end < lines.length && (lines[end].trim() === '' || lines[end].match(/^\s*/)![0].length > indent.length)) end++;
  while (end > at + 1 && lines[end - 1].trim() === '') end--;
  const block = lines.slice(at, end).map((l) => (l.trim() ? `    ${l}` : l));
  return [...lines.slice(0, at), `${indent}if (s.tst ? s.next : math.max(s.next, sI)) <= i`, ...block, ...lines.slice(end)].join('\n');
}

