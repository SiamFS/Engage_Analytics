# EngageAnalytics — Full Codebase Optimization Audit

**Date:** 2026-07-20  
**Scope:** Frontend (React 18 + Vite) + Backend (Django 5 + DRF)  
**Hosting:** Render free tier (0.1 CPU, 512MB RAM)  
**Key Concern:** Slow initial load times and request latency

---

## Critical Issues

### C1. `VideoEmotionRecordingsView` — Prefetch invalidated by `.order_by()`, N+1 per recording
**File:** `backend/api/views.py:735–741`  
**Problem:**
```python
recordings = WebcamRecording.objects.filter(
    video=video
).prefetch_related("emotion_frames").order_by("-recording_date")

for recording in recordings:
    frames = list(recording.emotion_frames.all().order_by("t_seconds"))  # KILLS prefetch
```
Calling `.order_by("t_seconds")` inside the loop modifies the queryset, invalidating the prefetch cache. Django re-fires a fresh query for every single recording. With 50 recordings, that's 50 extra queries. On 0.1 CPU, this can cause timeouts.

**Fix:**
```python
from django.db.models import Prefetch
recordings = WebcamRecording.objects.filter(video=video).prefetch_related(
    Prefetch("emotion_frames", queryset=EmotionFrame.objects.order_by("t_seconds"))
).order_by("-recording_date")

for recording in recordings:
    frames = list(recording.emotion_frames.all())  # No .order_by() — uses prefetch
```

---

### C2. `VideoEmotionSummaryView` — 5 separate COUNT queries instead of 1 aggregate
**File:** `backend/api/views.py:697–710`  
**Problem:**
```python
total_recordings = WebcamRecording.objects.filter(video=video).count()
completed_recordings = WebcamRecording.objects.filter(video=video, upload_status="completed").count()
failed_recordings = WebcamRecording.objects.filter(video=video, analysis_status="failed").count()
no_faces_recordings = WebcamRecording.objects.filter(video=video, analysis_status="completed").exclude(emotion_frames__isnull=True).count()
no_faces_recordings = WebcamRecording.objects.filter(video=video, analysis_status="completed").count() - no_faces_recordings
```
5 separate round-trips to the DB (~250ms+ cumulative on free tier).

**Fix:**
```python
from django.db.models import Count, Q
stats = WebcamRecording.objects.filter(video=video).aggregate(
    total=Count("id"),
    completed=Count("id", filter=Q(upload_status="completed")),
    failed=Count("id", filter=Q(analysis_status="failed")),
    completed_with_frames=Count("id", filter=Q(analysis_status="completed", emotion_frames__isnull=False)),
)
no_faces = (stats["completed"] or 0) - (stats["completed_with_frames"] or 0)
```

---

### C3. `AdRow.jsx` — Missing `X` icon import causes runtime crash
**File:** `frontend/src/components/Shared/AdRow/AdRow.jsx:68`  
**Problem:** `<X size={18} />` is rendered on line 68 but `X` is never imported from `lucide-react`. When a user clicks "Watch Now" on an AdRow card, the entire React tree crashes with `ReferenceError: X is not defined`.

**Fix:** Add `import { X } from 'lucide-react';` alongside the existing imports.

---

## High Severity Issues

### H1. `VideoDetailSerializer.get_is_liked` — N+1 in every list view that uses this serializer
**File:** `backend/api/serializers.py:165–169`  
**Problem:** `VideoDetailSerializer` is used in `UserHistoryAPI` and `UserLikedVideosAPI`. For each video in the response, `get_is_liked` fires a separate `VideoLike.objects.filter(...).exists()` query. With 50 videos, that's 50 extra EXISTS queries.

**Fix:** Annotate liked status in the view and pass via context:
```python
# In view:
liked_ids = set(VideoLike.objects.filter(user=user, video_id__in=video_ids)
               .values_list("video_id", flat=True))
serializer_context["liked_video_ids"] = liked_ids

# In serializer:
def get_is_liked(self, obj):
    return obj.id in self.context.get("liked_video_ids", set())
```

