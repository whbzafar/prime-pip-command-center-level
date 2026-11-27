import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/* Final pass for recorded videos, done with ffmpeg (free, open source): H.264 + AAC MP4 that Instagram, Facebook, TikTok and
   YouTube accept, loudness set to the level short-video apps use (-14 LUFS), fast-start so it plays while loading. */

/** How much memory the container still has free (cgroup v2/v1), or null when it cannot be read. */
export function freeMemoryMb(): number | null {
  try {
    const rd = (f: string) => readFileSync(f, "utf8").trim();
    for (const [lim, cur] of [["/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory.current"], ["/sys/fs/cgroup/memory/memory.limit_in_bytes", "/sys/fs/cgroup/memory/memory.usage_in_bytes"]]) {
      try { const l = rd(lim); if (l === "max") continue; const free = (Number(l) - Number(rd(cur))) / 1048576; if (isFinite(free) && free > 0 && free < 1e6) return free; } catch { /* next */ }
    }
  } catch { /* unreadable */ }
  return null;
}
/** 1080 wide when there is room, 720 wide when memory is tight: a smaller picture is better than a crashed server. */
export const pickWidth = () => { const f = freeMemoryMb(); return f === null ? 720 : f < 190 ? 540 : f < 330 ? 720 : 1080; };

export function ffmpegArgs(input: string, output: string, srt?: string, width = pickWidth()): string[] {
  // Memory-lean on purpose: the host has 512 MB in total, shared with the app. One thread, no look-ahead, no B-frames and a single
  // reference frame keep the encoder around 100–150 MB, and the picture is capped at 1080 wide (the most Instagram/Facebook show).
  const vf = [`scale='min(${width},trunc(iw/2)*2)':-2`, "format=yuv420p"];
  if (srt) vf.unshift(`subtitles=${srt.replace(/\\/g, "/").replace(/:/g, "\\:")}:force_style='Fontsize=22,PrimaryColour=&H0000FFFF,Outline=2'`);
  return ["-y", "-hide_banner", "-loglevel", "error", "-threads", "1", "-filter_threads", "1", "-i", input, "-vf", vf.join(","), "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-profile:v", "high", "-level", "4.1",
    "-x264-params", "threads=1:rc-lookahead=8:bframes=0:ref=1:sync-lookahead=0", "-maxrate", "9M", "-bufsize", "9M",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-max_muxing_queue_size", "256", output];
}

/** Only one conversion at a time, so two recordings can never double the memory use. */
let encodeQueue: Promise<unknown> = Promise.resolve();
export const oneAtATime = <T>(fn: () => Promise<T>): Promise<T> => { const p = encodeQueue.then(fn, fn); encodeQueue = p.catch(() => undefined); return p; };

async function ffmpegPath(): Promise<string> {
  try { const m: any = await import("ffmpeg-static"); const p = m.default || m; if (typeof p === "string" && p) return p; } catch { /* use PATH */ }
  return "ffmpeg";
}

export async function finishVideo(data: Buffer, ext = "webm"): Promise<Buffer> {
  return oneAtATime(() => finishVideoNow(data, ext));
}
async function finishVideoNow(data: Buffer, ext: string): Promise<Buffer> {
  const id = randomUUID(); const inp = join(tmpdir(), `pp-in-${id}.${ext === "mp4" ? "mp4" : "webm"}`); const out = join(tmpdir(), `pp-out-${id}.mp4`);
  await writeFile(inp, data);
  try {
    const bin = await ffmpegPath();
    await new Promise<void>((resolve, reject) => {
      const p = spawn(bin, ffmpegArgs(inp, out), { stdio: ["ignore", "ignore", "pipe"] }); let err = "";
      const t = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("ffmpeg timed out")); }, 240_000);
      p.stderr.on("data", (d) => { err += String(d).slice(0, 2000); });
      p.on("error", (e) => { clearTimeout(t); reject(e); });
      p.on("close", (c) => { clearTimeout(t); c === 0 ? resolve() : reject(new Error(err.trim().slice(-300) || `ffmpeg exited ${c}`)); });
    });
    return await readFile(out);
  } finally { unlink(inp).catch(() => {}); unlink(out).catch(() => {}); }
}

/** Same conversion working on files (no big buffers in memory). */
export async function finishFile(inp: string, out: string): Promise<void> {
  return oneAtATime(() => runFinish(inp, out));
}
async function runFinish(inp: string, out: string): Promise<void> {
  const bin = await ffmpegPath();
  await new Promise<void>((resolve, reject) => {
    const p = spawn(bin, ffmpegArgs(inp, out), { stdio: ["ignore", "ignore", "pipe"] }); let err = "";
    const t = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("ffmpeg timed out")); }, 600_000);
    p.stderr.on("data", (d) => { err += String(d).slice(0, 2000); });
    p.on("error", (e) => { clearTimeout(t); reject(e); });
    p.on("close", (c) => { clearTimeout(t); c === 0 ? resolve() : reject(new Error(err.trim().slice(-300) || `ffmpeg exited ${c}`)); });
  });
}
