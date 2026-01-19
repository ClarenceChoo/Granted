from firebase_functions import https_fn
from utils.logger import logger


def get_cors_headers():
    """Return CORS headers for API responses"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600"
    }


@https_fn.on_request()
def healthcheck(req: https_fn.Request) -> https_fn.Response:
    """Health check endpoint to verify API is running"""
    # Handle CORS preflight request
    if req.method == "OPTIONS":
        return https_fn.Response(
            "",
            status=204,
            headers=get_cors_headers()
        )
    
    logger.log_request(req.method, req.path)
    logger.info("Health check successful", endpoint="healthcheck")
    
    return https_fn.Response(
        "API is up and running",
        status=200,
        headers=get_cors_headers()
    )