# Audit Implementation Plan — EngageAnalytics (h3cker)

**Date:** 2026-07-15  
**Scope:** Full-stack audit (backend Django, frontend React, infra/CI-CD)  
**Total findings:** ~80 issues (CRITICAL: 10, HIGH: 18, MEDIUM: 25, LOW: 27)

---

## Phase 0 — Critical Fixes (do first, deploy immediately)

### P0.1 — Fix `Promise.VideoService` runtime crash (`EditVideo.jsx:135`)
- **Severity:** CRITICAL — guaranteed crash
- **Issue:** `await Promise.VideoService.getVideoDetails(id)` → `Promise` is a built-in JS object, not an import
- **Fix:** Change `Promise.VideoService` → `VideoService`
- **File:** `frontend/src/components/Pages/Dashboard/Admin/EditVideo.jsx`

### P0.2 — Remove `window.location.reload()` in Profile.jsx
- **Issue:** Full page reload after profile save destroys SPA UX
- **Fix:** Call `fetchUserData()` instead of `window.location.reload()`
- **File:** `frontend/src/components/Pages/Profile/Profile.jsx:506`

### P0.3 — Add rate limiting to all API endpoints
- **Issue:** No throttling anywhere — brute-force, DoS, abuse possible
- **Fix:** Use DRF `DEFAULT_THROTTLE_CLASSES` + `DEFAULT_THROTTLE_RATES`; add `ratelimit` on auth/upload
- **Files:** `backend/backend/settings.py`, `backend/requirements.txt`

### P0.4 — Add Django production security settings
- **Issue:** No `SECURE_SSL_REDIRECT`, HSTS, secure cookies, etc.
- **Fix:** Conditional block in `settings.py` for `ENVIRONMENT == 'PROD'`
- **File:** `backend/backend/settings.py`

### P0.5 — Fix race condition in `WebcamUploadCompleteView`
- **Issue:** No lock between check and update — duplicate completion signals
- **Fix:** Use `select_for_update()` inside `mark_upload_complete`
- **Files:** `backend/api/views.py:618`, `backend/api/services/webcam_upload_service.py:139`

### P0.6 — Fix race condition in `toggle_like`
- **Issue:** `get_or_create` without `IntegrityError` handling
- **Fix:** Wrap in try/except `IntegrityError`
- **File:** `backend/api/services/video_like_service.py:25`

---

## Phase 1 — Security & Production Hardening

### P1.1 — Add Sentry error tracking
- **Issue:** No error monitoring — production errors are invisible
- **Fix:** Install `sentry-sdk`, add `SENTRY_DSN` env var, init in Django config
- **Files:** `backend/requirements.txt`, `backend/backend/settings.py`, `.env.example`

### P1.2 — Add file upload validation (size + type)
- **Issue:** No validation before generating Azure SAS URLs
- **Fix:** Add `Content-Length` and `Content-Type` checks before SAS generation
- **Files:** `backend/api/views.py:405` (UploadVideoView), Azure upload policy

### P1.3 — Harden Firebase initialization
- **Issue:** Firebase failure kills ALL auth silently
- **Fix:** Lazy-init Firebase, add health check for Firebase status
- **File:** `backend/backend/firebase.py`

### P1.4 — Add connection pooling + SSL enforcement for PostgreSQL
- **Issue:** No `CONN_MAX_AGE`, no explicit SSL, no timeout
- **Fix:** Set `CONN_MAX_AGE=300`, add `sslmode=require`, add `connect_timeout=10`
- **File:** `backend/backend/settings.py`

### P1.5 — Move SAS expiry to settings
- **Issue:** Hardcoded 60-day SAS view URL expiry
- **Fix:** Move to `settings.py` with safe defaults (1h upload, 48h view)
- **Files:** `backend/backend/settings.py`, `backend/api/services/azure_storage_service.py`

### P1.6 — Add `gunicorn` to requirements.txt
- **Issue:** Production WSGI server not listed as dependency
- **Fix:** Add `gunicorn==23.0.0`
- **File:** `backend/requirements.txt`

### P1.7 — Add `whitenoise` for static file serving
- **Issue:** Django admin has no static files in production
- **Fix:** Add `whitenoise`, configure `STATIC_ROOT` + `STATICFILES_STORAGE`
- **Files:** `backend/requirements.txt`, `backend/backend/settings.py`

