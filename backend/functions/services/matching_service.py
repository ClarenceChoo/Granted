"""
AI-powered grant matching service using OpenAI API.

This service matches NPOs to relevant grants based on their descriptions,
sectors, beneficiaries, and other criteria using OpenAI's structured outputs.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional
from openai import OpenAI
from pydantic import BaseModel, Field
from firebase_admin import firestore
from google.cloud.firestore import SERVER_TIMESTAMP

# Configure logging for AI inference
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# ============================================================================
# Pydantic Models for OpenAI Structured Output
# ============================================================================

class GrantMatch(BaseModel):
    """Represents a single grant match with similarity score."""
    grant_id: str = Field(description="The unique identifier of the matched grant")
    similarity_score: int = Field(
        ge=0, le=100,
        description="Similarity score between 0-100 indicating relevance"
    )
    reasoning: str = Field(
        description="Brief explanation of why this grant matches the NPO"
    )


class MatchingResult(BaseModel):
    """Structured output from OpenAI for grant matching."""
    matches: list[GrantMatch] = Field(
        description="Exactly 3 most relevant grants for the NPO, sorted by similarity score descending",
        min_length=3,
        max_length=3
    )


# ============================================================================
# AI Matching Service
# ============================================================================

class GrantMatchingService:
    """
    Service for matching NPOs to relevant grants using OpenAI.
    
    Uses structured outputs to ensure consistent, parseable responses
    with similarity scores and reasoning.
    """
    
    MODEL = "gpt-4o-2024-08-06"  # Model that supports structured outputs
    
    def __init__(self, api_key: str):
        """
        Initialize the matching service.
        
        Args:
            api_key: OpenAI API key
        """
        self.client = OpenAI(api_key=api_key)
        logger.info("GrantMatchingService initialized with OpenAI client")
    
    def _build_npo_context(self, npo_data: dict) -> str:
        """
        Build a context string describing the NPO.
        
        Args:
            npo_data: NPO document data from Firestore
            
        Returns:
            Formatted string describing the NPO
        """
        # Extract and format beneficiaries
        beneficiaries = npo_data.get('beneficiaries', [])
        beneficiaries_str = ', '.join(beneficiaries) if beneficiaries else 'Not specified'
        
        # Extract and format budget
        budget = npo_data.get('budget')
        budget_str = f"${budget:,.0f}" if budget and isinstance(budget, (int, float)) else 'Not specified'
        
        return f"""
NPO Name: {npo_data.get('name', 'Unknown')}
Sector: {npo_data.get('sector', 'Not specified')}
Description: {npo_data.get('description', 'No description provided')}
Beneficiaries: {beneficiaries_str}
Budget: {budget_str}
Location: {npo_data.get('location', 'Not specified')}
Size: {npo_data.get('size', 'Not specified')}
        """.strip()
    
    def _build_grants_context(self, grants: list[dict]) -> str:
        """
        Build a context string describing available grants.
        
        Args:
            grants: List of grant documents from Firestore
            
        Returns:
            Formatted string describing all grants
        """
        grants_text = []
        for grant in grants:
            # Format applicable_to
            applicable_to = grant.get('applicable_to', [])
            applicable_to_str = ', '.join(applicable_to) if applicable_to else 'All organizations'
            
            # Format amount/budget
            amount = grant.get('amount', 'Varies')
            
            # Format closing dates
            closing_dates = grant.get('closingDates', {})
            closing_info = []
            if closing_dates:
                if closing_dates.get('nextApplicationDate'):
                    closing_info.append(f"Next Application: {closing_dates.get('nextApplicationDate')}")
                if closing_dates.get('closingDate'):
                    closing_info.append(f"Closes: {closing_dates.get('closingDate')}")
            closing_str = ' | '.join(closing_info) if closing_info else 'Rolling basis'
            
            grant_text = f"""
