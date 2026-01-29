"""
Grant search and filter API endpoint.

Provides comprehensive search, filtering, and pagination for grants.
"""

from firebase_functions import https_fn
from firebase_admin import firestore
import json
from typing import Optional


def get_cors_headers():
    """Return CORS headers for cross-origin requests."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }


@https_fn.on_request()
def search_grants(req: https_fn.Request) -> https_fn.Response:
    """
    Search and filter grants with pagination.
    
    Query Parameters:
    - q: Full-text search query (searches name and description)
    - sector: Filter by sector (e.g., "Arts & Heritage", "Social & Community")
    - status: Filter by status (e.g., "Open", "Closed")
    - min_amount: Minimum grant amount
    - max_amount: Maximum grant amount
    - applicable_to: Filter by organization type
    - agency_code: Filter by agency
    - page: Page number (default: 1)
    - limit: Results per page (default: 10, max: 50)
    - sort_by: Sort field (default: "name")
    - sort_order: Sort order "asc" or "desc" (default: "asc")
    
    Returns:
        JSON with grants array, pagination info, and filter metadata
    """
    # Handle CORS preflight
    if req.method == "OPTIONS":
        return https_fn.Response(
            status=204,
            headers=get_cors_headers()
        )
    
    # Only allow GET requests
    if req.method != "GET":
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers={**get_cors_headers(), "Content-Type": "application/json"}
        )
    
    try:
        # Parse query parameters
        args = req.args
        search_query = args.get('q', '').strip()
        sector = args.get('sector', '').strip()
        status = args.get('status', '').strip()
        min_amount = args.get('min_amount')
        max_amount = args.get('max_amount')
        applicable_to = args.get('applicable_to', '').strip()
        agency_code = args.get('agency_code', '').strip()
        
        # Pagination parameters
        page = int(args.get('page', 1))
        limit = min(int(args.get('limit', 10)), 50)  # Max 50 per page
        
        # Sorting parameters
        sort_by = args.get('sort_by', 'name')
        sort_order = args.get('sort_order', 'asc')
        
        # Validate pagination
        if page < 1:
            page = 1
        if limit < 1:
            limit = 10
        
        # Get Firestore client
        db = firestore.client()
        grants_ref = db.collection("grants")
        
        # Start building query
        query = grants_ref
        
        # Apply filters
        if status:
            query = query.where("status", "==", status)
        
        if agency_code:
            query = query.where("agency_code", "==", agency_code)
        
        # Note: Firestore has limitations with complex queries
        # For full-text search and multiple filters, we fetch and filter in memory
        
        # Apply sorting
        if sort_by in ['name', 'status', 'agency_code']:
            direction = firestore.Query.ASCENDING if sort_order == 'asc' else firestore.Query.DESCENDING
            query = query.order_by(sort_by, direction=direction)
        
        # Execute query
        all_grants = []
        docs = query.stream()
        
        for doc in docs:
            grant_data = doc.to_dict()
            grant_data['id'] = doc.id
            all_grants.append(grant_data)
        
        # Apply in-memory filters (for fields that don't work well with Firestore queries)
        filtered_grants = all_grants
        
        # Full-text search on name and description
        if search_query:
            search_lower = search_query.lower()
            filtered_grants = [
                g for g in filtered_grants
                if search_lower in g.get('name', '').lower() or 
                   search_lower in g.get('description', '').lower()
            ]
        
        # Filter by sector
        if sector:
            filtered_grants = [
                g for g in filtered_grants
                if g.get('sector') == sector
            ]
        
        # Filter by applicable_to
        if applicable_to:
            filtered_grants = [
                g for g in filtered_grants
                if applicable_to in g.get('applicable_to', [])
            ]
        
        # Filter by amount range
        if min_amount:
            try:
                min_val = float(min_amount)
                filtered_grants = [
                    g for g in filtered_grants
                    if _parse_amount(g.get('amount')) >= min_val
                ]
            except ValueError:
                pass
        
        if max_amount:
            try:
                max_val = float(max_amount)
                filtered_grants = [
                    g for g in filtered_grants
                    if _parse_amount(g.get('amount')) <= max_val
                ]
            except ValueError:
                pass
        
        # Calculate pagination
        total_results = len(filtered_grants)
        total_pages = (total_results + limit - 1) // limit
        
        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_grants = filtered_grants[start_idx:end_idx]
        
        # Build response
        response_data = {
            "grants": paginated_grants,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_results": total_results,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            },
            "filters": {
                "q": search_query,
                "sector": sector,
                "status": status,
                "min_amount": min_amount,
                "max_amount": max_amount,
                "applicable_to": applicable_to,
                "agency_code": agency_code
            }
        }
        
        return https_fn.Response(
            json.dumps(response_data),
            status=200,
            headers={**get_cors_headers(), "Content-Type": "application/json"}
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers={**get_cors_headers(), "Content-Type": "application/json"}
        )


def _parse_amount(amount_str: Optional[str]) -> float:
    """
    Parse amount string to float for comparison.
    Handles formats like "$10,000", "Up to $50,000", "Varies", etc.
    
    Returns 0 if amount cannot be parsed.
    """
    if not amount_str or not isinstance(amount_str, str):
        return 0.0
    
    # Remove common currency symbols and commas
    cleaned = amount_str.replace('$', '').replace(',', '').replace('SGD', '').strip()
    
    # Handle ranges - take the maximum value
    if ' to ' in cleaned.lower():
        parts = cleaned.lower().split(' to ')
        try:
            return float(parts[1].strip())
        except (ValueError, IndexError):
            pass
    
    # Handle "Up to" prefix
    if cleaned.lower().startswith('up to'):
        cleaned = cleaned[5:].strip()
    
    # Try to parse as float
    try:
        return float(cleaned)
    except ValueError:
        return 0.0
