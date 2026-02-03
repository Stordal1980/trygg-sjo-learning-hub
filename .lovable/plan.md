
# Fiks 360 Video Avspilling på Eldre Enheter (iPad)

## Problemanalyse

Nyere enheter (Samsung S24 Ultra/Chrome) fungerer fint, mens eldre iPads viser svart skjerm og play-knappen reagerer ikke. Dette skyldes flere iOS-spesifikke begrensninger:

### Identifiserte Problemer

1. **Video-element ikke i DOM** - iOS Safari har problemer med video-elementer opprettet via `document.createElement()` som aldri legges til i dokumentet. iOS trenger ofte at video-elementet er synlig i DOM for å initialisere riktig.

2. **Play må kalles direkte fra bruker-event** - iOS krever at `video.play()` kalles synkront fra en bruker-interaksjon (touch/click), ikke fra en React state-endring som skjer asynkront.

3. **Retry-funksjon fungerer ikke** - `handleRetry()` setter bare state tilbake, men video-elementet blir ikke faktisk re-opprettet siden `videoUrl` ikke endres.

4. **Manglende colorSpace for WebGL** - Noen iOS-versjoner trenger eksplisitt `colorSpace`-setting på teksturen.

---

## Løsning

### 1. Legg til video-element i DOM (skjult)

I stedet for bare å opprette video via JavaScript, legger vi video-elementet til i DOM-en (utenfor synsfeltet). Dette fikser iOS Safari sin video-initialisering.

### 2. Direkte play fra touch event

Endre arkitekturen slik at play-knappen direkte kaller `videoRef.current.play()` i samme event handler, ikke via state-endring.

### 3. Legg til forceUpdate-key for retry

Bruk en `key`-prop på Video360Sphere komponenten som endres ved retry, slik at hele komponenten re-mountes og videoen lastes på nytt.

### 4. Forbedret iOS-deteksjon og fallback

Legg til deteksjon av iOS-enheter og vis en tydeligere "Trykk for å starte" melding på første lasting.

---

## Tekniske Endringer

### Video360Player.tsx - Hovedendringer

| Endring | Beskrivelse |
|---------|-------------|
| Legg video i DOM | Opprett et skjult video-element i DOM via ref, ikke bare i minnet |
| Direkte play-kall | Kall `video.play()` direkte fra onClick, ikke via state |
| iOS auto-unmute | Etter første play, aktiver lyd automatisk |
| Retry med key | Bruk state-key for å tvinge re-mount ved retry |
| ColorSpace fix | Sett `texture.colorSpace = THREE.SRGBColorSpace` for eldre iOS |

### Ny kode-struktur

```text
+------------------------------------------+
|  Video Element i DOM (visibility: hidden)|
|  - Legges til i document.body            |
|  - Fjernes ved unmount                   |
+------------------------------------------+
           |
           v
+------------------------------------------+
|  Play-knapp onClick                      |
|  - Kaller video.play() DIREKTE           |
|  - Deretter oppdaterer React state       |
+------------------------------------------+
           |
           v
+------------------------------------------+
|  VideoTexture                            |
|  - colorSpace = SRGBColorSpace           |
|  - needsUpdate = true per frame          |
+------------------------------------------+
```

---

## Filer som Endres

| Fil | Endringer |
|-----|-----------|
| `src/components/Video360Player.tsx` | Legge video i DOM, direkte play fra event, iOS-håndtering, retry med key |

---

## Oppsummering

Disse endringene vil løse iPad-problemet ved å:
1. Sikre at video-elementet er i DOM (kreves av iOS Safari)
2. Kalle `play()` synkront fra bruker-touch (iOS krav)
3. Fikse retry-funksjonalitet med komponent re-mount
4. Legge til iOS-spesifikke tekstur-innstillinger
