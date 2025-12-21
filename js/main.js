// GLOBAL STORE - Ported from V19.14
window.sourceFilename = "baalsamic_render";
window.videoMeta = { duration: 0, fps: 30, width: 1920, height: 1080 }; // NEW: Metadata Store

window.currentRatio = 'max';
window.currentSmear = 1;
window.currentDepth = 'ltr';
window.currentAnchor = 'fit';
window.currentBurst = 'med';
window.currentGap = 'close';
window.isRadical = false;
window.renderState = 'idle';
window.useLock = true; 
window.jobIdCounter = 0; 

const RANGES = {
    organic: { count: 60, z: 8, w: 100 },
    radical: { count: 60, z: 90, w: 100 }
};

let debounceTimer = null;
let countdownInterval = null;
const DEBOUNCE_DELAY = 1500; 

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("overlay").style.display = "none";
    dbg("UI Loaded. Connected to Flask Backend.");

    // Hook up the "Get Stitches" button
    document.getElementById("btn_stitch").onclick = async () => {
        const uploadInput = document.getElementById("upload");
        
        if(uploadInput.files.length === 0) {
            alert("Please load a video file first.");
            return;
        }

        const file = uploadInput.files[0];
        const formData = new FormData();
        formData.append('video', file);

        const btn = document.getElementById("btn_stitch");
        const originalText = btn.innerText;
        btn.innerText = "UPLOADING & ANALYZING...";
        btn.disabled = true;

        try {
            // Send to Flask
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            dbg(`Server received: ${data.filename}`);
            
            // NEW: Store Metadata from Server
            if(data.metadata) {
                window.videoMeta = data.metadata;
                dbg(`Duration: ${window.videoMeta.duration.toFixed(2)}s | FPS: ${window.videoMeta.fps}`);
            }

            // Success! Switch Screens
            window.sourceFilename = data.filename;
            document.getElementById("screen-ingest").style.display = "none";
            document.getElementById("screen-time-travel").style.display = "flex";
            
            // Initialize Tool
            window.calculateGoldenStart();

        } catch (error) {
            console.error('Error:', error);
            alert("Failed to upload video to backend engine.");
            btn.innerText = "ERROR - TRY AGAIN";
        } finally {
            btn.disabled = false;
            if(btn.innerText !== "ERROR - TRY AGAIN") btn.innerText = originalText;
        }
    };

    document.getElementById("close_tuner").onclick = () => {
        document.getElementById("screen-time-travel").style.display = "none";
        document.getElementById("screen-ingest").style.display = "flex";
    };

    document.getElementById("btn_reset").onclick = () => {
        window.calculateGoldenStart();
        dbg("Reset to Golden State");
    };
});

window.handleRenderClick = function() {
    if (window.renderState === 'idle') {
        window.saveImage();
    } else if (window.renderState === 'waiting') {
        cancelUpdate();
    }
};

window.saveImage = function() {
    alert("Save Image logic will be re-enabled once backend is connected.");
};

function updateFileLabel() {
    const input = document.getElementById('upload');
    const label = document.getElementById('file-label');
    if (input.files.length > 0) {
        window.sourceFilename = input.files[0].name.replace(/\.[^/.]+$/, "");
        label.innerText = "READY: " + input.files[0].name.substring(0, 15) + "...";
        label.style.background = "#00ffcc"; label.style.color = "black";
    }
}

function checkResolution() {
    const val = document.querySelector('input[name="res"]:checked').value;
    const warn = document.getElementById('res-warning');
    if (val === "0") warn.style.display = "block";
    else warn.style.display = "none";
    updateCoords(); 
}

function toggleRadicalMode() {
    window.isRadical = !window.isRadical; 
    const btn = document.getElementById('btn_radical');
    const limits = window.isRadical ? RANGES.radical : RANGES.organic;
    
    const countInput = document.getElementById('input_count');
    const widthInput = document.getElementById('input_width');
    const zInput = document.getElementById('input_zjitter');
    
    countInput.max = limits.count;
    widthInput.max = limits.w;
    zInput.max = limits.z;
    
    if (window.isRadical) {
        btn.classList.add('active');
        document.body.classList.add('radical-mode');
    } else {
        btn.classList.remove('active');
        document.body.classList.remove('radical-mode');
        if (parseInt(countInput.value) > limits.count) countInput.value = limits.count;
        if (parseInt(widthInput.value) > limits.w) widthInput.value = limits.w;
        if (parseInt(zInput.value) > limits.z) zInput.value = limits.z;
    }
    
    updateCoords();
    triggerUpdate();
}

