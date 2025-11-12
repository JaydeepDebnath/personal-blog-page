from flask import Flask, jsonify
from config import Config
from extensions import db, migrate, login_manager
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # Enable CORS for React frontend
    CORS(app, supports_credentials=True, origins=["http://localhost:3000","http://192.168.1.3:3000"])

    # Import models and API blueprint AFTER extensions
    from models import User, BlogPost
    from routes import bp as api_bp
    app.register_blueprint(api_bp)

    # Health check route (optional)
    @app.route('/api/health')
    def health_check():
        return jsonify({"status": "ok", "message": "Flask backend running"}), 200

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
