// GLOBAL STORE
window.sourceFilename = "baalsamic_render";
window.sourcePath = ""; 
window.selectedFile = null; 
window.videoMeta = { duration: 0, fps: 30, width: 1920, height: 1080 }; 

window.currentRatio = 'max';
window.currentSmear = 1; 
window.currentDepth = 'ltr';
window.currentAnchor = 'fit';
window.currentBurst = 'soft'; 
window.currentGap = 'close';
window.isRadical = false;
window.renderState = 'idle';
window.useLock = true; 
window.jobIdCounter = 0; 

// --- UPDATED RANGES FOR V20.10 ---
const RANGES = {
    organic: { count: 60, width: 100, x: 100, y: 100, z: 8 },
    radical: { count: 60, width: 100, x: 200, y: 200, z: 45 } 
};

let debounceTimer = null;
let countdownInterval = null;
const DEBOUNCE_DELAY = 800; 

// --- HELPER FUNCTIONS ---

window.updateLensPositionFromSlider = function() {
    if (window.currentRatio === 'max') return;
    const slider = document.getElementById('input_pos');
    const lens = document.getElementById('crop-lens');
    const canvas = document.getElementById('main_canvas');
    const stage = document.getElementById('stage_container');
    
    if(!canvas || !lens || !stage) return;

    const visW = canvas.clientWidth;
    const stageW = stage.clientWidth;
    const canvasOffset = (stageW - visW) / 2;
    const maxLensTravel = visW - parseFloat(lens.style.width || 0);
    
    const sliderVal = slider ? slider.value : 50;
    const relativeLeft = (sliderVal / 100) * maxLensTravel;
    
    lens.style.left = (canvasOffset + relativeLeft) + "px";
};

window.updateLensDimensions = function() {
    const canvas = document.getElementById('main_canvas');
    const lens = document.getElementById('crop-lens');
    const ruler = document.getElementById('timeline-ruler');
    
    if (!canvas || canvas.width === 0) return;
    
    // --- RULER FIX: SNAP TO IMAGE ---
    ruler.style.width = canvas.clientWidth + "px";
    ruler.style.left = canvas.offsetLeft + "px"; 
    ruler.style.top = canvas.offsetTop + "px"; // Fix Vertical Detachment

    if (window.currentRatio === 'max') { 
        lens.style.display = 'none'; 
        return; 
    }
    lens.style.display = 'block';

    const visH = canvas.clientHeight;
    const visW = canvas.clientWidth;
    let targetW = visW;
    if (window.currentRatio === '1:1') targetW = visH; 
    if (window.currentRatio === '4:5') targetW = visH * (4/5);
    if (window.currentRatio === '16:9') targetW = visH * (16/9); 
    if(targetW > visW) targetW = visW;

    lens.style.width = targetW + "px";
    lens.style.height = visH + "px";
    lens.style.top = canvas.offsetTop + "px"; 
    window.updateLensPositionFromSlider();
};

window.updateTimeLabels = function() {
    const dur = window.videoMeta.duration || 0;
    const idxVal = document.getElementById('input_index').value;
    const spanVal = document.getElementById('input_span').value;
    const spanSec = 1.0 + (spanVal / 100.0) * (dur - 1.0);
    
    // --- DYNAMIC LIMIT LOGIC ---
    let burstFrames = 1; 
    if(window.currentBurst === 'med') burstFrames = 3;
    if(window.currentBurst === 'hard') burstFrames = 10;
    
    const fps = window.videoMeta.fps || 30;
    const frameDur = 1.0 / fps;
    const burstDuration = burstFrames * frameDur;
    
    let maxPossible = Math.floor(spanSec / burstDuration);
    
    const limitCap = window.isRadical ? RANGES.radical.count : RANGES.organic.count;
    if(maxPossible > limitCap) maxPossible = limitCap;
    if(maxPossible < 2) maxPossible = 2; 
    
    const countInput = document.getElementById('input_count');
    countInput.max = maxPossible;
    
    if(parseInt(countInput.value) > maxPossible) {
        countInput.value = maxPossible;
        document.getElementById('val_cnt').innerText = maxPossible;
    }
    // ---------------------------

    const center = dur * (idxVal / 100.0);
    const halfSpan = spanSec / 2.0;
    let start = center - halfSpan;
    let end = center + halfSpan;
    if (start < 0) { const diff = 0 - start; start = 0; end += diff; }
    if (end > dur) { const diff = end - dur; end = dur; start -= diff; if (start < 0) start = 0; }
    
    document.getElementById('val_idx_time').innerText = start.toFixed(1) + "s";
    document.getElementById('val_span_time').innerText = spanVal + "% (" + spanSec.toFixed(1) + "s)";
    
    const rulerStart = document.getElementById('ruler-start');
    const rulerEnd = document.getElementById('ruler-end');
    
    if (window.currentAnchor === 'focus') {
        rulerStart.innerText = start.toFixed(1) + "s";
        rulerEnd.innerText = end.toFixed(1) + "s";
        rulerStart.style.color = "#ff0055"; 
        rulerEnd.style.color = "#ff0055";
    } else {
        rulerStart.innerText = "0.0s";
        rulerEnd.innerText = dur.toFixed(1) + "s";
        rulerStart.style.color = "#00ffcc"; 
        rulerEnd.style.color = "#00ffcc";
    }
    
    window.updateLensPositionFromSlider();
}

