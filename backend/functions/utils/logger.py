"""
Logging utility for Firebase Cloud Functions
Provides structured logging that integrates with Google Cloud Logging
"""

import logging
import json
from datetime import datetime
from typing import Optional


class StructuredLogger:
    """
    Custom logger that outputs structured logs for Cloud Logging
    """
    
    def __init__(self, name: str = "ratemynus-backend"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # Remove existing handlers to avoid duplicates
        self.logger.handlers.clear()
        
        # Create console handler with structured formatting
        handler = logging.StreamHandler()
        handler.setLevel(logging.INFO)
        
        # Use JSON formatter for structured logging
        formatter = logging.Formatter(
            '{"severity": "%(levelname)s", "time": "%(asctime)s", "message": "%(message)s"}'
        )
        handler.setFormatter(formatter)
        
        self.logger.addHandler(handler)
    
    def _log(self, level: str, message: str, **kwargs):
        """
        Internal method to log with additional context
        """
        log_data = {
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            **kwargs
        }
        
        log_message = json.dumps(log_data)
        
        if level == "DEBUG":
            self.logger.debug(log_message)
        elif level == "INFO":
            self.logger.info(log_message)
        elif level == "WARNING":
            self.logger.warning(log_message)
        elif level == "ERROR":
            self.logger.error(log_message)
        elif level == "CRITICAL":
            self.logger.critical(log_message)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with optional context"""
        self._log("DEBUG", message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message with optional context"""
        self._log("INFO", message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with optional context"""
        self._log("WARNING", message, **kwargs)
    
    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log error message with optional exception details"""
        if error:
            kwargs["error_type"] = type(error).__name__
            kwargs["error_message"] = str(error)
        self._log("ERROR", message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message with optional context"""
        self._log("CRITICAL", message, **kwargs)
    
    def log_request(self, method: str, path: str, **kwargs):
        """Log HTTP request details"""
        self.info(
            f"{method} {path}",
            request_method=method,
            request_path=path,
            **kwargs
        )
    
    def log_response(self, method: str, path: str, status: int, duration_ms: Optional[float] = None, **kwargs):
        """Log HTTP response details"""
        self.info(
            f"{method} {path} - {status}",
            request_method=method,
            request_path=path,
            response_status=status,
            duration_ms=duration_ms,
            **kwargs
        )
    
    def log_firestore_operation(self, operation: str, collection: str, document_id: Optional[str] = None, **kwargs):
        """Log Firestore database operations"""
        self.info(
            f"Firestore {operation}",
            firestore_operation=operation,
            firestore_collection=collection,
            firestore_document_id=document_id,
            **kwargs
        )


# Create a global logger instance
logger = StructuredLogger()


def get_logger(name: Optional[str] = None) -> StructuredLogger:
    """
    Get a logger instance
    
    Args:
        name: Optional logger name
        
    Returns:
        StructuredLogger instance
    """
    if name:
        return StructuredLogger(name)
    return logger