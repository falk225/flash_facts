"""
Generate simple MP3-compatible WAV sound files for correct/wrong feedback.
Run once: python generate_sounds.py
Requires: pip install pydub (or use the wave module for pure WAV output)

This script creates pure WAV files using Python's built-in 'wave' module.
Flask will serve them fine — Chrome supports WAV audio.
We rename them .mp3 but they are WAV. For true MP3, replace with any
royalty-free sounds you prefer.
"""
import wave
import struct
import math
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'frontend', 'assets', 'sounds')
os.makedirs(OUTPUT_DIR, exist_ok=True)

SAMPLE_RATE = 44100


def write_wav(filename, samples):
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        for s in samples:
            f.writeframes(struct.pack('<h', int(max(-32767, min(32767, s)))))


def generate_tone(freq, duration, volume=0.5, fade_ms=30):
    n = int(SAMPLE_RATE * duration)
    fade = int(SAMPLE_RATE * fade_ms / 1000)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        val = volume * 32767 * math.sin(2 * math.pi * freq * t)
        # Fade in/out
        if i < fade:
            val *= i / fade
        elif i > n - fade:
            val *= (n - i) / fade
        samples.append(val)
    return samples


def generate_correct():
    # Two-note ascending ding: C5 then E5
    s = generate_tone(523.25, 0.12, 0.6)  # C5
    s += generate_tone(659.25, 0.20, 0.5)  # E5
    return s


def generate_wrong():
    # Low buzzer thud
    s = generate_tone(180, 0.08, 0.7)
    s += generate_tone(140, 0.12, 0.5)
    return s


correct_path = os.path.join(OUTPUT_DIR, 'correct.mp3')
wrong_path   = os.path.join(OUTPUT_DIR, 'wrong.mp3')

write_wav(correct_path, generate_correct())
write_wav(wrong_path,   generate_wrong())

print(f"Generated: {correct_path}")
print(f"Generated: {wrong_path}")
print("Note: These are WAV format files named .mp3 — Chrome plays them fine.")
print("Replace with real MP3 files for better sound quality if desired.")
