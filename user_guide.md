**USER GUIDE TO BAALSAMIC**
========================

**The Time-Travel Slit-Scan Engine**

Baalsamic is a tool that breaks a video file into hundreds of tiny slices and rearranges them into a single static image. It allows you to see time as a texture.

Instead of watching a video from start to finish, Baalsamic lays the video out flat, like unspooling a film reel and cutting it up to make a collage.

**1\. THE CORE CONCEPTS**
-------------------------

To master the engine, you need to understand the three ways it manipulates reality:

### **A. GEOMETRY (Space)**

_Controls the physical shape of your image._

*   **Stitch Count:** How many slices do you want?
    
    *   _Low (10-30):_ Chunky, readable images. You can see what is happening in each slice.
        
    *   _High (100+):_ Smooth, abstract textures. The image becomes a flow of color.
        
*   **Stitch Width:** How "fat" is each slice?
    
    *   _Thin:_ Creates a seamless, scanned look.
        
    *   _Wide:_ Creates a stuttering, "shingled" look where slices overlap heavily.
        

### **B. MEMORY (Time)**

_Controls which moments of the video are used._

*   **Anchor Mode (Fit vs. Focus):**
    
    *   **FIT:** Takes the entire video duration and squeezes it into your image. Good for "summarizing" a whole clip.
        
    *   **FOCUS:** Lets you pick a specific moment (Index) and a duration (Span). Good for capturing a specific action, like a jump or a car passing.
        
*   **Index:** The "Center Point" of your focus (e.g., the exact second a skater is in the air).
    
*   **Span:** How many seconds around the Index to capture. (e.g., "Show me 2 seconds before and after the jump").
    

### **C. RHYTHM (Cadence)**

_Controls the flow of time._

*   **Standard (Linear):** The engine steps through time evenly (1, 2, 3, 4...).
    
*   **Burst:** The engine grabs a cluster of frames in a row (1, 2, 3...) to show a micro-movement.
    
*   **Gap:** The engine skips a chunk of time (...skip 4, 5, 6...) before the next burst.
    
    *   _Effect:_ Creates a "film strip" aesthetic where you see distinct moments of action separated by jumps in time.
        
*   **Smear:** Drags a single moment across space. It stretches one frame wide, effectively "pausing" time while the paintbrush keeps moving.
    

### **D. ENTROPY (Chaos)**

_Breaks the grid to make it look organic._

*   **Jitter (X/Y):** Randomly nudges slices left/right or up/down so they don't line up perfectly.
    
*   **Z-Jitter (Rotation):** Tilts the slices.
    
    *   _Low:_ Creates a "shattered glass" or vibrating effect.
        
    *   _High:_ Creates jagged, cubist abstraction.
        

### **E. DEPTH (Layering)**

_Decides how the slices stack on top of each other._

*   **L>R (Left-to-Right):** Standard. New slices are painted ON TOP of old ones (like roof shingles).
    
*   **R>L (Right-to-Left):** Reverse. New slices are tucked BEHIND old ones.
    
*   **MIX:** Woven. The engine randomly chooses front or back for each slice, creating a complex, interlocking texture.
    

**2\. HOW TO USE THE APP**
--------------------------

### **Step 1: Ingest**

1.  **Select Resolution:** Choose **SD** (fastest), **HD** (balanced), or **4K** (highest detail, but may be slow on phones).
    
2.  **Load File:** Tap "LOAD A FILE" and pick a video from your device.
    
3.  **Get Stitches:** The engine will analyze the video and launch the editor.
    

### **Step 2: The "Golden Start"**

When the editor loads, Baalsamic automatically calculates a "Golden State"—a setup guaranteed to fill about 80% of your screen with a good-looking image. You can always return to this by hitting **RESET** in the top bar.

### **Step 3: Crafting Your Image**

*   **Use the Accordions:** Tap the headers (MEMORY, GEOMETRY, RHYTHM) to open different control groups.
    
*   **Adjust Sliders:** Changes update the preview in real-time (on desktop) or after you release the slider (on mobile).
    
*   **Check the Pixel Count:** Look at the number next to the Render button (e.g., 12400px). If it turns **RED**, your image is very large and might crash a mobile browser. Reduce Count or Width to fix it.
    

### **Step 4: Radical Mode (!RAD)**

By default, the app is in **Organic Mode** (Teal UI). The sliders are limited to "safe" ranges that usually look good.

*   **Want chaos?** Tap the **!RAD** button in the top left.
    
*   **What happens:** The UI turns **Hot Pink**. Safety limits are removed. You can set extreme values (e.g., 500 stitches, 90-degree rotation).
    
*   _Warning:_ Radical settings can create massive images that may freeze your device.
    

### **Step 5: Render & Save**

1.  When you are happy with the preview, tap **RENDER**.
    
2.  The app will generate a full-resolution PNG file.
    
3.  Tap **Download** to save it to your photos.
    

### **QUICK RECIPES**

*   **The Narrative Strip:**
    
    *   _Memory:_ FOCUS mode. Find the action.
        
    *   _Rhythm:_ Burst HARD, Gap MED.
        
    *   _Result:_ Distinct vertical bands showing a sequence of motion.
        
*   **The Abstract Texture:**
    
    *   _Geometry:_ High Count (100+), Low Width.
        
    *   _Depth:_ MIX.
        
    *   _Result:_ A woven, fabric-like surface made of color.
        
*   **The Shattered Mirror:**
    
    *   _Entropy:_ Z-Jitter around 5-8.
        
    *   _Result:_ The image looks like it is vibrating or viewed through cracked glass.
