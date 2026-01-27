"""
Firestore triggers for grant matching.

Triggers matching when NPO or Grant documents are created/updated.
"""

import logging
from firebase_functions import firestore_fn
from google.cloud.firestore_v1 import DocumentSnapshot

from .utils import get_matching_service, get_firestore_client
from services.matching_service import match_single_npo, match_all_npos

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# ============================================================================
# NPO Change Triggers
# ============================================================================

@firestore_fn.on_document_written(
    document="npos/{npoId}",
    memory=512,  # MB - AI inference may need more memory
    timeout_sec=120,
    secrets=["OPENAI_API_KEY"]
)
def on_npo_change(
    event: firestore_fn.Event[firestore_fn.Change[DocumentSnapshot]]
) -> None:
    """
    Trigger matching when an NPO document is created or updated.
    
    This ensures that when an NPO updates their profile (description,
    sector, beneficiaries, etc.), their grant matches are refreshed.
    
    Args:
        event: Firestore event containing before/after document snapshots
    """
    npo_id = event.params.get("npoId")
    
    # Determine if this is a create, update, or delete
    before_data = event.data.before.to_dict() if event.data.before and event.data.before.exists else None
    after_data = event.data.after.to_dict() if event.data.after and event.data.after.exists else None
    
    # Skip if document was deleted
    if not after_data:
        logger.info(
            f"[Firestore Trigger] NPO deleted, skipping matching: {npo_id}",
            extra={"npo_id": npo_id}
        )
        return
    
    # Determine event type
    event_type = "created" if not before_data else "updated"
    
    # For updates, check if relevant fields changed
    if event_type == "updated":
        relevant_fields = ["description", "sector", "beneficiaries", "budget", "name"]
        changed_fields = []
        
        for field in relevant_fields:
            if before_data.get(field) != after_data.get(field):
                changed_fields.append(field)
        
        if not changed_fields:
            logger.info(
                f"[Firestore Trigger] No relevant fields changed for NPO: {npo_id}",
                extra={"npo_id": npo_id}
            )
            return
        
        logger.info(
            f"[Firestore Trigger] NPO updated with relevant changes: {npo_id}",
            extra={
                "npo_id": npo_id,
                "changed_fields": changed_fields
            }
        )
    else:
        logger.info(
            f"[Firestore Trigger] New NPO created: {npo_id}",
            extra={"npo_id": npo_id}
        )
    
    try:
        # Initialize services
        db = get_firestore_client()
        service = get_matching_service()
        
        # Match this specific NPO
        result = match_single_npo(
            db=db,
            service=service,
            npo_id=npo_id,
            trigger_source=f"firestore_npo_{event_type}"
        )
        
        if result:
            logger.info(
                f"[Firestore Trigger] Successfully matched NPO: {npo_id}",
                extra={
                    "npo_id": npo_id,
                    "num_matches": len(result.get("matches", []))
                }
            )
        else:
            logger.warning(
                f"[Firestore Trigger] Failed to match NPO: {npo_id}",
                extra={"npo_id": npo_id}
            )
            
    except ValueError as e:
        logger.error(
            f"[Firestore Trigger] Configuration error: {e}",
            extra={"npo_id": npo_id, "error": str(e)}
        )
        
    except Exception as e:
        logger.error(
            f"[Firestore Trigger] Error matching NPO: {npo_id}",
            extra={"npo_id": npo_id, "error": str(e)},
            exc_info=True
        )


# ============================================================================
# Grant Change Triggers
# ============================================================================

@firestore_fn.on_document_written(
    document="grants/{grantId}",
    memory=512,  # MB - AI inference may need more memory
    timeout_sec=540,  # 9 minutes - re-matching all NPOs may take time
    secrets=["OPENAI_API_KEY"]
)
def on_grant_change(
    event: firestore_fn.Event[firestore_fn.Change[DocumentSnapshot]]
) -> None:
    """
    Trigger re-matching for all NPOs when a grant is created or updated.
    
    When grants change, all NPOs need their matches refreshed to ensure
    they see the most relevant grants.
    
    Args:
        event: Firestore event containing before/after document snapshots
    """
    grant_id = event.params.get("grantId")
    
    # Determine if this is a create, update, or delete
    before_data = event.data.before.to_dict() if event.data.before and event.data.before.exists else None
    after_data = event.data.after.to_dict() if event.data.after and event.data.after.exists else None
    
    # Determine event type
    if not after_data:
        event_type = "deleted"
    elif not before_data:
        event_type = "created"
    else:
        event_type = "updated"
    
    # For updates, check if relevant fields changed
    if event_type == "updated":
        relevant_fields = ["name", "description", "status", "applicable_to", "amount", "agency_code"]
        changed_fields = []
        
        for field in relevant_fields:
            if before_data.get(field) != after_data.get(field):
                changed_fields.append(field)
        
        if not changed_fields:
            logger.info(
                f"[Firestore Trigger] No relevant fields changed for grant: {grant_id}",
                extra={"grant_id": grant_id}
            )
            return
        
        logger.info(
            f"[Firestore Trigger] Grant updated with relevant changes: {grant_id}",
            extra={
                "grant_id": grant_id,
                "changed_fields": changed_fields
            }
        )
    else:
        logger.info(
            f"[Firestore Trigger] Grant {event_type}: {grant_id}",
            extra={"grant_id": grant_id, "event_type": event_type}
        )
    
    try:
        # Initialize services
        db = get_firestore_client()
        service = get_matching_service()
        
        # Re-match ALL NPOs since grant landscape changed
        logger.info(
            f"[Firestore Trigger] Re-matching all NPOs due to grant change: {grant_id}",
            extra={"grant_id": grant_id, "event_type": event_type}
        )
        
        result = match_all_npos(
            db=db,
            service=service,
            trigger_source=f"firestore_grant_{event_type}"
        )
        
        logger.info(
            f"[Firestore Trigger] Batch re-matching complete",
            extra={
                "grant_id": grant_id,
                "processed": result["processed"],
                "failed": result["failed"]
            }
        )
            
    except ValueError as e:
        logger.error(
            f"[Firestore Trigger] Configuration error: {e}",
            extra={"grant_id": grant_id, "error": str(e)}
        )
        
    except Exception as e:
        logger.error(
            f"[Firestore Trigger] Error during batch re-matching",
            extra={"grant_id": grant_id, "error": str(e)},
            exc_info=True
        )
