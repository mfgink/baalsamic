// v21.0 - js/ui/workflow.js
/*
    WORKFLOW ENGINE
    Handles Screen Navigation, API calls to Python, and State Management.
*/

window.Workflow = (function() {
    
    // STATE
    let state = {
        sourceFilename: null,
        renderParams: {
            count: 50, width: 20, 
            index: 50, span: 20,
            xjitter: 0, yjitter: 0, zjitter: 0,
            burst: 'soft', gap: 'close',
            anchor: 'fit'
        },
        debounceTimer: null,
        isRendering: false
    };

    const DEBOUNCE_MS = 600;

    // --- INIT ---
    function init() {
        console.log("WORKFLOW: Init");
        setupListeners();
    }

    function setupListeners() {
        // File Upload
        const upload = document.getElementById('upload');
        if(upload) {
            upload.addEventListener('change', (e) => {
                if(e.target.files.length > 0) {
                    const name = e.target.files[0].name;
                    document.getElementById('file-label').innerText = "READY: " + name;
                    document.getElementById('file-label').style.background = "#00ffcc";
                    document.getElementById('file-label').style.color = "black";
                    document.getElementById('btn_ingest').disabled = false;
                    document.getElementById('btn_ingest').onclick = uploadAndIngest;
                }
            });
        }
    }

    // --- NAVIGATION ---
    function switchScreen(screenId) {
        document.getElementById('screen-ingest').style.display = 'none';
        document.getElementById('screen-time-travel').style.display = 'none';
        document.getElementById('screen-darkroom').style.display = 'none';
        
        document.getElementById(screenId).style.display = 'flex';
    }

    // --- API: INGEST ---
    async function uploadAndIngest() {
        const fileInput = document.getElementById('upload');
        const btn = document.getElementById('btn_ingest');
        
        btn.innerText = "UPLOADING...";
        btn.disabled = true;
        
        const formData = new FormData();
        formData.append('video', fileInput.files[0]);
        
        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await response.json();
            
            if(data.status === 'success') {
                state.sourceFilename = data.filename;
                console.log("INGEST: Success");
                switchScreen('screen-time-travel');
                triggerRender(); // Initial Render
            } else {
                alert("Upload Failed: " + data.error);
            }
        } catch(e) {
            console.error(e);
            alert("Network Error");
        } finally {
            btn.innerText = "INITIALIZE ENGINE";
            btn.disabled = false;
        }
    }

    // --- API: RENDER (TIME TRAVEL) ---
    function updateCoords() {
        // Read DOM inputs into state
        state.renderParams.count = parseInt(document.getElementById('input_count').value);
        state.renderParams.width = parseInt(document.getElementById('input_width').value);
        state.renderParams.index = parseInt(document.getElementById('input_index').value);
        state.renderParams.span = parseInt(document.getElementById('input_span').value);
        state.renderParams.xjitter = parseInt(document.getElementById('input_xjitter').value);
        state.renderParams.yjitter = parseInt(document.getElementById('input_yjitter').value);
        state.renderParams.zjitter = parseInt(document.getElementById('input_zjitter').value);
        
        // Update Labels
        document.getElementById('val_cnt').innerText = state.renderParams.count;
        document.getElementById('val_wid').innerText = state.renderParams.width;
        document.getElementById('val_idx').innerText = state.renderParams.index + "%";
        document.getElementById('val_span').innerText = state.renderParams.span + "%";

        triggerRender();
    }

    function setParam(key, val) {
        state.renderParams[key] = val;
        
        // Update UI Buttons
        const grp = document.getElementById(`grp_${key}`);
        if(grp) {
            grp.querySelectorAll('.mini-btn').forEach(b => {
                if(b.dataset.val === val) b.classList.add('active');
                else b.classList.remove('active');
            });
        }
        triggerRender();
    }

    function triggerRender() {
        if(state.debounceTimer) clearTimeout(state.debounceTimer);
        
        document.getElementById('debounce-timer').style.display = 'block';
        
        state.debounceTimer = setTimeout(() => {
            executeRender();
        }, DEBOUNCE_MS);
    }

    async function executeRender() {
        console.log("RENDER: Requesting...");
        try {
            const response = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.renderParams)
            });
            
            const data = await response.json();
            
            if(data.status === 'success') {
                // Update Preview Image (Use timestamp to bust cache)
                const img = document.getElementById('preview_img');
                img.onload = () => {
                    document.getElementById('debounce-timer').style.display = 'none';
                    img.style.display = 'block';
                };
                img.src = data.image_url + "?t=" + new Date().getTime();
                
                // Store Map for Darkroom
                if(window.Artist) {
                    window.Artist.loadData(data.image_url, data.stitch_map, data.width, data.height);
                }
            }
        } catch(e) {
            console.error("RENDER ERROR:", e);
        }
    }

    // --- EXPORT LOGIC ---
    function openDevelopModal() {
        document.getElementById('develop-modal').style.display = 'flex';
    }

    async function exportRawStrip() {
        // Trigger High-Res Export in Backend
        const params = { ...state.renderParams, export_mode: true };
        const res = await fetch('/api/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        const data = await res.json();
        if(data.status === 'success') {
            const a = document.createElement('a');
            a.href = data.image_url;
            a.download = `BAAL_V21_RAW_${Date.now()}.png`;
            a.click();
        }
    }

    function goToDarkroom() {
        document.getElementById('develop-modal').style.display = 'none';
        switchScreen('screen-darkroom');
        // Initialize Artist Canvas
        if(window.Artist) window.Artist.render();
    }
    
    function backToTimeTravel() {
        switchScreen('screen-time-travel');
    }

    // --- DARKROOM I/O ---
    function exportPrint() {
        if(window.Artist) window.Artist.exportCanvas();
    }

    async function saveRecipe() {
        if(window.Artist) {
            const map = window.Artist.getMap();
            const res = await fetch('/api/map/save', {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({map: map})
            });
            const data = await res.json();
            alert("Recipe Saved: " + data.filename);
        }
    }

    // Public API
    return {
        init,
        updateCoords,
        setParam,
        openDevelopModal,
        exportRawStrip,
        goToDarkroom,
        backToTimeTravel,
        exportPrint,
        saveRecipe,
        goToIngest: () => switchScreen('screen-ingest'),
        closeModal: () => document.getElementById('info-modal').style.display = 'none'
    };

})();
// END OF DOCUMENT - js/ui/workflow.js