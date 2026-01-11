// v22.15 - js/ui/workflow.js
/*
    WORKFLOW ENGINE
    - FEATURE: Darkroom UI Wiring (State & Events)
    - UPDATE: Default Accordion Behavior (All Open)
*/

console.log("WORKFLOW: Loading V22.15...");

window.Workflow = (function() {
    
    // --- STATE ---
    let state = {
        currentRenderUrl: null, 
        currentStitchMap: null,
        sourceFilename: null,
        sourcePath: null, 
        interfaceLocked: false, 
        videoMeta: { duration: 0, fps: 30, width: 1920, height: 1080 },
        
        // Time Travel Params
        params: {
            count: 6, 
            img_width: 2400, 
            index: 50, span: 20,
            xjitter: 10, yjitter: 10, zjitter: 0,
            burst: 'soft', gap: 'close',
            anchor: 'fit', depth: 'ltr',
            res: '720', fps: '15'
        },
        
        // Darkroom Params (New)
        darkroom: {
            drift: 0, wave: 0, stretch: 0, gap_fill: 'void',
            heat: 0, flare: 0, flicker: 0,
            smooth: 0, crunch: 0, louver: 0
        },

        crop: { ratio: 'max', pos: 50 },

        queue: {
            timer: null,
            countdownInterval: null,
            isWeaving: false,
            pendingRequest: false,
            latestRequestId: 0, 
            DEBOUNCE_MS: 1500
        },

        radical: false
    };

    const LIMITS = {
        organic: { x: 100, y: 100, z: 8, width: 199 },
        radical: { x: 300, y: 300, z: 180, width: 500 }
    };

    const DEFAULTS = {
        count: 6, img_width: 2400, index: 50, span: 20,
        xjitter: 10, yjitter: 10, zjitter: 0
    };

    // --- KERNEL LOGGING ---
    function logKernel(msg) {
        const el = document.getElementById('debug_pre');
        if(el) {
            const time = new Date().toLocaleTimeString('en-US', {hour12: false});
            el.innerText += `\n[${time}] ${msg}`;
            const panel = document.getElementById('debug-panel');
            if(panel) panel.scrollTop = panel.scrollHeight;
        }
        console.log(`KERNEL: ${msg}`);
    }

    // --- INIT ---
    function init() {
        logKernel("Initializing V22.15 Interface...");
        setupListeners();
        
        window.addEventListener('resize', () => {
            updateLensDimensions();
            updateRuler(); 
        });

        try {
            updateCoords(true); 
            setupLensDrag();
            toggleLock(false); 
            logKernel("Subsystems Ready.");
        } catch(e) { 
            console.error("BOOT ERROR:", e); 
            logKernel("CRITICAL: Boot Sequence Failed.");
        }
    }

    function setupListeners() {
        const upload = document.getElementById('upload');
        if(upload) {
            const newUpload = upload.cloneNode(true);
            upload.parentNode.replaceChild(newUpload, upload);
            newUpload.addEventListener('change', (e) => {
                if(e.target.files.length > 0) {
                    const file = e.target.files[0];
                    logKernel(`File Selected: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`);
                    
                    const lbl = document.getElementById('file-label');
                    if(lbl) {
                        lbl.innerText = `LOADED ${file.name}`;
                        lbl.classList.add('loaded'); 
                    }

                    const btn = document.getElementById('btn_ingest');
                    if(btn) {
                        btn.disabled = false;
                        btn.innerText = "GET STITCHES";
                        state.sourcePath = null; 
                        btn.onclick = () => handleIngestAction(file);
                    }
                }
            });
        }
    }

    function handleIngestAction(file) {
        if(state.sourcePath) { 
            logKernel("Switching to Time Travel (Existing Session)");
            switchScreen('screen-time-travel'); 
            return; 
        }
        if(file) uploadAndIngest(file);
    }
    
    function goToIngest() {
        switchScreen('screen-ingest');
        const btn = document.getElementById('btn_ingest');
        if(state.sourcePath && btn) {
            btn.disabled = false;
            btn.innerText = "GET STITCHES";
            btn.onclick = () => handleIngestAction(null);
        }
    }

    async function uploadAndIngest(file) {
        const btn = document.getElementById('btn_ingest');
        btn.innerText = "UPLOADING...";
        btn.disabled = true;
        
        logKernel(`Initiating Ingest for: ${file.name}`);

        const formData = new FormData();
        formData.append('video', file);

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            
            if(data.status === 'success') {
                state.sourceFilename = data.filename;
                state.sourcePath = data.path; 
                state.videoMeta = data.metadata || { duration: 10, width: 1920, height: 1080 };
                
                const meta = state.videoMeta;
                const fpsDisp = meta.fps || "N/A";
                logKernel(`[Native] Duration: ${meta.duration.toFixed(2)}s | Res: ${meta.width}x${meta.height} | FPS: ${fpsDisp}`);
                logKernel("Upload Complete. Server acknowledged 200 OK.");

                resetParams(true); 
                switchScreen('screen-time-travel');
                queueRender();
            } else {
                logKernel(`Server Error: ${data.error}`);
                alert("Error: " + (data.error || "Unknown"));
                btn.innerText = "GET STITCHES";
                btn.disabled = false;
            }
        } catch(e) {
            console.error(e);
            logKernel(`Network Exception: ${e.message}`);
            btn.innerText = "GET STITCHES";
            btn.disabled = false;
        }
    }

    function switchScreen(screenId) {
        ['screen-ingest', 'screen-time-travel', 'screen-darkroom'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
        const target = document.getElementById(screenId);
        if(target) target.style.display = 'flex';
        
        if(screenId === 'screen-time-travel') setTimeout(() => {
            updateLensDimensions();
            updateRuler(); 
        }, 100);
    }

    function resetParams(skipUpdate = false) {
        state.params = { ...state.params, ...DEFAULTS };
        const setVal = (id, v) => { const el = document.getElementById(id); if(el) el.value = v; };
        setVal('input_count', DEFAULTS.count);
        setVal('input_image_width', DEFAULTS.img_width);
        setVal('input_index', DEFAULTS.index);
        setVal('input_span', DEFAULTS.span);
        setVal('input_xjitter', DEFAULTS.xjitter);
        setVal('input_yjitter', DEFAULTS.yjitter);
        setVal('input_zjitter', DEFAULTS.zjitter);
        
        if(!skipUpdate) {
            updateCoords(true); 
            executeRender(); 
        }
    }

    // --- UI UPDATES ---
    function updateCoords(skipRender = false) {
        const getVal = (id, def) => {
            const el = document.getElementById(id);
            return el ? parseInt(el.value) : def;
        };

        state.params.count = Math.max(3, getVal('input_count', 6));
        state.params.img_width = getVal('input_image_width', 2400); 
        state.params.index = getVal('input_index', 50);
        state.params.span = getVal('input_span', 20);
        state.params.xjitter = getVal('input_xjitter', 0);
        state.params.yjitter = getVal('input_yjitter', 0);
        state.params.zjitter = getVal('input_zjitter', 0);
        
        const setDisp = (id, mode) => { const el = document.getElementById(id); if(el) el.style.display = mode; };
        const setDisabled = (id, disabled) => {
            const el = document.getElementById(id);
            if(el) {
                if(disabled) el.classList.add('disabled');
                else el.classList.remove('disabled');
                const inputs = el.querySelectorAll('input');
                inputs.forEach(i => i.disabled = disabled);
            }
        };

        if(state.params.anchor === 'fit') {
            setDisabled('row_index', true);
            setDisabled('row_span', true);
        } else {
            setDisabled('row_index', false);
            setDisabled('row_span', false);
        }
        setDisp('row_direction', (state.params.zjitter > 0) ? 'flex' : 'none');

        const checkRad = (id, val, limit) => {
            const el = document.getElementById(id);
            if(el) {
                if(val > limit) el.classList.add('radical-active');
                else el.classList.remove('radical-active');
            }
        };
        checkRad('input_xjitter', state.params.xjitter, LIMITS.organic.x);
        checkRad('input_yjitter', state.params.yjitter, LIMITS.organic.y);
        checkRad('input_zjitter', state.params.zjitter, LIMITS.organic.z);

        updateLabels();
        updateCalculations();
        
        if(!skipRender) queueRender();
    }

    function updateLabels() {
        const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
        setTxt('val_cnt', state.params.count);
        setTxt('val_img_wid', state.params.img_width);
        setTxt('val_x', state.params.xjitter);
        setTxt('val_y', state.params.yjitter);
        setTxt('val_z', state.params.zjitter);
    }

    function updateCalculations() {
        const dur = state.videoMeta.duration || 10;
        let labelStart = 0;
        let labelSpan = dur;

        if(state.params.anchor !== 'fit') {
            const spanSec = 1.0 + ((state.params.span / 100.0) * (dur - 1.0));
            const midTime = (state.params.index / 100.0) * dur;
            labelStart = midTime; 
            labelSpan = spanSec;
        }

        const elSpan = document.getElementById('val_span');
        if(elSpan) elSpan.innerText = labelSpan.toFixed(1) + "s";
        const elIdx = document.getElementById('val_idx');
        if(elIdx) elIdx.innerText = labelStart.toFixed(1) + "s";
        
        const estW = state.params.img_width;
        
        const bpmDisp = document.getElementById('bpm-display');
        if(bpmDisp) {
            bpmDisp.innerText = estW + " PX";
            if(estW > 3000) bpmDisp.classList.add('danger');
            else bpmDisp.classList.remove('danger');
        }
    }

    // --- DARKROOM PARAMETERS ---
    function setDarkroomParam(key, val) {
        // Update State
        state.darkroom[key] = val;

        // Update Label (if slider)
        const labelId = `val_dr_${key}`;
        const label = document.getElementById(labelId);
        if(label) label.innerText = val;

        // Update Buttons (if toggle group)
        if(key === 'gap_fill') {
            const grp = document.getElementById('grp_gap_fill');
            if(grp) {
                grp.querySelectorAll('.mini-btn').forEach(b => {
                    if(b.dataset.val === val) b.classList.add('active');
                    else b.classList.remove('active');
                });
            }
        }
        
        // Log for Debug
        // logKernel(`DR Param: ${key} = ${val}`);
        
        // Note: Actual rendering logic will be hooked up later
        if(window.Artist && window.Artist.updateParam) {
            window.Artist.updateParam(key, val);
        }
    }

    // --- LOCK & TRANSPORT ---
    function toggleLock(forceState = null) {
        if(forceState !== null) state.interfaceLocked = forceState;
        else state.interfaceLocked = !state.interfaceLocked;

        const btn = document.getElementById('btn_lock');
        if(btn) {
            if(state.interfaceLocked) btn.classList.add('locked');
            else btn.classList.remove('locked');
        }
    }

    function expressToDarkroom() {
        exportRawStrip();
        enterDarkroomMode(); 
    }

    // --- RENDER LOGIC ---
    function queueRender() {
        const btn = document.getElementById('btn_play'); 
        state.queue.latestRequestId++;
        if(state.queue.isWeaving) {
            state.queue.pendingRequest = true;
            return; 
        }
        if(state.queue.timer) clearTimeout(state.queue.timer);
        if(state.queue.countdownInterval) clearInterval(state.queue.countdownInterval);

        if(btn) btn.style.opacity = "0.5"; 
        
        const timerDiv = document.getElementById('debounce-timer');
        if(timerDiv) {
            timerDiv.style.display = 'block';
            let timeLeft = state.queue.DEBOUNCE_MS / 1000;
            timerDiv.innerText = timeLeft.toFixed(1);
            state.queue.countdownInterval = setInterval(() => {
                timeLeft -= 0.1;
                if(timeLeft <= 0) timeLeft = 0;
                timerDiv.innerText = timeLeft.toFixed(1);
            }, 100);
        }
        state.queue.timer = setTimeout(executeRender, state.queue.DEBOUNCE_MS);
    }

    async function executeRender() {
        clearInterval(state.queue.countdownInterval);
        const timerDiv = document.getElementById('debounce-timer');
        if(timerDiv) timerDiv.style.display = 'none';

        const currentRequestId = state.queue.latestRequestId;
        state.queue.isWeaving = true;
        state.queue.pendingRequest = false;

        const btn = document.getElementById('btn_play');
        if(btn) btn.style.opacity = "1";

        if(state.interfaceLocked) {
             const ctrls = document.querySelector('.editor-controls');
             if(ctrls) ctrls.classList.add('interface-locked');
             document.body.style.cursor = 'wait';
        }

        const overlay = document.getElementById('overlay');
        if(overlay) overlay.classList.add('weaving');

        const calculatedSliceWidth = Math.max(1, Math.floor(state.params.img_width / state.params.count));

        const payload = {
            path: state.sourcePath, 
            count: state.params.count,
            width: calculatedSliceWidth, 
            index: state.params.index,
            span: state.params.span,
            xjitter: state.params.xjitter,
            yjitter: state.params.yjitter,
            zjitter: state.params.zjitter,
            anchor: state.params.anchor, 
            burst: state.params.burst,
            gap: state.params.gap,
            depth: state.params.depth
        };

        try {
            const res = await fetch('/api/render', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            
            if(state.queue.latestRequestId !== currentRequestId) {
                console.warn(`WORKFLOW: Discarding stale render (ID: ${currentRequestId})`);
                onRenderComplete(); 
                return;
            }

            const data = await res.json();
            
            if(data.status === 'success') {
                state.currentRenderUrl = data.image_url;
                state.currentStitchMap = data.stitch_map; 

                const img = document.getElementById('preview_img');
                if(img) {
                    img.onload = () => {
                        img.style.display = 'block';
                        updateLensDimensions();
                        updateRuler(data);
                        onRenderComplete();
                    };
                    img.src = data.image_url + "?t=" + Date.now();
                }
                if(window.Artist) window.Artist.loadData(data.image_url, data.stitch_map, data.width, data.height);
            } else {
                console.error("RENDER ERROR:", data.error);
                onRenderComplete();
            }
        } catch(e) {
            console.error("NETWORK ERROR:", e);
            onRenderComplete();
        }
    }

    function onRenderComplete() {
        state.queue.isWeaving = false;
        const overlay = document.getElementById('overlay');
        if(overlay) overlay.classList.remove('weaving');
        
        const ctrls = document.querySelector('.editor-controls');
        if(ctrls) ctrls.classList.remove('interface-locked');
        
        document.body.style.cursor = 'default';

        if(state.queue.pendingRequest) {
            queueRender();
        }
    }

    // --- RULER & CROP ---
    function updateRuler(renderData = null) {
        const img = document.getElementById('preview_img');
        const ruler = document.getElementById('timeline-ruler');
        if(!img || img.style.display === 'none') {
            if(ruler) ruler.style.display = 'none';
            return;
        }

        if(ruler) {
            ruler.style.display = 'flex';
            ruler.style.left = img.offsetLeft + 'px';
            ruler.style.width = img.clientWidth + 'px';
            
            const topPos = img.offsetTop - 21; 
            ruler.style.top = topPos + 'px';
            ruler.style.marginTop = '0'; 

            const rStart = document.getElementById('ruler-start');
            const rEnd = document.getElementById('ruler-end');

            if (renderData && renderData.render_start_time !== undefined) {
                 if(rStart) rStart.innerText = renderData.render_start_time.toFixed(1) + "s";
                 if(rEnd) rEnd.innerText = renderData.render_end_time.toFixed(1) + "s";
                 return;
            }
            
            const dur = state.videoMeta.duration || 10;
            let tStart = 0;
            let tEnd = dur;

            if(state.params.anchor !== 'fit') {
                const spanSec = 1.0 + ((state.params.span / 100.0) * (dur - 1.0));
                const centerSec = (state.params.index / 100.0) * dur;
                const halfSpan = spanSec / 2.0;
                
                tStart = centerSec - halfSpan;
                tEnd = centerSec + halfSpan;

                if (tStart < 0) {
                    const diff = Math.abs(tStart);
                    tStart = 0;
                    tEnd += diff;
                }
                if (tEnd > dur) {
                    const diff = tEnd - dur;
                    tEnd = dur;
                    tStart -= diff;
                }
                tStart = Math.max(0, tStart);
                tEnd = Math.min(dur, tEnd);
            }

            if(rStart) rStart.innerText = tStart.toFixed(1) + "s";
            if(rEnd) rEnd.innerText = tEnd.toFixed(1) + "s";
        }
    }

    function setRatio(r) {
        state.crop.ratio = r;
        const grp = document.querySelector('.ratio-mini-group');
        if(grp) {
            grp.querySelectorAll('.mini-btn').forEach(b => {
                if(b.innerText.toLowerCase() === r || (r === 'max' && b.innerText === 'MAX')) 
                    b.classList.add('active');
                else 
                    b.classList.remove('active');
            });
        }
        updateLensDimensions();
    }

    function updateLensDimensions() {
        const img = document.getElementById('preview_img');
        const lens = document.getElementById('crop-lens');
        if(!img || img.style.display === 'none' || state.crop.ratio === 'max' || !lens) {
            if(lens) lens.style.display = 'none';
            return;
        }
        
        lens.style.display = 'block';
        const visW = img.clientWidth;
        const visH = img.clientHeight;
        
        let targetW = visW;
        if(state.crop.ratio === '1:1') targetW = visH;
        if(state.crop.ratio === '4:5') targetW = visH * (4/5);
        if(state.crop.ratio === '16:9') targetW = visH * (16/9);
        if(targetW > visW) targetW = visW;

        lens.style.width = targetW + "px";
        lens.style.height = visH + "px";
        updateLensPosition();
    }
    
    function updateLensPosition() {
        const lens = document.getElementById('crop-lens');
        const img = document.getElementById('preview_img');
        const stage = document.getElementById('stage_container');
        if(!img || !lens || !stage) return;

        const imgLeft = img.offsetLeft;
        const lensW = lens.offsetWidth;
        const maxTravel = img.clientWidth - lensW;
        const relativeLeft = (state.crop.pos / 100.0) * maxTravel;
        
        let finalLeft = imgLeft + relativeLeft;
        const maxLeft = imgLeft + img.clientWidth - lensW;
        if(finalLeft < imgLeft) finalLeft = imgLeft;
        if(finalLeft > maxLeft) finalLeft = maxLeft;

        lens.style.left = finalLeft + "px";
        const offsetTop = img.offsetTop; 
        lens.style.top = offsetTop + "px";
    }

    function setupLensDrag() {
        const lens = document.getElementById('crop-lens');
        if(!lens) return; 

        let isDragging = false;
        let startX = 0;
        lens.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            lens.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if(!isDragging) return;
            const img = document.getElementById('preview_img');
            if(!img) return;

            const dx = e.clientX - startX;
            startX = e.clientX; 
            const maxTravel = img.clientWidth - lens.offsetWidth;
            const pctDelta = (dx / maxTravel) * 100;
            let newVal = state.crop.pos + pctDelta;
            state.crop.pos = Math.max(0, Math.min(100, newVal));
            updateLensPosition();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            lens.style.cursor = 'grab';
        });
    }

    function toggleRadicalMode() {
        state.radical = !state.radical;
        const btn = document.getElementById('btn_radical');
        if(btn) {
            if(state.radical) {
                btn.classList.add('radical-active');
                document.body.classList.add('radical-active');
            } else {
                btn.classList.remove('radical-active');
                document.body.classList.remove('radical-active');
            }
        }
        
        const curLimits = state.radical ? LIMITS.radical : LIMITS.organic;
        const setMax = (id, val) => { const el = document.getElementById(id); if(el) el.max = val; };
        
        setMax('input_xjitter', curLimits.x);
        setMax('input_yjitter', curLimits.y);
        setMax('input_zjitter', curLimits.z);

        const spanInp = document.getElementById('input_span');
        if(spanInp) {
            spanInp.step = state.radical ? "0.1" : "1";
            spanInp.min = state.radical ? "0.1" : "1";
        }

        const preState = JSON.stringify(state.params);

        if(!state.radical) {
             const clamp = (id, limit) => {
                 const el = document.getElementById(id);
                 if(el && parseInt(el.value) > limit) {
                     el.value = limit;
                 }
             };
             clamp('input_xjitter', LIMITS.organic.x);
             clamp('input_yjitter', LIMITS.organic.y);
             clamp('input_zjitter', LIMITS.organic.z);
        }
        
        updateCoords(true); 

        const postState = JSON.stringify(state.params);
        if(preState !== postState) {
            queueRender();
        }
    }

    function setParam(key, val) {
        const grp = document.getElementById(`grp_${key}`);
        if(grp) {
            grp.querySelectorAll('.mini-btn').forEach(b => {
                if(b.dataset.val === val) b.classList.add('active');
                else b.classList.remove('active');
            });
        }
        state.params[key] = val;
        updateCoords();
    }

    function openDevelopModal() { 
        const el = document.getElementById('develop-modal'); if(el) el.style.display = 'flex'; 
    }
    
    // --- MODE TOGGLE LOGIC ---
    function enterDarkroomMode() {
        const el = document.getElementById('develop-modal');
        if(el) el.style.display = 'none';
        const screen = document.getElementById('screen-time-travel');
        if(screen) screen.classList.add('mode-darkroom');
        const title = document.getElementById('header_title');
        if(title) title.innerText = "DARK ROOM";
        if(window.Artist) {
            setTimeout(() => {
                window.Artist.init();
                window.Artist.render();
            }, 100);
        }
    }

    function exitDarkroomMode() {
        const screen = document.getElementById('screen-time-travel');
        if(screen) screen.classList.remove('mode-darkroom');
        const title = document.getElementById('header_title');
        if(title) title.innerText = "TIME TRAVEL";
    }
    
    function goToDarkroom() { enterDarkroomMode(); }

    function exportRawStrip() {
        const img = document.getElementById('preview_img');
        if(img && img.src) {
            const a = document.createElement('a');
            a.href = img.src;
            a.download = `BAAL_V22_RAW_${Date.now()}.png`; 
            a.click();
        }
    }

    // --- EXPORTS ---
    function exportStitchMap() {
        if(!state.currentStitchMap) {
            alert("No stitch data available. Please wait for a render to complete.");
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.currentStitchMap));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `BAAL_V22_MAP_${Date.now()}.json`;
        a.click();
    }

    function triggerDownload(btnId) {
        if (!state.currentRenderUrl) return;
        const a = document.createElement('a');
        a.href = state.currentRenderUrl;
        a.download = `render_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    return {
        init,
        updateCoords,
        setParam,
        setRatio,
        toggleRadicalMode,
        toggleLock,
        expressToDarkroom,
        openDevelopModal,
        goToDarkroom,
        enterDarkroomMode, 
        exitDarkroomMode,  
        exportRawStrip,
        exportStitchMap, 
        triggerDownload,
        setDarkroomParam, // Exposed
        resetParams: () => { resetParams(); },
        goToIngest,
        closeModal: () => { const el = document.getElementById('info-modal'); if(el) el.style.display = 'none'; },
        backToTimeTravel: () => switchScreen('screen-time-travel'),
        saveRecipe: () => window.Artist && window.Artist.saveRecipe && window.Artist.saveRecipe(),
        exportPrint: () => window.Artist && window.Artist.exportCanvas && window.Artist.exportCanvas()
    };
})();
// END OF DOCUMENT js/ui/workflow.js [20260111 1400]