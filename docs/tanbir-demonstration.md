# Member 3 Demonstration Guide – TANBIR RAFAT NABIL

**Branch Name:** `tanbir-ticket-comments`  
**Module:** Ticket Comments / Communication  
**Student Name:** TANBIR RAFAT NABIL  

---

## 1. Module Overview

This module enables interactive, two-way threaded communication between Clients seeking help and Support Staff / Administrators resolving complaints:
- Post comments on tickets with author attribution.
- Retrieve full chronological conversation threads.
- Individual comment lookup by UUID.
- Comment modification and removal with strict ownership rules (only author or Admin can modify/delete).
- Automatic authorization checks ensuring Clients can only participate in conversations on their own tickets.
- Support Staff and Administrators can comment across all active tickets to provide guidance and technical updates.

---

## 2. API Endpoints Owned by Member 3

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/tickets/:ticketId/comments` | Ticket Owner / Staff / Admin | Add comment or message to ticket |
| `GET` | `/api/v1/tickets/:ticketId/comments` | Ticket Owner / Staff / Admin | Get conversation history in chronological order |
| `GET` | `/api/v1/ticket-comments/:id` | Ticket Owner / Staff / Admin | Get individual comment details by UUID |
| `PATCH` | `/api/v1/ticket-comments/:id` | Author or Admin | Edit existing comment text |
| `DELETE` | `/api/v1/ticket-comments/:id` | Author or Admin | Delete comment from ticket conversation |

---

## 3. How to Run This Branch Independently

```bash
# 1. Switch to this branch
git checkout tanbir-ticket-comments

# 2. Install dependencies
pnpm install

# 3. Ensure database schema is migrated
pnpm run migration:run

# 4. Run automated module unit tests
pnpm test

# 5. Start the backend development server
pnpm run start:dev
```

Server URL: `http://localhost:3000/api/v1`  
Swagger UI: `http://localhost:3000/api/docs`

---

## 4. Step-by-Step Demonstration for Evaluators

### Step 1: Client Posts an Initial Comment on Their Ticket
**Request:**
```http
POST /api/v1/tickets/<TICKET_UUID>/comments
Authorization: Bearer <CLIENT_TOKEN>
Content-Type: application/json

{
  "content": "Hello Support Team, this issue started occurring immediately after the latest database upgrade this morning."
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "c1a2...-uuid",
    "ticketId": "<TICKET_UUID>",
    "authorId": "<CLIENT_UUID>",
    "content": "Hello Support Team, this issue started occurring immediately after the latest database upgrade this morning.",
    "createdAt": "2026-11-16T...",
    "author": {
      "id": "<CLIENT_UUID>",
      "name": "Sarah Connor",
      "email": "sarah.connor@client.com",
      "role": "CLIENT"
    }
  }
}
```

---

### Step 2: Staff Logs In and Posts a Technical Response
**Request:**
```http
POST /api/v1/tickets/<TICKET_UUID>/comments
Authorization: Bearer <STAFF_TOKEN>
Content-Type: application/json

{
  "content": "Thank you for the update Sarah. We are actively investigating connection pools on the DB proxy."
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "c2b3...-uuid",
    "ticketId": "<TICKET_UUID>",
    "authorId": "<STAFF_UUID>",
    "content": "Thank you for the update Sarah. We are actively investigating connection pools on the DB proxy.",
    "createdAt": "2026-11-16T...",
    "author": {
      "id": "<STAFF_UUID>",
      "name": "Alex Murphy",
      "email": "alex.murphy@helpdesk.com",
      "role": "STAFF"
    }
  }
}
```

---

### Step 3: Retrieve All Comments for the Ticket (Chronological Thread)
**Request:**
```http
GET /api/v1/tickets/<TICKET_UUID>/comments
Authorization: Bearer <CLIENT_TOKEN>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Comments retrieved successfully",
  "data": [
    {
      "id": "c1a2...-uuid",
      "content": "Hello Support Team, this issue started occurring immediately after the latest database upgrade this morning.",
      "createdAt": "2026-11-16T18:00:00Z",
      "author": {
        "name": "Sarah Connor",
        "role": "CLIENT"
      }
    },
    {
      "id": "c2b3...-uuid",
      "content": "Thank you for the update Sarah. We are actively investigating connection pools on the DB proxy.",
      "createdAt": "2026-11-16T18:05:00Z",
      "author": {
        "name": "Alex Murphy",
        "role": "STAFF"
      }
    }
  ]
}
```

---

### Step 4: Retrieve Individual Comment by UUID
**Request:**
```http
GET /api/v1/ticket-comments/c1a2...-uuid
Authorization: Bearer <CLIENT_TOKEN>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment retrieved successfully",
  "data": {
    "id": "c1a2...-uuid",
    "content": "Hello Support Team, this issue started occurring immediately after the latest database upgrade this morning.",
    "author": {
      "name": "Sarah Connor",
      "role": "CLIENT"
    }
  }
}
```

---

### Step 5: Author Updates Their Comment
**Request:**
```http
PATCH /api/v1/ticket-comments/c1a2...-uuid
Authorization: Bearer <CLIENT_TOKEN>
Content-Type: application/json

{
  "content": "Hello Support Team, this issue started occurring immediately after the v2.4 upgrade at 09:30 AM."
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": "c1a2...-uuid",
    "content": "Hello Support Team, this issue started occurring immediately after the v2.4 upgrade at 09:30 AM."
  }
}
```

---

### Step 6: Delete a Comment
**Request:**
```http
DELETE /api/v1/ticket-comments/c1a2...-uuid
Authorization: Bearer <CLIENT_TOKEN>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "data": {
    "id": "c1a2...-uuid"
  }
}
```

---

### Step 7: Demonstrate Access Restriction
A different Client attempts to post or read comments on this ticket:
```http
POST /api/v1/tickets/<TICKET_UUID>/comments
Authorization: Bearer <DIFFERENT_CLIENT_TOKEN>
Content-Type: application/json

{
  "content": "Can I read this conversation?"
}
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "You are not authorized to access or comment on this ticket",
  "statusCode": 403,
  "path": "/api/v1/tickets/<TICKET_UUID>/comments",
  "timestamp": "2026-11-16T..."
}
```
