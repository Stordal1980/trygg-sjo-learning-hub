
# Fix 360 Video Playback on PICO 4 Browser

## Problem
The 360 video player shows a black screen on the PICO 4's native browser. This is caused by mobile browser restrictions on video playback and missing video texture update logic.

## Solution Overview
We'll fix the video player to work properly on VR browsers by:
- Fixing video loading order and attributes
- Adding proper video texture updates in the render loop
- Handling autoplay restrictions with a muted-first approach
- Adding user feedback for loading/error states

---

## Changes

### 1. Update Video360Player.tsx

**Fix video initialization order:**
- Set `crossOrigin` attribute before `src`
- Start video muted by default (required for autoplay on mobile browsers)
- Add `preload="auto"` for faster loading

**Add texture update in render loop:**
- Use `useFrame` hook from @react-three/fiber to update the video texture every frame
- Set `texture.needsUpdate = true` on each render

**Handle video events:**
- Listen for `canplay`/`loadeddata` events to know when video is ready
- Listen for `error` events to provide user feedback
- Implement retry logic for failed autoplay

**Add loading and error states:**
- Show loading spinner while video is loading
- Show error message if video fails to load
- Provide a "tap to play" button for browsers that block autoplay

---

## Technical Details

### Modified Video360Sphere component:

```text
+------------------------------------------+
|  Video Element Setup (before src)        |
|  - crossOrigin = "anonymous"             |
|  - playsInline = true                    |
|  - muted = true (initially for autoplay) |
|  - loop = true                           |
|  - preload = "auto"                      |
|  - THEN set src                          |
+------------------------------------------+
           |
           v
+------------------------------------------+
|  Video Events                            |
|  - onloadeddata: set ready state         |
|  - oncanplay: attempt auto-play          |
|  - onerror: set error state              |
+------------------------------------------+
           |
           v
+------------------------------------------+
|  useFrame Hook                           |
|  - Check if video is playing             |
|  - Set texture.needsUpdate = true        |
+------------------------------------------+
```

### New state management in parent component:
- `isVideoReady` - tracks when video can play
- `hasError` - tracks if video failed to load
- `showTapToPlay` - shows manual play button if autoplay blocked

### UI Additions:
- Loading overlay with spinner while video loads
- Error overlay with retry button if loading fails
- "Tap to play" button for autoplay-blocked scenarios

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Video360Player.tsx` | Complete refactor of video loading, add useFrame for texture updates, add loading/error states |

---

## Summary
This fix addresses the core issues preventing 360 video playback on PICO 4:
1. Correct attribute ordering for cross-origin video
2. Frame-by-frame texture updates for WebGL rendering
3. Mobile/VR browser autoplay restrictions handled with muted-first approach
4. User feedback for loading and error states
