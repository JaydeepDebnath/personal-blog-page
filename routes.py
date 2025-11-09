from flask import Blueprint, render_template, redirect, url_for, flash, request, abort
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db, login_manager
from models import User, BlogPost
from forms import RegistrationForm, LoginForm, BlogPostForm
from datetime import datetime

bp = Blueprint('main', __name__)

# Flask-Login user loader
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ----------------- Auth Routes -----------------
@bp.route('/register', methods=['GET','POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    form = RegistrationForm()
    if form.validate_on_submit():
        if User.query.filter_by(email=form.email.data).first():
            flash('Email already registered','danger')
            return redirect(url_for('main.register'))
        new_user = User(
            username=form.username.data,
            email=form.email.data,
            password=generate_password_hash(form.password.data)
        )
        db.session.add(new_user)
        db.session.commit()
        flash('Account created successfully. Please log in.','success')
        return redirect(url_for('main.login'))
    return render_template('register.html', form=form)

@bp.route('/login', methods=['GET','POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and check_password_hash(user.password, form.password.data):
            login_user(user)
            flash('Logged in successfully!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('main.dashboard'))
        flash('Invalid email or password', 'danger')
    return render_template('login.html', form=form)

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully', 'success')
    return redirect(url_for('main.login'))

# ----------------- Dashboard -----------------
@bp.route('/dashboard')
@login_required
def dashboard():
    if not current_user.is_admin:
        flash("Access denied: Only admin can view dashboard.", "danger")
        return redirect(url_for("main.index"))
    posts = BlogPost.query.order_by(BlogPost.creation_date.desc()).all()
    return render_template('dashboard.html', posts=posts)

# ----------------- Blog CRUD -----------------
@bp.route('/create_post', methods=['GET','POST'])
@login_required
def create_post():
    if not current_user.is_admin:
        flash("Access denied: Only admin can create posts.", "danger")
        return redirect(url_for("main.index"))
    form = BlogPostForm()
    if form.validate_on_submit():
        post = BlogPost(
            title=form.title.data,
            description=form.description.data,
            github_link=form.github_link.data,
            live_deploy_link=form.live_deploy_link.data,
            photo_filename=form.photo_filename.data,
            user_id=current_user.id,
            creation_date=datetime.utcnow(),
            last_updated=datetime.utcnow()
        )
        db.session.add(post)
        db.session.commit()
        flash('Post created successfully!', 'success')
        return redirect(url_for('main.dashboard'))
    return render_template('create_post.html', form=form)

@bp.route('/edit_post/<int:post_id>', methods=['GET','POST'])
@login_required
def edit_post(post_id):
    if not current_user.is_admin:
        flash("Access denied: Only admin can edit posts.", "danger")
        return redirect(url_for("main.index"))
    post = BlogPost.query.get_or_404(post_id)
    form = BlogPostForm(obj=post)
    if form.validate_on_submit():
        post.title = form.title.data
        post.description = form.description.data
        post.github_link = form.github_link.data
        post.live_deploy_link = form.live_deploy_link.data
        post.photo_filename = form.photo_filename.data
        post.last_updated = datetime.utcnow()
        db.session.commit()
        flash('Post updated successfully!', 'success')
        return redirect(url_for('main.dashboard'))
    return render_template('create_post.html', form=form, edit=True)

@bp.route('/delete_post/<int:post_id>', methods=['POST'])
@login_required
def delete_post(post_id):
    if not current_user.is_admin:
        flash("Access denied: Only admin can delete posts.", "danger")
        return redirect(url_for("main.index"))
    post = BlogPost.query.get_or_404(post_id)
    db.session.delete(post)
    db.session.commit()
    flash('Post deleted successfully!', 'success')
    return redirect(url_for('main.dashboard'))


# ----------------- Public Blog Listing -----------------
@bp.route('/')
def index():
    posts = BlogPost.query.order_by(BlogPost.creation_date.desc()).all()
    return render_template('index.html', posts=posts)

@bp.route('/blog')
def blog_list():
    posts = BlogPost.query.order_by(BlogPost.creation_date.desc()).all()
    return render_template('blog_list.html', posts=posts)

# ----------------- Public Individual View -----------------
@bp.route('/view/<int:post_id>')
def view_post(post_id):
    post = BlogPost.query.get_or_404(post_id)
    return render_template('view_post.html', post=post)
