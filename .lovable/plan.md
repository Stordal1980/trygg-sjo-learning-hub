

# Fix: Sort skjerm i Samsung Internet for A-Frame 360-video

## Problem
Samsung Internet (og andre mobile nettlesere) blokkerer autoplay av video uten brukerinteraksjon. Den navaerende implementasjonen setter `video.muted = true` men mangler `autoplay`-attributtet pa video-elementet, og starter ikke avspilling tidlig nok.

## Losning
Oppdatere `Video360Player.tsx` med disse endringene:

### 1. Legg til manglende video-attributter
- Sett `autoplay` attributt pa video-elementet
- Sikre at `playsinline` er korrekt satt
- Legg til `loop="true"` som attributt (ikke bare property)

### 2. Start video eksplisitt etter scene er klar
- Lytt pa A-Frame `loaded`-event for a starte video
- Legg til `loadeddata`-event pa video for debugging
- Kall `video.play()` sa snart scenen er klar (mens video er muted, noe som er tillatt uten brukerinteraksjon)

### 3. Forbedret brukerinteraksjon for unmute
- Behold klikk-handler for unmute, men flytt `video.play()` til scene-load
- Vis en visuell "Trykk for lyd"-indikator over videoen

## Teknisk detalj

Endringer i `src/components/Video360Player.tsx`:

```
// Video-element far disse attributtene:
video.setAttribute("autoplay", "");
video.setAttribute("muted", "");
video.setAttribute("playsinline", "");
video.setAttribute("webkit-playsinline", "");
video.setAttribute("loop", "true");
video.setAttribute("crossorigin", "anonymous");
video.muted = true;

// Etter scene er lagt til DOM, start video eksplisitt:
scene.addEventListener("loaded", () => {
  video.play().catch(() => {});
});

// Debugging: sjekk om video faktisk laster
video.addEventListener("loadeddata", () => {
  console.log("360 video loaded successfully");
});

// Klikk-handler endres til bare unmute (play skjer allerede):
const handleInteraction = () => {
  video.muted = false;
};
```

### Fil som endres
- `src/components/Video360Player.tsx`

