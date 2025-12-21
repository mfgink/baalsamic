# BAALSAMIC

**v19.14 "Time Travel" Release**

Baalsamic is a browser-based, single-file **Slit-Scan Generator**. It uses WebAssembly (Pyodide) to run a full Python image processing engine entirely inside your web browser, allowing for "Darkroom-style" temporal photography manipulation without server-side processing.

> **Status:** Stable / Beta
> **Architecture:** HTML5 + CSS3 + Pyodide (WASM) v0.24.1

---

## ⚡ What's New in v19.14

* **Visual Timeline Ruler:** Added a dynamic, pink-and-teal ruler above the canvas. It provides precise timestamps (`0.0s` to `Duration`) and updates purely based on your `Index` and `Span` settings (Focus Mode aware).
* **Race Condition Fix:** Implemented a `Job ID` system to prevent "Teal Flicker." Stale renders now die silently in the background if a new configuration change is made.
* **Smart Lock:** The interface no longer "hard locks" immediately upon changing a setting. You can tweak multiple sliders (e.g., Gap + Burst) during the debounce period.
* **Engine Stability:** Reverted Pyodide engine to `v0.24.1` to resolve infinite loading loops and recursion errors on mobile/desktop.
* **Mobile Layout Fixes:** Corrected the "Render" button expansion logic to prevent layout shifting on narrower screens (Pixel 9 Pro/iPhone).

---

## 🎛️ Core Features

Baalsamic organizes slit-scanning into four logical "Dimensions" of control:

### 1. MEMORY (Time)

* **Mode:** Switch between `FIT` (Use whole video) and `FOCUS` (Target specific moment).
* **Index:** Sets the center point of the capture in the video timeline.
* **Span:** Determines the duration (width of time) to capture.

### 2. GEOMETRY (Space)

* **Depth:** Controls the draw order (`LTR`, `RTL`, or `MIX`).
* **Stitch Count:** How many distinct slices to cut from time.
* **Width:** The pixel width of each slice.

### 3. RHYTHM (Motion)

* **Burst:** How long the "shutter" stays open for a single stitch (Soft vs. Hard motion blur).
* **Gap:** The amount of time skipped *between* stitches (The "Blink").
* **Smear:** Artificial motion blur multiplier (1x - 3x).

### 4. ENTROPY (Chaos)

* **Jitter (X/Y):** Randomizes the spatial placement of stitches to create "shredded" effects.
* **Jitter (Z):** Randomizes the *time* selection for each stitch, breaking linear causality.

---

## 🛠️ Technical Architecture

Baalsamic is unique because it is a **Polyglot Monolith** contained in a single file.

* **Frontend:** Standard HTML/CSS. Handles UI state, debounce timers, and canvas rendering.
* **Backend:** Python (running in WASM). Handles the heavy lifting of video buffer seeking, slicing, and pixel manipulation.
* **Data Bridge:** JavaScript passes configuration objects to Python; Python returns raw pixel buffers or Base64 images to the JS Canvas.

### Requirements

* A modern web browser (Chrome/Edge/Firefox/Safari) with WebAssembly support.
* **No Server Required:** You can run this locally by simply opening the `index.html` file.

---

## 🚀 How to Run locally

1. Clone this repository.
2. Open `index.html` in your browser.
3. Wait for the **"BOOTING SYSTEM..."** overlay to vanish (downloads ~10MB Pyodide engine).
4. Load a video file (`.mp4`, `.mov`, `.webm`).
5. Click **GET STITCHES**.

---

## ⚠️ Known Constraints

* **High Resolution:** 4K video processing is available but may crash mobile browser tabs due to RAM limits (iOS Safari cap is ~4GB).
* **Conflict Matrix:** Certain settings fight for resources.
* *Example:* High `Stitch Count` + Low `Span` = `Gap` forced to 0.
* *Example:* Low `FPS` + High `Smear` = Choppy blur (Data Scarcity).

