// GLOBAL STORE
window.sourceFilename = "baalsamic_render";
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

window.handleRenderClick = function() {
    if (window.renderState === 'idle') {
        window.saveImage();
    } else if (window.renderState === 'waiting') {
        cancelUpdate();
    }
};

window.saveImage = function() {
    const canvas = document.getElementById("main_canvas");
    const lens = document.getElementById("crop-lens");
    const scale = canvas.width / canvas.clientWidth; 
    
    let sourceX = 0;
    let sourceW = canvas.width;
    let sourceH = canvas.height;
    
    if (window.currentRatio !== 'max') {
        const stage = document.getElementById('stage_container');
        const visW = canvas.clientWidth;
        const stageW = stage.clientWidth;
        const canvasOffset = (stageW - visW) / 2; 
        const lensLeft = parseFloat(lens.style.left || 0);
        const lensWidth = parseFloat(lens.style.width || 0);
        const relativeLensX = lensLeft - canvasOffset;
        sourceX = relativeLensX * scale;
        sourceW = lensWidth * scale;
    }
    
    const temp = document.createElement('canvas');
    temp.width = sourceW; temp.height = sourceH;
    const ctx = temp.getContext('2d');
    ctx.fillStyle = "black"; 
    ctx.fillRect(0, 0, temp.width, temp.height);
    ctx.drawImage(canvas, sourceX, 0, sourceW, sourceH, 0, 0, sourceW, sourceH);
    
    const count = document.getElementById("input_count").value;
    const width = document.getElementById("input_width").value;
    const burst = window.currentBurst;
    const gap = window.currentGap;
    const anchor = window.currentAnchor;
    const jitX = document.getElementById("input_xjitter").value;
    const jitY = document.getElementById("input_yjitter").value;
    const jitZ = document.getElementById("input_zjitter").value;
    
    const fps = document.querySelector('input[name="fps"]:checked').value;
    const res = document.querySelector('input[name="res"]:checked').value;
    const resLabel = (res == 0) ? "4K" : (res == 1080) ? "1080p" : "SD";
    
    const filename = `BAAL_${window.sourceFilename}_v20.0_${resLabel}-${fps}_${count}x${width}_J${jitX}-${jitY}-${jitZ}_b${burst}-g${gap}_${anchor}.png`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = temp.toDataURL();
    link.click();
    alert("Done! Saved.");
};

window.updateFileLabel = function() {
    const input = document.getElementById('upload');
    const label = document.getElementById('file-label');
    if (input.files.length > 0) {
        window.sourceFilename = input.files[0].name.replace(/\.[^/.]+$/, "");
        label.innerText = "READY: " + input.files[0].name.substring(0, 15) + "...";
        label.style.background = "#00ffcc"; label.style.color = "black";
    }
}

window.checkResolution = function() {
    const val = document.querySelector('input[name="res"]:checked').value;
    const warn = document.getElementById('res-warning');
    if (val === "0") warn.style.display = "block";
    else warn.style.display = "none";
    updateCoords(); 
}

