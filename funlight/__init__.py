from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO
from flask_migrate import Migrate
import os
from sqlalchemy import text

db = SQLAlchemy()
socketio = SocketIO()
login_manager = LoginManager()
migrate = Migrate()

def create_app(test_config=None):
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///funlight.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    
    # Setup upload folder
    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app, cors_allowed_origins="*", async_mode='threading', logger=True, engineio_logger=True)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    
    with app.app_context():
        # Import parts of our application
        from funlight.models import User
        from funlight.auth import auth as auth_blueprint
        from funlight.main import main as main_blueprint
        from funlight.voice_video import voice_video as voice_video_blueprint
        from funlight.uploads import uploads as uploads_blueprint
        from . import routes
        
        # Create database tables
        db.create_all()
        
        def init_db():
            with app.app_context():
                # Add boost columns if they don't exist
                with db.engine.connect() as conn:
                    # Check if boost columns exist
                    result = conn.execute(text("PRAGMA table_info(server)"))
                    columns = [row[1] for row in result.fetchall()]
                    
                    if 'boost_level' not in columns:
                        conn.execute(text("ALTER TABLE server ADD COLUMN boost_level INTEGER DEFAULT 0"))
                    if 'boost_count' not in columns:
                        conn.execute(text("ALTER TABLE server ADD COLUMN boost_count INTEGER DEFAULT 0"))
                    
                    conn.commit()

        init_db()
        
        # Register blueprints
        app.register_blueprint(auth_blueprint)
        app.register_blueprint(main_blueprint)
        app.register_blueprint(voice_video_blueprint)
        app.register_blueprint(uploads_blueprint)
        app.register_blueprint(routes.bp)
        
        @login_manager.user_loader
        def load_user(user_id):
            return User.query.get(int(user_id))
        
    return app
