from js import document, console, localStorage, JSON, window, setTimeout
import asyncio, random, math

render_generation = 0

async def await_seek(video_elem, target_time):
    video_elem.currentTime = target_time
    await asyncio.sleep(0.08) 
    timeout = 20
    while video_elem.seeking and timeout > 0:
        await asyncio.sleep(0.05)
        timeout -= 1

def generate_jitter_bag(length, intensity):
    if intensity == 0: return [0] * length
    bag_size = 20
    bag = []
    for i in range(bag_size):
        bag.append(random.randint(-intensity, intensity))
    vals = []
    for _ in range(length):
        vals.append(random.choice(bag))
    return vals
    
def generate_burst_map(length, mode):
    bag = []
    for i in range(length):
        if mode == 'soft': bag.append(1)
        elif mode == 'med': bag.append(3)
        elif mode == 'hard': bag.append(10)
        elif mode == 'mix': bag.append(random.randint(1, 5))
        else: bag.append(1)
    return bag

current_seed = 0

async def ingest_video(*args):
    upload = document.getElementById("upload")
    if not upload.files.length:
        window.alert("Select a video first.")
        document.getElementById("overlay").style.display = "none"
        return
    
    file = upload.files.item(0)
    url = window.URL.createObjectURL(file)
    video = document.getElementById("hidden_video")
    video.src = url

    while not video.duration or math.isnan(video.duration):
        await asyncio.sleep(0.1)
    
    video.currentTime = 0.5
    await asyncio.sleep(0.1)
    video.currentTime = 0.0

    window.calculateGoldenStart()
    
    document.getElementById("screen-ingest").style.display = "none"
    document.getElementById("screen-time-travel").style.display = "flex"
    
    global current_seed
    current_seed = random.randint(100, 999)
    await update_preview(0)
    window.setRatio('max') 
    document.getElementById("overlay").style.display = "none"

# V19.12: Accepts my_job_id to track races
async def update_preview(my_job_id):
    global render_generation
    render_generation += 1
    my_gen = render_generation

    count = int(document.getElementById("input_count").value)
    width = int(document.getElementById("input_width").value)
    x_jit = int(document.getElementById("input_xjitter").value)
    y_jit = int(document.getElementById("input_yjitter").value)
    z_jit = int(document.getElementById("input_zjitter").value)
    
    anchor_mode = window.currentAnchor
    index_pct = int(document.getElementById("input_index").value) / 100.0
    
    video = document.getElementById("hidden_video")
    duration = video.duration
    span_slider = int(document.getElementById("input_span").value)
    span_sec = 1.0 + (span_slider / 100.0) * (duration - 1.0)
    
    burst_mode = window.currentBurst
    gap_mode = window.currentGap
    
    fps = int(document.querySelector('input[name="fps"]:checked').value)
    res = int(document.querySelector('input[name="res"]:checked').value)
    smear = window.currentSmear
    depth = window.currentDepth
    
    res_label = "4K" if res == 0 else str(res) + "p"
    window.dbg(f"ENGINE: {res_label} | {fps}fps | Duration: {round(duration,1)}s")

    await run_process(video, count, width, smear, depth, anchor_mode, index_pct, span_sec, burst_mode, gap_mode, x_jit, y_jit, z_jit, res, "main_canvas", fps, my_gen, my_job_id)
    
    window.updateLensDimensions()
    
    await asyncio.sleep(0.5)
    # Pass ID back to unlock
    window.unlockInterface(my_job_id)

