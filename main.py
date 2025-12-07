import js
from js import document, console, localStorage, JSON, window
import asyncio
import random

# --- PERSISTENCE ---
def load_config():
    try:
        data = localStorage.getItem("baalsamic_v6_config")
        if data:
            config = JSON.parse(data)
            fps_val = str(config.fps) if hasattr(config, 'fps') else "15"
            res_val = str(config.res) if hasattr(config, 'res') else "0"
            
            for r in document.getElementsByName("fps"):
                if r.value == fps_val: r.checked = True
            for r in document.getElementsByName("res"):
                if r.value == res_val: r.checked = True
    except: pass

def save_config(*args):
    fps_val = document.querySelector('input[name="fps"]:checked').value
    res_val = document.querySelector('input[name="res"]:checked').value
    config = js.Object.new()
    config.fps = fps_val
    config.res = res_val
    localStorage.setItem("baalsamic_v6_config", JSON.stringify(config))

# --- STATE ---
current_video_file = None
current_seed_configs = {} 

# --- LOGIC ---
async def start_stitching(*args):
    console.log("Stitch initiated...")
    upload_input = document.getElementById("upload")
    if not upload_input.files.length:
        window.alert("Select a video first.")
        return

    document.getElementById("overlay").style.display = "flex"
    document.getElementById("overlay-text").innerText = "LOADING..."
    
    fps = int(document.querySelector('input[name="fps"]:checked').value)
    
    file = upload_input.files.item(0)
    url = js.URL.createObjectURL(file)
    video = document.getElementById("hidden_video")
    video.src = url
    
    while video.readyState < 1: 
        await asyncio.sleep(0.1)
    
    await generate_contact_sheet(video, fps)
    
    document.getElementById("overlay").style.display = "none"
    document.getElementById("btn_reshuffle").style.display = "block"

async def reshuffle(*args):
    await start_stitching()

async def generate_contact_sheet(video_elem, target_fps):
    gallery = document.getElementById("gallery")
    gallery.innerHTML = ""
    current_seed_configs.clear()
    
    seeds = [random.randint(100, 999) for _ in range(3)]
    base_factor = 60 / target_fps 
    
    for i, seed in enumerate(seeds):
        random.seed(seed)
        base_w = random.randint(2, 8)
        cfg = {
            "width": int(base_w * base_factor),
            "jitter": random.randint(0, int(20 * base_factor))
        }
        current_seed_configs[seed] = cfg
        
        div = document.createElement("div")
        div.className = "card"
        div.innerHTML = f"""<div class="card-header">VAR #{seed}</div><canvas id="cvs_{seed}"></canvas>"""
        gallery.appendChild(div)
        
        await run_process(video_elem, cfg["width"], cfg["jitter"], 150, f"cvs_{seed}", target_fps, seed)

async def run_process(video_elem, width, jitter, target_height, canvas_id, target_fps, seed):
    canvas = document.getElementById("hidden_canvas")
    ctx = canvas.getContext("2d")
    out_canvas = document.getElementById(canvas_id)
    out_ctx = out_canvas.getContext("2d")
    
    scale = 1.0
    if target_height > 0 and video_elem.videoHeight > target_height:
        scale = target_height / video_elem.videoHeight
    
    w = int(video_elem.videoWidth * scale)
    h = int(video_elem.videoHeight * scale)
    canvas.width = w; canvas.height = h
    
    curr_slit = max(1, int(width * scale))
    curr_jitter = int(jitter * scale)

    duration = video_elem.duration
    step = 1 / target_fps
    total_frames = int(duration * target_fps)
    out_canvas.width = total_frames * curr_slit
    out_canvas.height = h
    
    current_time = 0.0
    x_pos = 0
    random.seed(seed)
    
    while current_time < duration:
        video_elem.currentTime = current_time
        await asyncio.sleep(0.02)
        ctx.drawImage(video_elem, 0, 0, w, h)
        
        offset = random.randint(-curr_jitter, curr_jitter)
        center_x = (w // 2) + offset
        start_x = max(0, min(w - curr_slit, center_x))
        out_ctx.drawImage(canvas, start_x, 0, curr_slit, h, x_pos, 0, curr_slit, h)
        
        current_time += step
        x_pos += curr_slit
        if x_pos % 50 == 0: await asyncio.sleep(0.001)

    def open_tuner_handler(e):
        open_tuner(seed)
    out_canvas.onclick = open_tuner_handler

current_tuner_seed = 0

def open_tuner(seed):
    global current_tuner_seed
    current_tuner_seed = seed
    cfg = current_seed_configs[seed]
    
    document.getElementById("tuner_width").value = cfg["width"]
    document.getElementById("tuner_jitter").value = cfg["jitter"]
    
    document.getElementById("main-view").style.display = "none"
    document.getElementById("tuner-view").style.display = "block"
    
    src_cvs = document.getElementById(f"cvs_{seed}")
    dest_cvs = document.getElementById("tuner_canvas")
    dest_cvs.width = src_cvs.width
    dest_cvs.height = src_cvs.height
    dest_cvs.getContext("2d").drawImage(src_cvs, 0, 0)

def close_tuner(*args):
    document.getElementById("tuner-view").style.display = "none"
    document.getElementById("main-view").style.display = "block"

async def render_from_tuner(*args):
    document.getElementById("overlay").style.display = "flex"
    document.getElementById("overlay-text").innerText = "RENDERING FINAL..."
    
    width = int(document.getElementById("tuner_width").value)
    jitter = int(document.getElementById("tuner_jitter").value)
    fps = int(document.querySelector('input[name="fps"]:checked').value)
    res = int(document.querySelector('input[name="res"]:checked').value)
    video = document.getElementById("hidden_video")
    
    await run_process(video, width, jitter, res, "tuner_canvas", fps, current_tuner_seed)
    
    document.getElementById("overlay").style.display = "none"
    window.alert("Done! Long-press image to save.")

# --- STARTUP ---
load_config()
window.alert("Baalsamic Engine Loaded!")