Grant ID: {grant.get('id', 'Unknown')}
Name: {grant.get('name', 'Unknown')}
Agency: {grant.get('agency_code', 'Unknown')}
Status: {grant.get('status', 'Unknown')}
Description: {grant.get('description', 'No description')}
Applicable To: {applicable_to_str}
Amount: {amount}
Dates: {closing_str}
            """.strip()
            grants_text.append(grant_text)
        
        return "\n\n---\n\n".join(grants_text)
    
    def match_npo_to_grants(
        self, 
        npo_data: dict, 
        grants: list[dict]
    ) -> Optional[MatchingResult]:
        """
        Match an NPO to the most relevant grants using OpenAI.
        
        Args:
            npo_data: NPO document data from Firestore
            grants: List of available grant documents
            
        Returns:
            MatchingResult with top 3 matches, or None if error
        """
        npo_id = npo_data.get('uid', 'unknown')
        
        logger.info(
            f"[AI Inference] Starting grant matching for NPO: {npo_id}",
            extra={
                "npo_id": npo_id,
                "npo_name": npo_data.get('name'),
                "num_grants": len(grants)
            }
        )
        
        if len(grants) < 3:
            logger.error(
                f"[AI Inference] Insufficient grants for matching NPO: {npo_id}. Need at least 3, got {len(grants)}"
            )
            return None
        
        # Build context for the prompt
        npo_context = self._build_npo_context(npo_data)
        grants_context = self._build_grants_context(grants)
        
        system_prompt = """You are an expert grant matching assistant for non-profit organisations (NPOs) in Singapore.

Your task is to analyze an NPO's profile and match them with the most relevant grants. You MUST be STRICT and REALISTIC in your scoring.

SCORING CRITERIA (weighted importance):
1. Sector alignment (30%) - Does the grant explicitly target the NPO's sector?
2. Beneficiary match (25%) - Do the grant's target beneficiaries align with the NPO's?
3. Eligibility (20%) - Does the NPO meet "Applicable To" requirements?
4. Mission alignment (15%) - Does the grant's purpose align with the NPO's description?
5. Budget fit (10%) - Is the grant amount appropriate for the NPO's scale?

STRICT SCORING GUIDELINES - BE CONSERVATIVE:
- 95-100: PERFECT match - ALL criteria align strongly, almost certain eligibility
- 85-94: EXCELLENT match - 4/5 criteria align strongly, very high confidence
- 75-84: STRONG match - 3/5 criteria align well, good confidence
- 65-74: GOOD match - 2-3/5 criteria align, worth considering
- 55-64: MODERATE match - Some alignment but notable gaps
- 45-54: WEAK match - Limited alignment, borderline relevance
- 35-44: POOR match - Minimal alignment, likely not suitable
- Below 35: VERY POOR match - No clear alignment

IMPORTANT RULES:
1. You MUST provide exactly 3 matches, no more and no fewer
2. BE STRICT - Most matches should score 60-85, not 90+
3. Only give 90+ scores when there is EXCEPTIONAL alignment across ALL criteria
4. If "Applicable To" excludes the NPO, score MUST be below 50
5. "Open" status adds +5 bonus, but doesn't override poor fit
6. Provide SPECIFIC reasoning citing which criteria match/don't match

Be objective, conservative, and evidence-based. Users trust your scores for decision-making."""

        user_prompt = f"""Please match the following NPO to the most relevant grants:

=== NPO PROFILE ===
{npo_context}

=== AVAILABLE GRANTS ===
{grants_context}

