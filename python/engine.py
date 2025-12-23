# v21.0 - python/engine.py
import cv2
import os
import numpy as np
import random
import time
import math

def get_video_metadata(file_path):
    """
    Extracts duration, FPS, and dimensions from the video source.
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
    Rotates an image slice around its center, expanding borders.
    """
    h, w = image.shape[:2]
    rad = math.radians(angle)
    sin, cos = math.sin(rad), math.cos(rad)
    new_w = int((h * abs(sin)) + (w * abs(cos)))
    new_h = int((h * abs(cos)) + (w * abs(sin)))
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    M[0, 2] += (new_w / 2) - center[0]
    M[1, 2] += (new_h / 2) - center[1]
    
    # Convert to BGRA if not already
    if image.shape[2] == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
        
    return cv2.warpAffine(image, M, (new_w, new_h), 
                          borderMode=cv2.BORDER_CONSTANT, 
                          borderValue=(0,0,0,0))

def overlay_image_alpha(img, img_overlay, x, y):
    """
    Standard alpha blending overlay.
    """
    h, w = img_overlay.shape[:2]
    canvas_h, canvas_w = img.shape[:2]
    
    if x >= canvas_w or y >= canvas_h: return img
    if x + w < 0 or y + h < 0: return img
    
    x1, y1 = max(x, 0), max(y, 0)
    x2, y2 = min(x + w, canvas_w), min(y + h, canvas_h)
    
    o_x1 = x1 - x
    o_y1 = y1 - y
    o_x2 = o_x1 + (x2 - x1)
    o_y2 = o_y1 + (y2 - y1)
    
    if x2 <= x1 or y2 <= y1: return img
    
    overlay_crop = img_overlay[o_y1:o_y2, o_x1:o_x2]
    background_crop = img[y1:y2, x1:x2]
    
    alpha_mask = overlay_crop[:, :, 3] / 255.0
    alpha_inv = 1.0 - alpha_mask
    
    for c in range(3):
        background_crop[:, :, c] = (alpha_mask * overlay_crop[:, :, c] + 
                                    alpha_inv * background_crop[:, :, c])
                                    
    img[y1:y2, x1:x2] = background_crop
    return img

