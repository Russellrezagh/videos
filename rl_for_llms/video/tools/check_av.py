#!/usr/bin/env python3
"""Judge the recordings made by check-av.mjs.

For each window:
  level   the recorded voice must not be silent (RMS above -45 dBFS)
  words   every word Whisper hears is placed on the voice clock; it must occur in
          the narration line of a beat on screen within +-0.6 s of that moment.
          At least 90 % of the heard words must match.
  drift   while the voice plays, |picture clock - voice clock| must stay < 0.1 s.

usage: check_av.py REPORT_JSON   (exit 1 when any window fails)
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

NUM = set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen '
          'seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand percent'.split())


def words(text):
    t = text.lower().replace('’', "'").replace('-', ' ')
    return [w for w in re.sub(r"[^a-z0-9' ]", ' ', t).split() if w not in NUM and not w[0].isdigit()]


def close(a, b):
    if a == b:
        return True
    if min(len(a), len(b)) < 5:
        return False
    # one edit apart: "parsimony" heard as "parsimoney"
    if abs(len(a) - len(b)) > 1:
        return False
    i = 0
    while i < min(len(a), len(b)) and a[i] == b[i]:
        i += 1
    return a[i + 1:] == b[i + 1:] or a[i:] == b[i + 1:] or a[i + 1:] == b[i:]


def main():
    report = json.load(open(sys.argv[1]))
    stt = WhisperModel('small.en', device='cpu', compute_type='int8')
    ok_all = True
    print(f"page: {report['url']}\nvoice track: {report['track']}")
    for w in report['windows']:
        if 'error' in w:
            print(f"  window {w['start']:>6}s  FAIL  {w['error']}")
            ok_all = False
            continue
        meta = json.load(open(w['webm'].replace('.webm', '.json')))
        pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', w['webm'], '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(pcm, dtype=np.float32)
        rms_db = 20 * np.log10(float(np.sqrt(np.mean(x ** 2))) + 1e-9)
        segs, _ = stt.transcribe(x, language='en', word_timestamps=True, beam_size=5)
        heard = [(wd.word, (wd.start + wd.end) / 2) for s in segs for wd in s.words]
        samples = meta['samples']
        ws = np.array([s['w'] for s in samples])
        hit = tot = 0
        misses = []
        for text, at in heard:
            for token in words(text):
                tot += 1
                # samples taken within +-0.6 s of the moment this word was spoken
                near = [samples[i]['say'] for i in np.where(np.abs(ws - at) <= 0.6)[0]]
                if any(any(close(token, t) for t in words(say)) for say in near):
                    hit += 1
                else:
                    misses.append(f'{token}@{meta["a0"] + at:.1f}')
        playing = [s for s in samples if s['w'] > 0.3]
        drift = max((abs(s['v'] - s['a']) for s in playing), default=0.0)
        frac = hit / tot if tot else 0.0
        ok = rms_db > -45 and tot >= 10 and frac >= 0.9 and drift < 0.1
        ok_all &= ok
        span = f"{meta['a0']:.1f}-{samples[-1]['a']:.1f}s" if samples else '?'
        print(f"  window {span:>15}  {'PASS' if ok else 'FAIL'}  level {rms_db:5.1f} dBFS  "
              f"words {hit}/{tot} on screen ({100 * frac:.0f} %)  max picture-voice drift {1000 * drift:.0f} ms")
        heard_text = ' '.join(t for t, _ in heard).strip()
        print(f"      heard: {heard_text[:150]}{'…' if len(heard_text) > 150 else ''}")
        if misses:
            print(f"      not on screen: {', '.join(misses[:8])}")
    if report.get('errors'):
        print('page errors:', report['errors'][:3])
        ok_all = False
    print('RESULT:', 'PASS' if ok_all else 'FAIL')
    sys.exit(0 if ok_all else 1)


if __name__ == '__main__':
    main()