window.toggleRadicalMode = function() {
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

window.updateCoords = function() {
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
    
    const fps = document.querySelector('input[name="fps"]:checked').value;
    const smearBtns = document.querySelectorAll('.smear-group .mini-btn');
    smearBtns.forEach(b => b.classList.remove('danger'));
    if(fps == "15" && window.currentSmear == 3) {
        if(smearBtns[2]) smearBtns[2].classList.add('danger');
    }

    updateTimeLabels();
}

window.updateTimeLabels = function() {
    const vid = document.getElementById('hidden_video');
    const dur = vid.duration || 0;
    const idxVal = document.getElementById('input_index').value;
    const timeVal = (idxVal / 100) * dur;
    document.getElementById('val_idx_time').innerText = timeVal.toFixed(1) + "s";
    
    const spanVal = document.getElementById('input_span').value;
    const spanSec = 1.0 + (spanVal / 100.0) * (dur - 1.0);
    document.getElementById('val_span_time').innerText = spanVal + "% (" + spanSec.toFixed(1) + "s)";
    
    const count = parseInt(document.getElementById('input_count').value);
    let burstFrames = 1;
    if(window.currentBurst === 'med') burstFrames = 3;
    if(window.currentBurst === 'hard') burstFrames = 10;
    const frameDur = 0.033 * window.currentSmear;
    
    const totalNeeded = (count * burstFrames * frameDur);
    const lblSpan = document.getElementById('lbl_span');
    const valSpan = document.getElementById('val_span_time');
    
    if (totalNeeded > spanSec) {
        lblSpan.classList.add('danger');
        valSpan.classList.add('danger');
    } else {
        lblSpan.classList.remove('danger');
        valSpan.classList.remove('danger');
    }

    // RULER LOGIC
    const rulerStart = document.getElementById('ruler-start');
    const rulerEnd = document.getElementById('ruler-end');
    
    if (window.currentAnchor === 'fit') {
        rulerStart.innerText = "0.0s";
        rulerEnd.innerText = dur.toFixed(1) + "s";
    } else {
        // Replicate Python Focus Logic
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
        
        rulerStart.innerText = start.toFixed(1) + "s";
        rulerEnd.innerText = end.toFixed(1) + "s";
    }
}

window.calculateGoldenStart = function() {
    const screenW = window.innerWidth;
    const targetW = Math.floor(screenW * 0.95); 
    let count = 40;
    let stitchW = Math.ceil(targetW / count); 
    if (stitchW < 1) stitchW = 1;
    
    document.getElementById('input_count').value = count;
    document.getElementById('input_width').value = stitchW;
    document.getElementById('input_xjitter').value = 30;
    document.getElementById('input_yjitter').value = 0;
    document.getElementById('input_zjitter').value = 0;
    
    window.currentSmear = 1;
    window.currentDepth = 'ltr';
    window.currentAnchor = 'fit';
    window.currentBurst = 'med';
    window.currentGap = 'close';
    window.isRadical = false; 
    
    const smearBtns = document.querySelectorAll('.smear-group .mini-btn');
    if(smearBtns.length > 0) setSmear(1, smearBtns[0]); 

    const depthBtns = document.querySelectorAll('.depth-group .mini-btn');
    if(depthBtns.length > 0) setDepth('ltr', depthBtns[0]); 

    const anchorBtns = document.querySelectorAll('.anchor-group .mini-btn');
    if(anchorBtns.length > 0) setAnchor('fit', anchorBtns[0]); 

    const burstBtns = document.querySelectorAll('.burst-group .mini-btn');
    if(burstBtns.length > 1) setBurst('med', burstBtns[1]); 

    const gapBtns = document.querySelectorAll('.gap-group .mini-btn');
    if(gapBtns.length > 0) setGap('close', gapBtns[0]); 
    
    document.getElementById('btn_radical').classList.remove('active');
    document.body.classList.remove('radical-mode');

    updateCoords();
}

window.setRatio = function(r) {
    window.currentRatio = r;
    const group = document.querySelector('.ratio-mini-group');
    group.querySelectorAll('.mini-btn').forEach(b => {
        if(b.innerText.toLowerCase() === r.toLowerCase() || (r === 'max' && b.innerText === 'MAX')) b.classList.add('active');
        else b.classList.remove('active');
    });
    const posRow = document.getElementById('row_pos');
    if (r === 'max') { posRow.style.opacity = '0.3'; posRow.style.pointerEvents = 'none'; } 
    else { posRow.style.opacity = '1'; posRow.style.pointerEvents = 'auto'; }
    updateLensDimensions();
}

window.setSmear = function(val, btn) {
    window.currentSmear = val;
    document.querySelector('.smear-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    triggerUpdate();
}

window.setDepth = function(val, btn) {
    window.currentDepth = val;
    document.querySelector('.depth-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    triggerUpdate();
}

window.setAnchor = function(val, btn) {
    window.currentAnchor = val;
    document.querySelector('.anchor-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    const rowIndex = document.getElementById('row_index');
    const rowSpan = document.getElementById('row_span');
    if (val === 'focus') { 
        rowIndex.classList.add('active'); rowSpan.classList.add('active'); 
    } else { 
        rowIndex.classList.remove('active'); rowSpan.classList.remove('active'); 
        triggerUpdate(); 
    }
    updateTimeLabels(); 
}

window.setBurst = function(val, btn) {
    window.currentBurst = val;
    document.querySelector('.burst-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    triggerUpdate();
}

window.setGap = function(val, btn) {
    window.currentGap = val;
    document.querySelector('.gap-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    triggerUpdate();
}

window.updateLensDimensions = function() {
    const canvas = document.getElementById('main_canvas');
    const lens = document.getElementById('crop-lens');
    const ruler = document.getElementById('timeline-ruler');
    
    if (!canvas) return;
    
    ruler.style.width = canvas.clientWidth + "px";
    const vid = document.getElementById('hidden_video');
    if(vid && vid.duration) {
        if(window.currentAnchor === 'fit') {
           document.getElementById('ruler-end').innerText = vid.duration.toFixed(1) + "s";
        }
    }

    if (window.currentRatio === 'max') { lens.style.display = 'none'; return; }
    lens.style.display = 'block';

    const visH = canvas.clientHeight;
    const visW = canvas.clientWidth;
    let targetW = visW;
    if (window.currentRatio === '1:1') targetW = visH; 
    if (window.currentRatio === '4:5') targetW = visH * (4/5);
    if (window.currentRatio === '16:9') targetW = visH * (16/9); 
    if (window.currentRatio === '9:16') targetW = visH * (9/16);

    if(targetW > visW) targetW = visW;

    lens.style.width = targetW + "px";
    lens.style.height = visH + "px";
    lens.style.top = canvas.offsetTop + "px"; 
    
    const range = visW - targetW; 
    const left = range / 2;
    
    const stage = document.getElementById('stage_container');
    const stageW = stage.clientWidth;
    const canvasOffset = (stageW - visW) / 2;
    
    lens.style.left = (canvasOffset + left) + "px";
    document.getElementById('input_pos').value = 50;
}

window.updateLensPositionFromSlider = function() {
    if (window.currentRatio === 'max') return;
    const lens = document.getElementById('crop-lens');
    const slider = document.getElementById('input_pos');
    const canvas = document.getElementById('main_canvas');
    const stage = document.getElementById('stage_container');
    
    const visW = canvas.clientWidth;
    const stageW = stage.clientWidth;
    const canvasOffset = (stageW - visW) / 2;
    
    const maxLensTravel = visW - parseFloat(lens.style.width);
    const relativeLeft = (slider.value / 100) * maxLensTravel;
    
    lens.style.left = (canvasOffset + relativeLeft) + "px";
}

// DRAG LOGIC
const lens = document.getElementById('crop-lens');
let isDragging = false;
let startX = 0; let startLeft = 0;

function startDrag(e) { if(window.currentRatio === 'max') return; isDragging = true; startX = (e.touches ? e.touches[0].clientX : e.clientX); startLeft = parseFloat(lens.style.left) || 0; lens.style.cursor = 'grabbing'; }
function doDrag(e) { if(!isDragging) return; e.preventDefault(); const clientX = (e.touches ? e.touches[0].clientX : e.clientX); const delta = clientX - startX; const canvas = document.getElementById('main_canvas'); const stage = document.getElementById('stage_container'); const visW = canvas.clientWidth; const stageW = stage.clientWidth; const canvasOffset = (stageW - visW) / 2; const minX = canvasOffset; const maxX = minX + (visW - parseFloat(lens.style.width)); let newLeft = startLeft + delta; if(newLeft < minX) newLeft = minX; if(newLeft > maxX) newLeft = maxX; lens.style.left = newLeft + "px"; const range = maxX - minX; if(range > 0) { const pct = ((newLeft - minX) / range) * 100; document.getElementById('input_pos').value = pct; } }
function stopDrag() { isDragging = false; lens.style.cursor = 'grab'; }
lens.addEventListener('mousedown', startDrag); lens.addEventListener('touchstart', startDrag);
window.addEventListener('mousemove', doDrag); window.addEventListener('touchmove', doDrag, {passive: false});
window.addEventListener('mouseup', stopDrag); window.addEventListener('touchend', stopDrag);

// --- SMART WAIT, SOFT LOCK & JOB ID ---
window.triggerUpdate = function() { 
    if (debounceTimer) clearTimeout(debounceTimer);
    if (countdownInterval) clearInterval(countdownInterval);

    window.renderState = 'waiting';
    window.useLock = document.getElementById('chk_lock').checked;
    window.jobIdCounter++; 
    
    const btn = document.getElementById('btn_render_final');
    const controls = document.querySelector('.editor-controls');
    
    if(window.useLock) {
        controls.classList.add('soft-locked');
    }
    
    btn.classList.add('waiting');
    btn.classList.remove('processing');
    
    let timeLeft = DEBOUNCE_DELAY / 1000;
    btn.innerText = `WAITING... ${timeLeft.toFixed(1)}s`;

    const timerDisplay = document.getElementById('debounce-timer');
    timerDisplay.style.display = 'block';
    timerDisplay.innerText = timeLeft.toFixed(1);

    countdownInterval = setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = 0;
            clearInterval(countdownInterval);
            timerDisplay.style.display = 'none';
        }
        if(window.renderState === 'waiting') {
            btn.innerText = `WAITING... ${timeLeft.toFixed(1)}s`;
            timerDisplay.innerText = timeLeft.toFixed(1);
        }
    }, 100);

    debounceTimer = setTimeout(() => {
        startProcessingState();
        window.call_py(`await update_preview(${window.jobIdCounter})`); 
    }, DEBOUNCE_DELAY);
}

function cancelUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (countdownInterval) clearInterval(countdownInterval);
    
    window.renderState = 'idle';
    window.jobIdCounter++; // Kill pending jobs
    
    const btn = document.getElementById('btn_render_final');
    const controls = document.querySelector('.editor-controls');
    
    controls.classList.remove('soft-locked');
    btn.classList.remove('waiting');
    btn.innerText = "RENDER";
    document.getElementById('debounce-timer').style.display = 'none';
}

function startProcessingState() {
    window.renderState = 'processing';
    const btn = document.getElementById('btn_render_final');
    btn.classList.remove('waiting');
    btn.classList.add('processing');
    btn.innerText = "WEAVING...";
    
    if(window.useLock) {
        document.querySelector('.editor-controls').classList.add('interface-locked');
        document.body.style.cursor = 'wait';
    }
}

window.unlockInterface = function(finishedJobId) {
    if(finishedJobId && finishedJobId != window.jobIdCounter) {
        return; 
    }
    
    const controls = document.querySelector('.editor-controls');
    controls.classList.remove('interface-locked');
    controls.classList.remove('soft-locked');
    document.body.style.cursor = 'default';
    const btn = document.getElementById('btn_render_final');
    btn.classList.remove('processing');
    btn.innerText = "RENDER";
    window.renderState = 'idle';
};

window.addEventListener('resize', () => { setTimeout(updateLensDimensions, 100); });
function dbg(msg){ console.log(msg); const pre = document.getElementById("debug_pre"); if(pre) { pre.textContent = (pre.textContent + "\n> " + msg).slice(-5000); const panel = document.getElementById("debug-panel"); if(panel) panel.scrollTop = panel.scrollHeight; } const ov = document.getElementById("overlay"); if(ov && ov.style.display !== "none") { document.getElementById("overlay-text").innerText = msg.toUpperCase(); } }

const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/";
(function(){
    dbg("Downloading Pyodide Engine...");

    const bootTimer = setTimeout(() => {
        const ov = document.getElementById("overlay-text");
        ov.innerText = "CONNECTION TIMEOUT.\nCHECK FIREWALL OR RELOAD.";
        ov.style.color = "red";
    }, 15000);

    // Initializer attached to window to await script load
    window.initPyodideSystem = async () => {
        clearTimeout(bootTimer);
        dbg("Initializing WASM...");
        try {
            window.pyodide = await loadPyodide({indexURL: PYODIDE_BASE});
            window.call_py = async function(expr){ return await pyodide.runPythonAsync(expr); };
            await initializePython();
        } catch(e){ dbg("INIT ERROR: " + e); }
    };
    
    // Check if pyodide script is already loaded by index
    if(typeof loadPyodide !== 'undefined') {
        window.initPyodideSystem();
    } else {
        // Wait for onload
        document.querySelector('script[src*="pyodide.js"]').onload = window.initPyodideSystem;
    }

})();

async function initializePython(){
    dbg("Fetching Engine Code...");
    try {
        const response = await fetch('python/engine.py');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const code = await response.text();
        
        await pyodide.runPythonAsync(code);
        
        document.getElementById("btn_stitch").onclick = async () => {
            dbg("Stitch Request Sent");
            document.getElementById("overlay").style.display = "flex";
            await pyodide.runPythonAsync(`await ingest_video()`);
        };
        
        document.getElementById("close_tuner").onclick = async () => {
            document.getElementById("screen-time-travel").style.display = "none";
            document.getElementById("screen-ingest").style.display = "flex";
            dbg("Navigated Back");
        };

        document.getElementById("btn_reset").onclick = async () => {
            window.calculateGoldenStart();
            window.triggerUpdate(); 
            dbg("System Reset to Golden State");
        };
        
        document.getElementById("overlay").style.display = "none";
        dbg("System Ready. Waiting for file.");
    } catch(e) {
        dbg("ENGINE LOAD FAILED: " + e.message);
        document.getElementById("overlay-text").innerText = "ENGINE LOAD FAILED.\nRUN LOCAL SERVER.";
    }
}
// END OF DOCUMENT [20251221-0746]