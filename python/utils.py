# v21.6.0 - python/utils.py
import cv2

def get_video_metadata(video_path):
    """
    Independent Utility: Extracts metadata from video file.
    Decoupled from engine logic to prevent circular import errors.
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
# END OF DOCUMENT - python/utils.py