#!/usr/bin/env python3
"""Synthesize one WAV clip per narrated beat, and record the durations.

usage:
  tts.py SCRIPT_JSON CLIP_DIR DURATIONS_JSON --engine kokoro \
      --model kokoro-v1.0.onnx --voices voices-v1.0.bin [--voice af_heart] [--speed 0.95]
  tts.py SCRIPT_JSON CLIP_DIR DURATIONS_JSON --engine piper \
      --model en_US-lessac-medium.onnx [--length-scale 1.08]

SCRIPT_JSON is the list [{id, say}] exported from the page (window.__script).

Domain:
  Voice  = an engine plus its settings: engine, voice id, speed, model files.
           Its fingerprint (names, sizes and a hash of each model file's head)
           is part of every clip's cache key, so a new model or voice re-makes
           every clip, and an edited line re-makes only that clip.
  Clip   = one beat's line, spoken: trimmed of edge silence, set to a common
           loudness, 16-bit mono WAV at the engine's sample rate.

Engines:
  kokoro  Kokoro-82M (Apache-2.0) through kokoro-onnx: onnxruntime only, no
          PyTorch, runs on a CPU at about 4x real time. Natural prosody.
          Model files: github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
  piper   Piper VITS voices: very fast, flatter delivery.
"""
import argparse
import hashlib
import json
import os
import re
import wave

import numpy as np

TARGET_RMS = 0.075  # about -22.5 dBFS of speech; the mixer sets the final peak


def speakable(text: str) -> str:
    # The script is written for speech already; normalise typography only.
    t = text.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    t = t.replace('–', ', ').replace('—', ', ')
    return re.sub(r'\s+', ' ', t).strip()


LETTER = '⟨A⟩'


def mark_letters(text: str) -> str:
    """Mark each capital A that names a species or a base: one that does not
    start a sentence ("species A and C", "pairs A with B", "A, C, G, and T").
    A sentence-initial A is the article ("A tool computes..."). Phonemizers
    read both as the article, so the mark makes the letter explicit; it is
    also part of the cache key, so only lines with a letter are re-spoken."""
    out, last = [], 0
    for m in re.finditer(r'\bA\b', text):
        before = text[:m.start()].rstrip()
        if before and before[-1] not in '.!?':
            out.append(text[last:m.start()] + LETTER)
            last = m.end()
    return ''.join(out) + text[last:]


def file_fingerprint(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read(1 << 20))
    return f'{os.path.basename(path)}:{os.path.getsize(path)}:{h.hexdigest()[:12]}'


class Kokoro:
    rate = 24000

    def __init__(self, args):
        from kokoro_onnx import Kokoro as K
        if not args.voices:
            raise SystemExit('--engine kokoro needs --voices voices-v1.0.bin')
        self.k = K(args.model, args.voices)
        self.voice, self.speed, self.lang = args.voice or 'af_heart', args.speed, args.lang
        self.sig = f'kokoro|{self.voice}|{self.speed}|{self.lang}|{file_fingerprint(args.model)}|{file_fingerprint(args.voices)}'

    def speak(self, text):
        if LETTER in text:
            # phonemize around each letter and insert the letter's own sound
            parts = [self.k.tokenizer.phonemize(p, self.lang).strip() for p in text.split(LETTER)]
            ph = parts[0]
            for p in parts[1:]:
                ph += ' ˈeɪ' + (p if p[:1] in ',.;:!?' else ' ' + p)
            x, sr = self.k.create(ph.strip(), voice=self.voice, speed=self.speed, lang=self.lang, is_phonemes=True)
        else:
            x, sr = self.k.create(text, voice=self.voice, speed=self.speed, lang=self.lang)
        assert sr == self.rate, sr
        return np.asarray(x, dtype=np.float32).reshape(-1)


class Piper:
    def __init__(self, args):
        from piper import PiperVoice, SynthesisConfig
        self.v = PiperVoice.load(args.model)
        self.cfg = SynthesisConfig(length_scale=args.length_scale, noise_scale=0.6, noise_w_scale=0.8)
        self.rate = self.v.config.sample_rate
        self.gap = np.zeros(int(self.rate * 0.18), dtype=np.float32)
        self.sig = f'piper|{args.length_scale}|{file_fingerprint(args.model)}'

    def speak(self, text):
        parts = []
        for chunk in self.v.synthesize(text.replace(LETTER, 'A'), syn_config=self.cfg):
            if parts:
                parts.append(self.gap)
            parts.append(np.frombuffer(chunk.audio_int16_bytes, dtype=np.int16).astype(np.float32) / 32768)
        return np.concatenate(parts)


ENGINES = {'kokoro': Kokoro, 'piper': Piper}


def finish(x, rate):
    """Trim edge silence (keep 30 ms before, 120 ms after) and level the clip."""
    idx = np.where(np.abs(x) > 0.004)[0]
    if len(idx):
        x = x[max(0, idx[0] - int(0.03 * rate)): min(len(x), idx[-1] + int(0.12 * rate))]
    rms = float(np.sqrt(np.mean(x ** 2))) or 1.0
    x = x * (TARGET_RMS / rms)
    peak = float(np.max(np.abs(x))) or 1.0
    if peak > 0.97:
        x = x * (0.97 / peak)
    return (x * 32767).astype(np.int16)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('script')
    ap.add_argument('clips')
    ap.add_argument('durations')
    ap.add_argument('--engine', choices=sorted(ENGINES), default='kokoro')
    ap.add_argument('--model', required=True)
    ap.add_argument('--voices', help='kokoro: voices-v1.0.bin')
    ap.add_argument('--voice', help='kokoro voice id (default af_heart)')
    ap.add_argument('--speed', type=float, default=0.95, help='kokoro speaking rate')
    ap.add_argument('--lang', default='en-us', help='kokoro phonemizer language')
    ap.add_argument('--length-scale', type=float, default=1.08, help='piper: larger is slower')
    args = ap.parse_args()

    beats = json.load(open(args.script))
    os.makedirs(args.clips, exist_ok=True)
    engine = ENGINES[args.engine](args)
    durations = {}
    made = 0
    for b in beats:
        text = mark_letters(speakable(b['say']))
        key = hashlib.sha256(f'{engine.sig}|{text}'.encode()).hexdigest()[:16]
        path = os.path.join(args.clips, f"{b['id']}.{key}.wav")
        if not os.path.exists(path):
            pcm = finish(engine.speak(text), engine.rate)
            with wave.open(path, 'wb') as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(engine.rate)
                w.writeframes(pcm.tobytes())
            made += 1
            print(f'  {made:3d}  {b["id"]}', flush=True)
        with wave.open(path) as w:
            durations[b['id']] = round(w.getnframes() / w.getframerate(), 3)
        b['clip'] = path
    json.dump(durations, open(args.durations, 'w'), indent=1, sort_keys=True)
    json.dump(beats, open(os.path.join(args.clips, 'index.json'), 'w'), indent=1)
    meta = {'engine': args.engine, 'voice': getattr(engine, 'voice', os.path.basename(args.model)), 'signature': engine.sig}
    json.dump(meta, open(os.path.join(os.path.dirname(args.durations), 'voice.json'), 'w'), indent=1)
    total = sum(durations.values())
    print(f'{len(beats)} lines, {made} synthesized, {total / 60:.1f} min of speech  [{engine.sig}]')


if __name__ == '__main__':
    main()
