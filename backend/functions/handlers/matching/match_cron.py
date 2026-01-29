"""
CRON trigger for scheduled daily grant matching.

Runs once per day to update all NPO-grant matches.
"""

import logging
from firebase_functions import scheduler_fn

from .utils import get_matching_service, get_firestore_client
from services.matching_service import match_all_npos

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@scheduler_fn.on_schedule(
    schedule="15 6 * * *",  # Run at 6:15 AM every day - 15 minutes after sync_grants_daily
    timezone=scheduler_fn.Timezone("Asia/Singapore"),  # Singapore timezone
    memory=512,  # MB - AI inference may need more memory
    timeout_sec=540,  # 9 minutes - batch processing may take time
    secrets=["OPENAI_API_KEY"]
)
def match_grants_daily(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Scheduled function to match all NPOs to grants daily.
    
    Runs at 6:15 AM Singapore time every day (15 minutes after grant sync).
    Updates all matches in the 'matches' collection.
    
    Args:
        event: Scheduler event containing execution metadata
    """
    logger.info(
        "[CRON Trigger] Daily grant matching started",
        extra={
            "scheduled_time": str(event.schedule_time),
            "job_name": event.job_name if hasattr(event, 'job_name') else "match_grants_daily"
        }
    )
    
    try:
        # Initialize services
        db = get_firestore_client()
        service = get_matching_service()
        
        # Match all NPOs
        result = match_all_npos(
            db=db,
            service=service,
            trigger_source="cron_daily"
        )
        
        logger.info(
            "[CRON Trigger] Daily grant matching completed",
            extra={
                "success": result["success"],
                "processed": result["processed"],
                "failed": result["failed"]
            }
        )
        
        if result["failed"] > 0:
            logger.warning(
                f"[CRON Trigger] {result['failed']} NPOs failed to match",
                extra={"failed_count": result["failed"]}
            )
            
    except ValueError as e:
        # Configuration error (e.g., missing API key)
        logger.error(
            f"[CRON Trigger] Configuration error: {e}",
            extra={"error": str(e)}
        )
        raise
        
    except Exception as e:
        logger.error(
            "[CRON Trigger] Unexpected error during daily matching",
            extra={"error": str(e)},
            exc_info=True
        )
        raise
