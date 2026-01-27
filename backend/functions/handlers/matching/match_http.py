"""
HTTP trigger for manual grant matching.

Provides endpoints to trigger matching for a single NPO or all NPOs.
"""

import json
import logging
from firebase_functions import https_fn

from .utils import get_cors_headers, get_matching_service, get_firestore_client
from services.matching_service import match_single_npo, match_all_npos

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@https_fn.on_request(secrets=["OPENAI_API_KEY"])
def match_grants_manual(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP endpoint to manually trigger grant matching.

    POST /match_grants_manual

    Request body (optional):
    {
        "npo_id": "specific_npo_id"  // If omitted, matches all NPOs
    }

    Returns:
        JSON response with matching results
    """
    # Handle CORS preflight request
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204, headers=get_cors_headers())

    # Only allow POST requests
    if req.method != "POST":
        return https_fn.Response(
            response=json.dumps({"error": "Method not allowed. Use POST."}),
            status=405,
            headers=get_cors_headers(),
            mimetype="application/json",
        )

    logger.info("[HTTP Trigger] Manual grant matching triggered")

    try:
        # Parse request body
        data = req.get_json(silent=True, force=True) or {}
        npo_id = data.get("npo_id")

        # Initialize services
        db = get_firestore_client()
        service = get_matching_service()

        if npo_id:
            # Match single NPO
            logger.info(
                f"[HTTP Trigger] Matching single NPO: {npo_id}",
                extra={"npo_id": npo_id},
            )

            result = match_single_npo(
                db=db, service=service, npo_id=npo_id, trigger_source="http_manual"
            )

            if result:
                return https_fn.Response(
                    response=json.dumps(
                        {
                            "success": True,
                            "message": f"Successfully matched NPO: {npo_id}",
                            "data": result,
                        }
                    ),
                    status=200,
                    headers=get_cors_headers(),
                    mimetype="application/json",
                )
            else:
                return https_fn.Response(
                    response=json.dumps(
                        {"success": False, "error": f"Failed to match NPO: {npo_id}"}
                    ),
                    status=500,
                    headers=get_cors_headers(),
                    mimetype="application/json",
                )
        else:
            # Match all NPOs
            logger.info("[HTTP Trigger] Matching all NPOs")

            result = match_all_npos(
                db=db, service=service, trigger_source="http_manual"
            )

            # Handle case where result might not have expected structure
            if not isinstance(result, dict):
                logger.error(f"[HTTP Trigger] Unexpected result type: {type(result)}")
                return https_fn.Response(
                    response=json.dumps(
                        {"error": "Unexpected response from matching service"}
                    ),
                    status=500,
                    headers=get_cors_headers(),
                    mimetype="application/json",
                )

            success = result.get("success", False)
            processed = result.get("processed", 0)
            failed = result.get("failed", 0)
            error = result.get("error", "Unknown error")

            if success:
                return https_fn.Response(
                    response=json.dumps(
                        {
                            "success": True,
                            "message": f"Processed {processed} NPOs, {failed} failed",
                            "data": result,
                        }
                    ),
                    status=200,
                    headers=get_cors_headers(),
                    mimetype="application/json",
                )
            else:
                return https_fn.Response(
                    response=json.dumps(
                        {
                            "success": False,
                            "error": error,
                            "message": f"Matching failed. Processed: {processed}, Failed: {failed}",
                            "data": result,
                        }
                    ),
                    status=500,
                    headers=get_cors_headers(),
                    mimetype="application/json",
                )

    except ValueError as e:
        # Configuration error (e.g., missing API key)
        logger.error(f"[HTTP Trigger] Configuration error: {e}", exc_info=True)
        return https_fn.Response(
            response=json.dumps({"error": f"Configuration error: {str(e)}"}),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json",
        )

    except KeyError as e:
        # Missing expected key in result
        logger.error(
            f"[HTTP Trigger] Missing expected data in response: {e}", exc_info=True
        )
        return https_fn.Response(
            response=json.dumps(
                {"error": f"Invalid response structure: missing {str(e)}"}
            ),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json",
        )

    except Exception as e:
        logger.error(
            f"[HTTP Trigger] Unexpected error during manual matching: {str(e)}",
            exc_info=True,
        )
        return https_fn.Response(
            response=json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json",
        )