async def run_process(video_elem, target_count, base_width, smear_val, depth_mode, anchor_mode, index_pct, span_sec, burst_mode, gap_mode, x_jitter, y_jitter, z_jitter, target_height, canvas_id, target_fps, my_gen, my_job_id):
    canvas = document.getElementById("hidden_canvas")
    ctx = canvas.getContext("2d")
    out_canvas = document.getElementById(canvas_id)
    out_ctx = out_canvas.getContext("2d")
    out_ctx.imageSmoothingEnabled = False
    
    scale = 1.0
    if target_height > 0 and video_elem.videoHeight > target_height:
        scale = target_height / video_elem.videoHeight
    
    w = int(video_elem.videoWidth * scale)
    h = int(video_elem.videoHeight * scale)
    canvas.width = w; canvas.height = h

    duration = video_elem.duration
    start_time = 0.0
    end_time = duration
    
    if anchor_mode == 'focus':
        center = duration * index_pct
        half_span = span_sec / 2.0
        start_time = center - half_span
        end_time = center + half_span
        if start_time < 0:
            diff = 0 - start_time
            start_time = 0
            end_time += diff
        if end_time > duration:
            diff = end_time - duration
            end_time = duration
            start_time -= diff
            if start_time < 0: start_time = 0
    else:
        start_time = 0.0
        end_time = duration

    available_time = end_time - start_time
    
    burst_map = generate_burst_map(target_count, burst_mode)
    total_burst_frames = sum(burst_map)
    frame_dur = 0.033 * smear_val
    total_burst_time = total_burst_frames * frame_dur
    remaining_time = available_time - total_burst_time
    
    gap_time = 0
    if target_count > 1:
        gap_time = remaining_time / (target_count - 1)
        
    if gap_time < 0:
        gap_time = 0
        
    jitter_buffer = (target_count * int(x_jitter * scale)) + 500
    est_width = (target_count * base_width * smear_val) + jitter_buffer
    
    out_canvas.width = est_width
    out_canvas.height = h
    out_ctx.clearRect(0, 0, est_width, h)
    
    curr_x_int = int(x_jitter * scale)
    curr_y_int = int(y_jitter * scale)
    x_vals = generate_jitter_bag(target_count + 10, curr_x_int)
    y_vals = generate_jitter_bag(target_count + 10, curr_y_int)
    
    current_time = start_time
    x_pos = 0
    
    for i in range(target_count):
        global render_generation
        if render_generation != my_gen:
            return 
        
        # V19.12: Check if JS has moved on to a new job ID
        if my_job_id != window.jobIdCounter:
            return

        seek_time = current_time
        
        if seek_time > end_time and anchor_mode == 'focus':
             break

        if seek_time > duration - 0.1: 
            seek_time = duration - 0.1
        if seek_time < 0:
            seek_time = 0
        
        msg = f"{i}/{target_count}"
        try:
            document.getElementById('btn_render_final').innerText = f"WEAVING {msg}"
        except: pass
        
        my_burst_count = burst_map[i]
        for b in range(my_burst_count):
             await await_seek(video_elem, seek_time)
             try: ctx.drawImage(video_elem, 0, 0, w, h)
             except: break
             seek_time += frame_dur 
        
        y_off = 0; x_var = 0
        if i < len(y_vals):
            y_off = y_vals[i]; x_var = x_vals[i]
            
        center_x = (w // 2) + y_off
        this_slit = (base_width * smear_val) + x_var
        this_slit = max(1, this_slit)
        start_x = max(0, min(w - this_slit, center_x))
        
        mode = "source-over"
        if depth_mode == "rtl": mode = "destination-over"
        elif depth_mode == "mix":
            if random.random() > 0.5: mode = "destination-over"
        out_ctx.globalCompositeOperation = mode

        angle = 0
        if z_jitter > 0: angle = random.uniform(-z_jitter, z_jitter)
            
        if angle == 0:
            try: out_ctx.drawImage(canvas, start_x, 0, this_slit, h, x_pos, 0, this_slit, h)
            except: pass
        else:
            rads = math.radians(angle)
            gap_w = abs(h * math.sin(rads))
            expansion = (gap_w * 1.5) + 4
            expanded_w = this_slit + expansion
            src_start_x = center_x - (expanded_w / 2)
            if src_start_x < 0: src_start_x = 0
            fill_bias = random.uniform(-0.5, 0.5) 
            offset_dest_x = (gap_w * fill_bias)

            out_ctx.save()
            draw_center_x = x_pos + (this_slit / 2)
            draw_center_y = h / 2
            out_ctx.translate(draw_center_x, draw_center_y)
            out_ctx.rotate(rads)
            try: out_ctx.drawImage(canvas, src_start_x, 0, expanded_w, h, -expanded_w/2 + offset_dest_x, -h/2, expanded_w, h)
            except: pass
            out_ctx.restore()
        
        x_pos += this_slit
        current_time += gap_time + (my_burst_count * frame_dur)

    if render_generation == my_gen and my_job_id == window.jobIdCounter:
        document.getElementById('btn_render_final').innerText = "RENDER"
        
    final_width = int(x_pos)
    if final_width > 0 and final_width < est_width:
        pixel_data = out_ctx.getImageData(0, 0, final_width, h)
        out_canvas.width = final_width
        out_ctx.putImageData(pixel_data, 0, 0)
        est_width = final_width 
    
    display = document.getElementById('pixel_count')
    display.innerText = f"{final_width}px"
    if final_width > 3200:
        display.classList.add('danger')
        display.style.color = ""
    else:
        display.classList.remove('danger')
        display.style.color = "#00ffcc"

    out_ctx.globalCompositeOperation = "destination-over"
    out_ctx.fillStyle = "black"
    out_ctx.fillRect(0, 0, est_width, h)
# END OF DOCUMENT [20251221-0746]