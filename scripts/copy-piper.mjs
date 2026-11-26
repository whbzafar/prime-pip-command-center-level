// Copies the self-hosted Urdu voice runtime (espeak phonemizer + onnxruntime wasm) into public/piper so Vite ships it.
import { cpSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
const out = 'public/piper'; mkdirSync(`${out}/ort`, { recursive: true });
const pw = 'node_modules/@diffusionstudio/piper-wasm/build';
for (const f of ['piper_phonemize.js', 'piper_phonemize.wasm', 'piper_phonemize.data']) cpSync(`${pw}/${f}`, `${out}/${f}`);
const od = 'node_modules/onnxruntime-web/dist';
if (existsSync(od)) cpSync(`${od}/ort.wasm.min.js`, `${out}/ort.wasm.min.js`);
if (existsSync(od)) for (const f of readdirSync(od)) if (/^ort-wasm.*\.wasm$/.test(f) && !f.includes('jsep') && !f.includes('training')) cpSync(`${od}/${f}`, `${out}/ort/${f}`);
console.log('piper assets ready');