function updateCoords() {
    const c = document.getElementById('input_count').value;
    const w = document.getElementById('input_width').value;
    document.getElementById('val_cnt').innerText = c;
    document.getElementById('val_wid').innerText = w;
    document.getElementById('val_x').innerText = document.getElementById('input_xjitter').value;
    document.getElementById('val_y').innerText = document.getElementById('input_yjitter').value;
    document.getElementById('val_z').innerText = document.getElementById('input_zjitter').value;

    const smear = window.currentSmear;
    const estW = (parseInt(c) * parseInt(w) * smear);
    const display = document.getElementById('pixel_count');
    display.innerText = "~" + estW + "px";
    if (estW > 3200) {
        display.classList.add('danger');
        display.style.color = "";
    } else {
        display.classList.remove('danger');
        display.style.color = "#00ffcc";
    }
    
    updateTimeLabels();
}

function updateTimeLabels() {
    // NEW: Use the real metadata from window.videoMeta
    const dur = window.videoMeta.duration || 0;
    
    const idxVal = document.getElementById('input_index').value;
    const timeVal = (idxVal / 100) * dur;
    document.getElementById('val_idx_time').innerText = timeVal.toFixed(1) + "s";
    
    const spanVal = document.getElementById('input_span').value;
    const spanSec = 1.0 + (spanVal / 100.0) * (dur - 1.0);
    document.getElementById('val_span_time').innerText = spanVal + "% (" + spanSec.toFixed(1) + "s)"; // Fixed display
    
    // Ruler Logic
    const rulerStart = document.getElementById('ruler-start');
    const rulerEnd = document.getElementById('ruler-end');
    
    if (window.currentAnchor === 'fit') {
        rulerStart.innerText = "0.0s";
        rulerEnd.innerText = dur.toFixed(1) + "s";
    } else {
        // Focus Mode Logic
        const center = dur * (idxVal / 100.0);
        const halfSpan = spanSec / 2.0;
        let start = center - halfSpan;
        let end = center + halfSpan;
        
        if (start < 0) {
            const diff = 0 - start;
            start = 0;
            end += diff;
        }
        if (end > dur) {
            const diff = end - dur;
            end = dur;
            start -= diff;
            if (start < 0) start = 0;
        }
        if (end > dur) end = dur; // Hard clamp for display
        
        rulerStart.innerText = start.toFixed(1) + "s";
        rulerEnd.innerText = end.toFixed(1) + "s";
    }
}

function calculateGoldenStart() {
    document.getElementById('input_count').value = 40;
    document.getElementById('input_width').value = 20;
    document.getElementById('input_xjitter').value = 30;
    document.getElementById('input_yjitter').value = 0;
    document.getElementById('input_zjitter').value = 0;
    
    window.currentSmear = 1;
    window.currentDepth = 'ltr';
    window.currentAnchor = 'fit';
    window.currentBurst = 'med';
    window.currentGap = 'close';
    window.isRadical = false; 

    updateCoords();
}

// UI HELPERS (Setters)
window.setRatio = function(r) { window.currentRatio = r; triggerUpdate(); }
window.setSmear = function(val, btn) { window.currentSmear = val; triggerUpdate(); }
window.setDepth = function(val, btn) { window.currentDepth = val; triggerUpdate(); }
window.setAnchor = function(val, btn) { window.currentAnchor = val; triggerUpdate(); }
window.setBurst = function(val, btn) { window.currentBurst = val; triggerUpdate(); }
window.setGap = function(val, btn) { window.currentGap = val; triggerUpdate(); }

function triggerUpdate() { 
    if (debounceTimer) clearTimeout(debounceTimer);
    if (countdownInterval) clearInterval(countdownInterval);

    window.renderState = 'waiting';
    const btn = document.getElementById('btn_render_final');
    btn.classList.add('waiting');
    btn.innerText = "WAITING...";

    debounceTimer = setTimeout(() => {
        // Here we would normally call Python
        btn.classList.remove('waiting');
        btn.innerText = "RENDER";
        window.renderState = 'idle';
        dbg("Parameters updated (Python disconnected)");
    }, DEBOUNCE_DELAY);
}

function cancelUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (countdownInterval) clearInterval(countdownInterval);
    
    window.renderState = 'idle';
    window.jobIdCounter++; // Kill pending jobs
    
    const btn = document.getElementById('btn_render_final');
    btn.classList.remove('waiting');
    btn.innerText = "RENDER";
    document.getElementById('debounce-timer').style.display = 'none';
}

function dbg(msg){ 
    console.log(msg); 
    const pre = document.getElementById("debug_pre"); 
    if(pre) pre.textContent = (pre.textContent + "\n> " + msg).slice(-5000); 
}

// Make functions global for HTML onclicks
window.checkResolution = checkResolution;
window.toggleRadicalMode = toggleRadicalMode;
window.updateCoords = updateCoords;
window.updateTimeLabels = updateTimeLabels;
window.triggerUpdate = triggerUpdate;
window.updateLensPositionFromSlider = function() {}; // Stub
window.updateLensDimensions = function() {}; // Stub

// END OF DOCUMENT [20251221-1635]