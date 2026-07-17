# Webcam Upload Fix — July 17, 2026

## Issue

`POST /api/videos/<id>/webcam-upload/` returned 500 with message "Failed to create recording entry."

## Root Cause

The `api_webcamrecording` table had three columns not defined in the Django `WebcamRecording` model:

| Column | Type | Constraint |
|---|---|---|
| `liveness_data` | TEXT | NOT NULL, CHECK(JSON_VALID) |
| `liveness_passed` | BOOL | NOT NULL |
| `liveness_score` | REAL | nullable |

When `objects.create()` inserted a new row, it omitted these columns, triggering `IntegrityError` on the `NOT NULL` constraints.

These columns were added to the database outside Django migrations (no migration file referenced them).

## Fix

1. Added the three fields to `WebcamRecording` model (`backend/api/models.py:433-435`):
   - `liveness_data = models.JSONField(default=dict, blank=True)`
   - `liveness_passed = models.BooleanField(default=False)`
   - `liveness_score = models.FloatField(null=True, blank=True)`

2. Generated migration `0017_add_liveness_fields_to_webcamrecording.py`.

3. Fake-applied on dev DB (`--fake`) since columns already exist in the production database. Test DB gets columns normally.

## Files Changed

- `backend/api/models.py` — added liveness fields to WebcamRecording
- `backend/api/migrations/0017_add_liveness_fields_to_webcamrecording.py` — new migration
