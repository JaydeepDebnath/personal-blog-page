from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models import User, BlogPost
from datetime import datetime
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    set_access_cookies,
    unset_jwt_cookies
)

bp = Blueprint('api', __name__)

# ============================================================
# 🔐 AUTH ROUTES
# ============================================================

@bp.route('/api/register', methods=['POST'])
def api_register():
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
        password=generate_password_hash(password),
        is_admin=data.get("is_admin", False)
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Account created successfully"}), 201


@bp.route('/api/login', methods=['POST'])
def api_login():
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

    access_token = create_access_token(identity=str(user.id))

    response = jsonify({
        "message": "Login successful",
        "token": access_token,
        "user": user.to_dict()
    })
    set_access_cookies(response, access_token)
    return response, 200


@bp.route('/api/logout', methods=['POST'])
def api_logout():
    response = jsonify({"message": "Logout successful"})
    unset_jwt_cookies(response)
    return response, 200


@bp.route('/api/current_user', methods=['GET'])
@jwt_required()
def api_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(user.to_dict()), 200


# ============================================================
# 🧭 PUBLIC BLOG ROUTES
# ============================================================

@bp.route('/api/posts', methods=['GET'])
def api_get_posts():
    posts = BlogPost.query.order_by(BlogPost.creation_date.desc()).all()
    return jsonify([
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "github_link": p.github_link,
            "live_deploy_link": p.live_deploy_link,
            "photo_filename": p.photo_filename,
            "creation_date": p.creation_date.strftime("%Y-%m-%d"),
            "last_updated": p.last_updated.strftime("%Y-%m-%d") if p.last_updated else None,
            "author": p.author.username
        } for p in posts
    ]), 200


@bp.route('/api/posts/<int:post_id>', methods=['GET'])
def api_view_post(post_id):
    post = BlogPost.query.get_or_404(post_id)
    return jsonify({
        "id": post.id,
        "title": post.title,
        "description": post.description,
        "github_link": post.github_link,
        "live_deploy_link": post.live_deploy_link,
        "photo_filename": post.photo_filename,
        "creation_date": post.creation_date.strftime("%Y-%m-%d"),
        "last_updated": post.last_updated.strftime("%Y-%m-%d") if post.last_updated else None,
        "author": post.author.username
    }), 200


# ============================================================
# 🧑‍💻 ADMIN DASHBOARD (JWT + ROLE CHECK)
# ============================================================

@bp.route('/api/dashboard', methods=['GET'])
@jwt_required()
def api_dashboard():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user or not user.is_admin:
        return jsonify({"message": "Access denied: Admins only"}), 403

    posts = BlogPost.query.order_by(BlogPost.creation_date.desc()).all()
    return jsonify([
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "github_link": p.github_link,
            "live_deploy_link": p.live_deploy_link,
            "photo_filename": p.photo_filename,
            "creation_date": p.creation_date.strftime("%Y-%m-%d")
        } for p in posts
    ]), 200


@bp.route('/api/posts', methods=['POST'])
@jwt_required()
def api_create_post():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user or not user.is_admin:
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
        user_id=user.id,
        creation_date=datetime.utcnow(),
        last_updated=datetime.utcnow()
    )
    db.session.add(post)
    db.session.commit()
    return jsonify({"message": "Post created successfully"}), 201


@bp.route('/api/posts/<int:post_id>', methods=['PUT'])
@jwt_required()
def api_edit_post(post_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user or not user.is_admin:
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
@jwt_required()
def api_delete_post(post_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user or not user.is_admin:
        return jsonify({"message": "Access denied: Admins only"}), 403

    post = BlogPost.query.get_or_404(post_id)
    db.session.delete(post)
    db.session.commit()
    return jsonify({"message": "Post deleted successfully"}), 200
