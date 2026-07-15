# Recording Toast & Audio Fixes — EngageAnalytics (h3cker)

**Date:** 2026-07-15  
**Scope:** Fix persistent toast stacking during recording, obtrusive face-blocked overlay, volume slider usability

## Issues Fixed

### 1. Sticky Toast Messages — Stacking & Overflow
- **Problem:** "Please position your face" toast was sticky (duration=0) and never auto-dismissed. Combined with "Face not detected — video paused" (also sticky), toasts stacked infinitely covering the bottom of the video.
- **Fix:** 
  - "Position your face" toast changed from duration=0 → 8000ms auto-dismiss
  - Toast container limits to max 2 visible with `slice(0, 2)` and shows "+N more" overflow indicator
  - Reduced font size from `text-sm` → `text-xs`, padding reduced
  - Added `max-w-[90%]` + `truncate` to prevent long messages from overflowing
  - Added `opacity-90` to backgrounds for translucency
  - Repositioned from `bottom-16` → `bottom-20`
- **File:** `WebcamRecorder.jsx`

### 2. Face-Blocked Overlay — Too Large, Center Position
- **Problem:** The "Face the camera to continue watching" overlay was a large centered panel (`bg-gray-900/80 backdrop-blur-sm rounded-lg px-6 py-4` with a 36px icon) that blocked the entire center of the video.
- **Fix:** Moved to `top-4 right-4` as a compact inline badge (`px-3 py-2`, 16px icon, `text-xs`). The center Play button now remains visible but in disabled state (`bg-gray-600 bg-opacity-50 cursor-not-allowed`).
- **File:** `VideoPlayer.jsx`

### 3. Volume Slider — Too Thin, Poor UX
- **Problem:** Volume slider was `h-1` (4px) and `w-16` (64px) — very thin and narrow, hard to click especially on mobile.
- **Fix:** Changed to `h-2` (8px) + `w-20` (80px), `step="0.05"` for fewer increments, added `cursor-pointer` and `title` attribute showing current volume percentage.
- **File:** `VideoPlayer.jsx`

### 4. Toggle Mute — Stale Closure Bug
- **Problem:** `toggleMute` used `isMuted` state from closure, which could be stale if the `volumechange` event hadn't fired yet.
- **Fix:** Changed to read `videoRef.current.muted` directly instead of relying on React state.
- **File:** `VideoPlayer.jsx`

### 5. Play Button During Face-Blocked State
- **Problem:** Center Play button was completely hidden when face-blocked, leaving a blank video with no affordance.
- **Fix:** Play button remains visible but in a disabled greyed-out state with cursor-not-allowed, so users understand they need to face the camera.
- **File:** `VideoPlayer.jsx`

## Verified Intentional

- **Microphone access:** `audio: false` throughout WebcamRecorder — confirmed as intentional (emotion analysis is video-only, no audio needed). My initial fix enabling audio was reverted.
- **"Face not detected — video paused" toast:** Kept as sticky (duration=0) since it's a critical state indicator. But it's now limited with the 2-toast cap so it won't overflow.

## Status

All 5 items completed.
