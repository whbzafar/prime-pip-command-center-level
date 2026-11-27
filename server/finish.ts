import { spawn } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/* Final pass for recorded videos, done with ffmpeg (free, open source): H.264 + AAC MP4 that Instagram, Facebook, TikTok and
   YouTube accept, loudness set to the level short-video apps use (-14 LUFS), fast-start so it plays while loading. */

export function ffmpegArgs(input: string, output: string, srt?: string): string[] {
  const vf = ["scale=trunc(iw/2)*2:trunc(ih/2)*2", "format=yuv420p"];
  if (srt) vf.unshift(`subtitles=${srt.replace(/\\/g, "/").replace(/:/g, "\\:")}:force_style='Fontsize=22,PrimaryColour=&H0000FFFF,Outline=2'`);
  return ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-vf", vf.join(","), "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-profile:v", "high", "-level", "4.1",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", output];
}

async function ffmpegPath(): Promise<string> {
  try { const m: any = await import("ffmpeg-static"); const p = m.default || m; if (typeof p === "string" && p) return p; } catch { /* use PATH */ }
  return "ffmpeg";
}

export async function finishVideo(data: Buffer, ext = "webm"): Promise<Buffer> {
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
  const bin = await ffmpegPath();
  await new Promise<void>((resolve, reject) => {
    const p = spawn(bin, ffmpegArgs(inp, out), { stdio: ["ignore", "ignore", "pipe"] }); let err = "";
    const t = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("ffmpeg timed out")); }, 600_000);
    p.stderr.on("data", (d) => { err += String(d).slice(0, 2000); });
    p.on("error", (e) => { clearTimeout(t); reject(e); });
    p.on("close", (c) => { clearTimeout(t); c === 0 ? resolve() : reject(new Error(err.trim().slice(-300) || `ffmpeg exited ${c}`)); });
  });
}
