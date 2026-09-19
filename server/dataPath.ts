import fs from 'fs';
import path from 'path';
import os from 'os';

let resolvedDataDir: string | null = null;

/**
 * Resolves a safe, writable data directory.
 * In local dev / normal servers: uses process.cwd()/data.
 * In serverless / read-only environments (Vercel, AWS Lambda): falls back to os.tmpdir()/primepipfx_data
 * and copies any existing seed JSON files so data is preserved.
 */
export function getDataDir(): string {
  if (resolvedDataDir) return resolvedDataDir;

  const cwdData = path.join(process.cwd(), 'data');

  // Test if cwdData is writable
  let isCwdWritable = false;
  try {
    if (!fs.existsSync(cwdData)) {
      fs.mkdirSync(cwdData, { recursive: true });
    }
    const testFile = path.join(cwdData, `.test_write_${Date.now()}`);
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    isCwdWritable = true;
  } catch {
    isCwdWritable = false;
  }

  if (isCwdWritable && !process.env.VERCEL) {
    resolvedDataDir = cwdData;
    return resolvedDataDir;
  }

  // Fallback to writable temporary directory in serverless environments
  const tmpData = path.join(os.tmpdir(), 'primepipfx_data');
  try {
    if (!fs.existsSync(tmpData)) {
      fs.mkdirSync(tmpData, { recursive: true });
    }
  } catch (e) {
    console.warn('[DATA] Error creating tmpData dir:', e);
  }

  // Seed / copy initial JSON files from process.cwd()/data to tmpData if they exist
  try {
    if (fs.existsSync(cwdData)) {
      const files = fs.readdirSync(cwdData);
      for (const file of files) {
        const src = path.join(cwdData, file);
        const dest = path.join(tmpData, file);
        if (!fs.existsSync(dest)) {
          try {
            const stat = fs.statSync(src);
            if (stat.isFile()) {
              fs.copyFileSync(src, dest);
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn('[DATA] Error copying seed data to tmp directory:', e);
  }

  resolvedDataDir = tmpData;
  return resolvedDataDir;
}

export function ensureDataDir(): string {
  const dir = getDataDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn('[DATA] ensureDataDir warning:', err);
  }
  return dir;
}

export function getDataFilePath(filename: string): string {
  return path.join(getDataDir(), filename);
}

// In-memory fallback cache so that even if filesystem fails completely, app never crashes
const memoryFileCache = new Map<string, string>();

export function safeReadJsonFile<T>(filename: string, fallback: T): T {
  const filePath = getDataFilePath(filename);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      memoryFileCache.set(filename, raw);
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[DATA] Error reading ${filename} from disk:`, err);
  }

  // Check in-memory cache
  if (memoryFileCache.has(filename)) {
    try {
      return JSON.parse(memoryFileCache.get(filename)!);
    } catch {}
  }

  // Also check original seed directory if not yet in tmp
  try {
    const seedPath = path.join(process.cwd(), 'data', filename);
    if (fs.existsSync(seedPath)) {
      const raw = fs.readFileSync(seedPath, 'utf8');
      memoryFileCache.set(filename, raw);
      return JSON.parse(raw);
    }
  } catch {}

  return fallback;
}

export function safeWriteJsonFile<T>(filename: string, data: T): void {
  const raw = JSON.stringify(data, null, 2);
  memoryFileCache.set(filename, raw);
  try {
    ensureDataDir();
    const filePath = getDataFilePath(filename);
    fs.writeFileSync(filePath, raw, 'utf8');
  } catch (err) {
    console.warn(`[DATA] Failed writing ${filename} to disk (kept in memory cache):`, err);
  }
}
