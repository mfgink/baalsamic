// v21.0 - js/engine/artist.js
/*
    ARTIST ENGINE (The Renderer)
    Responsibility: Takes the Raw Strip + StitchMap and "Develops" the image.
    Implements: Slip, Link, Temp, Mood, Gloss.
*/

window.Artist = (function() {
    
    // STATE
    let ctx = null;
    let canvas = null;
    let rawImage = new Image();
    let stitchMap = []; // The DNA
    let renderParams = {
        slip: 0,    // Vertical Displacement Multiplier
        temp: 0,    // Thermal Bias
        link: 'sync', // 'sync' or 'break' (Exposure)
        mood: 0,    // Vignette/Burn
        gloss: 0    // Bloom Radius
    };
    
    // --- INIT ---
    function loadData(imageUrl, mapData, w, h) {
        canvas = document.getElementById('darkroom_canvas');
        if(!canvas) return;
        
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Resize Canvas to Match Source Geometry
        canvas.width = w;
        canvas.height = h;
        
        stitchMap = mapData;
        
        rawImage.onload = () => {
            render();
        };
        rawImage.src = imageUrl; // Triggers load
    }
    
    // --- MAIN RENDER LOOP ---
    function render() {
        if(!ctx || !rawImage.complete || stitchMap.length === 0) return;
        
        // 1. Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 2. Global "Paper" Color (Base for transparency slips)
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 3. Draw Stitches
        stitchMap.forEach(stitch => {
            drawStitch(stitch);
        });
        
        // 4. Apply Finish (Post-Process)
        applyFinish();
    }
    
    function drawStitch(stitch) {
        // --- PHYSICS CALCS ---
        
        // SLIP: Vertical Displacement based on Velocity 
        let dy = 0;
        if(renderParams.slip > 0) {
            // Velocity is pre-calculated in Python. 
            // We multiply it by the user's "Slip" slider (0-100 mapped to 0-5.0 factor)
            const factor = renderParams.slip / 20.0;
            const direction = (stitch.id % 2 === 0) ? 1 : -1; // Simple alternating for now, or use velocity sign if available
            dy = stitch.velocity * factor * direction;
        }

        // LINK: Exposure Sync 
        let brightness = 100;
        if(renderParams.link === 'break') {
            // Use the exposure_bias from the map (-1.0 to 1.0)
            // Map to brightness % (e.g. 50% to 150%)
            brightness = 100 + (stitch.exposure_bias * 50);
        }

        // TEMP: Thermal Noise/Tint 
        // If stitch was hot, we tint it magenta
        let hueRotate = 0;
        let saturate = 100;
        if(renderParams.temp > 0) {
            const threshold = 0.5; // When does heat become visible?
            if(stitch.thermal_load > threshold) {
                // Calculate intensity based on slider and thermal load
                const heatIntensity = (stitch.thermal_load - threshold) * (renderParams.temp / 50.0);
                if(heatIntensity > 0) {
                    hueRotate = heatIntensity * 60; // Shift towards purple
                    saturate = 100 + (heatIntensity * 50);
                }
            }
        }

        // --- DRAWING ---
        ctx.save();
        
        // Apply Filters (Link & Temp)
        ctx.filter = `brightness(${brightness}%) hue-rotate(${hueRotate}deg) saturate(${saturate}%)`;
        
        // Draw Slice
        // source: rawImage, sx, sy, sw, sh, dx, dy, dw, dh
        // We draw from the Raw Strip (sx = stitch.x) to the Canvas (dx = stitch.x)
        // We add dy to the destination Y to create the "Broken Panel" look
        ctx.drawImage(
            rawImage, 
            stitch.x, 0, stitch.w, stitch.h, // Source
            stitch.x, dy, stitch.w, stitch.h // Destination (with Slip)
        );
        
        ctx.restore();
    }
    
    function applyFinish() {
        // MOOD: Vignette or Burn
        if(renderParams.mood !== 0) {
            ctx.globalCompositeOperation = (renderParams.mood < 0) ? 'multiply' : 'screen';
            const gradient = ctx.createRadialGradient(
                canvas.width/2, canvas.height/2, canvas.width/4, 
                canvas.width/2, canvas.height/2, canvas.width
            );
            
            if(renderParams.mood < 0) {
                // Vignette (Black)
                const opacity = Math.abs(renderParams.mood) / 100.0;
                gradient.addColorStop(0, "rgba(0,0,0,0)");
                gradient.addColorStop(1, `rgba(0,0,0,${opacity})`);
            } else {
                // Burn (Light Leak)
                const opacity = renderParams.mood / 100.0;
                gradient.addColorStop(0, "rgba(255,200,150,0)");
                gradient.addColorStop(1, `rgba(255,100,100,${opacity})`);
            }
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
        }

        // GLOSS: Bloom / Texture
        if(renderParams.gloss > 0) {
            // Simple approach: Duplicate image, blur it, screen blend it
            // This simulates light bleeding off the edges
            const blurAmt = renderParams.gloss / 10; // 0 to 10px
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.filter = `blur(${blurAmt}px) opacity(0.5)`;
            ctx.drawImage(canvas, 0, 0);
            ctx.restore();
        }
    }

    // --- INTERFACE ---
    function update() {
        // Read DOM controls from Darkroom
        const slip = document.getElementById('dk_slip');
        const temp = document.getElementById('dk_temp');
        const mood = document.getElementById('dk_mood');
        const gloss = document.getElementById('dk_gloss');

        if(slip) renderParams.slip = parseInt(slip.value);
        if(temp) renderParams.temp = parseInt(temp.value);
        if(mood) renderParams.mood = parseInt(mood.value);
        if(gloss) renderParams.gloss = parseInt(gloss.value);

        render();
    }
    
    function setMode(key, val) {
        renderParams[key] = val;
        // Update UI logic for buttons if needed
        const grp = document.getElementById(`grp_${key}`);
        if(grp) {
            grp.querySelectorAll('.mini-btn').forEach(b => {
                if(b.innerText.toLowerCase() === val || (val === 'sync' && b.innerText === 'SYNC')) 
                    b.classList.add('active');
                else 
                    b.classList.remove('active');
            });
        }
        render();
    }

    function exportCanvas() {
        if(!canvas) return;
        const link = document.createElement('a');
        link.download = `BAAL_V21_PRINT_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }

    function getMap() {
        return stitchMap;
    }

    return {
        loadData,
        render,
        update,
        setMode,
        exportCanvas,
        getMap
    };

})();
// END OF DOCUMENT - js/engine/artist.js