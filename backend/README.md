# Granted Backend

AI-powered grant matching platform for non-profit organisations (NPOs) in Singapore.

## High-Level Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Client)      │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────────────────────────┐
│          Firebase Cloud Functions (Python)              │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   NPO API    │  │  Grant API   │  │  AI Matching │ │
│  │              │  │              │  │   Service    │ │
│  │ • Create     │  │ • Sync       │  │              │ │
│  │ • Update     │  │ • Save       │  │ • HTTP       │ │
│  │ • Get        │  │ • Unsave     │  │ • CRON       │ │
│  │ • Login      │  │ • Get Saved  │  │ • Firestore  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Firebase Services                          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Firestore   │  │  Firebase    │  │   Secret     │ │
│  │  Database    │  │    Auth      │  │   Manager    │ │
│  │              │  │              │  │              │ │
│  │ • npos       │  │ • Email/Pass │  │ • API Keys   │ │
│  │ • grants     │  │ • JWT Tokens │  │ • Secrets    │ │
│  │ • matches    │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │   OpenAI     │
                  │   GPT-4o     │
                  │              │
                  │ Structured   │
                  │   Outputs    │
                  └──────────────┘
```

## Tech Stack

- **Runtime**: Python 3.13, Firebase Functions (2nd Gen)
- **Database**: Cloud Firestore (NoSQL)
- **Authentication**: Firebase Auth (Email/Password)
- **AI/ML**: OpenAI GPT-4o-2024-08-06 (Structured Outputs)
- **Secrets**: Google Cloud Secret Manager
- **Region**: asia-southeast1 (Singapore)

## Core Components

### 1. NPO Management (`/handlers/npo`)
- **create_npo**: Register new NPO with Firebase Auth
- **update_npo**: Update NPO profile
- **get_npo**: Retrieve NPO details
- **login_npo**: Authenticate and return JWT tokens

### 2. Grant Management (`/handlers`)
- **sync_grants_daily**: CRON job to sync grants (daily 6AM SGT)
- **sync_grants_manual**: HTTP trigger for manual grant sync
- **save_grant**: Add grant to NPO's saved list (max 5)
- **unsave_grant**: Remove grant from saved list
- **get_saved_grants**: Retrieve NPO's saved grants

### 3. AI Matching Service (`/services/matching_service.py`)
**Triggers:**
- **match_grants_manual**: HTTP POST endpoint
- **match_grants_daily**: CRON (daily 6AM SGT)
- **on_npo_change**: Firestore trigger (NPO updates)
- **on_grant_change**: Firestore trigger (Grant updates)

**Process:**
1. Fetch all grants from Firestore
2. Build context for NPO profile and grants
3. Send to OpenAI GPT-4o with structured output schema
4. AI returns exactly 3 ranked matches (0-100 score + reasoning)
5. Save matches to `matches` collection

## Data Models

### NPO Collection
```
npos/{uid}
├── uid: string (Firebase Auth UID)
├── email: string
├── name: string
├── uen: string (Unique Entity Number)
├── sector: string
├── description: string
├── beneficiaries: string[]
├── budget: number
├── saved_grants: string[] (max 5)
├── created_at: timestamp
└── updated_at: timestamp
```

### Grants Collection
```
grants/{id}
├── id: string (auto-generated)
├── name: string
├── agency_code: string
├── status: string (Open/Closed)
├── description: string
├── applicable_to: string[]
└── amount: string
```

### Matches Collection
```
matches/{npo_id}
├── npo_id: string
├── matches: array
│   ├── grant_id: string
│   ├── similarity_score: number (0-100)
│   └── reasoning: string
├── trigger_source: string
├── created_at: timestamp
└── updated_at: timestamp
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/create_npo` | POST | Create NPO account |
| `/update_npo` | PUT | Update NPO profile |
| `/get_npo` | GET | Get NPO by UID |
| `/login_npo` | POST | Login and get JWT token |
| `/save_grant` | POST | Save grant to NPO |
| `/unsave_grant` | DELETE | Remove saved grant |
| `/get_saved_grants` | GET | Get NPO's saved grants |
| `/sync_grants_manual` | POST | Manual grant sync |
| `/match_grants_manual` | POST | Trigger AI matching |

## Secrets Configuration

Managed via Firebase Secret Manager:
- `WEB_API_KEY`: Firebase Web API key for authentication
- `OPENAI_API_KEY`: OpenAI API key for grant matching

## Deployment

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:match_grants_manual
```

## Key Features

✅ **Email/Password Authentication** with JWT tokens  
✅ **AI-Powered Grant Matching** using OpenAI structured outputs  
✅ **Automated Matching** via CRON jobs and Firestore triggers  
✅ **Comprehensive Logging** for AI inference and debugging  
✅ **Secrets Management** via Google Cloud Secret Manager  
✅ **CORS Support** for cross-origin requests  
✅ **Validation & Error Handling** with detailed error messages

## Architecture Highlights

- **Serverless**: Scales automatically with Firebase Functions
- **AI-First**: OpenAI GPT-4o evaluates ALL grants for relevance
- **Event-Driven**: Firestore triggers auto-update matches on data changes
- **Stateless**: Each function call is independent
- **Secure**: Secrets in Secret Manager, no hardcoded credentials
- **Observable**: Structured logging with contextual metadata
