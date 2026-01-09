# EkoInk API Integration Specification

**Version:** 1.0
**Last Updated:** November 20, 2025
**Purpose:** Enable CRM systems to automatically generate handwritten thank you notes when deals close

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works (Plain English)](#how-it-works-plain-english)
3. [Integration Flow](#integration-flow)
4. [Authentication](#authentication)
5. [API Endpoints](#api-endpoints)
6. [Request/Response Schemas](#requestresponse-schemas)
7. [Rep Mapping System](#rep-mapping-system)
8. [Error Handling](#error-handling)
9. [Code Examples](#code-examples)
10. [Webhooks (Optional)](#webhooks-optional)
11. [Rate Limits & Billing](#rate-limits--billing)

---

## Overview

The EkoInk API allows your CRM/sales system to **automatically trigger handwritten thank you notes** when deals are marked as closed/won.

**Event-driven workflow:**
1. Deal marked "Closed-Won" in your CRM
2. Your system sends deal data to EkoInk API
3. EkoInk automatically:
   - Transcribes the sales call (if needed)
   - Generates a personalized AI note based on the conversation
   - Sends it as a physical handwritten card via Handwrite.io
4. Your system receives the note ID and can track status

**No manual intervention required** - notes are generated and sent automatically.

---

## How It Works (Plain English)

### What happens when a deal closes:

**In Your CRM:**
1. Sales rep closes a deal
2. Your system has:
   - Deal ID (your unique identifier)
   - Rep ID (your unique identifier for the sales rep)
   - Customer contact info (name, address)
   - Call recording URL or transcript

**Your CRM triggers EkoInk:**
```
POST /api/v1/notes/from-call
{
  "external_deal_id": "DEAL-12345",
  "external_rep_id": "REP-789",
  "customer": {
    "first_name": "John",
    "last_name": "Smith",
    "company": "Acme Corp",
    "address": {
      "street1": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94105"
    }
  },
  "call_recording_url": "https://your-crm.com/calls/12345.mp3"
}
```

**EkoInk processes automatically:**
1. Maps `external_rep_id: "REP-789"` → Internal EkoInk rep profile
2. Downloads and transcribes the call recording
3. Generates AI note based on:
   - Call transcript content
   - Rep's writing style preferences
   - Customer context
4. Validates note length (≤320 characters for handwriting)
5. Sends to Handwrite.io for physical card creation
6. Returns note ID and status

**Your CRM receives response:**
```json
{
  "note_id": "note_abc123",
  "status": "processing",
  "external_deal_id": "DEAL-12345",
  "estimated_delivery": "2025-11-27T00:00:00Z",
  "message": "Note generated and sent to handwriting service"
}
```

**Track progress:**
```
GET /api/v1/notes/note_abc123

Response:
{
  "note_id": "note_abc123",
  "status": "sent",
  "handwriteio_order_id": "HW-XYZ789",
  "tracking_number": "9400111899223344556677",
  "estimated_delivery": "2025-11-27T00:00:00Z"
}
```

---

## Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ YOUR CRM SYSTEM                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Deal marked "Closed-Won"                                       │
│     ├── Deal ID: DEAL-12345                                        │
│     ├── Rep ID: REP-789                                            │
│     ├── Customer: John Smith @ Acme Corp                           │
│     └── Call Recording: https://crm.com/calls/12345.mp3           │
│                                                                     │
│  2. Trigger webhook → POST /api/v1/notes/from-call                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ EKOINK API                                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  3. Receive deal data + call recording                             │
│                                                                     │
│  4. Map external_rep_id → Internal rep profile                    │
│     └── Lookup: "REP-789" maps to user_id "uuid-456"              │
│         (with style preferences, signature, etc.)                  │
│                                                                     │
│  5. Process call recording                                         │
│     ├── Download MP3 from provided URL                            │
│     ├── Send to AssemblyAI for transcription                      │
│     └── Extract key talking points                                │
│                                                                     │
│  6. Generate AI note                                               │
│     ├── Input: Transcript + Rep style + Customer context          │
│     ├── Claude AI generates personalized note                     │
│     ├── Validate length ≤320 characters                           │
│     └── Format for handwriting                                    │
│                                                                     │
│  7. Send to Handwrite.io                                           │
│     ├── Customer address from deal data                           │
│     ├── Generated note text                                       │
│     ├── Rep's handwriting style preference                        │
│     └── Return order ID + tracking number                         │
│                                                                     │
│  8. Return response to CRM                                         │
│     └── { note_id, status, tracking_number }                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ YOUR CRM SYSTEM                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  9. Store note_id in deal record                                   │
│                                                                     │
│  10. (Optional) Poll status:                                       │
│      GET /api/v1/notes/{note_id}                                   │
│      └── "processing" → "sent" → "delivered"                       │
│                                                                     │
│  11. (Optional) Receive webhook when delivered                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Authentication

All API requests require Bearer token authentication.

### API Key Format
```
ekoink_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Key components:**
- `ekoink_` - EkoInk key prefix
- `live_` - Environment (live vs test)
- Random alphanumeric string (32 chars)

### How to authenticate:

**Header:**
```
Authorization: Bearer YOUR_API_KEY_HERE
```

**Full request example:**
```bash
curl -X POST https://ekoink.com/api/v1/notes/from-call \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Scopes

API keys have permission scopes:
- `deals:read` - Read deal information
- `deals:write` - Create deals
- `notes:read` - Read note status
- `notes:write` - Create and send notes
- `reps:write` - Create/update rep mappings

**Standard integration scope:**
```json
["deals:write", "notes:read", "notes:write", "reps:write"]
```

---

## API Endpoints

### 1. Create Rep Mapping

Map your CRM's rep IDs to EkoInk rep profiles.

**Endpoint:** `POST /api/v1/reps`

**Purpose:** Tell EkoInk which internal rep profile to use for each of your sales reps.

**Request:**
```json
{
  "external_rep_id": "REP-789",
  "ekoink_user_id": "uuid-456-from-ekoink",
  "metadata": {
    "crm_name": "Jane Doe",
    "crm_email": "jane@company.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "mapping": {
    "external_rep_id": "REP-789",
    "ekoink_user_id": "uuid-456-from-ekoink",
    "created_at": "2025-11-20T10:00:00Z"
  }
}
```

**When to use:**
- During initial setup (map all your reps once)
- When new sales reps join
- When rep leaves (to reassign deals)

---

### 2. Generate Note from Call (Main Endpoint)

Automatically generate and send a handwritten note when a deal closes.

**Endpoint:** `POST /api/v1/notes/from-call`

**Purpose:** The main integration endpoint. Call this when a deal is marked "Closed-Won".

**Request:**
```json
{
  "external_deal_id": "DEAL-12345",
  "external_rep_id": "REP-789",
  "customer": {
    "first_name": "John",
    "last_name": "Smith",
    "company": "Acme Corp",
    "email": "john@acmecorp.com",
    "phone": "+1-555-123-4567",
    "address": {
      "street1": "123 Main St",
      "street2": "Suite 400",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94105"
    }
  },
  "call_recording_url": "https://your-crm.com/api/calls/12345.mp3",
  "call_transcript": null,
  "deal_metadata": {
    "deal_value": 50000,
    "product": "Enterprise Plan",
    "close_date": "2025-11-20"
  }
}
```

**Field descriptions:**
- `external_deal_id` (required) - Your unique deal identifier
- `external_rep_id` (required) - Your rep ID (must be mapped first)
- `customer` (required) - Complete customer contact info
- `call_recording_url` (optional) - URL to download MP3/WAV recording
- `call_transcript` (optional) - Provide transcript if already available
- `deal_metadata` (optional) - Additional context for note generation

**Response (Success):**
```json
{
  "note_id": "note_abc123",
  "status": "processing",
  "external_deal_id": "DEAL-12345",
  "message": "Note generation started",
  "estimated_delivery": "2025-11-27T00:00:00Z",
  "billing": {
    "cost_cents": 1000,
    "description": "1 handwritten card @ $10.00"
  }
}
```

**Response (Error):**
```json
{
  "error": "rep_not_mapped",
  "message": "No EkoInk rep found for external_rep_id: REP-789",
  "suggestion": "Create rep mapping via POST /api/v1/reps first"
}
```

---

### 3. Get Note Status

Check the status of a note (generation, sending, delivery).

**Endpoint:** `GET /api/v1/notes/{note_id}`

**Purpose:** Track note progress from generation → handwriting → delivery.

**Request:**
```bash
GET /api/v1/notes/note_abc123
```

**Response:**
```json
{
  "note_id": "note_abc123",
  "external_deal_id": "DEAL-12345",
  "status": "sent",
  "generated_text": "Hi John, Thanks so much for choosing Acme...",
  "character_count": 285,
  "handwriteio_order_id": "HW-XYZ789",
  "tracking_number": "9400111899223344556677",
  "estimated_delivery": "2025-11-27T00:00:00Z",
  "created_at": "2025-11-20T10:00:00Z",
  "sent_at": "2025-11-20T10:05:00Z",
  "delivered_at": null
}
```

**Status values:**
- `processing` - AI is generating the note
- `generated` - Note created, waiting to send
- `sent` - Sent to Handwrite.io
- `delivered` - USPS confirmed delivery
- `failed` - Error occurred (see error field)

---

### 4. Query Notes by Deal ID

Get all notes associated with a specific deal.

**Endpoint:** `GET /api/v1/notes?external_deal_id={deal_id}`

**Purpose:** Useful if you send multiple notes per deal or need to reconcile records.

**Request:**
```bash
GET /api/v1/notes?external_deal_id=DEAL-12345
```

**Response:**
```json
{
  "notes": [
    {
      "note_id": "note_abc123",
      "external_deal_id": "DEAL-12345",
      "status": "sent",
      "created_at": "2025-11-20T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### 5. Get Account Usage

Track your monthly API usage and billing.

**Endpoint:** `GET /api/v1/account/usage`

**Purpose:** Monitor how many notes sent this month and current bill.

**Request:**
```bash
GET /api/v1/account/usage
```

**Response:**
```json
{
  "month": "2025-11",
  "notes_sent": 47,
  "api_calls": 153,
  "amount_owed_cents": 47000,
  "billing_type": "monthly_api",
  "invoice_status": "pending",
  "next_invoice_date": "2025-12-01"
}
```

---

## Request/Response Schemas

### Customer Object
```typescript
{
  first_name: string;        // Required
  last_name: string;         // Required
  company?: string;          // Optional
  email?: string;            // Optional
  phone?: string;            // Optional
  address: {                 // Required for physical card
    street1: string;         // Required
    street2?: string;        // Optional (suite/apt)
    city: string;            // Required
    state: string;           // Required (2-letter: "CA", "NY")
    zip: string;             // Required (5 digits: "94105")
  }
}
```

### Note Status Object
```typescript
{
  note_id: string;
  external_deal_id: string;
  status: "processing" | "generated" | "sent" | "delivered" | "failed";
  generated_text?: string;
  character_count?: number;
  handwriteio_order_id?: string;
  tracking_number?: string;
  estimated_delivery?: string;  // ISO 8601 timestamp
  error?: string;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
}
```

---

## Rep Mapping System

### Why rep mapping is needed:

Your CRM has rep IDs like `REP-789`. EkoInk needs to know:
- Which EkoInk user this maps to
- That user's writing style preferences
- Their signature/sign-off preferences

### Setup process:

**Option 1: Pre-populate mappings** (recommended)
```bash
# Map all your reps during initial integration
POST /api/v1/reps
{
  "external_rep_id": "REP-789",
  "ekoink_user_id": "uuid-456-from-ekoink"
}

POST /api/v1/reps
{
  "external_rep_id": "REP-790",
  "ekoink_user_id": "uuid-457-from-ekoink"
}
# ... etc
```

**Option 2: Just-in-time mapping**

If `external_rep_id` is not mapped when you call `/notes/from-call`, EkoInk will:
1. Return an error with `rep_not_mapped`
2. You create the mapping
3. Retry the note generation

### Getting EkoInk user IDs:

During onboarding, EkoInk will provide a CSV with:
```
external_rep_id,ekoink_user_id,name,email
REP-789,uuid-456-from-ekoink,Jane Doe,jane@company.com
REP-790,uuid-457-from-ekoink,John Smith,john@company.com
```

Or query via API:
```bash
GET /api/v1/reps

Response:
{
  "mappings": [
    {
      "external_rep_id": "REP-789",
      "ekoink_user_id": "uuid-456-from-ekoink",
      "name": "Jane Doe"
    }
  ]
}
```

---

## Error Handling

### Error Response Format
```json
{
  "error": "error_code",
  "message": "Human-readable description",
  "details": {},
  "suggestion": "How to fix this"
}
```

### Common Error Codes

| Code | HTTP Status | Meaning | Solution |
|------|-------------|---------|----------|
| `invalid_api_key` | 401 | API key not found or revoked | Check key is correct |
| `insufficient_scope` | 403 | Key lacks required permission | Request key with `notes:write` scope |
| `rep_not_mapped` | 400 | No mapping for `external_rep_id` | Create mapping via `POST /api/v1/reps` |
| `invalid_address` | 400 | Missing required address fields | Ensure all address fields present |
| `transcription_failed` | 500 | AssemblyAI couldn't process call | Check recording URL is accessible |
| `note_too_long` | 400 | Generated note >320 characters | Reduce call length or context |
| `rate_limit_exceeded` | 429 | Too many requests | Wait 60 seconds, retry |
| `handwriteio_error` | 500 | Handwrite.io service issue | Contact EkoInk support |

### Example error handling (JavaScript):

```javascript
try {
  const response = await fetch('https://ekoink.com/api/v1/notes/from-call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dealData)
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle specific errors
    if (data.error === 'rep_not_mapped') {
      // Create rep mapping first
      await createRepMapping(dealData.external_rep_id);
      // Retry
      return generateNote(dealData);
    }

    throw new Error(`EkoInk API error: ${data.message}`);
  }

  return data;
} catch (error) {
  console.error('Failed to generate note:', error);
  // Log to your error tracking system
}
```

---

## Code Examples

### JavaScript / Node.js

```javascript
const EKOINK_API_KEY = 'sk_live_your_api_key_here';
const EKOINK_BASE_URL = 'https://ekoink.com/api/v1';

async function sendDealToEkoInk(deal) {
  const response = await fetch(`${EKOINK_BASE_URL}/notes/from-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EKOINK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_deal_id: deal.id,
      external_rep_id: deal.rep_id,
      customer: {
        first_name: deal.customer.first_name,
        last_name: deal.customer.last_name,
        company: deal.customer.company,
        address: {
          street1: deal.customer.address.street1,
          city: deal.customer.address.city,
          state: deal.customer.address.state,
          zip: deal.customer.address.zip
        }
      },
      call_recording_url: deal.call_recording_url
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`EkoInk error: ${data.message}`);
  }

  console.log(`Note created: ${data.note_id}`);
  return data.note_id;
}

// Usage in your CRM webhook:
app.post('/webhooks/deal-closed', async (req, res) => {
  const deal = req.body;

  if (deal.status === 'closed_won') {
    try {
      const noteId = await sendDealToEkoInk(deal);

      // Store note_id in your database
      await db.deals.update(deal.id, { ekoink_note_id: noteId });

      res.json({ success: true });
    } catch (error) {
      console.error('EkoInk integration failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
});
```

### Python

```python
import requests

EKOINK_API_KEY = 'sk_live_your_api_key_here'
EKOINK_BASE_URL = 'https://ekoink.com/api/v1'

def send_deal_to_ekoink(deal):
    headers = {
        'Authorization': f'Bearer {EKOINK_API_KEY}',
        'Content-Type': 'application/json'
    }

    payload = {
        'external_deal_id': deal['id'],
        'external_rep_id': deal['rep_id'],
        'customer': {
            'first_name': deal['customer']['first_name'],
            'last_name': deal['customer']['last_name'],
            'company': deal['customer'].get('company'),
            'address': {
                'street1': deal['customer']['address']['street1'],
                'city': deal['customer']['address']['city'],
                'state': deal['customer']['address']['state'],
                'zip': deal['customer']['address']['zip']
            }
        },
        'call_recording_url': deal['call_recording_url']
    }

    response = requests.post(
        f'{EKOINK_BASE_URL}/notes/from-call',
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        raise Exception(f"EkoInk API error: {response.json()['message']}")

    data = response.json()
    print(f"Note created: {data['note_id']}")
    return data['note_id']

# Usage in your CRM webhook handler:
@app.route('/webhooks/deal-closed', methods=['POST'])
def handle_deal_closed():
    deal = request.json

    if deal['status'] == 'closed_won':
        try:
            note_id = send_deal_to_ekoink(deal)

            # Store note_id in your database
            db.update_deal(deal['id'], ekoink_note_id=note_id)

            return {'success': True}
        except Exception as e:
            print(f'EkoInk integration failed: {e}')
            return {'error': str(e)}, 500
```

### cURL

```bash
# Create a note from a closed deal
curl -X POST https://ekoink.com/api/v1/notes/from-call \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "external_deal_id": "DEAL-12345",
    "external_rep_id": "REP-789",
    "customer": {
      "first_name": "John",
      "last_name": "Smith",
      "company": "Acme Corp",
      "address": {
        "street1": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip": "94105"
      }
    },
    "call_recording_url": "https://your-crm.com/calls/12345.mp3"
  }'

# Check note status
curl -X GET https://ekoink.com/api/v1/notes/note_abc123 \
  -H "Authorization: Bearer sk_live_your_api_key_here"

# Get monthly usage
curl -X GET https://ekoink.com/api/v1/account/usage \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

---

## Webhooks (Optional)

EkoInk can notify your system when note status changes.

### Setup

Configure webhook URL in your EkoInk dashboard settings:
```
https://your-crm.com/webhooks/ekoink
```

### Events

**`note.generated`** - AI finished writing the note
```json
{
  "event": "note.generated",
  "timestamp": "2025-11-20T10:05:00Z",
  "data": {
    "note_id": "note_abc123",
    "external_deal_id": "DEAL-12345",
    "generated_text": "Hi John, Thanks so much...",
    "character_count": 285
  }
}
```

**`note.sent`** - Sent to Handwrite.io
```json
{
  "event": "note.sent",
  "timestamp": "2025-11-20T10:10:00Z",
  "data": {
    "note_id": "note_abc123",
    "external_deal_id": "DEAL-12345",
    "handwriteio_order_id": "HW-XYZ789",
    "tracking_number": "9400111899223344556677"
  }
}
```

**`note.delivered`** - USPS confirmed delivery
```json
{
  "event": "note.delivered",
  "timestamp": "2025-11-27T14:30:00Z",
  "data": {
    "note_id": "note_abc123",
    "external_deal_id": "DEAL-12345",
    "delivered_at": "2025-11-27T14:30:00Z"
  }
}
```

### Security

Webhooks are signed with HMAC-SHA256. Verify signature:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

app.post('/webhooks/ekoink', (req, res) => {
  const signature = req.headers['x-ekoink-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'note.delivered') {
    // Update deal in your CRM
    db.deals.update(event.data.external_deal_id, {
      note_delivered: true,
      delivered_at: event.data.delivered_at
    });
  }

  res.json({ received: true });
});
```

---

## Rate Limits & Billing

### Rate Limits

**60 requests per minute** per API key.

Headers in every response:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1637424000
```

**429 Too Many Requests** response:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Retry after 30 seconds.",
  "retry_after": 30
}
```

### Billing

**$10.00 per card sent** (charged monthly in arrears)

**Billable event:** When `POST /api/v1/notes/from-call` results in a physical card being sent.

**Monthly invoice:**
- Generated on 1st of each month
- Charged to saved payment method
- Includes usage breakdown (deal IDs, dates, amounts)

**Track usage:**
```bash
GET /api/v1/account/usage

Response:
{
  "month": "2025-11",
  "notes_sent": 47,
  "amount_owed_cents": 47000,  # $470.00
  "next_invoice_date": "2025-12-01"
}
```

**Payment methods:**
- Managed in EkoInk dashboard settings
- Credit card via Stripe
- ACH available for >$1000/month

---

## Support

**Documentation:** https://docs.ekoink.com/api
**Support Email:** api-support@ekoink.com
**Status Page:** https://status.ekoink.com

**Integration help:**
- Slack channel (provided during onboarding)
- Weekly office hours: Tuesdays 2-3pm PT
- Dedicated Slack support for >100 notes/month

---

## Changelog

### v1.0 (2025-11-20)
- Initial API specification
- Event-driven note generation
- Rep mapping system
- Webhook support