---

### H2. `UserHistoryAPI` / `UserLikedVideosAPI` — Ordering lost after `filter(id__in=...)`
**File:** `backend/api/views.py:348–364`, `backend/api/views.py:380–400`  
**Problem:** Both views sort by `-last_viewed` / `-liked_at` to get ordered video IDs, then do `Video.objects.select_related("uploader").filter(id__in=viewed_video_ids)[:limit]`. The `filter(id__in=...)` subquery **loses ordering** — Django returns videos sorted by the model's default ordering (`-upload_date`), not by the user's watch/like time. This is a correctness bug: watch history shows videos sorted by upload date, not by when the user last watched them.

**Fix:** Use `in_bulk()` to preserve ordering:
```python
video_ids = list(viewed_video_ids[:limit+offset])
vids_map = Video.objects.select_related("uploader").in_bulk(video_ids[offset:offset+limit])
ordered = [vids_map[v_id] for v_id in video_ids[offset:offset+limit] if v_id in vids_map]
```

---

### H3. `VideoDetailView.get_video_by_id` — Missing `select_related("uploader")`
**File:** `backend/api/views.py:144–146`  
**Problem:**
```python
def get_video_by_id(self, video_id):
    return get_object_or_404(Video, id=int(video_id))
```
Every video detail request causes an extra query to fetch `uploader`. This is the single most-called endpoint in the app.

**Fix:**
```python
return get_object_or_404(Video.objects.select_related("uploader"), id=int(video_id))
```

---

### H4. `VideoPlayer` — All 10 event listeners re-register on every callback identity change
**File:** `frontend/src/components/Shared/VideoPlayer/VideoPlayer.jsx:130`  
**Problem:** The main effect depends on `[videoUrl, autoPlay, onEnded, onPlay]`. When the parent passes inline arrow functions or `useCallback` references that change identity (which `VideoDetail` does at line 578 when `viewRecorded` changes after 2 seconds), ALL 10 event listeners (`timeupdate`, `play`, `pause`, etc.) detach and re-attach. The `timeupdate` listener fires ~60x/sec during playback — re-registering it mid-playback causes dropped frames and GC pressure.

**Fix:** Use refs for callbacks, mirroring the pattern already used for `isPlayingRef`:
```javascript
const onEndedRef = useRef(onEnded);
onEndedRef.current = onEnded;
const onPlayRef = useRef(onPlay);
onPlayRef.current = onPlay;
// Effect depends only on [videoUrl]
// Handlers call onPlayRef.current()
```

---

### H5. `getVideoDetails` — Full video feed download to find 4 related videos
**File:** `frontend/src/components/Shared/VideoPlayer/VideoDetail.jsx:287–328`  
**Problem:** On every video detail page load, fetches the ENTIRE public video feed (potentially 200+ videos), then filters client-side by category/uploader, sorts, and takes top 4. On slow connections, the sidebar stays empty until the full payload downloads.

**Fix:** Create a lightweight backend endpoint: `GET /video/{id}/related/?limit=4` that does the filtering server-side and returns only the 4 results.

---

### H6. `AuthProvider` — Redundant token refresh on every page load fires twice
**File:** `frontend/src/contexts/AuthProvider/AuthProvider.jsx:494–525`  
**Problem:** Two separate effects fire on mount: (1) the `onAuthStateChanged` listener calls `processAuthenticatedUser` → `getIdToken(true)`, and (2) a "force check on initial load" effect also calls `getIdToken(true)`. This is a redundant ~200–500ms of Firebase network round-trip on every cold page load.

**Fix:** Remove the "force check" effect (lines 494–525). The `onAuthStateChanged` handler already does this. Keep only the `popstate` handler.

---

### H7. `AuthProvider` `useMemo` value — ALL context consumers re-render on every `user` change
**File:** `frontend/src/contexts/AuthProvider/AuthProvider.jsx:536–555`  
**Problem:** The context value is memoized with `[user, loading, ...]`. When `user` changes (which happens on every auth state change, profile update, etc.), `checkSession` and `extendSession` are recreated (they depend on `user`), causing the entire context value to change. This triggers re-renders in ALL 20+ components consuming `AuthContext` (Navbar, all dashboard pages, all route guards, VideoDetail).

