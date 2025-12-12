Baalsamic: The Client-Side Kinetic Stitcher
===========================================

> **"Your browser is the render farm."**

**Baalsamic** is a web-based kinetic photography engine that democratizes complex "slit-scan" and "time-displacement" glitch art.

Unlike traditional generative art tools that require expensive desktop software, command-line scripts, or server-side processing, Baalsamic runs **100% locally in your browser** using WebAssembly. It puts the power of Python-based video processing directly onto your mobile device, allowing for privacy-focused, zero-latency experimentation.

Key Features
------------

### The "Split-Brain" Engine

We separated the logic into two distinct engines to give you granular control over the chaos:

*   **Geometry Engine (Space):** Control the physical world. Slice width, density, and x/y/z jitter. Shatter your image into 500+ distinct strips.
    
*   **Memory Engine (Time):** Control the temporal world. Use the **Focus** and **Anchor** tools to target specific moments in time, or use the **Bag RNG** algorithm to weave time non-linearly without repetitive patterns.
    

### Mobile-First Architecture

Built and tested on flagship hardware (Pixel 9 Pro), Baalsamic is engineered to survive the constraints of mobile browsers:

*   **Dynamic Viewport (dvh):** UI elements respect system navigation bars and mobile chrome.
    
*   **Hard Containment:** Off-screen canvas elements are strictly managed to prevent "ghost scrolling."
    
*   **Memory Guardrails:** Intelligent input clamping prevents your GPU from crashing when things get too wild.
    

### Dual-Mode Interface

*   **Organic Mode (Safe):** Curated limits ensure beautiful, stable results. Perfect for learning the tool.
    
*   **!RAD Mode (Radical):** Unlock the safety clamps. Push the stitch count to 500+. Rotate Z-depth by 90°. Force the browser to its absolute breaking point for the sake of art.
    

### 100% Local & Private

No server uploads. No cloud fees. Your video files never leave your device. Baalsamic utilizes **Pyodide** to load a full Python kernel into your browser's WebAssembly runtime, processing pixel data in-memory.

Technical Architecture
----------------------

Baalsamic bridges the gap between high-level Python logic and high-performance web rendering.

### The Stack

*   **Core Logic:** Python (via Pyodide/WASM).
    
*   **Rendering:** HTML5 Canvas API.
    
*   **Frontend:** Vanilla JavaScript (ES6+) & CSS3 Variables.
    
*   **Processing:** Client-side FFMPEG (via WASM) for frame extraction.
    

### Engineering Highlights

*   **Bag RNG Algorithm:** Replaced standard random.uniform distribution with a "Bag" approach to eliminate the "Venetian Blind" pendulum bias common in random slit-scans.
    
*   **Warmup Sequence:** Implemented a decoder seek-sequence (0.5s -> 0.0s) to force mobile browser video decoders to wake up, solving the "Ghost Start" (black initial frame) bug.
    
*   **Thread Blocking Management:** Heavy processing tasks are chunked to prevent the UI thread from locking up completely during high-density renders.
    

Installation & Usage
--------------------

Because Baalsamic is client-side, it requires no backend setup. However, due to browser security policies (CORS) regarding local video files and WebAssembly, it must be served via a local HTTP server.

### Prerequisites

*   A modern web browser with WebAssembly support (Chrome, Firefox, Safari).
    
*   Python 3.x (for running a local server).
    

### Quick Start

1.  git clone \[https://github.com/yourusername/baalsamic-engine.git\](https://github.com/yourusername/baalsamic-engine.git)cd baalsamic-engine
    
2.  \# Python 3python -m http.server 8000
    
3.  Open http://localhost:8000/indexv17.html in your browser.
    
4.  Drag and drop an .mp4 or .mov file into the drop zone. Wait for the "Ready" indicator.
    

Roadmap
-------

*   **V17.x (Current):** Refinement of the "Memory Engine" and file naming conventions.
    
*   **V18.0:** "Free Crop" lens to remove fixed aspect ratio constraints.
    
*   **V19.0:** "Recipes" System – Saving and loading complex configuration presets via JSON strings.
    

License
-------

This project is licensed under the MIT License - see the [LICENSE.md](https://gemini.google.com/app/LICENSE.md) file for details.

Concept & Code by MFG Solutions.

Powered by Pyodide.
