"""Simple accounts: sign up, log in, log out.

Passwords are never stored: only a salted scrypt hash. A login creates a random session token that is kept in the
database and sent to the browser as an HttpOnly cookie, so page scripts cannot read it."""
import hashlib
import hmac
import os
import re
import secrets
import time

from . import db

COOKIE = "session"
TTL = 30 * 24 * 3600   # stay logged in for 30 days
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _init(c):
    c.executescript("""
        CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
                                         salt BLOB NOT NULL, hash BLOB NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS session (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires REAL NOT NULL);
    """)


def _conn():
    c = db.conn()
    _init(c)
    return c


def _hash(password, salt):
    return hashlib.scrypt(password.encode(), salt=salt, n=2 ** 14, r=8, p=1)


def _public(row):
    return {"id": row[0], "name": row[1], "email": row[2]}


def _start(c, user_id):
    token = secrets.token_urlsafe(32)
    c.execute("INSERT INTO session (token, user_id, expires) VALUES (?, ?, ?)", (token, user_id, time.time() + TTL))
    return token


def signup(name, email, password):
    """-> (user, session token). Raises ValueError with a merchant-readable message."""
    name, email = re.sub(r"\s+", " ", str(name or "")).strip()[:60], str(email or "").strip().lower()[:120]
    password = str(password or "")
    if not name:
        raise ValueError("Enter your name.")
    if not _EMAIL.match(email):
        raise ValueError("Enter a valid email address.")
    if len(password) < 6:
        raise ValueError("Use a password of at least 6 characters.")
    salt = os.urandom(16)
    with _conn() as c:
        if c.execute("SELECT 1 FROM user WHERE email=?", (email,)).fetchone():
            raise ValueError("An account with this email already exists. Log in instead.")
        cur = c.execute("INSERT INTO user (name, email, salt, hash, created) VALUES (?, ?, ?, ?, ?)",
                        (name, email, salt, _hash(password, salt), time.time()))
        return {"id": cur.lastrowid, "name": name, "email": email}, _start(c, cur.lastrowid)


def login(email, password):
    """-> (user, session token). The same message for a wrong email or password, so emails cannot be probed."""
    email = str(email or "").strip().lower()
    with _conn() as c:
        row = c.execute("SELECT id, name, email, salt, hash FROM user WHERE email=?", (email,)).fetchone()
        probe = _hash(str(password or ""), row[3] if row else b"\0" * 16)   # same work whether or not the email exists
        if not row or not hmac.compare_digest(probe, row[4]):
            raise ValueError("Wrong email or password.")
        return _public(row), _start(c, row[0])


def user_for(token):
    """The logged-in user for a session token, or None."""
    if not token:
        return None
    with _conn() as c:
        row = c.execute("SELECT u.id, u.name, u.email FROM session s JOIN user u ON u.id = s.user_id "
                        "WHERE s.token=? AND s.expires>?", (token, time.time())).fetchone()
        c.execute("DELETE FROM session WHERE expires<=?", (time.time(),))
    return _public(row) if row else None


def logout(token):
    if token:
        with _conn() as c:
            c.execute("DELETE FROM session WHERE token=?", (token,))
