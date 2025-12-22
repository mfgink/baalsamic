import cv2
import os
import numpy as np
import random
import time
import math

def get_video_metadata(file_path):
    """
    Opens the video file and extracts technical details.
    """
    if not os.path.exists(file_path):
        return {"error": "File not found"}

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        return {"error": "Could not open video file"}

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    
    duration = 0.0
    if fps > 0:
        duration = frame_count / fps

    cap.release()
    return {
        "duration": duration,
        "fps": fps,
        "width": int(width),
        "height": int(height)
    }

def rotate_image(image, angle):
    """
    Rotates an image (slice) around its center, expanding the border 
    to fit the new size (preserving corners). Returns RGBA image.
    """
    h, w = image.shape[:2]
    
    # Convert angle to radians for bounding box calc
    rad = math.radians(angle)
    sin = math.sin(rad)
    cos = math.cos(rad)
    
    # Calculate new bounding box dimensions
    new_w = int((h * abs(sin)) + (w * abs(cos)))
    new_h = int((h * abs(cos)) + (w * abs(sin)))
    
    # Center of image
    center = (w // 2, h // 2)
    
    # Rotation Matrix
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    
    # Adjust Translation to center image in new box
    M[0, 2] += (new_w / 2) - center[0]
    M[1, 2] += (new_h / 2) - center[1]
    
    # Perform rotation with transparency (Border = Transparent)
    # Convert BGR to BGRA first
    if image.shape[2] == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
        
    rotated = cv2.warpAffine(image, M, (new_w, new_h), borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))
    
    return rotated

def overlay_image_alpha(img, img_overlay, x, y):
    """
    Overlays img_overlay on top of img at (x, y) handling alpha channel.
    img: Background canvas (BGR or BGRA)
    img_overlay: Foreground slice (BGRA)
    """
    h, w = img_overlay.shape[:2]
    canvas_h, canvas_w = img.shape[:2]
    
    # Clipping logic
    if x >= canvas_w or y >= canvas_h: return img
    if x + w < 0 or y + h < 0: return img
    
    # Crop overlay if it goes out of bounds
    x1, y1 = max(x, 0), max(y, 0)
    x2, y2 = min(x + w, canvas_w), min(y + h, canvas_h)
    
    # Corresponding coordinates on overlay
    o_x1 = x1 - x
    o_y1 = y1 - y
    o_x2 = o_x1 + (x2 - x1)
    o_y2 = o_y1 + (y2 - y1)
    
    if x2 <= x1 or y2 <= y1: return img
    
    # Extract ROI
    overlay_crop = img_overlay[o_y1:o_y2, o_x1:o_x2]
    background_crop = img[y1:y2, x1:x2]
    
    # Normalize Alpha to 0-1 range
    alpha_mask = overlay_crop[:, :, 3] / 255.0
    alpha_inv = 1.0 - alpha_mask
    
    # Blend colors
    for c in range(3): # B, G, R
        background_crop[:, :, c] = (alpha_mask * overlay_crop[:, :, c] + 
                                    alpha_inv * background_crop[:, :, c])
                                    
    img[y1:y2, x1:x2] = background_crop
    return img

