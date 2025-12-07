### **1\. Project Backlog**

**Priority**

**ID**

**Task Name**

**Description**

**P0**

**B-07**

**Stitch Count Logic**

**(Highest Priority)** Pivot the core logic from "Width-First" to "Count-First." Allow the user to define a specific number of stitches (e.g., "5 Slices") and calculate the required slit width dynamically. In this mode, jitter would define the offset from the center of each Nth segment.

**P1**

**B-01**

**Versioning in Filename**

Update the export filename convention to include the Baalsamic version number (e.g., BAAL\_v13\_...) to track which engine logic generated the artifact.

**P1**

**B-05**

**Re-Ingest Capability**

Develop functionality to upload a previously generated BAAL\_\*.png file. The app should parse the filename (or metadata) to extract the settings (w, x, y, z) and restore the "Time Travel" state for tweaking.

**P2**

**B-02**

**Advanced Options UI**

Build out the functionality for the currently disabled "Advanced" accordion (Skew, Pattern, Symmetry).

**P2**

**B-03**

**Interface Scalability**

Refactor the UI to accommodate the growing list of sliders and toggles without cluttering the screen (e.g., tabbed config groups or a "Pro Mode" toggle).

**P3**

**B-04**

**Metadata Injection**

Investigate embedding the configuration data (JSON) directly into the PNG EXIF/Metadata chunks rather than just the filename, allowing for cleaner file names and richer data storage.

**P3**

**B-06**

**Favicon**

Add a custom favicon to the GitHub Pages deployment for better browser tab recognition.

### **2\. PMO Session Summary & Status Update**

Project: Baalsamic (Automated Slit-Scan Engine)

Role: Lead Architect / Developer

Sprint Duration: ~6 Hours

Status: 🟢 Live / Stable (V13)

#### **Project Summary**

Baalsamic is a browser-based "Kinetic Photography" tool designed to reclaim the "glitch" aesthetic of legacy mobile cameras. It subverts modern AI video stabilization by processing short video clips (2–10s) into static "slit-scan" timelines. The tool runs entirely client-side using WebAssembly, ensuring zero data transfer costs and maximum user privacy.

#### **Goals**

1.  **The Means of Production:** Create a tool that allows the user to generate "Broken Pano" art on a modern Google Pixel, which natively prevents such errors.
    
2.  **Zero-Friction:** Eliminate the need for server uploads (Data Gravity) or complex app store installations.
    
3.  **Visualizing Time:** Transform movement (video) into texture (static image) using variable slice geometry.
    

#### **Choices & Decisions**

*   **Architecture:** Pivoted from a Server-Side (Flask) model to a **Client-Side (PyScript/Pyodide)** model.
    
*   _Reasoning:_ Uploading 4K video to a server while commuting is prohibitive. Moving the Python engine _to the phone's browser_ allows for instant processing of local files.
    
*   **Deployment:** Selected **GitHub Pages** for free, SSL-secured hosting.
    
*   **The "Time Travel" Workflow:** Split the UI into two distinct phases:
    

1.  **Ingest:** Hardware settings (FPS/Res) and file loading.
    
2.  **Time Travel:** A specialized editor allowing the user to "scroll through time" and crop specific moments before rendering.
    

*   **Aspect Ratio Logic:** Decoupled the rendering width from the crop window. The engine now renders the full video duration (Max Width), allowing the user to slide a "Lens" (Crop Box) over it to find the best composition, rather than guessing with timestamps.
    

#### **Configuration Definitions**

*   **Sampling Rate (FPS):** Controls the temporal resolution. Low FPS (15) creates "steppy," distinct blocks; High FPS (60) creates smooth smears.
    
*   **Stitch Width:** The base width (in pixels) of each vertical slice taken from the video.
    
*   **X-Jitter (Time):** Random variance added to the _width_ of each slice. Creates uneven, organic stepping.
    
*   **Y-Jitter (Space):** Random variance added to the _source position_ (left/right) of the slit. Simulates a shaking camera.
    
*   **Z-Jitter (Rotation):** Random variance added to the _angle_ of the slice. Creates a "shattered glass" or "fanned deck" effect.
    
*   **Ratio:** The aspect ratio of the final crop window (e.g., 1:1 Square, 16:9 Cinematic).
    

#### **Site Aesthetic**

The interface utilizes a "Cyberpunk Terminal" aesthetic:

*   **Palette:** Deep Black (#0d0d0d) background with high-contrast Neon Teal (#00ffcc) for actions and Magenta (#ff0055) for emphasis.
    
*   **Typography:** Monospace fonts to reinforce the "Developer Tool" feel.
    
*   **Feedback:** Includes a visible "Kernel Log" console to expose the underlying Python operations to the user, building trust and technical engagement.
    

#### **Development Analysis: Design vs. Best Practice**

*   **The Choice:** We deployed the entire application (HTML, CSS, JS, and Python) as a **Single Monolithic File** (index.html).
    
*   **Best Practice Comparison:** Standard engineering practice dictates "Separation of Concerns" (separate files for .py, .css, .js).
    
*   **Justification:**
    

1.  **Deployment Friction:** A single file eliminates file-path errors and caching issues common with GitHub Pages.
    
2.  **The "Whitespace" Bug:** We encountered a critical issue where the GitHub web uploader "flattened" Python indentation when uploaded as a separate file. Embedding the Python code directly into the HTML within a block proved to be the most robust way to preserve syntax without requiring a local Git command-line environment.</div></li><li class="slate-li"><div style="position:relative"><strong class="slate-bold">Portability:</strong> The entire tool can be saved, shared, or archived as a single file.</div></li></ol><p class="slate-paragraph"><strong class="slate-bold">Recommendation:</strong> Continue with the single-file architecture for V14 to maintain velocity. Refactor into separate files only if the Python logic exceeds 500 lines or requires external module imports.</p><p class="slate-paragraph"></p></x-turndown>
