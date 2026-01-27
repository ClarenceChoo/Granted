"""
Shared utilities for matching handlers.
"""

import os
import logging
from firebase_admin import firestore

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
    return api_key


def get_matching_service() -> GrantMatchingService:
    """
    Create and return a GrantMatchingService instance.
    
    Returns:
        Configured GrantMatchingService
    """
    api_key = get_openai_api_key()
    return GrantMatchingService(api_key)


def get_firestore_client() -> firestore.Client:
    """
    Get Firestore client instance.
    
    Returns:
        Firestore client
    """
    return firestore.client()
