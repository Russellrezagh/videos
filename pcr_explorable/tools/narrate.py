#!/usr/bin/env python3
"""Speak the guided animation's script (src/scene.js) and join it into one track.

usage: narrate.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin [--voice af_heart] [--speed 0.95]

Writes narration/script.json (from scene.js), narration/clips/*.wav (cached),
narration/voice.json (offset and duration of each step in the track) and
dist/voice.mp3 (levelled to -17 LUFS). The speech engine is the one the
explainer video uses: agentic_science/video/tools/tts.py (Kokoro-82M).
"""
import argparse
import json
import os
import re
import subprocess
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS = os.path.join(ROOT, '..', 'agentic_science', 'video', 'tools', 'tts.py')
GAP = 0.45  # seconds of silence between steps in the joined track


def scene():
    src = open(os.path.join(ROOT, 'src', 'scene.js'), encoding='utf-8').read()
    return [{'id': f'step{i + 1}', 'say': m.group(1)} for i, m in enumerate(re.finditer(r"say: '((?:[^'\\]|\\.)*)'", src))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--voices', required=True)
    ap.add_argument('--voice', default='af_heart')
    ap.add_argument('--speed', default='0.95')
    a = ap.parse_args()
    nd = os.path.join(ROOT, 'narration')
    os.makedirs(os.path.join(nd, 'clips'), exist_ok=True)
    steps = scene()
    json.dump(steps, open(os.path.join(nd, 'script.json'), 'w'), indent=1)
    subprocess.run(['python3', TTS, os.path.join(nd, 'script.json'), os.path.join(nd, 'clips'), os.path.join(nd, 'durations.json'),
                    '--engine', 'kokoro', '--model', a.model, '--voices', a.voices, '--voice', a.voice, '--speed', a.speed], check=True)
    index = json.load(open(os.path.join(nd, 'clips', 'index.json')))
    parts, offsets, durs, rate = [], [], [], None
    t = 0.0
    for b in index:
        with wave.open(b['clip']) as w:
            rate = rate or w.getframerate()
            x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        offsets.append(round(t, 3))
        durs.append(round(len(x) / rate, 3))
        parts += [x, np.zeros(int(GAP * rate), dtype=np.int16)]
        t += len(x) / rate + GAP
    track = os.path.join(nd, 'clips', 'track.wav')
    with wave.open(track, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(np.concatenate(parts).tobytes())
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', track, '-af', 'loudnorm=I=-17:TP=-1.5:LRA=11',
                    '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '56k', os.path.join(ROOT, 'dist', 'voice.mp3')], check=True)
    json.dump({'offsets': offsets, 'durs': durs, 'voice': a.voice}, open(os.path.join(nd, 'voice.json'), 'w'), indent=1)
    print(f'{len(steps)} steps, {t:.1f} s of narration -> dist/voice.mp3')


if __name__ == '__main__':
    main()
