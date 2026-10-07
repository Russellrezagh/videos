#!/usr/bin/env python3
"""Word timings for every narration clip, so visuals can land on a word.

usage: words.py CLIP_INDEX_JSON OUT_JSON [--model base.en]

Transcribes each clip with faster-whisper (word timestamps) and writes
{ beat_id: [[word, start, end], ...] } with times in seconds from the start
of the clip. The page adds the 0.15 s lead of tools/mix.py. Clips are cached
by their file name (which carries the hash of the spoken text), so only new
or changed lines are transcribed again.
"""
import argparse
import json
import os
import wave

import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('clips_index')
    ap.add_argument('out')
    ap.add_argument('--model', default='base.en')
    args = ap.parse_args()

    clips = json.load(open(args.clips_index))
    cache_file = args.out + '.cache'
    cache = json.load(open(cache_file)) if os.path.exists(cache_file) else {}
    stt = None
    out = {}
    done = 0
    for c in clips:
        key = 'v2:' + os.path.basename(c['clip'])  # v2: padded, see below
        if key not in cache:
            if stt is None:
                from faster_whisper import WhisperModel
                stt = WhisperModel(args.model, device='cpu', compute_type='int8')
            with wave.open(c['clip']) as w:
                rate = w.getframerate()
                x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            if rate != 16000:
                n = int(len(x) * 16000 / rate)
                x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
            # A clip ends abruptly; Whisper then tends to invent a repeated tail.
            # A second of silence after the speech, and no carry-over between
            # windows, stop that. Any word that still starts past the speech is dropped.
            end = len(x) / 16000
            x = np.concatenate([x, np.zeros(16000, np.float32)])
            segs, _ = stt.transcribe(x, language='en', word_timestamps=True, beam_size=5,
                                     condition_on_previous_text=False)
            cache[key] = [[w.word.strip(), round(w.start, 3), round(min(w.end, end), 3)]
                          for s in segs for w in s.words if w.start < end - 0.02]
            done += 1
        out[c['id']] = cache[key]
    json.dump(cache, open(cache_file, 'w'))
    json.dump(out, open(args.out, 'w'), indent=0)
    print(f'word timings: {len(out)} lines, {done} transcribed')


if __name__ == '__main__':
    main()
