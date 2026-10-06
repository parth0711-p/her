#!/usr/bin/env python3
"""
Records the garden page as a vertical phone-sized video (the "website" part of the reel).

One-time setup:
    pip install playwright
    playwright install chromium

Run:
    python record_demo.py                     # records index.html next to this file
    python record_demo.py https://your.link/  # or record your live page

Output: garden-demo.webm  (convert to mp4 with:  ffmpeg -i garden-demo.webm -c:v libx264 -pix_fmt yuv420p garden-demo.mp4)
"""
import shutil
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
url = sys.argv[1] if len(sys.argv) > 1 else (HERE / "index.html").as_uri()

WIDTH, HEIGHT = 720, 1280       # 9:16, same size as the original reel
TAP_AT = 12.5                   # seconds: when the "Open Special Letter" button gets tapped
END_AT = 18.0                   # seconds: total length

with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(
        viewport={"width": WIDTH, "height": HEIGHT},   # must match the recording size
        device_scale_factor=1,
        record_video_dir=tmp,
        record_video_size={"width": WIDTH, "height": HEIGHT},
    )
    page = ctx.new_page()
    page.goto(url)
    page.wait_for_timeout(int(TAP_AT * 1000))
    page.click("#openLetter")
    page.wait_for_timeout(int((END_AT - TAP_AT) * 1000))
    video_path = page.video.path()
    ctx.close()                 # the video file is finalised when the context closes
    browser.close()
    shutil.copy(video_path, HERE / "garden-demo.webm")

print("Saved garden-demo.webm")
