"""
Shared utilities for matching handlers.
"""

import os
import logging
from firebase_admin import firestore, auth

from services.matching_service import GrantMatchingService

logger = logging.getLogger(__name__)


def get_cors_headers():
    """Return CORS headers for API responses"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600"
    }


def verify_auth_token(req):
    """
    Verify Firebase Auth token from Authorization header.
    
    Args:
        req: HTTP request object
        
    Returns:
        Decoded token dict if valid, None otherwise
    """
    auth_header = req.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None


def get_openai_api_key() -> str:
    """
    Get OpenAI API key from environment variables.
    
    Returns:
        OpenAI API key string
        
    Raises:
        ValueError: If API key not found
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("[Config] OPENAI_API_KEY environment variable not set")
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    # Strip whitespace and newlines that may have been added during secret creation
    api_key = api_key.strip()
    
    return api_key


def get_matching_service() -> GrantMatchingService:
    """
    Create and return a GrantMatchingService instance.
    
    Returns:
        Configured GrantMatchingService
    """
    api_key = get_openai_api_key()
    return GrantMatchingService(api_key)


def get_firestore_client():
    """
    Get Firestore client instance.
    
    Returns:
        Firestore client
    """
    return firestore.client()