Analyze and return EXACTLY 3 grants ranked by relevance. You must provide 3 matches with similarity scores and reasoning, even if some are less relevant than others."""

        try:
            logger.info(
                f"[AI Inference] Sending request to OpenAI",
                extra={
                    "model": self.MODEL,
                    "npo_id": npo_id,
                    "prompt_length": len(user_prompt),
                    "system_prompt_length": len(system_prompt)
                }
            )
            
            start_time = datetime.now(timezone.utc)
            
            # Use structured outputs with Pydantic model
            completion = self.client.beta.chat.completions.parse(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format=MatchingResult,
                temperature=0.1  # Very low temperature for consistent, conservative scoring
            )
            
            end_time = datetime.now(timezone.utc)
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            result = completion.choices[0].message.parsed
            
            # Validate result
            if not result or not result.matches:
                logger.error(
                    f"[AI Inference] Empty or invalid response from OpenAI",
                    extra={"npo_id": npo_id}
                )
                return None
            
            logger.info(
                f"[AI Inference] Successfully received response from OpenAI",
                extra={
                    "npo_id": npo_id,
                    "duration_ms": duration_ms,
                    "num_matches": len(result.matches),
                    "model": self.MODEL,
                    "usage": {
                        "prompt_tokens": completion.usage.prompt_tokens,
                        "completion_tokens": completion.usage.completion_tokens,
                        "total_tokens": completion.usage.total_tokens
                    }
                }
            )
            
            # Log individual matches
            for i, match in enumerate(result.matches):
                logger.info(
                    f"[AI Inference] Match {i+1}: {match.grant_id} (score: {match.similarity_score}%)",
                    extra={
                        "npo_id": npo_id,
                        "match_rank": i + 1,
                        "grant_id": match.grant_id,
                        "similarity_score": match.similarity_score,
                        "reasoning": match.reasoning[:100]  # Truncate for log
                    }
                )
            
            return result
            
        except Exception as e:
            logger.error(
                f"[AI Inference] Error during OpenAI API call: {str(e)}",
                extra={
                    "npo_id": npo_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "num_grants": len(grants),
                    "prompt_length": len(user_prompt)
                },
                exc_info=True
            )
            return None


# ============================================================================
# Firestore Operations
# ============================================================================

def get_all_grants(db: firestore.Client) -> list[dict]:
    """
    Retrieve all grants from Firestore.
    
    Args:
        db: Firestore client
        
    Returns:
        List of grant documents as dictionaries
    """
    logger.info("[Firestore] Fetching all grants")
    
    grants = []
    grants_ref = db.collection("grants")
    
    # Get ALL grants (no status filter - AI will evaluate relevance)
    docs = grants_ref.stream()
    
    for doc in docs:
        grant_data = doc.to_dict()
        grant_data["id"] = doc.id
        grants.append(grant_data)
    
    logger.info(f"[Firestore] Retrieved {len(grants)} grants (all statuses)")
    return grants


def get_all_npos(db: firestore.Client) -> list[dict]:
    """
    Retrieve all NPOs from Firestore.
    
    Args:
        db: Firestore client
        
    Returns:
        List of NPO documents as dictionaries
    """
    logger.info("[Firestore] Fetching all NPOs")
    
    npos = []
    npos_ref = db.collection("npos")
    docs = npos_ref.stream()
    
    for doc in docs:
        npo_data = doc.to_dict()
        npo_data["uid"] = doc.id
        npos.append(npo_data)
    
    logger.info(f"[Firestore] Retrieved {len(npos)} NPOs")
    return npos


def get_npo_by_id(db: firestore.Client, npo_id: str) -> Optional[dict]:
    """
    Retrieve a single NPO by ID.
    
    Args:
        db: Firestore client
        npo_id: NPO document ID
        
    Returns:
        NPO document as dictionary, or None if not found
    """
    doc = db.collection("npos").document(npo_id).get()
    if doc.exists:
        npo_data = doc.to_dict()
        npo_data["uid"] = doc.id
        return npo_data
    return None


def save_matches(
    db: firestore.Client, 
    npo_id: str, 
    matches: MatchingResult,
    trigger_source: str
) -> str:
    """
    Save matching results to Firestore.
    
    Args:
        db: Firestore client
        npo_id: NPO document ID
        matches: MatchingResult from AI inference
        trigger_source: What triggered this match (http, cron, firestore_npo, firestore_grant)
        
    Returns:
        Document ID of the saved match
    """
    logger.info(
        f"[Firestore] Saving matches for NPO: {npo_id}",
        extra={"npo_id": npo_id, "trigger_source": trigger_source}
    )
    
    # Use NPO ID as document ID for easy lookup/updates
    match_ref = db.collection("matches").document(npo_id)
    
    match_data = {
        "npo_id": npo_id,
        "matches": [
            {
                "grant_id": m.grant_id,
                "similarity_score": m.similarity_score,
                "reasoning": m.reasoning
            }
            for m in matches.matches
        ],
        "trigger_source": trigger_source,
        "updated_at": SERVER_TIMESTAMP,
        "created_at": SERVER_TIMESTAMP
    }
    
    # Use set with merge to update if exists
    match_ref.set(match_data, merge=True)
    
    logger.info(
        f"[Firestore] Saved {len(matches.matches)} matches for NPO: {npo_id}",
        extra={
            "npo_id": npo_id,
            "document_id": match_ref.id,
            "num_matches": len(matches.matches)
        }
    )
    
    return match_ref.id


# ============================================================================
# Main Matching Functions
# ============================================================================

def match_single_npo(
    db: firestore.Client,
    service: GrantMatchingService,
    npo_id: str,
    trigger_source: str
) -> Optional[dict]:
    """
    Match a single NPO to grants and save results.
    
    Args:
        db: Firestore client
        service: GrantMatchingService instance
        npo_id: NPO document ID
        trigger_source: What triggered this match
        
    Returns:
        Match result dictionary, or None if error
    """
    logger.info(
        f"[Matching] Starting match for single NPO: {npo_id}",
        extra={"npo_id": npo_id, "trigger_source": trigger_source}
    )
    
    # Get NPO data
    npo_data = get_npo_by_id(db, npo_id)
    if not npo_data:
        logger.error(f"[Matching] NPO not found: {npo_id}")
        return None
    
    # Get all grants
    grants = get_all_grants(db)
    if len(grants) < 3:
        logger.error(f"[Matching] Insufficient grants for matching. Need at least 3, got {len(grants)}")
        return None
    
    # Run AI matching
    result = service.match_npo_to_grants(npo_data, grants)
    if not result:
        return None
    
    # Save to Firestore
    save_matches(db, npo_id, result, trigger_source)
    
    return {
        "npo_id": npo_id,
        "matches": [m.model_dump() for m in result.matches]
    }


def match_all_npos(
    db: firestore.Client,
    service: GrantMatchingService,
    trigger_source: str
) -> dict:
    """
    Match all NPOs to grants and save results.
    
    Args:
        db: Firestore client
        service: GrantMatchingService instance
        trigger_source: What triggered this match
        
    Returns:
        Summary of matching results
    """
    logger.info(
        f"[Matching] Starting batch match for all NPOs",
        extra={"trigger_source": trigger_source}
    )
    
    # Get all grants first (shared across all NPOs)
    grants = get_all_grants(db)
    if len(grants) < 3:
        logger.error(f"[Matching] Insufficient grants for matching. Need at least 3, got {len(grants)}")
        return {"success": False, "error": f"Need at least 3 grants, found {len(grants)}", "processed": 0, "failed": 0}
    
    # Get all NPOs
    npos = get_all_npos(db)
    if not npos:
        logger.warning(f"[Matching] No NPOs found")
        return {"success": False, "error": "No NPOs found", "processed": 0}
    
    results = {
        "success": True,
        "processed": 0,
        "failed": 0,
        "npo_results": []
    }
    
    for npo_data in npos:
        npo_id = npo_data.get("uid")
        if not isinstance(npo_id, str) or not npo_id:
            logger.error(
                f"[Matching] Invalid or missing NPO ID in data: {npo_data}",
                extra={"npo_data": npo_data}
            )
            results["failed"] += 1
            results["npo_results"].append({
                "npo_id": npo_id,
                "status": "failed",
                "error": "Invalid or missing NPO ID"
            })
            continue
        
        try:
            # Run AI matching
            result = service.match_npo_to_grants(npo_data, grants)
            
            if result:
                save_matches(db, npo_id, result, trigger_source)
                results["processed"] += 1
                results["npo_results"].append({
                    "npo_id": npo_id,
                    "status": "success",
                    "num_matches": len(result.matches)
                })
            else:
                logger.error(
                    f"[Matching] AI inference returned None for NPO: {npo_id}",
                    extra={"npo_id": npo_id, "npo_name": npo_data.get('name')}
                )
                results["failed"] += 1
                results["npo_results"].append({
                    "npo_id": npo_id,
                    "status": "failed",
                    "error": "AI inference failed - check logs for details"
                })
                
        except Exception as e:
            logger.error(
                f"[Matching] Error processing NPO: {npo_id}",
                extra={"npo_id": npo_id, "error": str(e)},
                exc_info=True
            )
            results["failed"] += 1
            results["npo_results"].append({
                "npo_id": npo_id,
                "status": "failed",
                "error": str(e)
            })
    
    logger.info(
        f"[Matching] Batch matching complete",
        extra={
            "trigger_source": trigger_source,
            "processed": results["processed"],
            "failed": results["failed"],
            "total_npos": len(npos)
        }
    )
    
    return results
