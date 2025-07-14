from flask import Flask, render_template

app = Flask(__name__, static_folder='assets', template_folder='.')
from flask_cors import CORS
CORS(app)
@app.route('/')
def index():
    return render_template('settings.html')

@app.route('/settings.html')
def settings():
    return render_template('settings.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)