# v21.7.1 - main.py
from flask import Flask, send_from_directory, jsonify, request, send_file
import os
import time
import sys
import inspect # For tracing
import json

# --- IMPORT KERNEL ---
import python.engine as engine

# --- FORENSIC DEBUGGING (Run on Startup) ---
print("\n" + "="*40)
print("🔎 KERNEL DIAGNOSTICS")
print(f"PATH: {engine.__file__}")  # PROVES which file is loaded
print(f"CONTENTS: {[x for x in dir(engine) if not x.startswith('__')]}") # PROVES what functions exist
print("="*40 + "\n")

app = Flask(__name__, static_folder='.')

# CONFIG
UPLOAD_FOLDER = 'uploads'
MAPS_FOLDER = 'maps'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MAPS_FOLDER, exist_ok=True)

# STATE TRACKING (For Verbose Diff Logging)
LAST_RENDER_STATE = {}

def log_request_diff(new_payload):
    """
    Compares the current request against the previous one 
    to log only the changed variables (Deltas).
    """
    global LAST_RENDER_STATE
    
    # Filter out path/metadata from diffs to keep logs clean
    ignored_keys = ['path', 'timestamp']
    
    print("\n📝 CONFIGURATION DELTA:")
    
    if not LAST_RENDER_STATE:
        print("   (First Run - Full Config)")
        for k, v in new_payload.items():
            if k not in ignored_keys:
                print(f"   + {k}: {v}")
    else:
        has_changes = False
        for k, v in new_payload.items():
            if k in ignored_keys: continue
            
            old_v = LAST_RENDER_STATE.get(k)
            if old_v != v:
                print(f"   » {k.upper()}: {old_v} -> {v}")
                has_changes = True
        
        if not has_changes:
            print("   (No variable changes detected)")
            
    # Update State
    LAST_RENDER_STATE = new_payload.copy()
    print("-" * 30)


@app.route('/')
def serve_index():
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/uploads/<filename>')
def serve_uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    print("\n--- API: UPLOAD REQUEST ---")
    
    # 1. TRACE CALLER
    curframe = inspect.currentframe()
    calframe = inspect.getouterframes(curframe, 2)
    print(f"TRACE: upload_file called from {calframe[1][3]}")

    if 'video' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['video']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = file.filename
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(save_path)
    print(f"SAVED: {save_path}")

    # 2. TRACE ENGINE CALL
    print("TRACE: Attempting to call engine.get_video_metadata...")
    
    try:
        # Check if attribute exists before calling
        if not hasattr(engine, 'get_video_metadata'):
            print("❌ CRITICAL FAILURE: get_video_metadata MISSING from engine module!")
            print(f"   Engine File being used: {engine.__file__}")
            raise AttributeError("Function missing from loaded module")

        metadata = engine.get_video_metadata(save_path)
        print(f"SUCCESS: Metadata received: {metadata}")
        
        return jsonify({
            "status": "success",
            "filename": filename,
            "path": save_path,
            "metadata": metadata
        })
    except Exception as e:
        print(f"🔥 UPLOAD ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/render', methods=['POST'])
def render_stitch():
    print("\n--- API: RENDER REQUEST ---")
    data = request.json
    
    # Run Verbose Diff Log
    log_request_diff(data)
    
    video_path = data.get('path')
    
    # Path Logic
    if video_path and not os.path.exists(video_path):
        clean_path = os.path.basename(video_path)
        potential_path = os.path.join(UPLOAD_FOLDER, clean_path)
        if os.path.exists(potential_path):
            video_path = potential_path
            
    if not video_path or not os.path.exists(video_path):
        return jsonify({"error": "Video file not found on server"}), 404
        
    try:
        result = engine.process_video(video_path, data)
        return jsonify(result)
    except Exception as e:
        print(f"RENDER ERROR: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("--- BAALSAMIC V21 SERVER STARTING ---")
    print(f"Running on Python {sys.version}")
    app.run(debug=True, port=5000)
# END OF DOCUMENT - main.py [20251225-1755]