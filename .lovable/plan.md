
# Legg til WebXR/VR-stotte i 360-videospilleren

## Hva dette gir
Brukere med VR-briller (som PICO 4, Meta Quest) vil kunne trykke "Enter VR" og oppleve 360-videoen med hodestyring -- de ser seg rundt naturlig ved aa bevege hodet, i stedet for aa dra med fingeren.

Pa vanlige enheter (PC, mobil) fungerer alt som for med mus/touch-styring.

## Hva som endres

### 1. Installere `@react-three/xr`
Pakken er kompatibel med prosjektets eksisterende React 18 og @react-three/fiber v8.

### 2. Oppdatere `Video360Player.tsx`
- Importere `createXRStore` og `XR` fra `@react-three/xr`
- Opprette en XR store med `createXRStore()`
- Wrappe 360-sfaeren i en `<XR store={store}>` komponent inne i Canvas
- Legge til en "Enter VR"-knapp i kontrollpanelet som kaller `store.enterVR()`
- Knappen vises kun nar WebXR er tilgjengelig pa enheten (sjekkes via `navigator.xr?.isSessionSupported('immersive-vr')`)
- Nar brukeren er i VR-modus, skjules OrbitControls (hodestyring tar over)

### 3. Brukeropplevelse
- Pa VR-briller: En VR-ikon-knapp vises i kontrollpanelet. Trykk starter immersiv VR-modus med hodestyring.
- Pa vanlige enheter: Ingen synlig endring -- VR-knappen vises ikke hvis enheten ikke stotter WebXR.

---

## Tekniske detaljer

**Ny avhengighet:** `@react-three/xr@latest` (v6.x, kompatibel med fiber >=8, react >=18)

**Endringer i `Video360Player.tsx`:**

```
// Nye imports
import { XR, createXRStore } from "@react-three/xr";

// Opprette store utenfor komponenten
const xrStore = createXRStore();

// Ny state for VR-stotte
const [vrSupported, setVrSupported] = useState(false);

// Sjekk ved mount
useEffect(() => {
  navigator.xr?.isSessionSupported('immersive-vr')
    .then(supported => setVrSupported(supported));
}, []);

// Canvas-innhold wrappes i <XR>
<Canvas>
  <XR store={xrStore}>
    <Video360Sphere ... />
    <OrbitControls ... />  // Fungerer fortsatt for ikke-VR
  </XR>
</Canvas>

// Ny knapp i kontrollpanelet (kun synlig nar VR er stottet)
{vrSupported && (
  <Button onClick={() => xrStore.enterVR()}>
    <Glasses icon />
  </Button>
)}
```

**Filer som endres:**
- `src/components/Video360Player.tsx` -- legge til XR-wrapping og VR-knapp
- `package.json` -- ny avhengighet `@react-three/xr`
