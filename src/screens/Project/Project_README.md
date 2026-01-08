# Project Screen Module Documentation

This document provides a comprehensive technical breakdown of the `src/screens/Project` directory. This module acts as the "Video Editor" of the application, where users review their session, generate AI narrations, and export the final composited video.

---

## 1. Directory Structure

```
src/screens/Project/
├── project.tsx                 # [Controller] Main orchestrator component
├── project.css                 # [Styles] scoped animations and layout fixes
└── sections/                   # [Components] UI Sub-modules
    ├── HeaderSection/          # Top Toolbar (Export, Share, Title)
    ├── MainCanvasSection/      # The "Stage" (Video container & Background)
    ├── SideNavigationSection/  # Left Sidebar (Script, Elements, etc.)
    ├── TranscriptionSection/   # Script & AI Speech Panel
    └── VideoPlayerSection/     # Video Player & Custom Controls
```

---

## 2. Core Logic: `project.tsx`

**File Path:** `src/screens/Project/project.tsx`

### Purpose
This is the root container for the editor. It functions as the "State Machine" for the entire editing session. It does not render much UI directly but rather composes the `sections/` components and passes them the state they need.

### Key Responsibilities
1.  **Session Initialization**: Fetches recording data based on `sessionId`.
2.  **Audio/Video Synchronization**: Keeps the HTML5 Video element in sync with the appropriate Audio element (Original vs. AI Generated).
3.  **Effect Rendering loop**: Runs a `requestAnimationFrame` loop to apply zoom/pan effects 60 times a second.
4.  **State Management**: Holds all "Source of Truth" data (volume, playback time, active tab, colors).

### State Breakdown
*   **UI State**: `activeTab`, `activeSidebarItem`, `aspectRatio`, `backgroundColor`.
*   **Media State**: `videoUrl`, `audioUrl` (original mic), `processedAudioUrl` (ElevenLabs TTS), `isPlaying`, `currentTime`, `volume`.
*   **Processing State**: `preparing` (initial load), `generatingSpeech` (TTS api call), `exporting` (FFmpeg render).
*   **Effects State**: `normalizedEffects` (Calculated zoom coordinates relative to video size).

### Critical Logic hooks

#### A. Data Loading Trigger
```typescript
useEffect(() => { ... }, [sessionId]);
```
**Flow:**
1. Checks if `sessionId` exists.
2. Calls `processSession(sessionId)` form `backend-api.js`.
3. Sets `videoUrl` and `audioUrl`.
4. If backend returns `displayEffects` (raw zoom data), it normalizes them to the current video dimensions using `normalizeCoordinates`.

#### B. The Audio/Video Sync Engine
```typescript
useEffect(() => { ... }, [processedAudioUrl, videoUrl]);
```
**Why do we need this?**
The "Original Audio" is a separate file from the "Video" (which is screen recording only, or screen + mic mixed). When we generate AI Speech, we get a *new* audio file (`processedAudioUrl`). We cannot just replace the video's audio track easily in the browser.
**Solution:**
- We maintain two audio refs: `audioRef` (original) and `aiAudioRef` (AI).
- We listen to the `<video>`'s `timeupdate` event.
- If the active audio element drifts more than `0.3s` from the video, we force a seek: `audio.currentTime = video.currentTime`.

#### C. The Effect Rendering Loop (The "Zoom" Engine)
```typescript
useEffect(() => {
    const renderFrame = () => {
        // 1. Get current video time
        // 2. Find active effects for this second
        // 3. Calculate interpolation (0% to 100% of the movement)
        // 4. Apply CSS Transform
        rafRef.current = requestAnimationFrame(renderFrame);
    }
}, [normalizedEffects]);
```
**Logic:**
This loop drives the visual "Zoom" effects. It uses the `videoLayerRef` (a `<div>` wrapping the video) and applies:
`transform: scale(X) translate(X%, Y%)`
This is what makes the video pan and zoom smoothly without needing to re-render the React component tree.

---

## 3. Styling Logic: `project.css`

**File Path:** `src/screens/Project/project.css`

### Styles Explanation

#### `.video-container`
The container that defines the maximum size of the player options. It enforces an aspect ratio of 16/9 for the preview area initially.

#### `.video-layer`
**Crucial Class**. This is the `div` that `project.tsx` manipulates.
*   `position: absolute`: Allows it to move freely inside the container.
*   `transform-origin: center center`: **IMPORTANT**. All zoom calculations in `project.tsx` assume the anchor point is the exact center (0.5, 0.5) of the div. If this changes, zooms will be off-center.
*   `will-change: transform`: Hints browser to promote this layer to the GPU compositing thread to prevent jitter during zooms.
*   `width: 100%; height: 100%`: Matches the parent container initially.

