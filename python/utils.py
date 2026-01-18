# python/utils.py v23.0
import cv2
import os
import glob

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

def flush_cache(folder_path, extensions=['*.png', '*.jpg', '*.jpeg'], exclude_files=[]):
    """
    Clears old render files from the specified folder.
    Used for 'Smart Reset' to keep disk usage low between sessions.
    
    Args:
        folder_path (str): Directory to clean (e.g., 'uploads' or 'maps')
        extensions (list): List of file patterns to remove
        exclude_files (list): Exact filenames to keep (e.g., the active video)
    """
    print(f"🧹 UTILS: Flushing cache in {folder_path}...")
    deleted_count = 0
    
    if not os.path.exists(folder_path):
        print("   -> Folder does not exist, skipping.")
        return 0

    try:
        # Collect all files matching extensions
        files_to_check = []
        for ext in extensions:
            files_to_check.extend(glob.glob(os.path.join(folder_path, ext)))
        
        for file_path in files_to_check:
            file_name = os.path.basename(file_path)
            
            if file_name in exclude_files:
                continue
                
            try:
                os.remove(file_path)
                deleted_count += 1
            except OSError as e:
                print(f"   -> Error deleting {file_name}: {e}")

        print(f"   -> Deleted {deleted_count} files.")
        return deleted_count

    except Exception as e:
        print(f"UTILS ERROR in flush_cache: {e}")
        return 0

# END OF DOCUMENT 20260117 1900