def render_preview(video_path, params, output_folder):
    """
    The Core Stitching Logic V2 (Supports Rotation & Layering)
    """
    # 1. Parse Parameters
    count = int(params.get('count', 20))
    width = int(params.get('width', 20))
    idx_pct = float(params.get('index', 50)) / 100.0
    span_pct = float(params.get('span', 20)) / 100.0
    
    # Jitter & Physics
    x_jit_max = int(params.get('xjitter', 0))
    y_jit_max = int(params.get('yjitter', 0))
    z_jit_max = int(params.get('zjitter', 0)) # NEW: Rotation
    
    # Modes
    anchor = params.get('anchor', 'fit') 
    burst_mode = params.get('burst', 'med')
    depth_mode = params.get('depth', 'ltr') # NEW: Layering Order
    
    # Open Video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Failed to open video"}

    vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    # 2. Calculate Timing
    start_time = 0.0
    end_time = duration
    
    span_sec = 1.0 + (span_pct * (duration - 1.0))

    if anchor == 'focus':
        center = duration * idx_pct
        half_span = span_sec / 2.0
        start_time = max(0, center - half_span)
        end_time = min(duration, center + half_span)
    
    available_time = end_time - start_time

    # 3. Calculate Rhythm
    burst_map = []
    for i in range(count):
        val = 1
        if burst_mode == 'med': val = 3
        elif burst_mode == 'hard': val = 10
        elif burst_mode == 'mix': val = random.randint(1, 5)
        burst_map.append(val)
        
    total_burst_frames = sum(burst_map)
    frame_dur = 1.0 / fps if fps > 0 else 0.033
    total_burst_time = total_burst_frames * frame_dur
    
    remaining_time = available_time - total_burst_time
    gap_time = 0
    if count > 1 and remaining_time > 0:
        gap_time = remaining_time / (count - 1)

    # 4. Prepare Canvas Logic
    # We don't create the numpy canvas yet. We first collect all "Stitch Objects"
    # because the final width depends on the un-rotated grid, but drawing requires sorting.
    
    current_time = start_time
    x_pos = 0
    
    # Generate Jitter Bags
    x_jitters = [random.randint(-x_jit_max, x_jit_max) for _ in range(count)] if x_jit_max > 0 else [0] * count
    y_jitters = [random.randint(-y_jit_max, y_jit_max) for _ in range(count)] if y_jit_max > 0 else [0] * count
    z_jitters = [random.randint(-z_jit_max, z_jit_max) for _ in range(count)] if z_jit_max > 0 else [0] * count

    slices = [] # Will store {'img': array, 'x': int, 'y': int, 'index': int}

    # 5. Extraction Phase
    for i in range(count):
        target_time = current_time + (burst_map[i] * frame_dur)
        target_time = max(0, min(duration - 0.1, target_time))
        
        cap.set(cv2.CAP_PROP_POS_MSEC, target_time * 1000)
        ret, frame = cap.read()
        
        if ret:
            # Jitter Values
            x_off = x_jitters[i]
            y_off = y_jitters[i]
            z_rot = z_jitters[i]
            
            # 5a. Cut the Rectangle
            center_x = (vid_w // 2) + y_off
            slit_w = width + x_off
            slit_w = max(1, slit_w)
            
            src_x1 = max(0, center_x - (slit_w // 2))
            src_x2 = min(vid_w, src_x1 + slit_w)
            real_w = src_x2 - src_x1
            
            if real_w > 0:
                roi = frame[:, src_x1:src_x2]
                
                # 5b. Rotate if needed (The Heavy Physics)
                final_slice = roi
                offset_y = 0
                offset_x = 0
                
                if abs(z_rot) > 0:
                    final_slice = rotate_image(roi, z_rot)
                    # Rotation changes size, need to center it vertically
                    new_h, new_w = final_slice.shape[:2]
                    offset_y = (vid_h - new_h) // 2
                    offset_x = (slit_w - new_w) // 2 
                else:
                    # Convert to BGRA for consistency in blending later
                    final_slice = cv2.cvtColor(roi, cv2.COLOR_BGR2BGRA)
                
                # Store for Compositing
                slices.append({
                    'img': final_slice,
                    'x': x_pos + offset_x,
                    'y': offset_y,
                    'index': i,
                    'base_w': slit_w # Used for canvas sizing
                })
            
            x_pos += slit_w
        
        current_time += gap_time + (burst_map[i] * frame_dur)

    cap.release()

    # 6. Compositing Phase (The Depth Layer)
    # Create final canvas
    # Width is determined by the cumulative advance of the "cursor" (x_pos)
    # We add some buffer for rotation overflow
    canvas_w = max(1, x_pos + 500) # Extra buffer for rotation overhang
    canvas = np.zeros((vid_h, canvas_w, 4), dtype=np.uint8) # BGRA canvas
    
    # DEPTH SORTING
    # LTR: Draw 0, 1, 2... (Standard) -> Last one is on Top
    # RTL: Draw N, N-1... -> First one is on Top (Reverse standard)
    # MIX: Shuffle
    
    draw_order = slices.copy()
    
    if depth_mode == 'rtl':
        draw_order.reverse()
    elif depth_mode == 'mix':
        random.shuffle(draw_order)
    # else 'ltr' is default order
    
    # Draw
    for s in draw_order:
        overlay_image_alpha(canvas, s['img'], s['x'], s['y'])

    # 7. Crop & Save
    # Crop to actual content width (remove buffer)
    # Find last non-transparent pixel column? Or just use x_pos + buffer?
    # Simplest: Crop to x_pos. Rotation might stick out further, let's scan.
    
    # Conservative crop: x_pos might cut off the last rotated edge.
    # Let's find the max X extent from the slices
    max_x = 0
    for s in slices:
        w = s['img'].shape[1]
        if (s['x'] + w) > max_x:
            max_x = s['x'] + w
            
    final_canvas = canvas[:, :max_x]
    
    # Drop Alpha for JPG save
    final_jpg = final_canvas[:, :, :3] # Keep BGR
    
    output_filename = f"preview_{int(time.time())}.jpg"
    output_path = os.path.join(output_folder, output_filename)
    
    cv2.imwrite(output_path, final_jpg)
    
    return {
        "status": "success",
        "image_url": f"/uploads/{output_filename}",
        "width": max_x,
        "height": vid_h
    }
# END OF DOCUMENT [20251222-2045]