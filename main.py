# v21.0 - main.py
import os
import json
import time
from flask import Flask, send_from_directory, jsonify, request, send_file
from werkzeug.utils import secure_filename
import python.engine as engine

# CONFIGURATION
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'css')
JS_DIR = os.path.join(BASE_DIR, 'js')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
MAPS_FOLDER = os.path.join(BASE_DIR, 'maps')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MAPS_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder=STATIC_DIR)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAPS_FOLDER'] = MAPS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 2048 * 1024 * 1024  # 2GB Limit

# GLOBAL STATE (Server-Side Memory)
# In a production app, this would be a database or Redis.
# For V21 Desktop, a global dict is sufficient for single-user context.
current_state = {
    "source_path": None,
    "last_map": None,
    "video_meta": {}
}

# --- ROUTES ---
@app.route('/')
def index():
    return send_file('index.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    # Support subdirectories in JS folder
    return send_from_directory(JS_DIR, filename)

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# --- API ENDPOINTS ---

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Ingest Screen: Handles video upload and metadata extraction.
    """
    if 'video' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(save_path)
        
        print(f"--- V21 INGEST: Received {filename} ---")
        
        # Extract Metadata
        metadata = engine.get_video_metadata(save_path)
        if "error" in metadata:
            return jsonify(metadata), 500

        # Update State
        current_state["source_path"] = save_path
        current_state["video_meta"] = metadata

        return jsonify({
            "status": "success",
            "filename": filename,
            "path": save_path,
            "metadata": metadata
        })

@app.route('/api/render', methods=['POST'])
def render_request():
    """
    Render Screen: The Time Machine.
    Generates the Stitch Map and the Preview Buffer.
    """
    data = request.json
    
    # Use cached path if not provided
    video_path = data.get('path') or current_state.get("source_path")
    
    if not video_path or not os.path.exists(video_path):
        return jsonify({"error": "Video source missing. Please re-upload."}), 404

    # Sanitize Inputs
    try:
        clean_data = {
            'count': int(data.get('count', 50)),
            'width': int(data.get('width', 20)),
            'index': int(data.get('index', 50)),
            'span': int(data.get('span', 20)),
            'xjitter': int(data.get('xjitter', 0)),
            'yjitter': int(data.get('yjitter', 0)),
            'zjitter': int(data.get('zjitter', 0)),
            'anchor': str(data.get('anchor', 'fit')),
            'burst': str(data.get('burst', 'soft')),
            'gap': str(data.get('gap', 'close')),
            'direction': str(data.get('direction', 'ltr')),
            # High-Res Export Flag
            'export_mode': bool(data.get('export_mode', False))
        }
    except ValueError as e:
        return jsonify({"error": f"Invalid parameters: {str(e)}"}), 400

    # Call The Cartographer
    # Output folder is UPLOAD_FOLDER
    result = engine.generate_stitch_map(video_path, clean_data, app.config['UPLOAD_FOLDER'])
    
    if result.get('status') == 'success':
        current_state['last_map'] = result.get('stitch_map')
        
    return jsonify(result)

@app.route('/api/map/save', methods=['POST'])
def save_map():
    """
    Darkroom: Saves the current StitchMap (Recipe) to disk.
    REQ-06: Stitch Map I/O
    """
    data = request.json
    map_data = data.get('map')
    filename_hint = data.get('name', 'recipe')
    
    if not map_data:
        return jsonify({"error": "No map data provided"}), 400

    timestamp = int(time.time())
    filename = f"{filename_hint}_{timestamp}.json"
    save_path = os.path.join(app.config['MAPS_FOLDER'], filename)
    
    with open(save_path, 'w') as f:
        json.dump(map_data, f, indent=2)
        
    return jsonify({
        "status": "success",
        "filename": filename,
        "url": f"/maps/{filename}" # Assuming we add a route for this if needed, or just download logic
    })

# Main Execution
if __name__ == '__main__':
    print("--- BAALSAMIC V21: FAILURE ENGINE INITIALIZED ---")
    print("--- Mode: Desktop / Single User ---")
    app.run(debug=True, port=5000, host='0.0.0.0')
# END OF DOCUMENT - main.py