### P1.8 — CORS restrict for non-PROD environments
- **Issue:** `CORS_ALLOW_ALL_ORIGINS = True` in TEST/LOCAL
- **Fix:** Use explicit `CORS_ALLOWED_ORIGINS` from env var
- **File:** `backend/backend/settings.py`

---

## Phase 2 — Backend Performance & Correctness

### P2.1 — Fix `EmotionFrame.bulk_create` batch size
- **Issue:** Single massive INSERT for 600+ frames
- **Fix:** Add `batch_size=100`
- **File:** `backend/api/services/emotion_analysis_service.py:140`

### P2.2 — Stream video downloads instead of loading into memory
- **Issue:** Entire video file loaded as `bytes` — OOM risk on free tier
- **Fix:** Use `BlobClient.download_blob().chunks()` to stream to temp file
- **File:** `backend/api/services/emotion_analysis_service.py:148`

### P2.3 — Remove duplicate business logic in `utils.py`
- **Issue:** `utils.py` duplicates `video_view_service.py` exactly
- **Fix:** Delete `utils.py`, migrate callers to `VideoViewService`
- **Files:** `backend/api/utils.py`, `backend/api/admin.py`, `backend/api/views.py`

### P2.4 — Fix `VideoFeedView` unbounded queryset when limit=0
- **Issue:** No pagination fallback → returns all rows
- **Fix:** Always apply a default minimum limit
- **File:** `backend/api/views.py:130`

### P2.5 — Add `select_related('uploader')` to remaining video fetches
- **Issue:** N+1 risk in `WebcamUploadView` + `RunEmotionAnalysisView`
- **Fix:** Add `select_related` where missing
- **Files:** `backend/api/views.py:463`, `backend/api/views.py:676`

### P2.6 — Extract `CacheService.invalidate_all()` method
- **Issue:** Same 4 invalidation calls repeated in 7 places
- **Fix:** Single method that invalidates all video-related caches
- **File:** `backend/api/services/cache_service.py`

### P2.7 — Add `select_for_update()` in emotion analysis `_claim_recordings`
- **Issue:** Race on recording claim between concurrent analysis runs
- **Fix:** Already has `select_for_update()` — verify correctness
- **File:** `backend/api/services/emotion_analysis_service.py:77`

### P2.8 — Add emotion field validators (0.0–1.0)
- **Issue:** No constraint that emotion probabilities are valid
- **Fix:** Add `MinValueValidator(0.0)` + `MaxValueValidator(1.0)`
- **File:** `backend/api/models.py:454-462`

---

## Phase 3 — Frontend Performance & Quality

### P3.1 — Remove unused npm dependencies
- **Run:** `npm uninstall @tensorflow/tfjs @cloudinary/react @cloudinary/url-gen js-cookie localforage match-sorter sort-by`
- **Impact:** Removes ~4.5MB from bundle (mostly TensorFlow.js)
- **File:** `frontend/package.json`

### P3.2 — Strip console.log in production build
- **Fix:** Add `drop_console: true` to Vite build config
- **File:** `frontend/vite.config.js`

### P3.3 — Add `React.memo` to list-item components
- **Priority targets:** `AdCard`, `FeatureCard`, dashboard table rows, grid items in `Video.jsx`
- **Impact:** Reduces unnecessary re-renders when parent state changes

### P3.4 — Add route-level code splitting
- **Fix:** Convert all route components to `React.lazy(() => import(...))` + `Suspense`
- **Priority:** `UploadVideo.jsx` (926 lines), `VideoDetail.jsx`, `DetailedAnalytics.jsx`
- **File:** `frontend/src/Routes/Routes/Routes.jsx`

### P3.5 — Add `AbortController` usage in `SearchBar.jsx`
- **Issue:** Stale search requests can overwrite newer results
- **Fix:** Call `ApiService.cancelRequest(endpoint)` before new searches
- **File:** `frontend/src/components/Shared/SearchBar/SearchBar.jsx`

### P3.6 — Fix `UserWatchHistory.jsx` unnecessary `.then(data => data)`
- **Fix:** Remove identity `.then()` passthrough
- **File:** `frontend/src/components/Pages/Dashboard/User/UserWatchHistory.jsx:27`

### P3.7 — Fix `UploadVideo.jsx` unnecessary `Promise.resolve()` wrappers
- **Fix:** Remove `Promise.resolve()` around already-async calls
- **File:** `frontend/src/components/Pages/Dashboard/Admin/UploadVideo.jsx:214`

