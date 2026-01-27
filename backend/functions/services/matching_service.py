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
        description="Top 3 most relevant grants for the NPO, sorted by similarity score descending",
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
        return f"""
NPO Name: {npo_data.get('name', 'Unknown')}
Sector: {npo_data.get('sector', 'Not specified')}
Description: {npo_data.get('description', 'No description provided')}
Beneficiaries: {', '.join(npo_data.get('beneficiaries', [])) or 'Not specified'}
Budget: ${npo_data.get('budget', 'Not specified')}
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
            grant_text = f"""
Grant ID: {grant.get('id', 'Unknown')}
Name: {grant.get('name', 'Unknown')}
Agency: {grant.get('agency_code', 'Unknown')}
Status: {grant.get('status', 'Unknown')}
Description: {grant.get('description', 'No description')}
Applicable To: {', '.join(grant.get('applicable_to', [])) or 'All'}
Amount: {grant.get('amount', 'Varies')}
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
        
        if not grants:
            logger.warning(f"[AI Inference] No grants available for matching NPO: {npo_id}")
            return MatchingResult(matches=[])
        
        # Build context for the prompt
        npo_context = self._build_npo_context(npo_data)
        grants_context = self._build_grants_context(grants)
        
        system_prompt = """You are an expert grant matching assistant for non-profit organisations (NPOs).

Your task is to analyze an NPO's profile and match them with the most relevant grants based on:
1. Sector alignment - Does the grant target the NPO's sector?
2. Beneficiary match - Do the grant's target beneficiaries align with the NPO's?
3. Mission alignment - Does the grant's purpose align with the NPO's description and goals?
4. Budget fit - Is the grant amount reasonable for the NPO's scale?

Provide exactly 3 matches (or fewer if not enough relevant grants exist).
Score each match from 0-100 where:
- 90-100: Excellent match, highly recommended
- 70-89: Good match, worth applying
- 50-69: Moderate match, consider if no better options
- Below 50: Poor match, not recommended

Be objective and provide clear reasoning for each match."""

        user_prompt = f"""Please match the following NPO to the most relevant grants:

=== NPO PROFILE ===
{npo_context}

=== AVAILABLE GRANTS ===
{grants_context}

Analyze and return the top 3 most relevant grants with similarity scores and reasoning."""

        try:
            logger.info(
                f"[AI Inference] Sending request to OpenAI",
                extra={
                    "model": self.MODEL,
                    "npo_id": npo_id,
                    "prompt_length": len(user_prompt)
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
                temperature=0.3  # Lower temperature for more consistent results
            )
            
            end_time = datetime.now(timezone.utc)
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            result = completion.choices[0].message.parsed
            
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
                f"[AI Inference] Error during OpenAI API call",
                extra={
                    "npo_id": npo_id,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return None


# ============================================================================
# Firestore Operations
# ============================================================================

def get_all_grants(db: firestore.Client) -> list[dict]:
    """
    Retrieve all active grants from Firestore.
    
    Args:
        db: Firestore client
        
    Returns:
        List of grant documents as dictionaries
    """
    logger.info("[Firestore] Fetching all grants")
    
    grants = []
    grants_ref = db.collection("grants")
    
    # Only get grants that are open/active
    docs = grants_ref.where("status", "==", "Open").stream()
    
    for doc in docs:
        grant_data = doc.to_dict()
        grant_data["id"] = doc.id
        grants.append(grant_data)
    
    logger.info(f"[Firestore] Retrieved {len(grants)} active grants")
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
    if not grants:
        logger.warning(f"[Matching] No grants available for matching")
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
    if not grants:
        logger.warning(f"[Matching] No grants available for matching")
        return {"success": False, "error": "No grants available", "processed": 0}
    
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
                results["failed"] += 1
                results["npo_results"].append({
                    "npo_id": npo_id,
                    "status": "failed",
                    "error": "AI inference failed"
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
