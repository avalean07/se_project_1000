import functools
import os
import logging
import uuid
from db import get_db
from flask_dance.contrib.google import make_google_blueprint
from flask import Blueprint, flash, render_template, request, redirect, url_for, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, timezone
from utils import send_email

logger = logging.getLogger(__name__)
# for local testing
if os.environ.get("FLASK_ENV", "development") == "development":
    logger.info("Setting up environment variables for local testing.")
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "true"
    os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "true"

auth_bp = Blueprint("auth", __name__, template_folder="templates/auth")
google_client_id = os.environ.get(
    "GOOGLE_CLIENT_ID",
)
google_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")

google_bp = make_google_blueprint(
    client_id=google_client_id,
    client_secret=google_client_secret,
    scope=[
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/user.birthday.read",
    ],
    redirect_to="google_login",
)


def login_required(view):
    @functools.wraps(view)
    def wrapped_view(*args, **kwargs):
        if "username" not in session:
            return redirect(url_for("auth.login"))

        return view(*args, **kwargs)

    return wrapped_view


def admin_or_manager_required(view):
    @functools.wraps(view)
    def wrapped_view(*args, **kwargs):
        if session.get("role_name") not in ("Admin", "Manager"):
            logger.info("Unauthorized access: Admin or Manager role required.")
            flash("Unauthorized access.", "error")
            return redirect("/")
        return view(*args, **kwargs)

    return wrapped_view


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username_or_email = request.form.get("username").lower()
        password = request.form.get("password")

        db = get_db()
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT user_id, first_name, second_name, email, password_hash, role_name, username FROM users WHERE username = %s OR email = %s",
                (username_or_email, username_or_email),
            )
            user = cursor.fetchone()
            if not user:
                return render_template("login.html", error="Invalid credentials")

            user_id, first_name, second_name, email, password_hash, role_name, username = user
            if not check_password_hash(password_hash, password):
                return render_template("login.html", error="Invalid credentials")

            session.clear()
            session.update(
                {
                    "user_id": user_id,
                    "name": f"{first_name} {second_name}" if second_name else first_name,
                    "email": email,
                    "role_name": role_name,
                    "username": username,
                }
            )

        return redirect(url_for("index"))
    return render_template("login.html")


@auth_bp.route("/check_username", methods=["POST"])
def check_username():
    data = request.get_json()
    username = data.get("username").lower()
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT 1 FROM users WHERE username = %s", (username,))
        exists = cursor.fetchone() is not None
    return jsonify({"exists": exists})


@auth_bp.route("/check_email", methods=["POST"])
def check_email():
    data = request.get_json()
    email = data.get("email").lower()
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT 1 FROM users WHERE email = %s", (email,))
        exists = cursor.fetchone() is not None
    return jsonify({"exists": exists})


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        first_name = request.form.get("first_name").lower()
        second_name = request.form.get("second_name").lower()
        email = request.form.get("email").lower()
        username = request.form.get("username").lower()
        birthday_date = request.form.get("birthday_date")
        password = request.form.get("password")
        role_name = request.form.get("role_name")

        db = get_db()
        with db.cursor() as cursor:
            # cursor.execute("SELECT 1 FROM users WHERE username = %s OR email = %s", (username, email))
            # if cursor.fetchone():
            #     return render_template("register.html", error="Username or email already exists")

            cursor.execute(
                """INSERT INTO users (username, password_hash, role_name, first_name, second_name, birthday_date, email)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   RETURNING user_id""",
                (username, generate_password_hash(password), role_name, first_name, second_name, birthday_date, email),
            )
            user_id = cursor.fetchone()[0]
            db.commit()
            confirmation_token = str(uuid.uuid4())
            expires_at_utc = datetime.now(timezone.utc) + timedelta(days=1)

            cursor.execute(
                """
                INSERT INTO reset_confirm_tokens (token, user_id, expires_at_utc)
                VALUES (%s, %s, %s)
                """,
                (confirmation_token, user_id, expires_at_utc),
            )
            db.commit()
            confirm_link = url_for("auth.confirm_email", token=confirmation_token, _external=True)

            send_email(
                to_address=email,
                subject="Confirm your email address",
                html_body=render_template("email/confirm_email.html", confirm_link=confirm_link),
            )
            session.clear()
            session.update(
                {
                    "username": username,
                    "user_id": user_id,
                    "role_name": role_name,
                    "name": f"{first_name} {second_name}",
                    "email": email,
                    "confirmed": False,
                }
            )

        return render_template("confirm.html")
    return render_template("register.html")


