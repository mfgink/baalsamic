# v21.12.6 - python/engine.py
# REFACTOR: Shift Logic Implementation (No Looping)
# TIMESTAMP: 20251225-2210
import cv2
import numpy as np
import random
import os
import time

def get_video_metadata(video_path):
    """
    Independent Utility: Extracts structural metadata.
    """
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"UTILS ERROR: Cannot open {video_path}")
            return {"duration": 0, "fps": 0, "width": 0, "height": 0}
        
        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        duration = frames / fps if fps > 0 else 0
        cap.release()
        
        return {
            "duration": duration,
            "fps": fps,
            "width": width,
            "height": height,
            "frame_count": frames
        }
    except Exception as e:
        print(f"UTILS EXCEPTION: {e}")
        return {"duration": 0, "fps": 0, "width": 0, "height": 0}

def process_video(video_path, config):
    """
    V21 KERNEL: Structural Slicing Engine (Shift Logic Active)
    """
    try:
        # 1. CONFIG & CLAMPING
        count = max(1, int(config.get('count', 50)))
        width = max(1, int(config.get('width', 20)))
        
        index_pct = float(config.get('index', 50))
        span_pct = float(config.get('span', 20))
        anchor = config.get('anchor', 'fit') 
        
        xjitter = int(config.get('xjitter', 0))
        yjitter = int(config.get('yjitter', 0))
        zjitter = int(config.get('zjitter', 0))

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"error": "Could not open video file."}

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps == 0: fps = 30
        duration = total_frames / fps
        
        # 2. TIME WINDOW CALCULATION (SHIFT LOGIC)
        if anchor == 'fit':
            start_time = 0.0
            span_seconds = duration
        else:
            # Calculate theoretical window based on center (Index)
            span_seconds = 1.0 + ((span_pct / 100.0) * (duration - 1.0))
            center_time = (index_pct / 100.0) * duration
            
            half_span = span_seconds / 2.0
            start_time = center_time - half_span
            end_time = center_time + half_span
            
            # Apply Shift (Prevent Looping)
            if start_time < 0:
                # Window is too far left; shift right to start at 0
                diff = abs(start_time)
                start_time = 0.0
                end_time += diff
            
            if end_time > duration:
                # Window is too far right; shift left to end at duration
                diff = end_time - duration
                start_time -= diff
                # end_time = duration (implicit)
            
            # Final hard clamp to prevent crashes on extremely short videos
            start_time = max(0.0, start_time)
            
        # Recalculate step based on the shifted window
        time_step = span_seconds / max(1, count)
        
        # 3. CANVAS SETUP
        video_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        video_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        final_w = count * width
        final_h = video_h 
        
        canvas = np.zeros((final_h, final_w, 3), dtype=np.uint8)
        stitch_map = [] 

        # 4. WEAVE LOOP
        for i in range(count):
            target_time = start_time + (i * time_step)
            
            # Hard Clamp (No Modulo)
            if target_time < 0: target_time = 0
            if target_time > duration: target_time = duration - 0.01

            target_frame = int(target_time * fps)
            # Frame Count Safety
            if target_frame >= total_frames: target_frame = total_frames - 1
            
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            
            ret, frame = cap.read()
            if not ret: 
                # Fallback: Black frame if read fails
                frame = np.zeros((video_h, video_w, 3), dtype=np.uint8)

            # Structural Jitter
            center_x = video_w // 2
            dx = random.randint(-xjitter, xjitter) if xjitter > 0 else 0
            dy = random.randint(-yjitter, yjitter) if yjitter > 0 else 0
            
            if zjitter > 0:
                angle = random.uniform(-zjitter, zjitter)
                M = cv2.getRotationMatrix2D((video_w/2, video_h/2), angle, 1)
                frame = cv2.warpAffine(frame, M, (video_w, video_h))

            # Slice
            start_x = (center_x - (width // 2)) + dx
            if dy != 0: frame = np.roll(frame, dy, axis=0)

            # Horizontal clamping
            if start_x < 0: start_x = 0
            if start_x + width > video_w: start_x = video_w - width
            
            stitch = frame[:, start_x:start_x+width]
            
            # Verify shape (in case of edge rounding errors)
            h, w, c = stitch.shape
            if w != width: stitch = cv2.resize(stitch, (width, h))

            # Place
            x_pos = i * width
            canvas[:, x_pos:x_pos+width] = stitch
            
            stitch_map.append({ 
                "id": i, "x": x_pos, "width": width,
                "src_time": target_time
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
            "width": final_w,
            "height": final_h,
            "render_start_time": start_time,
            "render_end_time": start_time + span_seconds
        }

    except Exception as e:
        print(f"KERNEL CRASH: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
# END OF DOCUMENT - python/engine.py [20251225-2210]