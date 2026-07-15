# UI/UX Audit Fixes — EngageAnalytics (h3cker)

**Date:** 2026-07-15
**Scope:** Frontend UI/UX quality issues identified during production audit
**Total findings:** 11 items fixed

---

## Phase 1 — Critical UI Fixes (P1)

### P1.1 — Fix SearchBar dual clear buttons
- **Issue:** `<input type="search">` renders native browser × AND custom HiX button
- **Fix:** Changed `type="search"` → `type="text"` with `role="searchbox"`
- **File:** `frontend/src/components/Shared/SearchBar/SearchBar.jsx`
- **Status:** ✅ DONE

### P1.2 — Fix sidebar bouncy width transition
- **Issue:** CSS `transition-all` on `width` property causes layout repaints; no GPU acceleration
- **Fix:** Replaced width animation with `transform: translateX()` — sidebar always `w-64`, uses `-translate-x-48` when collapsed (showing only 64px icon strip via justify-end), `translate-x-0` when expanded
- **File:** `frontend/src/components/Shared/DashboardSideNavbar/DashboardSideNavbar.jsx`
- **Status:** ✅ DONE

### P1.3 — Fix broken placeholder image URLs
- **Issue:** `/api/placeholder/...` URLs resolve to Django 404 (10 occurrences)
- **Fix:** Created shared `getPlaceholderImage()` utility (`frontend/src/utils/getPlaceholderImage.js`) returning inline SVG data URI; replaced all 10 occurrences across HeroBillboard, AdCard, Video, VideoDetail, UserWatchHistory, UserLikedVideo, RecordedVideos, AdminVideos, EditVideo
- **Files edited:** `getPlaceholderImage.js` (new), `HeroBillboard.jsx`, `AdCard.jsx`, `Video.jsx`, `VideoDetail.jsx`, `UserWatchHistory.jsx`, `UserLikedVideo.jsx`, `RecordedVideos.jsx`, `AdminVideos.jsx`, `EditVideo.jsx`
- **Status:** ✅ DONE

### P1.4 — Fix Avatar rendered without `src` prop in VideoDetail
- **Issue:** `<Avatar rounded size="md" />` renders with no image source
- **Fix:** Added `img={video.uploader?.avatar_url || ''}` prop
- **File:** `frontend/src/components/Shared/VideoPlayer/VideoDetail.jsx`
- **Status:** ✅ DONE

### P1.5 — Migrate icon libraries to lucide-react
- **Issue:** Mixed usage of `react-icons/hi` (SearchBar, Profile) and `react-icons/bs` (Footer) while rest of app uses lucide-react
- **Fix:** Migrated SearchBar, Profile.jsx, and Footer.jsx to lucide-react
- **Files:** `SearchBar.jsx`, `Profile.jsx`, `Footer.jsx`
- **Status:** ✅ DONE (all three files migrated)

---

## Phase 2 — Code Quality (P2)

### P2.1 — Fix AdminVideos `setIsMobile` destructuring bug
- **Issue:** `const [ setIsMobile] = useState(...)` — setter named but variable not destructured
- **Fix:** `const [isMobile, setIsMobile] = useState(...)`
- **File:** `frontend/src/components/Pages/Dashboard/Admin/AdminVideos.jsx`
- **Status:** ✅ DONE

### P2.2 — Fix DashboardLayout double padding
- **Issue:** Layout wrapper had `p-4 sm:p-6 md:p-8` AND child pages have their own padding
- **Fix:** Changed to `px-4 sm:px-6 md:px-8 py-4` — horizontal padding preserved, vertical padding minimized to avoid compounding
- **File:** `frontend/src/components/Shared/DashboardLayout/DashboardLayout.jsx`
- **Status:** ✅ DONE

### P2.3 — Add reduced-motion support
- **Issue:** framer-motion animations, sidebar transitions, and CSS animations don't respect `prefers-reduced-motion`
- **Fix:** Added `<MotionConfig reducedMotion="user">` wrapper in App.jsx for framer-motion; added global `@media (prefers-reduced-motion: reduce)` CSS rule in index.css for all CSS animations/transitions
- **Files:** `frontend/src/App.jsx`, `frontend/src/index.css`
- **Status:** ✅ DONE

---

## Phase 3 — Summary

| Item | Description | Status |
|------|-------------|--------|
| P1.1 | SearchBar dual clear buttons | ✅ |
| P1.2 | Sidebar width→transform | ✅ |
| P1.3 | Placeholder image URLs (10 files) | ✅ |
| P1.4 | VideoDetail Avatar src | ✅ |
| P1.5 | Icon library migration (3 files) | ✅ |
| P2.1 | AdminVideos setIsMobile bug | ✅ |
| P2.2 | DashboardLayout double padding | ✅ |
| P2.3 | Reduced-motion support | ✅ |

**All 8 items completed.**
