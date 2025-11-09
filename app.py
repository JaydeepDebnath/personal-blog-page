from flask import Flask
from config import Config
from extensions import db, migrate, login_manager

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # import models and routes AFTER extensions
    from models import User, BlogPost
    from routes import bp as main_bp
    app.register_blueprint(main_bp)

    return app

app = create_app()
