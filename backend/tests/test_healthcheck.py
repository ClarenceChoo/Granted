"""Tests for healthcheck handler."""
import pytest
from unittest.mock import Mock, MagicMock
from functions.handlers.healthcheck import healthcheck, get_cors_headers


def test_healthcheck_returns_success():
    """Test that healthcheck returns a successful response."""
    mock_request = Mock()
    mock_request.method = "GET"
    mock_request.path = "/healthcheck"
    
    result = healthcheck(mock_request)
    
    assert result is not None
    assert result.status == 200
    assert result.response == "API is up and running"


def test_healthcheck_includes_cors_headers():
    """Test that healthcheck response includes CORS headers."""
    mock_request = Mock()
    mock_request.method = "GET"
    mock_request.path = "/healthcheck"
    
    result = healthcheck(mock_request)
    
    assert result.headers is not None
    assert "Access-Control-Allow-Origin" in result.headers


def test_healthcheck_handles_options_request():
    """Test that healthcheck properly handles OPTIONS preflight requests."""
    mock_request = Mock()
    mock_request.method = "OPTIONS"
    mock_request.path = "/healthcheck"
    
    result = healthcheck(mock_request)
    
    assert result.status == 204
    assert result.response == ""


def test_get_cors_headers_contains_required_fields():
    """Test that CORS headers include all required fields."""
    headers = get_cors_headers()
    
    assert "Access-Control-Allow-Origin" in headers
    assert "Access-Control-Allow-Methods" in headers
    assert "Access-Control-Allow-Headers" in headers
    assert headers["Access-Control-Allow-Origin"] == "*"