window.updateCoords = function(skipRender = false) { 
    // 1. Refresh Text Values
    document.getElementById('val_cnt').innerText = document.getElementById('input_count').value;
    document.getElementById('val_wid').innerText = document.getElementById('input_width').value;
    document.getElementById('val_img_wid').innerText = document.getElementById('input_image_width').value + "px";
    
    document.getElementById('val_x').innerText = document.getElementById('input_xjitter').value;
    document.getElementById('val_y').innerText = document.getElementById('input_yjitter').value;
    const zVal = document.getElementById('input_zjitter').value;
    document.getElementById('val_z').innerText = zVal;
    
    // VISIBILITY TOGGLE FOR DIRECTION
    const dirRow = document.getElementById('row_direction');
    if(dirRow) {
        dirRow.style.display = (parseInt(zVal) > 0) ? 'flex' : 'none';
    }

    // 2. Refresh Timeline & Limits
    window.updateTimeLabels();
    
    // 3. Pixel Estimation
    const c = parseInt(document.getElementById('input_count').value);
    let estW = 0;
    
    if(window.currentAnchor === 'fit') {
        const w = parseInt(document.getElementById('input_width').value);
        estW = c * w * 1; 
    } else {
        estW = parseInt(document.getElementById('input_image_width').value);
    }
    
    const display = document.getElementById('pixel_count');
    if(display) {
        display.innerText = "~" + estW + "px";
        if (estW > 3200) display.classList.add('danger');
        else display.classList.remove('danger');
    }

    if(!skipRender) window.triggerUpdate();
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("overlay").style.display = "none";
    dbg("SYSTEM: V20.10 Interface Initialized.");
    
    const uploadInput = document.getElementById("upload");
    const fileLabel = document.getElementById("file-label");
    
    uploadInput.addEventListener('change', () => {
        if (uploadInput.files.length > 0) {
            window.selectedFile = uploadInput.files[0]; 
            const name = window.selectedFile.name;
            fileLabel.innerText = "READY: " + name.substring(0, 20) + (name.length > 20 ? "..." : "");
            fileLabel.style.background = "#00ffcc"; 
            fileLabel.style.color = "black";
            dbg(`USER: Selected file ${name}`);
        }
    });

    document.getElementById("btn_stitch").onclick = async () => {
        if(!window.selectedFile) { alert("Please load a video file first."); return; }

        const formData = new FormData();
        formData.append('video', window.selectedFile);

        const btn = document.getElementById("btn_stitch");
        const originalText = btn.innerText;
        btn.innerText = "UPLOADING...";
        btn.disabled = true;
        
        dbg("NETWORK: Starting upload...");

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Upload failed with status ' + response.status);

            const data = await response.json();
            dbg(`SERVER: Received ${data.filename}`);
            if(data.metadata) {
                window.videoMeta = data.metadata;
                dbg(`SERVER: Metadata Extracted (${data.metadata.width}x${data.metadata.height} @ ${data.metadata.fps}fps)`);
            }
            window.sourceFilename = data.filename;
            window.sourcePath = data.path; 

            document.getElementById("screen-ingest").style.display = "none";
            document.getElementById("screen-time-travel").style.display = "flex";
            
            window.calculateGoldenStart(); 
            setTimeout(() => { window.updateLensDimensions(); }, 100);

        } catch (error) {
            console.error(error);
            dbg("ERROR: " + error.message);
            alert("System Error: " + error.message);
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    };

    document.getElementById("close_tuner").onclick = () => {
        document.getElementById("screen-time-travel").style.display = "none";
        document.getElementById("screen-ingest").style.display = "flex";
        dbg("USER: Navigated to Ingest Screen.");
    };

    document.getElementById("btn_reset").onclick = () => window.calculateGoldenStart();
    window.addEventListener('resize', () => { setTimeout(window.updateLensDimensions, 100); });
});

