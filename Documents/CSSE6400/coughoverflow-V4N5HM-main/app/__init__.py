from flask import Flask
from .database import init_db
from .routes import api_blueprint


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///analysis.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    init_db(app)
    app.register_blueprint(api_blueprint)

    return app