### Animations
*   `@keyframes spin`: Used for the loading spinner when exporting/generating.
*   `@keyframes slide-in`: Used for the `TranscriptionSection` sidebar to slide in comfortably from the left/right.
*   `@keyframes pulse-glow`: Visual feedback for active elements.

---

## 4. Component Deep Dives (The `sections/` folder)

### 4.1 HeaderSection
**Path:** `src/screens/Project/sections/HeaderSection/HeaderSection.tsx`
**Role:** Dumb UI component.
**Key Props:** `onExport`, `isExporting`.
**Flow:**
- User clicks "Export".
- Triggers callback to `project.tsx`.
- `project.tsx` calls `backend-api.js` -> `exportVideo`.
- Button shows `Loader2` icon (spinning) while `isExporting` is true.

### 4.2 MainCanvasSection ("The Stage")
**Path:** `src/screens/Project/sections/MainCanvasSection/MainCanvasSection.tsx`
**Role:** Handles the "Background" behind the video.
**Concept:**
To make the video feel "Premium", we place it on a "Stage".
- **The Stage**: A background `div` with a user-selected color (`backgroundColor` prop) and ratio (`aspectRatio` prop).
- **The Content**: The `children` prop (which contains the `VideoLayer`).
**Visual Logic:**
The stage has `overflow: hidden`. When `project.tsx` zooms the video `scale(1.5)`, the parts of the video that go "off-stage" are visually clipped by this container. This creates the "Camera Zoom" effect (the camera moves in, cropping the view).

### 4.3 SideNavigationSection
**Path:** `src/screens/Project/sections/SideNavigationSection/SideNavigationSection.tsx`
**Role:** Navigation Menu.
**Items:** Script, Elements, Templates, Music, Captions.
**Logic:** purely selects a string ID (e.g., `'script'`) which `project.tsx` uses to decide which panel to show (e.g., `showTranscriptionPanel`).

### 4.4 TranscriptionSection
**Path:** `src/screens/Project/sections/TranscriptionSection/TranscriptionSection.tsx`
**Role:** Displays the generated script.
**Features:**
1.  **Sync Points**:
    - The `narrations` array contains objects with `{ start: 10.5, text: "..." }`.
    - Clicking a "Sync Point" calls `onSyncPointClick(narration.start)`.
    - This bubbles up to `project.tsx` -> `handleSeek(time)`.
2.  **Generate Speech**:
    - Button state changes based on `isGenerating` (Loading spinner) and `hasProcessedAudio` (Green checkmark).

### 4.5 VideoPlayerSection
**Path:** `src/screens/Project/sections/VideoPlayerSection/VideoPlayerSection.tsx`
**Role:** Splits the "Video Display" from the "Controls".

**Sub-Component: `VideoLayer`**
- Contains the HTML `<video>` tag.
- **Why separate?** This component is "dumb" and often doesn't re-render. Its `div` is manipulated directly via DOM refs (`videoLayerRef`) for performance (Direct DOM manipulation is faster than React re-renders for 60fps animations).
- **Initial State**: `transform: scale(0.94)`. It starts slightly smaller than the stage to show the background margins.

**Sub-Component: `VideoControls`**
- Determines the UI for the timeline, play button, volume.
- **Logic**: Calculates the progress bar width: `(currentTime / duration) * 100`.
- **Interactions**: Dragging the timeline calls `onSeek`.

---

## 5. Backend Service Integration (`backend-api.js`)

This file (`src/services/backend-api.js`) is the bridge between the React frontend and the backend logic.

### 1. `processSession(sessionId)`
*   **Called by**: `project.tsx` (on mount).
*   **Flow**:
    1.  Hits `POST /api/process-session`.
    2.  Backend runs Deepgram (transcription).
    3.  Backend runs LLM (script generation).
    4.  Backend runs `instructionGenerator` (zoom coordinates).
*   **Returns**: `{ narrations, displayEffects, videoUrl, audioUrl }`.

### 2. `generateSpeech(sessionId)`
*   **Called by**: `TranscriptionSection` -> "Generate Speech" button.
*   **Flow**:
    1.  Hits `POST /api/generate-speech`.
    2.  Backend uses ElevenLabs to generate mp3.
    3.  Backend uploads to S3/Local.
*   **Returns**: `{ processedAudioUrl }`. `project.tsx` then switches audio sources to this new file.

### 3. `exportVideo(sessionId, instructions, dimensions, options)`
*   **Called by**: `HeaderSection` -> "Export" button.
*   **Flow**:
    1.  Frontend collects the *current* state of effects (`normalizedEffects`).
    2.  Frontend converts them back to "Instructions" for the backend.
    3.  Hits `POST /api/export-video`.
    4.  Backend spawns FFmpeg.
        *   Takes the source video.
        *   Applies the exact `scale` and `translation` math calculated on the frontend.
        *   Renders to 1920x1080 mp4.
*   **Returns**: `{ videoUrl }`. The frontend then creates a hidden `<a>` tag to auto-download this file.