// --- RENDER & SAVE BUTTON LOGIC ---
window.handleRenderClick = function() {
    if (window.renderState === 'idle') {
        window.saveImage();
    } else {
        cancelUpdate();
    }
};

window.saveImage = function() {
    const canvas = document.getElementById("main_canvas");
    const lens = document.getElementById("crop-lens");
    if(!canvas || canvas.width === 0) return;

    const scale = 1; 
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
        const displayScale = canvas.width / canvas.clientWidth;
        
        sourceX = relativeLensX * displayScale;
        sourceW = lensWidth * displayScale;
    }
    
    const temp = document.createElement('canvas');
    temp.width = sourceW; temp.height = sourceH;
    const ctx = temp.getContext('2d');
    ctx.fillStyle = "black"; 
    ctx.fillRect(0, 0, temp.width, temp.height);
    ctx.drawImage(canvas, sourceX, 0, sourceW, sourceH, 0, 0, sourceW, sourceH);
    
    const count = document.getElementById("input_count").value;
    const fps = document.querySelector('input[name="fps"]:checked').value;
    const filename = `BAAL_${window.sourceFilename}_v20.10_${count}stitches_${fps}fps.png`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = temp.toDataURL();
    link.click();
    dbg(`USER: Downloaded ${filename}`);
};

// --- RENDER LOGIC ---

function triggerUpdate() { 
    const ingest = document.getElementById("screen-ingest");
    if(ingest && ingest.style.display !== 'none') return;

    if (debounceTimer) clearTimeout(debounceTimer);
    if (countdownInterval) clearInterval(countdownInterval);

    window.renderState = 'waiting';
    const btn = document.getElementById('btn_render_final');
    btn.classList.add('waiting');
    
    if(document.getElementById('chk_lock').checked) {
        document.querySelector('.editor-controls').classList.add('soft-locked');
    }

    let timeLeft = DEBOUNCE_DELAY / 1000;
    btn.innerText = `WAITING... ${timeLeft.toFixed(1)}s`;
    document.getElementById('debounce-timer').style.display = 'block';
    
    countdownInterval = setInterval(() => {
        timeLeft -= 0.1;
        if(timeLeft <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('debounce-timer').style.display = 'none';
        } else {
            btn.innerText = `WAITING... ${timeLeft.toFixed(1)}s`;
            document.getElementById('debounce-timer').innerText = timeLeft.toFixed(1);
        }
    }, 100);

    debounceTimer = setTimeout(() => {
        performRender();
    }, DEBOUNCE_DELAY);
}

