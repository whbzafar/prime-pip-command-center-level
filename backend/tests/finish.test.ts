import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ffmpegArgs, finishVideo } from '../../server/finish';

describe('ffmpegArgs', () => {
  it('makes H.264 + AAC, even sizes, loudness and fast start', () => {
    const a = ffmpegArgs('in.webm', 'out.mp4').join(' ');
    expect(a).toContain('libx264'); expect(a).toContain('yuv420p'); expect(a).toContain('loudnorm'); expect(a).toContain('+faststart'); expect(a).toContain('aac');
  });
  it('can burn subtitles', () => { expect(ffmpegArgs('a.webm', 'b.mp4', '/tmp/x.srt').join(' ')).toContain('subtitles='); });
});

describe('finishVideo', () => {
  it('turns a real WebM into a playable MP4', async () => {
    const bin = (await import('ffmpeg-static')).default as unknown as string;
    const t = spawnSync(bin, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:v', 'libvpx', '-c:a', 'libopus', '-shortest', '/tmp/pp-test.webm']);
    expect(t.status).toBe(0);
    const out = await finishVideo(readFileSync('/tmp/pp-test.webm'), 'webm');
    expect(out.length).toBeGreaterThan(1000); expect(out.subarray(4, 8).toString()).toBe('ftyp');
  }, 60000);
});
