# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions.options import set_global_options
from firebase_admin import initialize_app

# For cost control, you can set the maximum number of containers that can be
# running at the same time. This helps mitigate the impact of unexpected
# traffic spikes by instead downgrading performance. This limit is a per-function
# limit. You can override the limit for each function using the max_instances
# parameter in the decorator, e.g. @https_fn.on_request(max_instances=5).
set_global_options(
    max_instances=10,           # Max concurrent instances for cost control
    region="asia-southeast1",   # Singapore region for low latency in SEA
    memory=256,                 # Memory per instance (MB) - adjust based on needs
    timeout_sec=60,             # Function timeout in seconds
    min_instances=0,            # Scale to zero when not in use (cost-effective)
)

initialize_app()

# Import handlers
from handlers.healthcheck import healthcheck
from handlers.send_email import send_hello_world_email
from handlers.sync_grants import sync_grants_daily, sync_grants_manual
from handlers.send_grant_emails import send_weekly_grant_emails, send_grant_emails_manual

# Import matching handlers (AI-powered grant matching)
from handlers.matching.match_cron import match_grants_daily
from handlers.matching.match_http import match_grants_manual
from handlers.matching.match_firestore import on_npo_change, on_grant_change
from handlers.matching.get_matches import get_matches

# Import grants handlers
from handlers.grants.get_grant import get_grant
from handlers.grants.search_grants import search_grants

# Import NPO handlers
from handlers.npo.create_npo import create_npo
from handlers.npo.get_npo import get_npo
from handlers.npo.update_npo import update_npo
from handlers.npo.login_npo import login_npo
from handlers.npo.deactivate_npo import deactivate_npo

# Import saved grants handlers
from handlers.saved_grants.save_grant import save_grant
from handlers.saved_grants.unsave_grant import unsave_grant
from handlers.saved_grants.get_saved_grants import get_saved_grants

# Import AI handlers (Gemini-powered features)
from handlers.ai.chat_refine import chat_refine
from handlers.ai.chat import ai_chat
