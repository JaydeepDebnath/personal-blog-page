from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField,FileField, SubmitField, TextAreaField, URLField
from wtforms.validators import DataRequired, Length, Email, EqualTo, URL, Optional

class BlogPostForm(FlaskForm):
    title = StringField("Title", validators=[DataRequired()])
    description = TextAreaField("Description", validators=[DataRequired()])
    github_link = StringField("GitHub Link", validators=[Optional(), URL()])
    live_deploy_link = StringField("Live Deploy Link", validators=[Optional(), URL()])
    photo_filename = FileField("photo", validators=[Optional()])
    submit = SubmitField("Submit")


class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=25)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')