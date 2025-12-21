import os
from flask import Flask, send_from_directory, jsonify

# Define paths to the frontend folders (since they are one level up from this script)
# We use os.path.abspath to ensure Windows paths work correctly
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATIC_DIR = os.path.join(BASE_DIR, 'css')  # CSS folder
JS_DIR = os.path.join(BASE_DIR, 'js')       # JS folder

# Initialize Flask
# static_folder is explicitly set to where our CSS lives to avoid confusion
app = Flask(__name__, static_folder=STATIC_DIR)

# 1. Route for the Homepage
@app.route('/')
def index():
    """
    Serves the index.html file from the project root.
    """
    try:
        # We manually read and return the HTML file since it's in the root, not 'templates'
        with open(os.path.join(BASE_DIR, 'index.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Error: index.html not found in project root."

# 2. Route for CSS (Explicitly serving from ../css)
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(STATIC_DIR, filename)

# 3. Route for JS (Explicitly serving from ../js)
@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(JS_DIR, filename)

# 4. API Endpoint (The "Backend Logic")
@app.route('/api/status')
def api_status():
    """
    This is where your JavaScript will eventually talk to Python.
    Returns a JSON object confirming the backend is reachable.
    """
    return jsonify({
        "system": "Baalsamic v20",
        "status": "Online",
        "backend": "Flask Connected"
    })

if __name__ == '__main__':
    print("--- Starting Baalsamic v20 Server ---")
    print(f"Project Root: {BASE_DIR}")
    print("Go to: http://127.0.0.1:5000")
    # debug=True allows the server to auto-reload when you save code changes
    app.run(debug=True, port=5000)

# END OF DOCUMENT [251221-0921]