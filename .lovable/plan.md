

# Bytt 360-videospiller til Video.js + videojs-vr

## Hvorfor dette er en god ide
Den navaerende Three.js-spilleren (via React Three Fiber) har vedvarende problemer med svart skjerm i Samsung Internet. `videojs-vr` er et offisielt Video.js-plugin som haandterer 360-video paa tvers av nettlesere -- inkludert Samsung Internet, Chrome, Safari og Firefox. Den bruker Three.js internt, men tar seg av alle kompatibilitetsproblemene automatisk.

## Hva som endres

### 1. Nye avhengigheter
- `video.js` -- den mest brukte HTML5-videospilleren
- `videojs-vr` -- offisielt 360/VR-plugin med WebXR-stoette

### 2. Fjerne unnoedvendige avhengigheter
Disse kan fjernes da de kun ble brukt av den gamle 360-spilleren:
- `@react-three/fiber`
- `@react-three/drei`
- `@react-three/xr`
- `three`

### 3. Ny `Video360Player.tsx`
Erstatte hele komponenten med en Video.js-basert spiller:
- Opprette et standard `<video>` element
- Initialisere Video.js med `videojs-vr` plugin
- Konfigurere `projection: 'equirectangular'` for 360-video
- WebXR/VR-stoette kommer innebygd i pluginen
- Beholde fullskjerm-knapp og muted/unmute-funksjonalitet
- Beholde fallback-logikk for enheter uten WebGL

### 4. Ingen endring i YouTube-spilleren
`YouTube360Player.tsx` forblir uendret -- den bruker iframe og er helt uavhengig.

### 5. Ingen endring i `CourseDetail.tsx`
Samme komponent-grensesnitt (`videoUrl` prop) saa kurssiden trenger ingen endring.

## Brukeropplevelse
- Paa desktop: Dra for aa se rundt, scroll for zoom, fullskjerm
- Paa mobil (inkl. Samsung Internet): Touch for aa dra, pinch-zoom, fullskjerm
- Paa VR-briller: Innebygd WebXR-stoette via videojs-vr

---

## Tekniske detaljer

**Nye avhengigheter:**
```
video.js (videospiller-rammeverk)
videojs-vr (360/VR-plugin)
```

**Fjernes:**
```
@react-three/fiber
@react-three/drei
@react-three/xr
three
```

**Ny implementasjon i `Video360Player.tsx`:**

```tsx
import { useRef, useEffect, useState, useCallback } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-vr/dist/videojs-vr.css";
import "videojs-vr";

export function Video360Player({ videoUrl }: { videoUrl: string }) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered", "vjs-fluid");
    videoRef.current?.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      autoplay: false,
      preload: "auto",
      loop: true,
      muted: true,
      sources: [{ src: videoUrl, type: "video/mp4" }],
    });

    player.vr({ projection: "equirectangular" });
    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [videoUrl]);

  return (
    <div className="w-full rounded-lg overflow-hidden">
      <div ref={videoRef} />
    </div>
  );
}
```

**Filer som endres:**
- `src/components/Video360Player.tsx` -- fullstendig omskrevet med Video.js
- `package.json` -- nye avhengigheter, fjerne gamle

**Filer som IKKE endres:**
- `src/components/YouTube360Player.tsx`
- `src/pages/CourseDetail.tsx`