def generate_stitch_map(video_path, params, output_folder):
    """
    THE CARTOGRAPHER (V21 Core)
    Generates the 'Raw Strip' image and the 'Stitch Map' JSON.
    """
    # 1. Parse Parameters
    count = params['count']
    base_width = params['width']
    idx_pct = params['index'] / 100.0
    span_pct = params['span'] / 100.0
    
    x_jit_max = params['xjitter']
    y_jit_max = params['yjitter']
    z_jit_max = params['zjitter'] # Rotation
    
    anchor = params['anchor'] # 'fit' or 'focus'
    burst_mode = params['burst']
    gap_mode = params['gap'] # Used for Thermal Calc
    direction = params['direction']
    export_mode = params['export_mode']

    # 2. Video Init
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Failed to open video"}

    vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    
    # 3. Timeline Logic (The Memory)
    span_sec = 1.0 + (span_pct * (duration - 1.0))
    center = duration * idx_pct
    
    if anchor == 'focus':
        # Focus: Center point is index, span spreads out
        start_time = max(0, center - (span_sec / 2.0))
        end_time = min(duration, center + (span_sec / 2.0))
    else:
        # Fit: Standard 0-100 logic (V20 Classic)
        # Actually V20 Fit maps 0-100 to full duration usually
        # But let's respect the V21 "Time Travel" logic:
        # If Fit, usually implies the whole video? 
        # Let's align with V20 logic: 
        start_time = 0.0
        end_time = duration
        # If user explicitly sets Span in Fit mode, we respect it?
        # For now, let's assume 'Fit' overrides Index/Span to cover full video 
        # unless we want 'Fit' to just mean "Stitch Width is manual".
        # Re-reading V20: Fit vs Focus dictates *Width* calculation mostly.
        # Let's keep Time logic consistent:
        # If Fit, we use the specific start/end derived from index/span? 
        # No, typically Fit maps the whole timeline. 
        # Let's stick to the User Story: "Which moments of time to capture".
        # We will use the computed start/end regardless of anchor.
        
    available_time = end_time - start_time
    
    # 4. Rhythm Logic (The Open Eye)
    burst_map = []
    for _ in range(count):
        val = 1
        if burst_mode == 'med': val = 3
        elif burst_mode == 'hard': val = 10
        elif burst_mode == 'mix': val = random.randint(1, 5)
        burst_map.append(val)
        
    frame_dur = 1.0 / fps if fps > 0 else 0.033
    total_burst_time = sum(burst_map) * frame_dur
    
    # Gap Logic
    remaining_time = max(0, available_time - total_burst_time)
    gap_time = 0
    if count > 1:
        gap_time = remaining_time / (count - 1)
        
    # 5. Physics Init (V21 New)
    stitch_map = []
    
    # Random Seeds
    x_jitters = [random.randint(-x_jit_max, x_jit_max) for _ in range(count)]
    y_jitters = [random.randint(-y_jit_max, y_jit_max) for _ in range(count)]
    z_jitters = [random.randint(-z_jit_max, z_jit_max) for _ in range(count)]
    
    # Velocity Trackers
    prev_coords = (0, 0) # (x, y) relative to center
    
    # Thermal Trackers
    current_temp = 0.0 # 0.0 to 1.0
    cooling_rate = 0.1 # Cooling per second of gap
    heating_rate = 0.05 # Heating per frame of burst
    
    current_video_time = start_time
    canvas_cursor_x = 0
    
    slices = [] # {img, x, y, map_data}
    
    # 6. Extraction Loop
    for i in range(count):
        # A. Timing
        target_time = current_video_time
        target_time = max(0, min(duration - 0.1, target_time))
        
        # B. Thermal Physics 
        # Heat up based on burst
        frames_in_burst = burst_map[i]
        current_temp += (frames_in_burst * heating_rate)
        
        # Cool down based on gap (pre-gap)
        # Note: Gap happens *after* this stitch usually, or before?
        # Logic: Gap is travel time. 
        current_temp -= (gap_time * cooling_rate)
        current_temp = max(0.0, min(1.0, current_temp))
        
        # C. Geometry & Velocity 
        x_off = x_jitters[i]
        y_off = y_jitters[i]
        z_rot = z_jitters[i]
        
        # Calculate Velocity (Euclidean distance from previous jitter offset)
        # This represents how "erratic" the camera is moving relative to the ideal path
        dx = x_off - prev_coords[0]
        dy = y_off - prev_coords[1]
        velocity = math.sqrt(dx*dx + dy*dy)
        prev_coords = (x_off, y_off)
        
        # D. Frame Capture
        cap.set(cv2.CAP_PROP_POS_MSEC, target_time * 1000)
        ret, frame = cap.read()
        
        if ret:
            # E. Slicing
            # Center of frame + y_jitter
            center_x = (vid_w // 2) + y_off # Note: y_jitter affects horizontal center in V20 logic? 
            # V20 Logic: "y_jitter" usually shifted the *source* window left/right 
            # while "x_jitter" changed the *width*. 
            # Let's standardize for V21:
            # Y-Jitter = Horizontal Offset on Source (Pan)
            # X-Jitter = Width Variance
            # Wait, roadmap says: "SLIP ... Vertical Displacement (y-offset)" 
            # This implies Y-Jitter should be *Vertical* placement on canvas in Screen 3.
            # But in Screen 2 (Render), we need to decide what Y-Jitter does.
            # If we want "Broken Panel" (Vertical Sheer), that is a Canvas operation (Screen 3).
            # So in Screen 2, Y-Jitter might strictly be Source Selection (Pan)?
            # Or do we bake the vertical offset into the canvas?
            # DECISION: Screen 2 produces a FLAT STRIP. 
            # Y-Jitter (Source) = Shifting the crop window Left/Right on the source video.
            # Vertical Slip (Canvas) = Shifting the strip Up/Down on the final print.
            # Let's map V20 "Y Jitter" to Source X Offset.
            
            src_center_x = (vid_w // 2) + y_off 
            
            # Width Calc
            current_width = max(1, base_width + x_off)
            
            src_x1 = max(0, src_center_x - (current_width // 2))
            src_x2 = min(vid_w, src_x1 + current_width)
            real_w = src_x2 - src_x1
            
            if real_w > 0:
                roi = frame[:, src_x1:src_x2]
                
                # F. Rotation (Z)
                final_slice = roi
                offset_y = 0 # Vertical centering for rotation
                offset_x = 0
                
                if abs(z_rot) > 0:
                    final_slice = rotate_image(roi, z_rot)
                    new_h, new_w = final_slice.shape[:2]
                    offset_y = (vid_h - new_h) // 2
                    offset_x = (current_width - new_w) // 2
                else:
                    final_slice = cv2.cvtColor(roi, cv2.COLOR_BGR2BGRA)
                
                # G. Map Generation
                map_entry = {
                    "id": i,
                    "x": canvas_cursor_x + offset_x, # Where it sits on the raw strip
                    "y": offset_y, # Vertical center offset (rotation only)
                    "w": final_slice.shape[1], # Actual width
                    "h": final_slice.shape[0],
                    "src_time": float(f"{target_time:.3f}"),
                    "velocity": float(f"{velocity:.2f}"), # 
                    "thermal_load": float(f"{current_temp:.2f}"), # 
                    "exposure_bias": random.uniform(-1.0, 1.0) # For LINK effect
                }
                
                slices.append({
                    "img": final_slice,
                    "x": canvas_cursor_x + offset_x,
                    "y": offset_y,
                    "map": map_entry
                })
                
                stitch_map.append(map_entry)
                
            # Advance Cursor
            canvas_cursor_x += current_width
        
        # Advance Time
        current_video_time += (gap_time + (burst_map[i] * frame_dur))

    cap.release()
    
    # 7. Compositing (The Static Buffer)
    # Calculate total canvas size
    # Width is the cursor position. Height is video height.
    # No padding. [Refined Req]
    total_w = max(1, canvas_cursor_x)
    
    # Create Canvas
    canvas = np.zeros((vid_h, total_w, 4), dtype=np.uint8)
    
    # Depth Sorting (LTR/RTL)
    draw_order = slices.copy()
    if direction == 'rtl':
        draw_order.reverse()
    
    for s in draw_order:
        overlay_image_alpha(canvas, s['img'], s['x'], s['y'])
        
    # 8. Output
    # Drop Alpha for JPEG Buffer to save space/speed
    # Keep Alpha for High-Res Export if requested? For now, stick to JPG/PNG mix.
    # REQ-08: Static Buffer
    
    if export_mode:
        # High Res Export [REQ-09]
        # Use PNG for quality
        timestamp = int(time.time())
        filename = f"BAAL_V21_EXPORT_{timestamp}.png"
        path = os.path.join(output_folder, filename)
        cv2.imwrite(path, canvas) # Writes BGRA as PNG (Supported)
        image_url = f"/uploads/{filename}"
    else:
        # Preview Buffer
        filename = "preview_buffer.jpg"
        path = os.path.join(output_folder, filename)
        # Drop Alpha
        jpg_canvas = canvas[:, :, :3]
        cv2.imwrite(path, jpg_canvas, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        image_url = f"/uploads/{filename}"

    return {
        "status": "success",
        "image_url": image_url,
        "stitch_map": stitch_map,
        "width": total_w,
        "height": vid_h
    }
# END OF DOCUMENT - python/engine.py