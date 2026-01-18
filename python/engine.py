# python/engine.py v23.4
# V23 FAILURE ENGINE IMPLEMENTATION
# UPDATE: "Magenta Center" Content Grid
# UPDATE: Grid decoupled from Radical Mode

import cv2
import numpy as np
import random
import os
import time
import math

def process_video(video_path, config):
    """
    V23 KERNEL: Structural Slicing Engine with Failure Logic
    """
    try:
        # 1. CONFIG & CLAMPING
        count = max(1, int(config.get('count', 50)))
        width = max(1, int(config.get('width', 20)))
        
        index_pct = float(config.get('index', 50))
        span_pct = float(config.get('span', 20))
        anchor = config.get('anchor', 'fit')
        
        # V23.4: Debug Grid is now independent of Radical Mode
        show_grid = config.get('debug_grid', False)
        
        # Structural Jitter
        xjitter = int(config.get('xjitter', 0))
        yjitter = int(config.get('yjitter', 0))
        zjitter = int(config.get('zjitter', 0))

        # --- DARKROOM PARSING ---
        darkroom = config.get('darkroom', {})
        
        # Geometry
        drift_val = float(darkroom.get('drift', 0))
        wave_val = float(darkroom.get('wave', 0))
        stretch_val = float(darkroom.get('stretch', 0))
        gap_fill = darkroom.get('gap_fill', 'void') 
        
        # Atmosphere
        heat_val = float(darkroom.get('heat', 0))
        flicker_val = float(darkroom.get('flicker', 0))
        flare_val = float(darkroom.get('flare', 0))
        
        # Texture
        smooth_val = float(darkroom.get('smooth', 0))
        crunch_val = float(darkroom.get('crunch', 0))
        louver_val = float(darkroom.get('louver', 0))

        # Open Video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"error": "Could not open video file."}

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps == 0: fps = 30
        duration = total_frames / fps

        # 2. TIME WINDOW CALCULATION
        if anchor == 'fit':
            start_time = 0.0
            span_seconds = duration
        else:
            span_seconds = 0.1 + ((span_pct / 100.0) * (duration - 0.1))
            center_time = (index_pct / 100.0) * duration
            half_span = span_seconds / 2.0
            start_time = center_time - half_span
            end_time = center_time + half_span
            
            if start_time < 0:
                start_time = 0.0
            elif start_time + span_seconds > duration:
                start_time = duration - span_seconds
                
            start_time = max(0.0, start_time)

        time_step = span_seconds / max(1, count)

        # 3. CANVAS SETUP
        video_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        video_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        final_w = count * width 
        final_h = video_h

        canvas = np.zeros((final_h, final_w, 4), dtype=np.uint8)
        stitch_map = []

        # 4. WEAVE LOOP
        for i in range(count):
            target_time = start_time + (i * time_step)
            
            # Clamp Time
            if target_time < 0: target_time = 0
            if target_time > duration: target_time = duration - 0.01
            
            target_frame = int(target_time * fps)
            if target_frame >= total_frames: target_frame = total_frames - 1
            
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            ret, frame_bgr = cap.read()
            
            if not ret:
                frame_bgr = np.zeros((video_h, video_w, 3), dtype=np.uint8)

            frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2BGRA)

            # --- DEBUG: GENERATE CONTENT GRID LAYER ---
            debug_layer = None
            if show_grid:
                debug_layer = np.zeros((video_h, video_w, 4), dtype=np.uint8)
                draw_content_grid(debug_layer, width) # Lime + Magenta

            # --- GEOMETRY ENGINE ---
            
            # 1. Z-Jitter (Rotation)
            rotation_applied = 0
            if zjitter > 0:
                angle = random.uniform(-zjitter, zjitter)
                rotation_applied = angle
                M = cv2.getRotationMatrix2D((video_w/2, video_h/2), angle, 1)
                frame = cv2.warpAffine(frame, M, (video_w, video_h))
                if show_grid:
                    debug_layer = cv2.warpAffine(debug_layer, M, (video_w, video_h))

            # 2. Vertical Offsets (Drift + Wave + Jitter)
            drift_offset = (i * (drift_val / 10.0))
            
            wave_offset = 0
            if wave_val > 0:
                freq = 0.5 
                amp = wave_val * 3.0 
                wave_offset = math.sin(i * freq) * amp
            
            jitter_offset = random.randint(-yjitter, yjitter) if yjitter > 0 else 0
            
            total_y_offset = int(drift_offset + wave_offset + jitter_offset)

            if total_y_offset != 0:
                M_trans = np.float32([[1, 0, 0], [0, 1, total_y_offset]])
                
                b_mode = cv2.BORDER_CONSTANT
                b_val = (0, 0, 0, 0)
                
                if gap_fill == 'black':
                    b_val = (0, 0, 0, 255)
                elif gap_fill == 'stretch':
                    b_mode = cv2.BORDER_REPLICATE

                frame = cv2.warpAffine(
                    frame, M_trans, (video_w, video_h),
                    borderMode=b_mode, borderValue=b_val
                )
                if show_grid:
                    debug_layer = cv2.warpAffine(
                        debug_layer, M_trans, (video_w, video_h),
                        borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0)
                    )

            # 3. Slice Extraction
            center_x = video_w // 2
            dx = random.randint(-xjitter, xjitter) if xjitter > 0 else 0
            start_x = (center_x - (width // 2)) + dx
            
            if start_x < 0: start_x = 0
            if start_x + width > video_w: start_x = video_w - width
            
            stitch = frame[:, start_x:start_x+width]
            
            if show_grid:
                debug_stitch = debug_layer[:, start_x:start_x+width]

            # 4. Stretch
            stretch_factor = 1.0
            if stretch_val > 0:
                stretch_factor = 1.0 - (stretch_val / 200.0)
                target_src_width = int(width / stretch_factor)
                
                src_x_center = start_x + (width // 2)
                src_x_start = src_x_center - (target_src_width // 2)
                
                if src_x_start < 0: src_x_start = 0
                if src_x_start + target_src_width > video_w: 
                     src_x_start = video_w - target_src_width
                     if src_x_start < 0: src_x_start = 0

                stitch_src = frame[:, src_x_start:src_x_start + target_src_width]
                stitch = cv2.resize(stitch_src, (width, video_h))
                
                if show_grid:
                    debug_src = debug_layer[:, src_x_start:src_x_start + target_src_width]
                    debug_stitch = cv2.resize(debug_src, (width, video_h))

            h, w, c = stitch.shape
            if w != width: stitch = cv2.resize(stitch, (width, h))
            
            # --- OVERLAY DEBUG GRID ---
            if show_grid:
                # 1. Overlay the distorted Content Grid
                mask = debug_stitch[:, :, 3] > 0
                stitch[mask] = cv2.addWeighted(stitch[mask], 0.5, debug_stitch[mask], 0.5, 0)
                
                # 2. Draw the Stitch Viewport Grid
                draw_viewport_grid(stitch)

            # --- EFFECTS ---
            active_effects = []
            
            if heat_val > 0:
                stitch = apply_heat(stitch, heat_val)
                active_effects.append('heat')
            if flicker_val > 0:
                stitch = apply_flicker(stitch, flicker_val)
                active_effects.append('flicker')
            if flare_val > 0:
                stitch = apply_flare(stitch, flare_val)
                active_effects.append('flare')
            if smooth_val > 0:
                stitch = apply_smooth(stitch, smooth_val)
                active_effects.append('smooth')
            if crunch_val > 0:
                stitch = apply_crunch(stitch, crunch_val)
                active_effects.append('crunch')
            if louver_val > 0:
                stitch = apply_louver(stitch, louver_val)
                active_effects.append('louver')

            # Place on Canvas
            x_pos = i * width
            canvas[:, x_pos:x_pos+width] = stitch
            
            stitch_map.append({
                "id": i, "x": x_pos, "width": width, "src_time": target_time,
                "y_offset": total_y_offset, "stretch_factor": stretch_factor,
                "rotation": rotation_applied, "effects": active_effects
            })

        cap.release()

        # 5. SAVE
        base_dir = os.path.abspath(os.getcwd())
        output_filename = f"render_{int(time.time())}.png"
        output_path = os.path.join(base_dir, "uploads", output_filename)
        
        cv2.imwrite(output_path, canvas)
        print(f"KERNEL RENDER COMPLETE: {output_path}")

        return {
            "status": "success",
            "image_url": f"/uploads/{output_filename}",
            "stitch_map": stitch_map,
            "width": final_w, "height": final_h,
            "render_start_time": start_time, "render_end_time": start_time + span_seconds
        }

    except Exception as e:
        print(f"KERNEL CRASH: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

# --- HELPER FUNCTIONS ---

def draw_content_grid(layer, slice_width):
    """
    Draws 'World Grid' (Lime) + Center Double Lines (Magenta)
    """
    h, w, c = layer.shape
    green = (0, 255, 0, 255) 
    magenta = (255, 0, 255, 255)
    thickness = 1
    
    # 1. Lime Green Grid (Background)
    step_x = max(20, slice_width // 4)
    for x in range(0, w, step_x):
        cv2.line(layer, (x, 0), (x, h), green, thickness)
    
    step_y = 100
    for y in range(0, h, step_y):
        cv2.line(layer, (0, y), (w, y), green, thickness)

    # 2. Magenta Center Double Lines
    cx, cy = w // 2, h // 2
    offset = 5 # Gap from center
    
    # Vertical Double Line
    cv2.line(layer, (cx - offset, 0), (cx - offset, h), magenta, 2)
    cv2.line(layer, (cx + offset, 0), (cx + offset, h), magenta, 2)
    
    # Horizontal Double Line
    cv2.line(layer, (0, cy - offset), (w, cy - offset), magenta, 2)
    cv2.line(layer, (0, cy + offset), (w, cy + offset), magenta, 2)

def draw_viewport_grid(img):
    """
    Draws 'Viewfinder Grid' (Cyan) on the final stitch.
    """
    h, w, c = img.shape
    color = (255, 255, 0, 255) # Cyan
    thickness = 2 
    
    # Border
    cv2.rectangle(img, (0, 0), (w-1, h-1), color, thickness)
    
    # Center Crosshair
    cx, cy = w // 2, h // 2
    cv2.line(img, (cx, cy-20), (cx, cy+20), color, 1)
    cv2.line(img, (cx-20, cy), (cx+20, cy), color, 1)

# --- EFFECT FUNCTIONS ---
# (Same as previous versions, kept for completeness)
def apply_heat(img, amount):
    if amount <= 0: return img
    gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    thresh = 60 + (amount * 0.5) 
    mask = (gray < thresh).astype(np.float32)
    img_f = img.astype(np.float32)
    tint_strength = amount * 0.8
    img_f[:,:,0] += (mask * tint_strength) 
    img_f[:,:,2] += (mask * tint_strength)
    noise = np.random.normal(0, amount * 0.5, img.shape).astype(np.float32)
    img_f += (noise * mask[:,:,None])
    np.clip(img_f, 0, 255, out=img_f)
    return img_f.astype(np.uint8)

def apply_flicker(img, amount):
    if amount <= 0: return img
    scale = 1.0 + (random.uniform(-1, 1) * (amount / 100.0))
    img_f = img.astype(np.float32)
    img_f[:,:,0:3] *= scale 
    np.clip(img_f, 0, 255, out=img_f)
    return img_f.astype(np.uint8)

def apply_flare(img, amount):
    if amount <= 0: return img
    gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    thresh_val = 200 - (amount * 1.0) 
    _, mask = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY)
    if cv2.countNonZero(mask) == 0: return img
    flare_layer = np.zeros_like(img)
    flare_layer[:,:,0] = mask 
    flare_layer[:,:,2] = mask 
    flare_layer[:,:,3] = mask 
    ksize = int(amount) | 1 
    flare_layer = cv2.GaussianBlur(flare_layer, (ksize, ksize), 0)
    return cv2.addWeighted(img, 1.0, flare_layer, (amount/100.0), 0)

def apply_smooth(img, amount):
    if amount <= 0: return img
    d = int(5 + (amount * 0.2))
    sigma = int(amount * 1.5)
    rgb = img[:,:,0:3]
    alpha = img[:,:,3]
    blurred = cv2.bilateralFilter(rgb, d, sigma, sigma)
    return np.dstack((blurred, alpha))

def apply_crunch(img, amount):
    if amount <= 0: return img
    rgb = img[:,:,0:3]
    alpha = img[:,:,3]
    gaussian = cv2.GaussianBlur(rgb, (0, 0), 2.0)
    strength = amount / 20.0 
    sharpened = cv2.addWeighted(rgb, 1.0 + strength, gaussian, -strength, 0)
    return np.dstack((sharpened, alpha))

def apply_louver(img, amount):
    if amount <= 0: return img
    h, w, c = img.shape
    x = np.linspace(0, np.pi, w)
    gradient = np.sin(x) 
    intensity = (amount / 100.0)
    factor = (1.0 - intensity) + (gradient * intensity)
    mask = np.tile(factor, (h, 1))
    img_f = img.astype(np.float32)
    for i in range(3): 
        img_f[:,:,i] *= mask
    np.clip(img_f, 0, 255, out=img_f)
    return img_f.astype(np.uint8)

# END OF DOCUMENT 20260117 2058