async function performRender() {
    const btn = document.getElementById('btn_render_final');
    btn.classList.remove('waiting');
    btn.classList.add('processing');
    btn.innerText = "WEAVING...";
    document.body.style.cursor = 'wait';
    
    document.getElementById('stage_container').classList.add('weaving');
    
    if(document.getElementById('chk_lock').checked) {
        document.querySelector('.editor-controls').classList.add('interface-locked');
    }

    let finalStitchWidth = 20;
    
    if(window.currentAnchor === 'fit') {
        finalStitchWidth = document.getElementById('input_width').value;
    } else {
        const targetImgWidth = parseInt(document.getElementById('input_image_width').value);
        const count = parseInt(document.getElementById('input_count').value);
        finalStitchWidth = Math.max(1, Math.floor(targetImgWidth / count));
    }

    const payload = {
        path: window.sourcePath,
        count: document.getElementById('input_count').value,
        width: finalStitchWidth, 
        index: document.getElementById('input_index').value,
        span: document.getElementById('input_span').value,
        xjitter: document.getElementById('input_xjitter').value,
        yjitter: document.getElementById('input_yjitter').value,
        zjitter: document.getElementById('input_zjitter').value, 
        anchor: window.currentAnchor,
        burst: window.currentBurst,
        depth: window.currentDepth
    };

    try {
        const response = await fetch('/api/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if(data.status === 'success') {
            const canvas = document.getElementById('main_canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                document.getElementById('stage_container').classList.remove('weaving');
                
                btn.classList.remove('processing');
                btn.innerText = "RENDER";
                document.body.style.cursor = 'default';
                
                const ctrls = document.querySelector('.editor-controls');
                ctrls.classList.remove('soft-locked');
                ctrls.classList.remove('interface-locked');
                
                window.renderState = 'idle';
                window.updateLensDimensions();
            };
            img.src = data.image_url + "?t=" + new Date().getTime(); 
        } else {
            throw new Error(data.error || "Backend Error");
        }
    } catch (e) {
        console.error(e);
        btn.innerText = "ERROR";
        document.getElementById('stage_container').classList.remove('weaving');
        
        document.querySelector('.editor-controls').classList.remove('interface-locked');
        document.querySelector('.editor-controls').classList.remove('soft-locked');
        dbg("RENDER ERROR: " + e.message);
    }
}

function cancelUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (countdownInterval) clearInterval(countdownInterval);
    
    window.renderState = 'idle';
    document.getElementById('stage_container').classList.remove('weaving');
    
    const btn = document.getElementById('btn_render_final');
    const controls = document.querySelector('.editor-controls');
    controls.classList.remove('soft-locked');
    btn.classList.remove('waiting');
    btn.innerText = "RENDER";
    document.getElementById('debounce-timer').style.display = 'none';
}

window.checkResolution = function() { window.updateCoords(); }

window.toggleRadicalMode = function() {
    const xInput = document.getElementById('input_xjitter');
    const yInput = document.getElementById('input_yjitter');
    const zInput = document.getElementById('input_zjitter');
    
    const oldX = parseInt(xInput.value);
    const oldY = parseInt(yInput.value);
    const oldZ = parseInt(zInput.value);

    window.isRadical = !window.isRadical; 
    const btn = document.getElementById('btn_radical');
    const limits = window.isRadical ? RANGES.radical : RANGES.organic;

    if (window.isRadical) { 
        btn.classList.add('active'); 
        document.body.classList.add('radical-mode'); 
    } else { 
        btn.classList.remove('active'); 
        document.body.classList.remove('radical-mode'); 
    }
    
    xInput.max = limits.x;
    yInput.max = limits.y;
    zInput.max = limits.z;

    if (parseInt(xInput.value) > limits.x) xInput.value = limits.x;
    if (parseInt(yInput.value) > limits.y) yInput.value = limits.y;
    if (parseInt(zInput.value) > limits.z) zInput.value = limits.z;

    window.updateTimeLabels(); 
    
    const newX = parseInt(xInput.value);
    const newY = parseInt(yInput.value);
    const newZ = parseInt(zInput.value);
    
    const hasChanged = (oldX !== newX) || (oldY !== newY) || (oldZ !== newZ);

    window.updateCoords(!hasChanged); 
};

window.calculateGoldenStart = function() {
    document.getElementById('input_count').value = 40;
    document.getElementById('input_width').value = 20;
    document.getElementById('input_image_width').value = 1200;
    
    document.getElementById('input_xjitter').value = 30;
    document.getElementById('input_yjitter').value = 0;
    document.getElementById('input_zjitter').value = 0;
    
    window.currentSmear = 1;
    window.currentDepth = 'ltr';
    window.currentAnchor = 'fit';
    window.currentBurst = 'soft'; 
    window.currentGap = 'close';
    window.isRadical = false; 

    document.querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.anchor-group .mini-btn').classList.add('active'); 
    document.querySelectorAll('.burst-group .mini-btn')[0].classList.add('active'); 
    document.querySelector('.depth-group .mini-btn').classList.add('active');
    document.querySelectorAll('.gap-group .mini-btn')[0].classList.add('active');
    
    const btnRad = document.getElementById('btn_radical');
    btnRad.classList.remove('active');
    document.body.classList.remove('radical-mode');
    
    // Set Organic Limits
    const xInput = document.getElementById('input_xjitter');
    const yInput = document.getElementById('input_yjitter');
    const zInput = document.getElementById('input_zjitter');
    xInput.max = RANGES.organic.x;
    yInput.max = RANGES.organic.y;
    zInput.max = RANGES.organic.z;

    document.getElementById('row_index').classList.add('disabled');
    document.getElementById('row_span').classList.add('disabled');
    
    // Fit Mode Default
    document.getElementById('row_stitch_width').style.display = 'flex';
    document.getElementById('row_image_width').style.display = 'none';
    
    const dirRow = document.getElementById('row_direction');
    if(dirRow) dirRow.style.display = 'none';
    
    window.updateCoords();
}

