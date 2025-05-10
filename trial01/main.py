from flask import Flask, render_template, send_from_directory, redirect
import os

app = Flask(__name__, static_folder='.')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    try:
        return send_from_directory('.', path)
    except:
        return redirect('/')

@app.route('/attached_assets/<path:path>')
def serve_assets(path):
    return send_from_directory('attached_assets', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)