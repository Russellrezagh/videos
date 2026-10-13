"""Synthesize the narration with Piper and lay it out on the video timeline.

Usage: python3 tts.py <voice_dir> <out_dir>

Reads ../src/script.json, writes one clip per line (cached by text), then
  <out_dir>/narration.mp3   the full narration track, silence between lines
  <out_dir>/timing.json     scene and line start times measured from the real clips
The page uses timing.json as its clock, so visuals stay locked to the voice.
"""
import hashlib, json, os, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
voice_dir, out_dir = sys.argv[1], sys.argv[2]
script = json.load(open(os.path.join(HERE, "..", "src", "script.json")))
voice = os.path.join(voice_dir, script["voice"] + ".onnx")
clip_dir = os.path.join(out_dir, "clips")
os.makedirs(clip_dir, exist_ok=True)

RATE = None


def synth(text):
    """Return mono float32 samples for one line, trimmed of edge silence."""
    global RATE
    h = hashlib.sha1((text + str(script["lengthScale"])).encode()).hexdigest()[:16]
    path = os.path.join(clip_dir, h + ".wav")
    if not os.path.exists(path):
        subprocess.run(
            [sys.executable, "-m", "piper", "-m", voice, "-f", path,
             "--length-scale", str(script["lengthScale"]), "--sentence-silence", "0.25"],
            input=text.encode(), check=True, capture_output=True)
    with wave.open(path) as w:
        RATE = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    loud = np.where(np.abs(x) > 0.01)[0]
    if len(loud):
        x = x[max(0, loud[0] - int(0.03 * RATE)): loud[-1] + int(0.08 * RATE)]
    return x


gap = script["gap"]
timeline, clips, T = [], [], 0.0
for sc in script["scenes"]:
    start = T
    t = sc["lead"]
    lines = []
    for ln in sc["lines"]:
        x = synth(ln.get("say", ln["t"]))
        d = len(x) / RATE
        clips.append((start + t, x))
        lines.append({"start": round(t, 3), "dur": round(d, 3)})
        t += d + gap
    dur = t + sc["tail"]
    timeline.append({"key": sc["key"], "start": round(start, 3), "dur": round(dur, 3), "lines": lines})
    T += dur
    print(f'{sc["key"]:13s} {start:7.1f}s  +{dur:5.1f}s')

total = T
print(f"total {total:.1f}s = {int(total // 60)}:{int(total % 60):02d}")

track = np.zeros(int((total + 1) * RATE), dtype=np.float32)
for t0, x in clips:
    i = int(t0 * RATE)
    track[i:i + len(x)] += x
pcm = (np.clip(track, -1, 1) * 32767).astype(np.int16)
wav_path = os.path.join(out_dir, "narration.wav")
with wave.open(wav_path, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-ac", "1", "-b:a", "40k",
                os.path.join(out_dir, "narration.mp3")], check=True)
json.dump({"total": round(total, 3), "scenes": timeline}, open(os.path.join(out_dir, "timing.json"), "w"), indent=1)
