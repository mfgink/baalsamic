import os
import shutil
from flask import Flask, send_from_directory, jsonify, request
from werkzeug.utils import secure_filename
import engine

# CONFIGURATION
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATIC_DIR = os.path.join(BASE_DIR, 'css')
JS_DIR = os.path.join(BASE_DIR, 'js')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder=STATIC_DIR)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024 

# STATE FOR LOGGING
last_config = {}

# --- ROUTES ---
@app.route('/')
def index():
    try:
        with open(os.path.join(BASE_DIR, 'index.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Error: index.html not found."

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(JS_DIR, filename)

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# --- API ---
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'video' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['video']
    if file.filename == '': return jsonify({"error": "No selection"}), 400
    
    if file:
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(save_path)
        
        print(f"--- INGEST: Received {filename} ---")
        metadata = engine.get_video_metadata(save_path)
        if "error" in metadata: return jsonify(metadata), 500

        return jsonify({
            "status": "success",
            "filename": filename,
            "path": save_path,
            "metadata": metadata
        })

@app.route('/api/render', methods=['POST'])
def render_request():
    global last_config
    data = request.json
    video_path = data.get('path')
    
    if not video_path or not os.path.exists(video_path):
        return jsonify({"error": "Video file missing on server"}), 404
        
    # SMART LOGGING (DIFF ONLY)
    changes = []
    if not last_config:
        changes.append("Initial Render")
    else:
        for key, val in data.items():
            if key == 'path': continue # Ignore path
            old_val = last_config.get(key)
            if str(val) != str(old_val):
                changes.append(f"{key}: {old_val} -> {val}")
    
    if changes:
        print(f">>> UPDATE: {', '.join(changes)}")
        last_config = data.copy()
    
    # --- DATA SANITIZATION & TYPE CASTING ---
    # Ensure numbers are numbers, not strings
    clean_data = data.copy()
    try:
        clean_data['count'] = int(data.get('count', 50))
        clean_data['width'] = int(data.get('width', 20))
        clean_data['index'] = int(data.get('index', 50))
        clean_data['span'] = int(data.get('span', 20))
        clean_data['xjitter'] = int(data.get('xjitter', 0))
        clean_data['yjitter'] = int(data.get('yjitter', 0))
        clean_data['zjitter'] = int(data.get('zjitter', 0))
        # Strings are fine
        clean_data['anchor'] = str(data.get('anchor', 'fit'))
        clean_data['burst'] = str(data.get('burst', 'soft'))
        clean_data['depth'] = str(data.get('depth', 'ltr'))

    except ValueError as e:
        print(f"TYPE ERROR: {e}")
        return jsonify({"error": "Invalid parameter types"}), 400

    # Process
    result = engine.render_preview(video_path, clean_data, app.config['UPLOAD_FOLDER'])
    return jsonify(result)

if __name__ == '__main__':
    print("--- Baalsamic v20.8 Server (Flask) ---")
    app.run(debug=True, port=5000, host='0.0.0.0')
# END OF DOCUMENT [20251222-2045]