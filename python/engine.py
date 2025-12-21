import cv2
import os

def get_video_metadata(file_path):
    """
    Opens the video file and extracts technical details.
    """
    if not os.path.exists(file_path):
        return {"error": "File not found"}

    cap = cv2.VideoCapture(file_path)
    
    if not cap.isOpened():
        return {"error": "Could not open video file"}

    # Extract raw properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    
    # Calculate duration
    duration = 0.0
    if fps > 0:
        duration = frame_count / fps

    cap.release()

    print(f"--- ENGINE: Analyzed {os.path.basename(file_path)} ---")
    print(f"Duration: {duration:.2f}s | FPS: {fps} | Size: {int(width)}x{int(height)}")

    return {
        "status": "success",
        "duration": duration,
        "fps": fps,
        "width": int(width),
        "height": int(height),
        "frame_count": int(frame_count)
    }

# END OF DOCUMENT [20251221-1630]