### P3.8 — Convert `UserLikedVideo.jsx` `Promise.resolve()` wrapper
- **Fix:** Remove `Promise.resolve()` wrapper
- **File:** `frontend/src/components/Pages/Dashboard/User/UserLikedVideo.jsx:27`

---

## Phase 4 — Infrastructure & CI-CD

### P4.1 — Create `Procfile` for Render
- **Content:**
  ```
  web: gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
  release: python manage.py migrate --noinput
  ```

### P4.2 — Create `render.yaml` (Infrastructure as Code)
- **Content:** Web service definition, env vars, cron job, health check
- **Benefit:** Version-controlled Render configuration

### P4.3 — Add security scanning to CI
- **Steps:** `bandit` for Python, `npm audit` for JS, `trufflehog` for secrets
- **File:** `.github/workflows/deploy.yml`

### P4.4 — Add test parallelization with `pytest-xdist`
- **Benefit:** Faster CI (currently 77s sequential)
- **File:** `.github/workflows/deploy.yml`

### P4.5 — Add deploy validation + rollback
- **Check:** Health check after deploy, auto-rollback on failure
- **File:** `.github/workflows/deploy.yml`

### P4.6 — Merge SonarQube into deploy workflow
- **Issue:** Two workflows running same tests independently
- **Fix:** SonarQube step in deploy.yml, remove sonarqube.yml
- **Files:** `.github/workflows/deploy.yml`, `.github/workflows/sonarqube.yml`

### P4.7 — Replace `django-crontab` with `django-celery-beat`
- **Issue:** `django-crontab` unmaintained since 2020
- **Fix:** Migrate to Celery Beat for scheduled emotion analysis

### P4.8 — Add proper Python lock file
- **Fix:** Generate `requirements-lock.txt` via `pip freeze` for deterministic builds

---

## Phase 5 — Architecture Improvements

### P5.1 — Split `AuthProvider.jsx` (650+ lines)
- **Strategy:** Extract `useSessionMonitoring`, `useGoogleAuthCache`, `useAuthNavigation`
- **File:** `frontend/src/contexts/AuthProvider/AuthProvider.jsx`

### P5.2 — Split `WebcamRecorder.jsx` (48k+ chars)
- **Strategy:** Extract `services/WebcamUploadService.js`, `hooks/useFaceTracker.js`, `hooks/useMediaDevices.js`
- **File:** `frontend/src/components/Shared/VideoPlayer/WebcamRecorder.jsx`

### P5.3 — Add Error Boundary to App.jsx
- **Fix:** Create class-based `ErrorBoundary`, wrap `<App>` + dashboard `<Outlet>`
- **Files:** `frontend/src/components/common/ErrorBoundary/ErrorBoundary.jsx`, `frontend/src/App.jsx`

### P5.4 — Standardize `user` vs `viewer` naming in API
- **Issue:** `VideoLike.user` vs `VideoView.viewer` vs `EmotionFrame.viewer`
- **Fix:** Create migration to rename `VideoLike.user` → `viewer`

### P5.5 — Add Azure blob cleanup on cascade delete
- **Issue:** Deleting a user doesn't clean up their Azure blobs
- **Fix:** Add `post_delete` signal to `WebcamRecording` and `User`

### P5.6 — Replace hardcoded placeholder image URLs
- **Issue:** `/api/placeholder/300/169` — may not exist on backend
- **Fix:** Use data URI inline SVG or hosted fallback with `onError` handler

---

## Edge Cases & Non-Functional Requirements

### Duplicate UUIDs in emotion frames (already fixed in migration 0011)
### Empty states in all list views (verify handling)
### Network failure during emotion analysis (exponential backoff exists)
### Concurrent analysis runs (add lock to prevent overlap)
### HF API rate limit (100 req/min — implement queue/batch)
### Azure SAS URL expiration during long uploads
### Browser back button after login redirect (check auth state)
### Mobile toast/notification display (WebcamRecorder targets desktop)

---

## Effort Estimate

| Phase | Issues | Est. Effort |
|-------|--------|-------------|
| P0 — Critical | 6 | 1 day |
| P1 — Security | 8 | 2 days |
| P2 — Backend perf | 8 | 2 days |
| P3 — Frontend | 8 | 2 days |
| P4 — Infra | 8 | 1 day |
| P5 — Architecture | 6 | 3 days |
| **Total** | **44** | **~11 days** |
