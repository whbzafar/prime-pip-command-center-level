import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ffmpegArgs, finishVideo, parseProbe, canCopyVideo, copyArgs } from '../../server/finish';

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

describe('fast path (copy the picture, fix the sound)', () => {
  it('reads codecs and size from the ffmpeg banner', () => {
    const p = parseProbe("Stream #0:0: Video: h264 (High), yuv420p, 1080x1920, 6000 kb/s, 30 fps, 30 tbr\n  Stream #0:1: Audio: aac (LC), 48000 Hz, stereo");
    expect(p).toMatchObject({ vcodec: 'h264', acodec: 'aac', w: 1080, h: 1920, fps: 30 }); expect(canCopyVideo(p)).toBe(true);
  });
  it('re-encodes anything that is not H.264 or is oversized', () => {
    expect(canCopyVideo(parseProbe("Stream #0:0: Video: vp9, yuv420p, 1080x1920, 30 fps"))).toBe(false);
    expect(canCopyVideo(parseProbe("Stream #0:0: Video: h264, yuv420p, 3840x2160, 30 fps"))).toBe(false);
    expect(canCopyVideo({})).toBe(false);
  });
  it('copy args keep the picture and normalise loudness', () => { const a = copyArgs('a.mp4', 'b.mp4').join(' '); expect(a).toContain('-c:v copy'); expect(a).toContain('loudnorm'); expect(a).toContain('+faststart'); });
  it('turns a real H.264 MP4 into a fast-start MP4 without re-encoding the picture', async () => {
    const bin = (await import('ffmpeg-static')).default as unknown as string;
    const t = spawnSync(bin, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=30:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '/tmp/pp-test-h264.mp4']);
    expect(t.status).toBe(0);
    const out = await finishVideo(readFileSync('/tmp/pp-test-h264.mp4'), 'mp4');
    expect(out.length).toBeGreaterThan(1000); expect(out.subarray(4, 8).toString()).toBe('ftyp');
  }, 60000);
});