**Fix:** Split into two contexts: `UserContext` (user object) and `AuthActionsContext` (login/logout/extend). Consumers that only need actions won't re-render when `user` updates.

---

### H8. `vite.config.js` — `console.error` stripped in production
**File:** `frontend/vite.config.js:16`  
**Problem:** `drop: ['console', 'debugger']` strips ALL `console.*` calls, including `console.error`. Runtime errors in production are silently lost — error boundaries, catch blocks, and debugging become impossible.

**Fix:** Change to:
```javascript
drop: ['console.log', 'console.debug', 'console.info', 'console.warn', 'debugger'],
```

---

## Medium Severity Issues

### M1. `User.role` — Missing database index
**File:** `backend/api/models.py:56`  
**Problem:** `role` field filtered in nearly every view (`role="admin"`, `role="company"`). No `db_index=True`, so every role-based query does a full table scan.  
**Fix:** Add `db_index=True`. Requires migration.

---

### M2. `Video.likes` — Missing index on frequently sorted column
**File:** `backend/api/models.py:145`  
**Problem:** Used in `order_by("-likes")` in `VideoStatsView` and `get_preference_based_videos`. No index = filesort (full scan + sort in memory).  
**Fix:** Add `db_index=True`. Requires migration.

---

### M3. `VideoLike` — Missing index for user-only queries
**File:** `backend/api/models.py:362–374`  
**Problem:** `unique_together = ("video", "user")` creates index `(video, user)`. But `UserLikedVideosAPI` queries `VideoLike.objects.filter(user=user).order_by("-liked_at")` — the composite index cannot serve `user`-only queries efficiently. Full table scan on every liked videos load.  
**Fix:** Add `models.Index(fields=["user", "-liked_at"])` to `Meta.indexes`. Requires migration.

---

### M4. `VideoView` — Missing standalone index on `viewer`
**File:** `backend/api/models.py:342–356`  
**Problem:** Index exists on `["video", "viewer"]`, but `UserHistoryAPI` and `get_preference_based_videos` query by `viewer` only. Composite index can't serve viewer-only queries — PostgreSQL falls back to sequential scan.  
**Fix:** Add `models.Index(fields=["viewer", "-viewed_at"])` to `Meta.indexes`. Requires migration.

---

### M5. `WebcamRecording` — Missing composite index on `(video, upload_status)`
**File:** `backend/api/models.py:436–443`  
**Problem:** `VideoEmotionSummaryView` filters by `video=X, upload_status="completed"`. No dedicated index — PostgreSQL uses bitmap index scan merging two single-column indexes (FK auto-index on `video` + the `upload_status` index).  
**Fix:** Add `models.Index(fields=["video", "upload_status"])`. Requires migration.

---

### M6. `check_video_privacy` — Per-video Python loop instead of single UPDATE
**File:** `backend/api/management/commands/check_video_privacy.py:30–34`  
**Problem:** Iterates all videos with view limits set, does Python comparison per video, then individual `save()` UPDATE per matched video. For 1000 limited videos, that's up to 1000 separate UPDATE statements.  
**Fix:**
```python
updated = Video.objects.filter(
    view_limit__isnull=False, view_limit__gt=0,
    views__gte=F("view_limit"),
    visibility__in=["public", "unlisted"]
).update(visibility="private")
```

---

### M7. `CacheService._get_registry` / `_save_registry` — Race condition on concurrent writes
**File:** `backend/api/services/cache_service.py:22–38`  
**Problem:** Get whole dict from cache, mutate in-memory, save whole dict back. With multiple gunicorn workers, simultaneous writes cause lost updates — cache keys leak until TTL expiry.  
**Fix:** Acceptable on free tier (keys auto-expire). For production, switch to Redis with atomic operations.

---

