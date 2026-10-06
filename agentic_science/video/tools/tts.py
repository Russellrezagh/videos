#!/usr/bin/env python3
"""Synthesize one WAV clip per narrated beat with Piper, and record durations.

usage: tts.py SCRIPT_JSON CLIP_DIR DURATIONS_JSON --model VOICE.onnx [--length-scale 1.08]

SCRIPT_JSON is the list [{id, say}] exported from the page (window.__script).
Clips are cached by a hash of (text, voice, settings), so only edited lines
are synthesized again.
"""
import argparse
import hashlib
import json
import os
import re
import wave

from piper import PiperVoice, SynthesisConfig


def speakable(text: str) -> str:
    # The script is written for speech already; normalise typography only.
    t = text.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    t = t.replace('–', ', ').replace('—', ', ')
    return re.sub(r'\s+', ' ', t).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('script')
    ap.add_argument('clips')
    ap.add_argument('durations')
    ap.add_argument('--model', required=True)
    ap.add_argument('--length-scale', type=float, default=1.08)
    ap.add_argument('--sentence-silence', type=float, default=0.18)
    args = ap.parse_args()

    beats = json.load(open(args.script))
    os.makedirs(args.clips, exist_ok=True)
    voice = PiperVoice.load(args.model)
    cfg = SynthesisConfig(length_scale=args.length_scale, noise_scale=0.6, noise_w_scale=0.8)
    rate = voice.config.sample_rate
    gap = int(rate * args.sentence_silence)
    durations = {}
    made = 0
    for b in beats:
        text = speakable(b['say'])
        key = hashlib.sha256(f"{text}|{os.path.basename(args.model)}|{args.length_scale}|{args.sentence_silence}".encode()).hexdigest()[:16]
        path = os.path.join(args.clips, f"{b['id']}.{key}.wav")
        if not os.path.exists(path):
            # synthesize sentence by sentence, joined by a short silence
            frames = bytearray()
            for chunk in voice.synthesize(text, syn_config=cfg):
                if frames:
                    frames += b'\x00\x00' * gap
                frames += chunk.audio_int16_bytes
            with wave.open(path, 'wb') as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(rate)
                w.writeframes(bytes(frames))
            made += 1
        with wave.open(path) as w:
            durations[b['id']] = round(w.getnframes() / w.getframerate(), 3)
        b['clip'] = path
    json.dump(durations, open(args.durations, 'w'), indent=1, sort_keys=True)
    json.dump(beats, open(os.path.join(args.clips, 'index.json'), 'w'), indent=1)
    total = sum(durations.values())
    print(f'{len(beats)} lines, {made} synthesized, {total / 60:.1f} min of speech')


if __name__ == '__main__':
    main()
