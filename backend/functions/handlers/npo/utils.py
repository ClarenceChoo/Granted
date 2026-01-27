"""
Shared utilities for NPO handlers.
"""

import re


def get_cors_headers():
    """Return CORS headers for API responses"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600"
    }


def validate_uen(uen: str) -> bool:
    """
    Validate Singapore UEN format.
    UEN can be:
    - Business (ROB): 8-9 digits + 1 letter (e.g., 53312345A)
    - Local Company (ROC): 9 digits + 1 letter (e.g., 201912345A)
    - Others: 10 characters (e.g., T08GA0001A)
    """
    if not uen:
        return False
    uen = uen.upper().strip()
    # Basic UEN pattern - alphanumeric, 9-10 characters
    pattern = r'^[A-Z0-9]{9,10}$'
    return bool(re.match(pattern, uen))


def validate_email(email: str) -> bool:
    """Validate email format"""
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))
