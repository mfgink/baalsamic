# BAALSAMIC V20 (Time Travel Engine)

**Current Version:** V20.10 (Stable Release Candidate)

**Date:** December 2025

Baalsamic is a video-to-static "Time Travel" engine. It deconstructs video files into temporal slices ("stitches") and reconstructs them into a single panoramic timeline. V20 introduces a **Dual Physics** architecture, handling both spatial construction and temporal division, along with advanced entropy controls like Z-Jitter rotation and depth sorting.

---

## 🚀 Key Features (V20.10)

### 1. Dual Physics Engine

The system operates in two distinct geometric modes:

* **FIT MODE ("The Bricklayer"):** You define the **Stitch Width**. The engine adds stitches until the count is reached.
* *Result:* The image grows wider as you add stitches.


* **FOCUS MODE ("The Slicer"):** You define the **Image Width**. The engine calculates the necessary stitch width to fit the count within that space.
* *Result:* The image size stays fixed; stitches get thinner (higher resolution) as you add them.



### 2. Advanced Entropy (Jitter)

* **X/Y Jitter:** Randomizes the source selection coordinates (simulating a shaky camera).
* **Z-Jitter (Rotation):** Applies random affine rotation to each stitch.
* **Organic Mode:** Max rotation ±8° (Natural vibration).
* **!RAD Mode:** Max rotation ±45° (Shattered/Diamond effect).



### 3. Depth Sorting & Alpha Blending

* **Depth Control:** Determines the Z-Index stacking order of overlapping stitches (`L>R`, `R>L`, or `MIX`).
* **Alpha Blending:** Rotated stitches are rendered with transparency, allowing corners to overlap neighbors non-destructively.

---

## 🛠 Installation & Setup

### Prerequisites

* Python 3.8+
* Git

### 1. Clone & Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd baalsamic-v20

# Create Virtual Environment
python -m venv venv

# Activate Environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install Dependencies
pip install flask opencv-python numpy

```

### 2. Configuration

Ensure you have a `.gitignore` file to prevent large video uploads from bloating the repository:

```text
# .gitignore
uploads/
__pycache__/
venv/
*.mp4
*.jpg

```

---

## 🖥 Usage

### 1. Run the Server

```bash
cd python
python main.py

```

Access the interface at `http://127.0.0.1:5000`.

### 2. The Workflow

1. **Ingest:** Upload a video file (.mp4, .mov). The system extracts metadata (FPS, Duration, Dimensions).
2. **Tuning (The Time Travel Screen):**
* **Memory (Time):** Set the `Index` (Anchor Point) and `Span` (Duration).
* **Geometry (Space):** Choose Fit vs. Focus mode. Adjust Stitch Count.
* **Rhythm:** Control `Burst` (recording duration) and `Gap` (silence between stitches).
* **Jitters:** Apply X, Y, and Z chaos.


3. **Render:** Click **RENDER** to process the image on the backend.
4. **Export:** Click the Render button again (when idle) to save the PNG.

---

## 📐 Logic & Constraints

| Parameter | Behavior |
| --- | --- |
| **Index** | The center point of your timeline window. |
| **Span** | The total duration captured. If `Span < (Count * Burst)`, rendering clamps to available time. |
| **!RAD Mode** | Unlocks extreme parameters: Z-Jitter up to 45°, X/Y Jitter up to 200px. |
| **Overlay** | A teal-to-pink pulse indicates the backend is processing a frame. |

---

## 📝 Backlog & Known Issues

* **Smear V2 (Deferred to V21):** The current "Smear" (Blur) function is deprecated. Future versions will implement "Seam Healing" (Mesh Stretch) to fill black voids created by high Z-Jitter rotation.
* **Mobile Support:** Touch events for the crop lens need validation on mobile devices.

---

**End of Documentation**
