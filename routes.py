from flask import Blueprint, jsonify, request
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db, login_manager
from models import User, BlogPost
from datetime import datetime

bp = Blueprint('api', __name__)

# ----------------- Flask-Login user loader -----------------
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ============================================================
# 🔐 AUTH ROUTES (React + JSON)
# ============================================================

@bp.route('/api/register', methods=['POST'])
def api_register():
    """Register a new user (POST only)."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "Missing request data"}), 400

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not all([username, email, password]):
        return jsonify({"message": "All fields are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 400

    new_user = User(
        username=username,
        email=email,
        password=generate_password_hash(password)
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Account created successfully"}), 201


@bp.route('/api/login', methods=['POST'])
def api_login():
    """Login and return user info."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "Missing credentials"}), 400

    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid email or password"}), 401
    
    if not user.is_admin:
        return jsonify({"message": "Access denied: Only admin can log in"}), 403
    
    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid email or password"}), 401

    login_user(user)
    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_admin": getattr(user, "is_admin", False)
        }
    }), 200

@bp.route("/api/session", methods=["GET"])
def get_session():
    if not current_user.is_authenticated:
        return jsonify({"message": "Session inactive"}), 401

    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": getattr(current_user, "is_admin", False)
    }), 200

@bp.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    """Logout the current user."""
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200


@bp.route('/api/current_user', methods=['GET'])
@login_required
def api_current_user():
    """Fetch current logged-in user."""
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": getattr(current_user, "is_admin", False)
    }), 200

# ============================================================
# 🧭 BLOG ROUTES (Public + Admin)
# ============================================================

@bp.route('/api/posts', methods=['GET'])
def api_get_posts():
    """Public route to list all blog posts."""
    posts = BlogPost.query.order_by(BlogPost.creation_date.desc()).all()
    result = []
    for post in posts:
        result.append({
            "id": post.id,
            "title": post.title,
            "description": post.description,
            "github_link": post.github_link,
            "live_deploy_link": post.live_deploy_link,
            "photo_filename": post.photo_filename,
            "creation_date": post.creation_date.strftime("%Y-%m-%d"),
            "last_updated": post.last_updated.strftime("%Y-%m-%d") if post.last_updated else None
        })
    return jsonify(result), 200


@bp.route('/api/posts/<int:post_id>', methods=['GET'])
def api_view_post(post_id):
    """Public route to view a single post by ID."""
    post = BlogPost.query.get_or_404(post_id)
    return jsonify({
        "id": post.id,
        "title": post.title,
        "description": post.description,
        "github_link": post.github_link,
        "live_deploy_link": post.live_deploy_link,
        "photo_filename": post.photo_filename,
        "creation_date": post.creation_date.strftime("%Y-%m-%d"),
        "last_updated": post.last_updated.strftime("%Y-%m-%d") if post.last_updated else None
    }), 200


# ============================================================
# 🧑‍💻 DASHBOARD (Admin-only CRUD)
# ============================================================

@bp.route('/api/dashboard', methods=['GET'])
@login_required
def api_dashboard():
    """Admin-only dashboard to list all posts."""
    if not getattr(current_user, "is_admin", False):
        return jsonify({"message": "Access denied: Admins only"}), 403

    posts = BlogPost.query.order_by(BlogPost.creation_date.desc()).all()
    return jsonify([{
        "id": post.id,
        "title": post.title,
        "description": post.description,
        "github_link": post.github_link,
        "live_deploy_link": post.live_deploy_link,
        "photo_filename": post.photo_filename,
        "creation_date": post.creation_date.strftime("%Y-%m-%d")
    } for post in posts]), 200


@bp.route('/api/posts', methods=['POST'])
@login_required
def api_create_post():
    """Create a new blog post."""
    if not getattr(current_user, "is_admin", False):
        return jsonify({"message": "Access denied: Admins only"}), 403

    data = request.get_json()
    required = ["title", "description", "github_link", "live_deploy_link", "photo_filename"]
    if not all(key in data for key in required):
        return jsonify({"message": "Missing required fields"}), 400

    post = BlogPost(
        title=data["title"],
        description=data["description"],
        github_link=data["github_link"],
        live_deploy_link=data["live_deploy_link"],
        photo_filename=data["photo_filename"],
        user_id=current_user.id,
        creation_date=datetime.utcnow(),
        last_updated=datetime.utcnow()
    )
    db.session.add(post)
    db.session.commit()
    return jsonify({"message": "Post created successfully"}), 201


@bp.route('/api/posts/<int:post_id>', methods=['PUT'])
@login_required
def api_edit_post(post_id):
    """Update an existing post."""
    if not getattr(current_user, "is_admin", False):
        return jsonify({"message": "Access denied: Admins only"}), 403

    post = BlogPost.query.get_or_404(post_id)
    data = request.get_json()

    post.title = data.get("title", post.title)
    post.description = data.get("description", post.description)
    post.github_link = data.get("github_link", post.github_link)
    post.live_deploy_link = data.get("live_deploy_link", post.live_deploy_link)
    post.photo_filename = data.get("photo_filename", post.photo_filename)
    post.last_updated = datetime.utcnow()

    db.session.commit()
    return jsonify({"message": "Post updated successfully"}), 200


@bp.route('/api/posts/<int:post_id>', methods=['DELETE'])
@login_required
def api_delete_post(post_id):
    """Delete a post by ID."""
    if not getattr(current_user, "is_admin", False):
        return jsonify({"message": "Access denied: Admins only"}), 403

    post = BlogPost.query.get_or_404(post_id)
    db.session.delete(post)
    db.session.commit()
    return jsonify({"message": "Post deleted successfully"}), 200
