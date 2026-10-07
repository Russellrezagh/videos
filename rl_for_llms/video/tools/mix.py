#!/usr/bin/env python3
"""Place every narration clip at its beat start and write one WAV track.

usage: mix.py SCHEDULE_JSON CLIP_INDEX_JSON OUT_WAV [--lead 0.15]

SCHEDULE_JSON comes from the page (window.__schedule) after it was given the
real clip durations, so picture and voice use the same timeline.
"""
import argparse
import json
import wave

import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('schedule')
    ap.add_argument('clips_index')
    ap.add_argument('out')
    ap.add_argument('--lead', type=float, default=0.15)
    args = ap.parse_args()

    sched = json.load(open(args.schedule))
    clips = {b['id']: b['clip'] for b in json.load(open(args.clips_index))}
    rate = None
    track = None
    placed = 0
    for b in sched['beats']:
        if b['id'] not in clips:
            continue
        with wave.open(clips[b['id']]) as w:
            if rate is None:
                rate = w.getframerate()
                track = np.zeros(int((sched['duration'] + 2) * rate), dtype=np.float32)
            data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
        start = int((b['start'] + args.lead) * rate)
        end = min(len(track), start + len(data))
        track[start:end] += data[: end - start]
        placed += 1
        # the beat must be long enough for its line
        assert b['start'] + args.lead + len(data) / rate <= b['start'] + b['dur'] + 1e-6, f"clip overruns beat {b['id']}"
    peak = np.max(np.abs(track)) or 1.0
    track = np.clip(track * min(1.0, 30000.0 / peak), -32768, 32767).astype(np.int16)
    with wave.open(args.out, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(track.tobytes())
    print(f'placed {placed} clips, track {len(track) / rate / 60:.2f} min')


if __name__ == '__main__':
    main()
