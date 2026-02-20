

# Videotype-velger i admin modulredigering

## Oversikt
Legge til en velger i admin-modulredigeringen der admin kan velge mellom to videokilder:
1. **YouTube-URL** -- lim inn en YouTube-lenke (fungerer pa alle enheter)
2. **Last opp video** -- last opp en videofil til lagring, som spilles av med den eksisterende 360-spilleren (Three.js)

Pa kurssiden vil riktig spiller vises basert pa videotypen.

## Endringer

### 1. Database: Ny kolonne `video_type`
Legge til en ny kolonne `video_type` (text, default `'youtube'`) i `course_modules`-tabellen for a skille mellom de to typene. Eksisterende moduler far automatisk `'youtube'` som standard.

### 2. AdminModuleEdit.tsx -- Videotype-velger
- Legge til radioknapper/toggle for a velge mellom "YouTube" og "Last opp video"
- Nar "YouTube" er valgt: vis URL-input (som na)
- Nar "Last opp video" er valgt: vis filopplasting med progress, som laster opp til `course-videos`-bucketen
- Lagre `video_type` sammen med `video_url` i databasen

### 3. CourseDetail.tsx -- Betinget spiller
- Importere bade `YouTube360Player` og `Video360Player`
- Sjekke `video_type`-feltet pa modulen:
  - Hvis `'youtube'` -> vis YouTube-embed
  - Hvis `'upload'` -> vis Three.js 360-spilleren
- Oppdatere Module-interfacet med `video_type`

### 4. Oppdatere Module-interface
Legge til `video_type` i Module-typen i CourseDetail.tsx.

---

## Tekniske detaljer

**Ny kolonne:**
```sql
ALTER TABLE course_modules 
ADD COLUMN video_type text NOT NULL DEFAULT 'youtube';
```

**AdminModuleEdit.tsx:**
- Ny state `videoType` ('youtube' | 'upload') som styrer hvilket felt som vises
- Gjeninnfore `handleVideoUpload` for filopplasting til `course-videos`-bucketen
- Sende `video_type` med i `formData` ved lagring

**CourseDetail.tsx:**
- Betinget rendering: `module.video_type === 'upload'` bruker `Video360Player`, ellers `YouTube360Player`

