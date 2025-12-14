# 📓 BAALSAMIC V18.0 USER GUIDE

**Baalsamic** is a "Time Travel" engine that turns video into static, slit-scan compositions. Unlike a standard screenshot, it captures multiple moments in time simultaneously and stitches them into a single image.

---

## ⚡ Quick Start

1.  **Ingest:** Click **LOAD A FILE** and select a video (`.mp4`, `.mov`).
2.  **Wait:** On mobile devices, allow 5-10 seconds for the engine to perform the initial "Smart Seek" scan.
3.  **Render:** The system will auto-generate a "Golden Start" preview.
4.  **Tweak:** Open the accordions (Memory, Geometry, etc.) to adjust the logic.
5.  **Save:** Click **RENDER** (top right) to download the full-resolution image.

---

## 🎛️ The Controls

The interface is divided into four logic engines. Understanding how they interact is key to controlling the output.

### 1. MEMORY (The Timeline)
*Controls **when** the engine looks at your video.*

* **MODE:**
    * **FIT:** Compresses the *entire* video duration into your image. Good for timelines.
    * **FOCUS:** Zooms in on a specific moment.
* **INDEX:** (Focus Mode only) The specific timestamp where capture begins.
* **SPAN:** (Focus Mode only) The duration of the "Time Window."
    * *Example:* Set Span to `50%` to capture exactly half of the video.

### 2. GEOMETRY (The Space)
*Controls **how** the image is constructed.*

* **DEPTH:** Determines the layering order of the slices.
    * `L>R`: Time flows left-to-right (Standard).
    * `R>L`: Time flows right-to-left.
    * `MIX`: Randomizes layering for a collage effect.
* **STITCHES:** How many slices to cut.
    * *Low (10-20):* Chunky, distinct panels.
    * *High (50+):* Smooth, fluid motion.
* **WIDTH:** The thickness of each slice in pixels.

### 3. RHYTHM (The Pulse)
*Controls the motion and "shutter speed" of the capture.*

* **SMEAR:** Multiplies the width of the slice to create drag.
* **BURST ("The Open Eye"):** How long the camera records *inside* a single stitch.
    * `SOFT` (1 frame): Sharp, frozen moment.
    * `HARD` (10 frames): Reveals motion/blur within the slice.
* **GAP ("The Blink"):** The silence between stitches.
    * *Note:* Baalsamic uses **Elastic Logic**. If you set a specific **Span** (e.g., 5 seconds), the engine will automatically stretch or shrink the Gaps to ensure your image covers exactly 5 seconds.

### 4. THE ENTROPY (The Chaos)
*Controls the imperfections.*

* **JITTER ("The Footing"):**
    * **X-Jitter:** Randomizes the **Width** of every stitch. Breaks the "grid" look.
    * **Y-Jitter:** Randomizes the **Vertical Position** of the source capture. Good for abstract textures.
    * **Z-Jitter:** Rotates stitches randomly. (Use sparingly).

---

## 📱 Mobile Performance Guide

Baalsamic V18 runs entirely in your browser using WebAssembly. This is heavy lifting for a phone.

* **Initialization Speed:** Loading a file on mobile is slower than desktop because the engine performs a "Safety Scan" to prevent frame drift.
* **Battery:** The "Smart Seek" system forces your video chip to jump non-linearly. Extended use will drain battery faster than watching YouTube.
* **Layout:** The interface is optimized for modern devices (like the Pixel 9 Pro), automatically adjusting padding to avoid gesture bars and camera cutouts.

---

## 🔧 Advanced Features

* **!RAD Mode:** Click the `!RAD` button in the header to unlock safety limits.
    * Allows up to **500 Stitches**.
    * Allows extreme Jitter values.
    * *Warning:* May cause browser crashes on lower-end devices.
* **Info Modal:** Click the **( i )** button in the header at any time for a quick refresher on definitions.

---

**Troubleshooting:**
* *Image looks like "Venetian Blinds"?* Increase **X-Jitter** to vary the stitch widths.
* *Render stops halfway?* The engine prevents "Ghost Renders." Wait for the `SCANNING...` indicator to finish before adjusting controls again.