window.setAnchor = function(val, btn) { 
    window.currentAnchor = val; 
    document.querySelector('.anchor-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const rowIndex = document.getElementById('row_index');
    const rowSpan = document.getElementById('row_span');
    const rowStitchW = document.getElementById('row_stitch_width');
    const rowImgW = document.getElementById('row_image_width');
    
    if (val === 'focus') { 
        rowIndex.classList.remove('disabled'); 
        rowSpan.classList.remove('disabled');
        rowStitchW.style.display = 'none';
        rowImgW.style.display = 'flex';
    } else { 
        rowIndex.classList.add('disabled'); 
        rowSpan.classList.add('disabled'); 
        rowStitchW.style.display = 'flex';
        rowImgW.style.display = 'none';
    }
    window.updateTimeLabels(); window.triggerUpdate(); 
}

window.setBurst = function(val, btn) { 
    window.currentBurst = val; 
    document.querySelector('.burst-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active'); window.triggerUpdate(); 
}
window.setGap = function(val, btn) { 
    window.currentGap = val; 
    document.querySelector('.gap-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active'); window.triggerUpdate(); 
}
window.setDepth = function(val, btn) { 
    window.currentDepth = val; 
    document.querySelector('.depth-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active'); window.triggerUpdate(); 
}
window.setSmear = function(val, btn) { 
    window.currentSmear = val; 
    document.querySelector('.smear-group').querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active'); window.triggerUpdate(); 
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
    window.updateLensDimensions(); 
}

window.handleRenderClick = function() {
    if (window.renderState === 'idle') {
        window.saveImage();
    } else {
        cancelUpdate();
    }
};

const lens = document.getElementById('crop-lens');
let isDragging = false; let startX = 0; let startLeft = 0;
function startDrag(e) { if(window.currentRatio === 'max') return; isDragging = true; startX = (e.touches ? e.touches[0].clientX : e.clientX); startLeft = parseFloat(lens.style.left) || 0; lens.style.cursor = 'grabbing'; }
function doDrag(e) { if(!isDragging) return; e.preventDefault(); const clientX = (e.touches ? e.touches[0].clientX : e.clientX); const delta = clientX - startX; const canvas = document.getElementById('main_canvas'); const stage = document.getElementById('stage_container'); const visW = canvas.clientWidth; const stageW = stage.clientWidth; const canvasOffset = (stageW - visW) / 2; const minX = canvasOffset; const maxX = minX + (visW - parseFloat(lens.style.width)); let newLeft = startLeft + delta; if(newLeft < minX) newLeft = minX; if(newLeft > maxX) newLeft = maxX; lens.style.left = newLeft + "px"; const range = maxX - minX; if(range > 0) { const pct = ((newLeft - minX) / range) * 100; document.getElementById('input_pos').value = pct; } }
function stopDrag() { isDragging = false; lens.style.cursor = 'grab'; }
lens.addEventListener('mousedown', startDrag); lens.addEventListener('touchstart', startDrag);
window.addEventListener('mousemove', doDrag); window.addEventListener('touchmove', doDrag, {passive: false});
window.addEventListener('mouseup', stopDrag); window.addEventListener('touchend', stopDrag);

function dbg(msg){ console.log(msg); const pre = document.getElementById("debug_pre"); if(pre) { pre.textContent = (pre.textContent + "\n> " + msg).slice(-5000); const panel = document.getElementById("debug-panel"); if(panel) panel.scrollTop = panel.scrollHeight; } }
// END OF DOCUMENT [20251222-2115]