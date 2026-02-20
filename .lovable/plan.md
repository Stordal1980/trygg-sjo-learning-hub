

# Legg til debug-overlay for 360-videospilleren

## Hva
Legge til et visuelt debug-overlay over 360-videoen som viser sanntidsstatus direkte pa skjermen. Dette gjor det mulig a feilsoke pa Samsung Internet uten a trenge DevTools (som er vanskelig pa mobil).

## Hva vises i overlayet
Overlayet vil vise folgende informasjon i sanntid, oppdatert hvert sekund:

- **Video state**: `playing` / `paused` / `waiting` / `stalled`
- **Video time**: gjeldende avspillingstid (bekrefter at video faktisk spiller)
- **Video dimensions**: bredde x hoyde (0x0 betyr at video ikke er dekodet)
- **Muted**: ja/nei
- **ReadyState**: 0-4 (4 = nok data til a spille)
- **NetworkState**: 0-3 (viser om video laster)
- **WebGL texture**: om mesh/material/map finnes pa videosphere
- **Browser**: viser user agent (bekrefter Samsung Internet)
- **A-Frame scene**: loaded / not loaded

## Hvordan det fungerer
- Et React state-objekt holder all debug-info
- En `setInterval` (1 sekund) oppdaterer staten fra video-elementet og A-Frame-scenen
- Overlayet vises som en semi-transparent boks i hjornet av spilleren
- Kan enkelt fjernes nar feilsokingen er ferdig

## Teknisk plan

### Endringer i `src/components/Video360Player.tsx`:
1. Legg til `debugInfo` state med felter for video state, tid, dimensjoner, muted, readyState, networkState, texture-status, og nettleser
2. I hovedeffekten: sett opp en `setInterval` som leser fra video-elementet og videosphere-meshen hvert sekund
3. Lagre referanser til video og videosphere i `useRef` sa intervallet kan lese fra dem
4. Render et absolutt posisjonert debug-panel over containeren med all info
5. Legg til event listeners for `playing`, `waiting`, `stalled`, `pause` pa video-elementet for a oppdatere state

### Forventet resultat pa Samsung Internet
- Hvis video time oker men dimensions er 0x0: video dekodes ikke (format/codec-problem)
- Hvis video time oker og dimensions er OK men texture er `null`: WebGL-tekstur-mapping feiler
- Hvis readyState forblir lav: video laster ikke riktig (CORS eller nettverksproblem)
- Hvis alt ser normalt ut: problemet er i Three.js/WebGL-rendering spesifikt

### Fil som endres
- `src/components/Video360Player.tsx`

