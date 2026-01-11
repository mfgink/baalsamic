# BAALSAMIC v22.16
### The Failure Engine

**Current Version:** v22.16 (The Pivot Update)  
**Release Date:** January 11, 2026  
**Status:** Interface Frozen / Backend Integration Phase

---

## 📖 Overview

**Baalsamic** is a slit-scan and time-displacement engine designed to simulate the aesthetic decay of early digital video. Unlike standard glitch tools that apply filters *over* an image, Baalsamic deconstructs the video into vertical temporal slices ("stitches") and reassembles them with deliberate geometric and chemical errors.

We call this **"The Failure Engine"**—a system built to emulate specific hardware sensor malfunctions (drift, heat noise) and software processing artifacts (smoothing, crunch).

---

## 🏗 Architecture: The "Hub-and-Spoke" Pivot

As of **v22.16**, Baalsamic has moved away from a linear wizard workflow (Screen 1 → 2 → 3) to a unified **Hub-and-Spoke** architecture.

### 1. Ingest (The Hub)
The entry point for loading video assets. Handles file upload, FPS sampling selection, and session initialization.

### 2. Time Travel Workspace (The Spoke)
A single, modal interface that toggles between two distinct processing modes:

* **teal // TUNER (Time):**
    * *Focus:* The "Container."
    * *Controls:* Slicing, Temporal Indexing, Span Duration, and Jitter.
    * *Goal:* Define *when* and *where* the frames are extracted.

* **pink // DARK ROOM (Physics):**
    * *Focus:* The "Content."
    * *Controls:* Sensor Drift, Thermal Noise, Lens Flare, and Texture Processing.
    * *Goal:* degrade and process the pixels *within* the slices.

---

## 🛠 Features & Controls

### 🧠 MEMORY (Timeline Logic)
* **Index & Span:** Precise control over the temporal window (center point vs. duration).
* **Fit vs. Focus:** Toggle between mapping the entire video duration (Fit) or a manual selection (Focus).
* **Burst:** (Backlog) Algorithms for frame distribution (Soft/Med/Hard).

### 📐 GEOMETRY (Spatial Logic)
* **Unified Width:** Input the target **Total Image Width** (e.g., 2400px), and the engine automatically calculates slice geometry.
* **Drift:** Pan content horizontally within the stitch (Sensor Readout Error).
* **Wave:** Vertical sine distortion (Rolling Shutter simulation).
* **Gap Fill:** Logic for handling empty pixels caused by jitter (`Void` | `Black` | `Stretch`).

### 🧪 ATMOSPHERE (Sensor Decay)
* **Heat:** Simulates "HTC Purple Noise" (thermal sensor failure in low light).
* **Flicker:** Exposure clashing between adjacent stitches.
* **Flare:** Highlight blowout thresholds.

### 📜 TEXTURE (Processing Artifacts)
* **Smooth:** Aggressive bilateral blur (Early smartphone "Oil Painting" effect).
* **Crunch:** Over-sharpening halos.
* **Louver:** Quantization banding ("Ribbed Sky" effect).

---

## 🚀 Installation & Setup

### Prerequisites
* Python 3.9+
* FFmpeg (installed and added to system PATH)

### Quick Start
1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/mfgink/baalsamic.git](https://github.com/mfgink/baalsamic.git)
    cd baalsamic
    ```

2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Server:**
    ```bash
    python server.py
    ```

4.  **Launch:**
    Open `http://localhost:5000` in your browser.

---

## 🗺 Roadmap & Known Issues (v22.16)

### 🐛 Critical Bugs
* **Dead Space Render:** Rounding errors in slice width calculation occasionally produce black/transparent gaps on the right edge of the image.
* **UI Artifacts:** Pink `<hr>` lines appear in the preview area when switching to Dark Room mode.

### 🚧 Active Development (Next Steps)
1.  **Backend Integration:** Wiring the new Dark Room JSON parameters (`drift`, `heat`, `louver`) to the Python processing engine.
2.  **Cache Management:** Implementing a "Smart Reset" policy to flush video/image caches effectively.
3.  **Schema Unification:** Merging "Stitch Map" and "Recipe" into a single portable JSON format.

---

## 📄 License
MIT License. See `LICENSE` for details.
