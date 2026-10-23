#!/usr/bin/env python3
"""export-music.py -- turn a full-quality music master into a shipped track.

The masters live in art/<Name>.mp3 (as delivered, e.g. Garage_Sunset.mp3).
The game ships copies in assets/audio/<key>.mp3 (192 kbps stereo MP3),
where <key> is the master name lowercased with hyphens (garage-sunset). Then
add the key to MUSIC_KEYS in Car_Guy_Sim.html so the radio rotation picks it.

    python3 dev/export-music.py                  # every art/*.mp3 master
    python3 dev/export-music.py Garage_Sunset    # one master

Needs ffmpeg on PATH.
"""
import glob
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTERS = os.path.join(ROOT, "art")
OUT = os.path.join(ROOT, "assets", "audio")
BITRATE = "192k"


def key_for(name):
    return name.lower().replace("_", "-").replace(" ", "-")


def export(src):
    name = os.path.splitext(os.path.basename(src))[0]
    dst = os.path.join(OUT, key_for(name) + ".mp3")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", src, "-map_metadata", "-1",
         "-vn", "-ac", "2", "-ar", "44100", "-b:a", BITRATE, dst],
        check=True,
    )
    kb = os.path.getsize(dst) / 1024
    print(f"{os.path.relpath(src, ROOT)} -> {os.path.relpath(dst, ROOT)} ({kb:.0f} KB)")


def main():
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:]
    srcs = [os.path.join(MASTERS, n + ".mp3") for n in names] if names else sorted(
        glob.glob(os.path.join(MASTERS, "*.mp3")))
    if not srcs:
        sys.exit("export-music: no masters found in art/")
    for s in srcs:
        if not os.path.exists(s):
            sys.exit(f"export-music: missing master {os.path.relpath(s, ROOT)}")
        export(s)


if __name__ == "__main__":
    main()
