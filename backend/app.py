import os
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder=None)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')


# Register API blueprints
from backend.routes.accounts import accounts_bp
from backend.routes.config import config_bp
from backend.routes.sessions import sessions_bp

app.register_blueprint(accounts_bp)
app.register_blueprint(config_bp)
app.register_blueprint(sessions_bp)


@app.route('/api/health')
def health():
    return {'status': 'ok'}


# Serve frontend static files
@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