### M8. `VideoViewService.increment_video_views` — Unnecessary `refresh_from_db()`
**File:** `backend/api/services/video_view_service.py:47`  
**Problem:** `video.refresh_from_db()` fires an extra SELECT after `video.views = F("views") + 1` just to get the updated count. This is one extra query per video view — the most frequent write operation.  
**Fix:** Return `video.views + 1` computed in Python (the `F()` already handled the atomic increment). Or use `.values("views")`.
**Same issue in:** `backend/api/services/video_like_service.py:44, 64` (like/unlike).

---

### M9. `SearchBar.fetchRecommendedCategories` — 3 sequential API calls instead of parallel
**File:** `frontend/src/components/Shared/SearchBar/SearchBar.jsx:104–149`  
**Problem:** Calls `recommendations`, then `trending-videos`, then `recent-videos` — sequentially (await each). Worst case ~1.5 seconds before category tiles render.  
**Fix:** Use `Promise.allSettled` (already done correctly in `LoggedInView.jsx`).

---

### M10. `VideoDetail` — `recordView` callback identity changes on view record causing event re-registration
**File:** `frontend/src/components/Shared/VideoPlayer/VideoDetail.jsx:578–580`  
**Problem:** `recordView` depends on `[video?.id, viewRecorded]`. After ~2s when the view is recorded, `viewRecorded` changes → callback identity changes → VideoPlayer re-registers all 10 event listeners mid-playback.  
**Fix:** Use refs for callbacks passed to VideoPlayer (see H4).

---

### M11. `flowbite` side-effect import adds ~50KB to main bundle
**File:** `frontend/src/main.jsx:6`  
**Problem:** `import "flowbite"` pulls in ALL Flowbite JS (dropdowns, modals, tooltips, carousels). The app already uses `flowbite-react` which wraps the same functionality. ~50KB of duplicate JS.  
**Fix:** Remove `import "flowbite"` and rely on `flowbite-react` alone.

---

### M12. No code splitting for heavy dependencies (`recharts` ~180KB, `@mediapipe/tasks-vision` ~4MB)
**Files:** `frontend/src/components/Shared/VideoPlayer/VideoDetail.jsx:29–32`, `frontend/src/utils/FaceTracker.js`  
**Problem:** `recharts` (used only for emotion charts) and `@mediapipe/tasks-vision` (used only for face tracking) are bundled in the main chunk. Users who never watch videos with emotion data or use webcam still pay this cost.  
**Fix:** Use `React.lazy` for the chart component. Dynamic `import()` for FaceTracker inside `initFaceTracker()`. Use route-based splitting for video detail page.

---

### M13. `WebcamRecorder` pip drag effect re-adds mousemove/mouseup on every pixel of drag
**File:** `frontend/src/components/Shared/VideoPlayer/WebcamRecorder.jsx:84–104`  
**Problem:** `[pipPos]` is in the effect dependency array. During drag, every pixel change removes and re-adds `window` event listeners — dozens of times per second.  
**Fix:** Store `pipPos` in a ref; remove it from the dependency array.

---

### M14. `Video.jsx` — Filtering effect runs twice on page load (double sort)
**File:** `frontend/src/components/Pages/Video/Video.jsx:193–264`  
**Problem:** The filter/sort effect depends on `[videos, ..., searchQuery, ...]`. A separate effect at line 185 sets `searchQuery` from URL params. On page load, the filter effect fires twice: once when `videos` loads, and once when `searchQuery` updates from URL parsing.  
**Fix:** Remove `searchQuery` from the filter effect deps. Compute it synchronously from `location.search` at render time.

---

### M15. `NotificationService.get_notifications` — Unnecessary `select_related("recipient")`
**File:** `backend/api/services/notification_service.py:55`  
**Problem:** `NotificationSerializer` does NOT include a `recipient` field. The JOIN is wasted on every notification fetch.  
**Fix:** Remove `.select_related("recipient")`.

---

