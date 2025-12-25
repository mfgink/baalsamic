// v21.12.0 - js/engine/artist.js
/*
    ARTIST ENGINE (V21 Phase 3)
    Responsibility: Darkroom Rendering, Filters, Export.
*/

window.Artist = (function() {
    let rawImage = new Image();
    let stitchMap = [];
    let canvas = null;
    let ctx = null;
    
    // Params
    let params = {
        slip: 0,
        temp: 0,
        mood: 0,
        gloss: 0,
        link: 'sync'
    };

    function init() {
        canvas = document.getElementById('darkroom_canvas');
        if(canvas) {
            ctx = canvas.getContext('2d');
            console.log("ARTIST: Canvas Initialized");
        } else {
            console.error("ARTIST: Canvas Element Not Found");
        }
    }

    // Called by Workflow when render is complete
    function loadData(imgUrl, map, w, h) {
        if(!canvas) init();
        
        rawImage.onload = () => {
            if(canvas) {
                canvas.width = w;
                canvas.height = h;
                render();
            }
        };
        rawImage.src = imgUrl;
        stitchMap = map;
        console.log("ARTIST: Data Loaded", w, h);
    }

    function update() {
        // Read DOM sliders
        const getVal = (id) => { const el = document.getElementById(id); return el ? parseInt(el.value) : 0; };
        params.slip = getVal('dk_slip');
        params.temp = getVal('dk_temp');
        params.mood = getVal('dk_mood');
        params.gloss = getVal('dk_gloss');
        
        render();
    }

    function render() {
        if(!ctx) init(); // Try to self-heal
        if(!ctx || !rawImage.src) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Draw Raw
        ctx.drawImage(rawImage, 0, 0);

        // 2. Apply Filters
        let filterString = "";
        
        // Mood -> Contrast/Brightness
        if(params.mood !== 0) {
            const contrast = 100 + params.mood;
            filterString += `contrast(${contrast}%) `;
        }
        
        // Temp -> Sepia/Hue
        if(params.temp > 0) {
            filterString += `sepia(${params.temp}%) `;
        }
        
        // Slip -> Blur
        if(params.slip > 0) {
            const blurPx = params.slip / 20;
            filterString += `blur(${blurPx}px) `;
        }

        if(filterString) {
            ctx.filter = filterString;
            ctx.drawImage(rawImage, 0, 0); // Redraw with filter
            ctx.filter = 'none';
        }

        // Gloss -> White Overlay
        if(params.gloss > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${params.gloss / 200})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function exportCanvas() {
        if(!canvas) return;
        const link = document.createElement('a');
        link.download = `BAAL_V21_PRINT_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
    
    function saveRecipe() {
        alert("Recipe Saved! (Simulation)");
    }

    function setMode(key, val) {
        params[key] = val;
        const grp = document.getElementById(`grp_${key}`);
        if(grp) {
             grp.querySelectorAll('.mini-btn').forEach(b => {
                if(b.innerText.toLowerCase() === val || (val === 'sync' && b.innerText === 'SYNC')) 
                    b.classList.add('active');
                else 
                    b.classList.remove('active');
            });
        }
    }

    // Initialize on load
    setTimeout(init, 500);

    return {
        init,
        loadData,
        update,
        render,
        exportCanvas,
        saveRecipe,
        setMode
    };
})();
// END OF DOCUMENT - js/engine/artist.js