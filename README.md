
###**New File: README.md [20251214-1448]**```markdown
# BAALSAMIC v18.0
### Browser-Based Slit-Scan Time Travel Engine

**Baalsamic** is a single-file, client-side application that performs complex slit-scan video processing entirely in the browser. Powered by Python (via Pyodide/WASM) and HTML5 Canvas, it transforms standard video files into organic, rhythmic, or chaotic static compositions.

---

## 🚀 Key Features

* **Zero-Upload Architecture:** All processing happens locally on your device using WebAssembly. No video data is ever sent to a server.
* **Elastic Rhythm Engine:** A "Time Budgeting" system that dynamically calculates gaps between bursts to ensure your renders match the exact time span you requested.
* **Smart Seek (Mobile Optimized):** Features a hardware-aware rendering loop that waits for video decoders to catch up, preventing frame drift and "ghosting" on mobile devices (Optimized for Pixel 9 Pro).
* **Entropy Control:** Variable X/Y jitter injection to break the "grid" and create organic, painterly textures.
* **Radical UI:** A high-contrast, touch-friendly interface designed for both desktop precision and mobile experimentation.

---

## 🎛️ The Logic (How it Works)

Baalsamic deconstructs video into four core dimensions.

### 1. THE MEMORY (Timeline)
Controls *when* the engine looks.
* **Index:** The starting point in the video timeline.
* **Span:** The total duration of time to capture across the image.
* *Modes:*
    * `FIT`: Forces the timeline to cover the entire duration of the video.
    * `FOCUS`: Focuses on a specific percentage of the video around the Index.

### 2. THE GEOMETRY (Space)
Controls *how* the image is constructed.
* **Stitches:** The number of vertical slices to cut. (More = smoother image).
* **Width:** The thickness of each slice in pixels. (Wider = more context).
* **Depth:** Controls the layering order (Left-to-Right vs Right-to-Left).

### 3. THE RHYTHM (Time)
Controls the pulse of the capture.
* **Burst ("The Open Eye"):** How long the camera records *during* a single stitch. High bursts create motion blur; low bursts create sharp freezes.
* **Gap ("The Blink"):** How much time disappears *between* stitches. The engine automatically stretches this silence to fit your Span.

### 4. THE ENTROPY (Chaos)
Controls the imperfection.
* **Jitter ("The Footing"):** How stable the camera's grip is on the timeline.
    * *Sure Footing (Low):* A perfect, mechanical grid.
    * *Lost Footing (High):* The camera slips on the X-axis (width) and shakes on the Y-axis (position), creating organic distortion.

---

## 🛠️ Installation & Usage

### Running Locally
Baalsamic is designed as a standalone system.
1.  Download `index.html`.
2.  Open it in any modern web browser (Chrome, Firefox, Edge).
3.  **Note:** Requires an active internet connection on first load to fetch the Pyodide engine (approx 10MB).

### Hosting
Simply upload `index.html` to any static host (GitHub Pages, Netlify, WP Engine, or an S3 bucket). No backend is required.

---

## 📱 Mobile Performance Note
Slit-scanning 4K video is computationally expensive.
* **Battery:** This application forces the device's video decoder to seek non-linearly 30-60 times per second. Expect high battery consumption during extended sessions.
* **Initialization:** On mobile devices, the initial "Ingest" phase may take 5-10 seconds as the Smart Seek system creates a cache of the video stream.

---

## 📜 Version History

* **v18.0 (Current):** Added Info Modal, Concurrency Locking (prevents ghost renders), and "Organic Start" defaults.
* **v17.8:** Fixed mobile frame drift, implemented pixel-safe layout for Android gesture bars.
* **v17.5:** Introduced "Elastic Rhythm" logic.
* **v17.0:** Migrated kernel to Pyodide/WASM.

---

**License:** MIT

```