### M16. `FeedbackAnalyticsView` — Duplicate analytics logic (dead code)
**File:** `backend/api/feedback_views.py:234–280`  
**Problem:** The view manually recomputes analytics that `FeedbackService.calculate_analytics()` already computes. Duplication + maintenance hazard.  
**Fix:** Call `FeedbackService.calculate_analytics()` from the view instead.

---

## Low Severity Issues

### L1. `User.firebase_uid` / `User.email` — Redundant `db_index=True` with `unique=True`
**File:** `backend/api/models.py:51–52`  
**Problem:** `unique=True` already creates a unique index. `db_index=True` is redundant (Django only creates one). Code noise only — no performance impact.  
**Fix:** Remove `db_index=True` from both fields.

---

### L2. `VideoService._cache` — Static cache shared across JS contexts but not synchronized
**File:** `frontend/src/utils/VideoService.js:6–16`  
**Problem:** If user opens two tabs, `adminVideos` cache is stale in one tab after admin edit in the other until TTL expires (30s).  
**Fix:** Use `BroadcastChannel` to signal cache invalidation across tabs, or reduce admin TTL to 5s.

---

### L3. `VideoService` — `inProgress` rejected Promises cascade failures
**File:** `frontend/src/utils/VideoService.js:57, 129`  
**Problem:** If `inProgress.videoFeed` rejects, the `return await this._cache.inProgress.videoFeed` at line 57 re-throws the error without clearing the cache key. Concurrent callers all hit the same rejected Promise. No independent retry.  
**Fix:** Wrap the `await` in try/catch; on catch, delete `inProgress[key]` and re-throw.

---

### L4. `ApiService.handleUnauthorized` — Stale AbortController references accumulate
**File:** `frontend/src/utils/ApiService.js:260`  
**Problem:** Token refresh retry calls `this.request(endpoint, newConfig)` directly (not `this.get/post`). The `_clearSignal` in the original helper's `finally` block never executes. The `_activeControllers` map grows with dead controllers.  
**Fix:** Call `this.get(endpoint)` or `this._clearSignal(endpoint)` before retry.

---

### L5. `DashboardSideNavbar` — `window.innerWidth` accessed synchronously in render
**File:** `frontend/src/components/Shared/DashboardSideNavbar/DashboardSideNavbar.jsx:66`  
**Problem:** `useState(window.innerWidth < 768)` forces layout recalculation on every render.  
**Fix:** Use lazy initializer: `useState(() => window.innerWidth < 768)`.

---

### L6. `PromoteToAdminView` — Synchronous Firebase API call blocks request thread
**File:** `backend/api/admin_views.py:77`  
**Problem:** `firebase_auth.get_user(current_user.firebase_uid)` — synchronous HTTP call during request processing. On free tier with limited outbound connections, this can cause timeouts.  
**Fix:** Add a short timeout or make async.

---

### L7. `WebcamUploadService._trigger_thumbnail_async` — `time.sleep(3)` is fragile
**File:** `backend/api/services/webcam_upload_service.py:190`  
**Problem:** Fixed 3-second sleep before generating thumbnail. On slow connections it's not enough; on fast connections it's wasted.  
**Fix:** Use exponential backoff with retries checking blob existence.

---

### L8. `UploadRequestService.get_company_analytics` — 4 queries can be reduced to 2
**File:** `backend/api/services/upload_request_service.py:291–320`  
**Problem:** `by_status` → `completed_count` (separate) → `video_ids` (separate) → `frame_count` (separate) = 4 round-trips.  
**Fix:** Extract `completed_count` from the `by_status` dict. Use a single subquery for `total_frames`.

---

### L9. `VideoDetailView` — Digit-only identifier skips UUID/token lookup
**File:** `backend/api/views.py:172`  
**Problem:** If `identifier.isdigit()`, it only tries numeric ID. If someone passes a digit-only string that happens to NOT match a numeric PK, it returns 404 without trying UUID/share-token.  
**Fix:** Edge case — very unlikely in practice. Document and accept.

---

