

## Plan: Adaptive resolution for old devices in Video360Player

The `canvas-video-texture` component already checks `MAX_TEXTURE_SIZE` and downscales when the video exceeds it. The fix is to also cap at 1920px when `MAX_TEXTURE_SIZE` is ≤ 4096 (old GPUs), while letting newer devices (MAX_TEXTURE_SIZE > 4096) use full resolution.

### Changes in `src/components/Video360Player.tsx`

In the `canvas-video-texture` tick function:

1. **Current logic**: Only uses canvas workaround when video dimensions exceed `MAX_TEXTURE_SIZE`. Otherwise passes through at full resolution.

2. **New logic**: 
   - If `MAX_TEXTURE_SIZE <= 4096` (old device), always use canvas workaround and cap at `maxSize: 1920`
   - If `MAX_TEXTURE_SIZE > 4096` (modern device), keep current behavior (pass through or downscale only if exceeding max)

3. **Implementation**: In the `tick` function, change the early-return condition. Instead of only activating when `vw > maxTex || vh > maxTex`, also activate when `maxTex <= 4096` and video is larger than 1920px. Use `Math.min(this.data.maxSize, maxTex, oldDeviceCap)` for the target size.

This is a single-file change affecting only the component's internal rendering pipeline — no impact on modern devices.