@auth_bp.route("/confirm_email/<token>", methods=["GET"])
def confirm_email(token):
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT user_id, expires_at_utc, used FROM reset_confirm_tokens WHERE token = %s", (token,))
        token_record = cursor.fetchone()
        if token_record is None:
            return render_template("confirm.html", error_message="Invalid confirmation link.")
        user_id, expires_at_utc, used = token_record
        if datetime.now(timezone.utc) > expires_at_utc.replace(tzinfo=timezone.utc):
            return render_template("confirm.html", error_message="Expired confirmation link.")
        if used:
            return redirect(url_for("index"))
        cursor.execute("UPDATE users SET confirmed = TRUE WHERE user_id = %s", (user_id,))
        db.commit()
        cursor.execute("UPDATE reset_confirm_tokens SET used = TRUE WHERE token = %s", (token,))
        db.commit()
        # if "username" in session and session["username"] == email:
        session["confirmed"] = True

        return render_template("confirm.html", success=True)


@auth_bp.route("/resend_confirmation", methods=["POST"])
def resend_confirmation():
    if "user_id" not in session or "email" not in session:
        return redirect(url_for("login"))
    user_id = session["user_id"]
    email = session["email"]
    confirmation_token = str(uuid.uuid4())
    expires_at_utc = datetime.now(timezone.utc) + timedelta(days=1)
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO reset_confirm_tokens (token, user_id, expires_at_utc)
            VALUES (%s, %s, %s)
            """,
            (confirmation_token, user_id, expires_at_utc),
        )
        db.commit()
        confirm_link = url_for("auth.confirm_email", token=confirmation_token, _external=True)
        send_email(
            to_address=email,
            subject="Confirm your email address",
            html_body=render_template("email/confirm_email.html", confirm_link=confirm_link),
        )
    return render_template("confirm.html")


@auth_bp.route("/check_confirmation", methods=["GET"])
def check_confirmation():
    if "user_id" not in session:
        return redirect(url_for("login"))
    user_id = session["user_id"]
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT confirmed FROM users WHERE user_id = %s", (user_id,))
        success = cursor.fetchone()[0]
    return jsonify({"success": success})


@auth_bp.route("/forgot_password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        username_or_email = request.form.get("username").lower()
        db = get_db()
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT user_id, email FROM users
                WHERE username = %s OR email = %s
                """,
                (username_or_email, username_or_email),
            )
            user = cursor.fetchone()
            if user:
                user_id, email_addr = user
                reset_token = str(uuid.uuid4())
                expires_at_utc = datetime.now(timezone.utc) + timedelta(hours=1)
                cursor.execute(
                    """
                    INSERT INTO reset_confirm_tokens (token, user_id, expires_at_utc)
                    VALUES (%s, %s, %s)
                    """,
                    (reset_token, user_id, expires_at_utc),
                )
                db.commit()

                reset_link = url_for("auth.reset_password", token=reset_token, _external=True)
                send_email(
                    to_address=email_addr,
                    subject="Password Reset Request",
                    html_body=render_template("email/reset_password_email.html", reset_link=reset_link),
                )
                return render_template(
                    "forgot_password.html",
                    success=True,
                )
            else:
                return render_template("forgot_password.html", error="User not found.")
    return render_template("forgot_password.html")


@auth_bp.route("/reset_password/<token>", methods=["GET", "POST"])
def reset_password(token):
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT user_id, expires_at_utc, used FROM reset_confirm_tokens WHERE token = %s", (token,))
        token_record = cursor.fetchone()

        if token_record is None:
            return render_template("reset_password.html", error="Invalid token.")

        user_id, expires_at_utc, used = token_record
        if used:
            return render_template("reset_password.html", error="This token has already been used.")

        if datetime.now(timezone.utc) > expires_at_utc.replace(tzinfo=timezone.utc):
            return render_template("reset_password.html", error="This token has expired.")

        if request.method == "POST":
            new_password = request.form.get("password")
            confirm_password = request.form.get("confirm_password")

            if new_password != confirm_password:
                return render_template("reset_password.html", error="Passwords do not match.", token=token)
            cursor.execute("SELECT password_hash FROM users WHERE user_id = %s", (user_id,))
            previous_password = cursor.fetchone()[0]
            if check_password_hash(previous_password, new_password):
                return render_template("reset_password.html", error="New password should be different.", token=token)
            cursor.execute(
                "UPDATE users SET password_hash = %s WHERE user_id = %s",
                (generate_password_hash(new_password), user_id),
            )
            cursor.execute("UPDATE reset_confirm_tokens SET used = TRUE WHERE token = %s", (token,))
            db.commit()
            return render_template("reset_password.html", success=True)

        return render_template("reset_password.html", token=token)


@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login"))