### L10. Router missing `future` flags for React Router v6 → v7 transition
**File:** `frontend/src/main.jsx:10`  
**Problem:** No `future={{ v7_startTransition: true }}` — route transitions are synchronous blocking operations.  
**Fix:** Add `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to `createBrowserRouter`.

---

### L11. `WebcamRecorder` — `handleFaceResult` recreated on every render, ref updated every render
**File:** `frontend/src/components/Shared/VideoPlayer/WebcamRecorder.jsx:420–422`  
**Problem:** Effect with no dependency array reassigns the ref on every render. During face tracking (~60fps), this causes unnecessary GC pressure.  
**Fix:** Wrap `handleFaceResult` in `useCallback` and add deps to the ref-update effect.

---

### L12. `SessionTimeoutHandler` — 1-second interval forces state update every second
**File:** `frontend/src/components/common/SessionTimeoutHandler/SessionTimeoutHandler.jsx:33–53`  
**Problem:** Local `setInterval` decrement of `sessionTimeRemaining` drifts from the actual value and causes unnecessary re-renders.  
**Fix:** Compute display from the actual `sessionTimeRemaining` prop directly; avoid local decrement.

---

### L13. `ActivityTracker` — `extendSession` async call on every throttled activity
**File:** `frontend/src/components/common/ActivityTracker/ActivityTracker.jsx:11–49`  
**Problem:** Every 5 minutes of activity triggers `user.getIdToken(true)` — a Firebase network round-trip. During heavy scrolling, this is bursty.  
**Fix:** Use only `mousedown` + `keydown` (2 listeners instead of 4). Remove `scroll` and `touchstart` (redundant).

---

### L14. No bundle visualizer configured
**File:** `frontend/package.json`, `frontend/vite.config.js`  
**Problem:** Cannot identify bundle size regressions or unused dependencies.  
**Fix:** Add `rollup-plugin-visualizer` to devDependencies.

---

## Migration Plan Summary

A single migration file is needed for all index changes:

| # | Model | Change | Index |
|---|-------|--------|-------|
| M1 | `User` | Add `db_index=True` to `role` | B-tree on `role` |
| M2 | `Video` | Add `db_index=True` to `likes` | B-tree on `likes` |
| M3 | `VideoLike` | Add to `Meta.indexes` | `[user, -liked_at]` |
| M4 | `VideoView` | Add to `Meta.indexes` | `[viewer, -viewed_at]` |
| M5 | `WebcamRecording` | Add to `Meta.indexes` | `[video, upload_status]` |

All indexes are safe for `CREATE INDEX CONCURRENTLY` on PostgreSQL.

---

## Priority Action Items (Ordered by Impact)

### Immediate (Fix today — runtime bugs & timeouts)
1. **[C3]** Fix `AdRow.jsx` missing `X` import — runtime crash
2. **[C1]** Fix emotion recordings N+1 — timeout risk on free tier
3. **[C2]** Consolidate 5 COUNTs into 1 aggregate — unnecessary latency
4. **[H3]** Add `select_related("uploader")` to video detail — most-called endpoint
5. **[H8]** Don't strip `console.error` in production

### This Week (Significant perf wins)
6. **[M1–M5]** Add missing DB indexes — migration required
7. **[M6]** Bulk UPDATE in `check_video_privacy` instead of per-video loop
8. **[H1]** Fix `get_is_liked` N+1 in list views
9. **[H2]** Fix ordering bug in watch history / liked videos
10. **[H4]** Use refs for VideoPlayer callbacks to prevent event listener churn
11. **[H7]** Split AuthContext to reduce re-render cascade

### This Sprint (Bundle size & network optimization)
12. **[M11]** Remove `flowbite` duplicate import
13. **[M12]** Code-split `recharts` and `@mediapipe/tasks-vision`
14. **[H5]** Create `GET /video/{id}/related/` endpoint
15. **[H6]** Remove redundant token refresh on page load
16. **[M9]** Parallelize search bar category fetches
17. **[M14]** Fix double-sort in Video.jsx filter effect

### Backlog (Nice-to-have)
18. **[L1–L14]** Low-severity items
19. **[L14]** Add bundle visualizer
20. **[L2]** Cross-tab cache synchronization
