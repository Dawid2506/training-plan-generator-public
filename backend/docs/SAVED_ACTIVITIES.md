# Saved Activities Implementation

## Overview

Backend implementation for persistent save/list/delete of Strava activities per authenticated user.

## Database Schema

### Migration

- **File**: `prisma/migrations/20260419173141_init/migration.sql`
- **Status**: Applied (non-destructive - added SavedActivity table only)

### Prisma Model

```prisma
model SavedActivity {
  id              String   @id @default(uuid())
  userId          String
  activityId      BigInt
  activityPayload Json
  savedAt         DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, activityId])
  @@index([userId])
  @@index([activityId])
}
```

**Key Features:**

- Unique constraint on `(userId, activityId)` prevents duplicate saves
- Cascade delete on user deletion
- BigInt for activityId (Strava uses large numeric IDs)
- JSONB storage for full activity payload

---

## API Endpoints

### 1. POST /api/strava/saved-activities

Save a Strava activity for the authenticated user.

**Request:**

```json
{
  "activity": {
    "id": 123,
    "name": "Morning Ride",
    "type": "Ride",
    "distance": 25000,
    "moving_time": 3600,
    "elapsed_time": 3900,
    "total_elevation_gain": 220,
    "average_speed": 6.9,
    "max_speed": 13.2,
    "average_heartrate": 150,
    "max_heartrate": 178,
    "start_date": "2026-04-18T08:30:00Z"
  }
}
```

**Response - Success (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "activityId": 123,
    "savedAt": "2026-04-19T10:00:00.000Z",
    "activity": {
      "id": 123,
      "name": "Morning Ride",
      "type": "Ride",
      "distance": 25000,
      "moving_time": 3600,
      "elapsed_time": 3900,
      "total_elevation_gain": 220,
      "average_speed": 6.9,
      "max_speed": 13.2,
      "average_heartrate": 150,
      "max_heartrate": 178,
      "start_date": "2026-04-18T08:30:00Z"
    }
  }
}
```

**Response - Duplicate (409):**

```json
{
  "success": true,
  "data": {
    "id": "existing-uuid",
    "activityId": 123,
    "savedAt": "2026-04-18T10:00:00.000Z",
    "activity": { ... }
  }
}
```

**Error Responses:**

- `400` - Invalid payload or validation error
- `401` - Unauthorized (unauthenticated)
- `500` - Server error

---

### 2. GET /api/strava/saved-activities

List all saved activities for the authenticated user, sorted by most recent.

**Request:**

```
GET /api/strava/saved-activities
```

**Response - Success (200):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "activityId": 123,
      "savedAt": "2026-04-19T10:00:00.000Z",
      "activity": {
        "id": 123,
        "name": "Morning Ride",
        "type": "Ride",
        "distance": 25000,
        "moving_time": 3600,
        "elapsed_time": 3900,
        "total_elevation_gain": 220,
        "average_speed": 6.9,
        "max_speed": 13.2,
        "average_heartrate": 150,
        "max_heartrate": 178,
        "start_date": "2026-04-18T08:30:00Z"
      }
    }
  ]
}
```

**Error Responses:**

- `401` - Unauthorized (unauthenticated)
- `500` - Server error

---

### 3. DELETE /api/strava/saved-activities/:activityId

Delete a saved activity for the authenticated user.

**Request:**

```
DELETE /api/strava/saved-activities/123
```

**Response - Success (204):**

```
(no body, status 204 No Content)
```

**Response - Not Found (404):**

```json
{
  "message": "Activity not found",
  "code": "NOT_FOUND"
}
```

**Error Responses:**

- `400` - Invalid activity ID (non-numeric or negative)
- `401` - Unauthorized (unauthenticated)
- `404` - Activity not found
- `500` - Server error

---

## Validation Rules

**Activity Payload:**

- `id` (number, required): Positive integer
- `name` (string, required): Non-empty
- `type` (string, required): Non-empty
- `distance` (number, required): Non-negative
- `moving_time` (number, required): Non-negative integer
- `elapsed_time` (number, required): Non-negative integer
- `total_elevation_gain` (number, required): Non-negative
- `average_speed` (number, required): Non-negative
- `max_speed` (number, required): Non-negative
- `average_heartrate` (number, optional): Non-negative if provided
- `max_heartrate` (number, optional): Non-negative if provided
- `start_date` (datetime, required): Valid ISO 8601 format

**Request Validation:**

- No `userId` accepted in request body (prevents cross-user attack)
- All numeric fields validated as numbers
- Date validated as ISO 8601 datetime

---

## Security

- **Authentication**: All endpoints require valid JWT token in cookies
- **Authorization**: Users can only access/modify their own saved activities
- **Data Isolation**: `userId` extracted from JWT token, never from request body
- **Input Validation**: Strict Zod schema validation on all inputs
- **SQL Injection**: Protected via Prisma ORM

---

## Files Modified/Created

| File                                                | Type     | Description                                    |
| --------------------------------------------------- | -------- | ---------------------------------------------- |
| `prisma/schema.prisma`                              | Modified | Added SavedActivity model and relation to User |
| `src/types/saved-activity.dto.ts`                   | Created  | DTOs for request/response types                |
| `src/utils/saved-activity.validation.ts`            | Created  | Zod validation schemas                         |
| `src/services/saved-activity.service.ts`            | Created  | Business logic layer                           |
| `src/controllers/saved-activity.controller.ts`      | Created  | HTTP request handlers                          |
| `src/routes/saved-activity.routes.ts`               | Created  | Route definitions                              |
| `src/routes/strava.routes.ts`                       | Modified | Added saved-activity subroutes                 |
| `src/services/saved-activity.service.test.ts`       | Created  | Service layer tests                            |
| `src/controllers/saved-activity.controller.test.ts` | Created  | Controller layer tests                         |

---

## Test Coverage

Tests verify:

- ✅ Save new activity (201 created)
- ✅ Duplicate save handling (409 conflict)
- ✅ List returns only current user data (200)
- ✅ Delete success (204 no content)
- ✅ Cannot delete another user's item (unauthorized operations blocked)
- ✅ Unauthorized blocked on all routes (401)
- ✅ Invalid payload validation (400)
- ✅ Invalid activity ID format (400)
- ✅ Not found error (404 on delete)

---

## Error Handling

All errors return structured JSON:

```json
{
  "message": "Human-readable error message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

Status codes:

- `201` - Activity saved successfully
- `200` - List retrieved successfully
- `204` - Activity deleted successfully
- `400` - Bad request (validation error)
- `401` - Unauthorized (not authenticated)
- `404` - Not found (activity doesn't exist or not owned by user)
- `409` - Conflict (duplicate save)
- `500` - Server error
