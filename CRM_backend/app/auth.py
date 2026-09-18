"""Authentication helpers: password hashing, verification, and token utilities."""

import hashlib
import secrets


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}${key.hex()}"


def verify_password(stored_password_hash: str, provided_password: str) -> bool:
    try:
        salt, key = stored_password_hash.split("$", 1)
        new_key = hashlib.pbkdf2_hmac(
            "sha256", provided_password.encode("utf-8"), salt.encode("utf-8"), 100_000
        )
        return secrets.compare_digest(new_key.hex(), key)
    except Exception:
        return False


def create_token() -> str:
    return secrets.token_urlsafe(32)
