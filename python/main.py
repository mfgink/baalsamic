import os
import shutil
from flask import Flask, send_from_directory, jsonify, request
from werkzeug.utils import secure_filename

# Import the new Engine module
import engine

# CONFIGURATION
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATIC_DIR = os.path.join(BASE_DIR, 'css')
JS_DIR = os.path.join(BASE_DIR, 'js')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder=STATIC_DIR)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # Limit uploads to 500MB

# --- ROUTES ---

@app.route('/')
def index():
    try:
        with open(os.path.join(BASE_DIR, 'index.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Error: index.html not found in project root."

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(JS_DIR, filename)

# --- API: INGEST ---
@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Receives the video, saves it, and IMMEDIATELY analyzes it.
    """
    if 'video' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['video']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # 1. Save to disk
        file.save(save_path)
        print(f"--- INGEST: Received {filename} ---")
        
        # 2. Call the Engine to get Metadata
        metadata = engine.get_video_metadata(save_path)
        
        if "error" in metadata:
            return jsonify(metadata), 500

        # 3. Return everything to the UI
        return jsonify({
            "status": "success",
            "filename": filename,
            "path": save_path,
            "metadata": metadata
        })

if __name__ == '__main__':
    print("--- Baalsamic v20 Server (Flask) ---")
    print(f"Storage: {UPLOAD_FOLDER}")
    app.run(debug=True, port=5000, host='0.0.0.0')

# END OF DOCUMENT [20251221-1632]