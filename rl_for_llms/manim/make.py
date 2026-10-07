#!/usr/bin/env python3
"""Build Three Landscapes end to end.

  python3 manim/make.py --manim <path to the manim executable> \
      --model kokoro-v1.0.onnx --voices voices-v1.0.bin [--quality 1080] [--only-assemble]

1. check the model against the film's kernel      (test_landscapes.py)
2. write the narration script from the model       (script.py)
3. typeset the formulas                            (tex.mjs, MathJax)
4. speak the lines                                 (../video/tools/tts.py, Kokoro, cached)
5. render each scene                               (Manim Community, scenes.py)
6. assemble: the scenes' pictures back to back; one voice track placed from
   the scenes' cues, mixed to -17 LUFS like the main film; the captions as a
   soft subtitle track and an .srt beside the film.

Output: manim/dist/three-landscapes.mp4 and .srt
"""
import argparse
import json
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCENES = ['Title', 'Logits', 'Clip', 'Dome', 'End']
RATE = 24000


def run(*cmd, **kw):
    print('  $', ' '.join(str(c) for c in cmd)[:160])
    subprocess.run([str(c) for c in cmd], check=True, cwd=ROOT, **kw)


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True).stdout
    return float(out)


def srt_time(t):
    ms = int(round(t * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--manim', default='manim')
    ap.add_argument('--model')
    ap.add_argument('--voices')
    ap.add_argument('--quality', default='1080', choices=['480', '720', '1080'])
    ap.add_argument('--only-assemble', action='store_true')
    a = ap.parse_args()
    media = os.path.join(HERE, 'media')
    size = {'480': ('854,480', 15), '720': ('1280,720', 30), '1080': ('1920,1080', 30)}[a.quality]

    if not a.only_assemble:
        print('1. model vs kernel')
        run(sys.executable, 'manim/test_landscapes.py')
        print('2. script')
        run(sys.executable, 'manim/script.py')
        print('3. formulas')
        run('node', 'manim/tex.mjs')
        print('4. voice')
        run(sys.executable, 'video/tools/tts.py', 'manim/narration/script.json', 'manim/narration/clips',
            'manim/narration/durations.json', '--engine', 'kokoro', '--model', a.model, '--voices', a.voices,
            '--voice', 'af_heart', '--speed', '0.95')
        print('5. render')
        procs = [subprocess.Popen([a.manim, '-r', size[0], '--frame_rate', str(size[1]), '--disable_caching',
                                   '--media_dir', media, 'manim/scenes.py', s], cwd=ROOT,
                                  stdout=subprocess.DEVNULL, stderr=open(os.path.join(media, f'{s}.log'), 'w')
                                  if os.path.isdir(media) else subprocess.DEVNULL) for s in SCENES]
        if any(p.wait() for p in procs):
            sys.exit('a scene failed to render; see manim/media/<Scene>.log')

    print('6. assemble')
    folder = os.path.join(media, 'videos', 'scenes', f'{size[0].split(",")[1]}p{size[1]}')
    parts = [os.path.join(folder, f'{s}.mp4') for s in SCENES]
    dist = os.path.join(HERE, 'dist')
    os.makedirs(dist, exist_ok=True)
    listing = os.path.join(dist, 'parts.txt')
    open(listing, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    picture = os.path.join(dist, 'picture.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listing, '-map', '0:v', '-c', 'copy', picture)

    clips = {c['id']: c['clip'] for c in json.load(open(os.path.join(HERE, 'narration', 'clips', 'index.json')))}
    total = duration(picture)
    track = np.zeros(int(total * RATE) + RATE, np.float32)
    subs, offset, n = [], 0.0, 0
    for s, part in zip(SCENES, parts):
        cues_file = os.path.join(HERE, 'narration', f'{s}.cues.json')
        cues = json.load(open(cues_file))['cues'] if os.path.exists(cues_file) else []
        for c in cues:
            with wave.open(os.path.join(ROOT, clips[c['id']])) as w:
                assert w.getframerate() == RATE
                x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
            i = int((offset + c['start']) * RATE)
            track[i:i + len(x)] += x[:len(track) - i]
            n += 1
            subs.append(f"{n}\n{srt_time(offset + c['start'])} --> {srt_time(offset + c['end'])}\n{c['cap']}\n")
        offset += duration(part)
    voice = os.path.join(dist, 'voice.wav')
    with wave.open(voice, 'wb') as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(RATE)
        w.writeframes((np.clip(track, -1, 1) * 32767).astype(np.int16).tobytes())
    srt = os.path.join(dist, 'three-landscapes.srt')
    open(srt, 'w').write('\n'.join(subs))
    out = os.path.join(dist, 'three-landscapes.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', picture, '-i', voice, '-i', srt, '-map', '0:v', '-map', '1:a', '-map', '2',
        '-c:v', 'copy', '-af', 'loudnorm=I=-17:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '128k',
        '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng', '-movflags', '+faststart', '-shortest', out)
    os.remove(picture), os.remove(voice), os.remove(listing)
    print(f'{out}  {os.path.getsize(out) / 1e6:.1f} MB  {duration(out) / 60:.2f} min  {n} lines')


if __name__ == '__main__':
    main()
