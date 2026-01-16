# Explaino Frontend - Complete Technical Documentation

> **Last Updated**: January 13, 2026  
> **Version**: 1.0  
> **Tech Stack**: React 18.2, TypeScript, Vite 6, Tailwind CSS 3.4

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Screens](#screens)
4. [State Management](#state-management)
5. [Video Player Logic](#video-player-logic)
6. [Effect Processing](#effect-processing)
7. [API Integration](#api-integration)
8. [Deployment](#deployment)

---

## Overview

Explaino Frontend is a SaaS video editor that transforms screen recordings into polished tutorial videos with:

- **Timeline-based playback** with 3-clip structure (intro → video → outro)
- **Clip-specific audio switching** (raw audio or AI-generated speech)
- **Real-time effect preview** using CSS transforms (zoom, pan)
- **Text overlay rendering** for intro/outro clips with custom styling
- **Word-level narration highlighting** synchronized with audio
- **GraphQL authentication** with JWT token refresh
- **WebSocket progress updates** during processing
- **CDN-optimized media delivery** (cdn.vocallabs.ai)

---

## Architecture

### Component Hierarchy

```
App (index.tsx)
├── Router
│   ├── PublicRoute
│   │   └── LoginPage
│   └── ProtectedRoute
│       ├── MericodSaasRecord (Dashboard)
│       └── ProjectScreen (Video Editor)
│           ├── HeaderSection
│           ├── SideNavigationSection
│           ├── TranscriptionSection
│           ├── MusicSection
│           └── MainCanvasSection
│               ├── VideoPlayerSection
│               │   ├── VideoLayer
│               │   │   └── TextOverlayLayer
│               │   └── VideoControls
│               └── VideoControls
```

### Directory Structure

```
src/
├── index.tsx                 # App entry, routing
├── components/
│   ├── AuthRoute.tsx        # Route guards
│   └── ui/                  # Reusable UI (Shadcn pattern)
│       ├── button.tsx
│       ├── input.tsx
│       ├── select.tsx
│       └── ... (10+ components)
├── screens/
│   ├── Login/              # Authentication
│   ├── MericodSaasRecord/  # Dashboard
│   └── Project/            # Video editor (1147 lines)
│       ├── project.tsx
│       └── sections/       # UI sections
│           └── VideoPlayerSection/
│               ├── VideoPlayerSection.tsx
│               └── TextOverlayLayer.tsx
├── hooks/
│   └── useProcessingWebSocket.js
├── services/
│   └── backend-api.js      # HTTP client
├── lib/
│   ├── apolloClient.ts     # GraphQL
│   ├── authManager.ts      # Token refresh
│   └── utils.ts
└── utils/
    ├── effectProcessor.js       # Zoom calculations
    ├── instructionGenerator.js  # Backend format
    └── timelineUtils.ts         # Time conversions
```

---

## Screens

### LoginPage

**Purpose**: Phone-based authentication with OTP verification.

**Features**:
- Country code selector (flag-icons library)
- Phone number input with validation
- CAP.js anti-bot verification (alternative to reCAPTCHA)
- OTP verification (6-digit code)
- Onboarding flow (company name for new users)
- JWT token management with automatic refresh

**GraphQL Mutations**:
```graphql
# 1. Send OTP
mutation RegisterV4($phone: String!, $recaptcha_token: String!) {
  registerWithoutPasswordV4(credentials: {
    phone: $phone
    recaptcha_token: $recaptcha_token
  }) {
    request_id
    status
  }
}

# 2. Verify OTP
mutation VerifyOTPV3($phone1: String!, $otp1: String!) {
  verifyOTPV3(request: {
    phone: $phone1
    otp: $otp1
  }) {
    auth_token
    refresh_token
    id
    status
  }
}

# 3. Update company (onboarding)
mutation UpdateCompany($id: uuid!, $company_name: String!) {
  insert_vocallabs_client_one(
    object: { client_id: $id, company_name: $company_name }
    on_conflict: { constraint: vocallabs_client_pkey, update_columns: [company_name] }
  ) {
    id
    company_name
  }
}
```

**User Flow**:
```
1. Enter phone → Generate CAP token → Send OTP
2. Enter OTP → Verify → Fetch user data
3. If new user → Onboarding (company) → Dashboard
4. If existing → Dashboard
```

---

### MericodSaasRecord (Dashboard)

**Purpose**: Main dashboard for project management.

**Sections**:
- **SideNavigationSection**: Collapsible sidebar (Home, Library, Settings)
- **HomeSection**: Hero area with project cards
- **VideoLibrarySection**: User's video projects
- **SettingsSection**: Account settings

**State**:
```typescript
const [active, setActive] = useState<string>("Home");
const [isCollapsed, setIsCollapsed] = useState(false);
const [isDarkMode, setIsDarkMode] = useState(false);
```

**Features**:
- Dark/light mode toggle
- Sidebar collapse animation
- Project templates grid
- AI tools showcase

---

### ProjectScreen (Video Editor)

**Purpose**: Full-featured video editor with timeline, effects, and export.

**Core State** (50+ state variables):
```typescript
// UI State
const [activeTab, setActiveTab] = useState<'video' | 'article'>('video');
const [activeSidebarItem, setActiveSidebarItem] = useState<SidebarMenuItem | null>('script');
const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
const [backgroundColor, setBackgroundColor] = useState('#1a1625');

// Video Playback
const [videoUrl, setVideoUrl] = useState<string | null>(null);
const [isPlaying, setIsPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const [volume, setVolume] = useState(1);

// Clip-Based Audio (3 clips)
const [clipAudioUrls, setClipAudioUrls] = useState({
  intro: null,
  video: null,
  outro: null
});
const [currentClipAudio, setCurrentClipAudio] = useState<string | null>(null);
const [hasSpeechGenerated, setHasSpeechGenerated] = useState(false);

// Processing
const [preparing, setPreparing] = useState(true);
const [generatingSpeech, setGeneratingSpeech] = useState(false);
const [exporting, setExporting] = useState(false);
const [results, setResults] = useState<any>(null);

// Effects
const [normalizedEffects, setNormalizedEffects] = useState<any[]>([]);
const [textElements, setTextElements] = useState<any[]>([]);
const [recordingDimensions, setRecordingDimensions] = useState<{
  recordingWidth: number;
  recordingHeight: number;
} | null>(null);
```

**Key Sections**:

#### HeaderSection
```tsx
<HeaderSection
  title="Video Project"
  onExport={handleExport}
  isExporting={exporting}
  canExport={!!results && !!recordingDimensions}
/>
```

#### SideNavigationSection
```tsx
<SideNavigationSection
  activeItem={activeSidebarItem}
  onItemClick={handleSidebarItemClick}
/>
// Items: script, elements, templates, music, captions
```

#### TranscriptionSection
```tsx
<TranscriptionSection
  narrations={narrations}
  isVisible={activeSidebarItem === 'script'}
  onClose={() => setActiveSidebarItem(null)}
  onSyncPointClick={handleSyncPointClick}
  onGenerateScript={handleGenerateSpeech}
  isGenerating={generatingSpeech}
  hasProcessedAudio={!!processedAudioUrl}
  currentTime={currentTime}
/>
```

**Features**:
- Word-level highlighting (synchronized with audio)
- "Sync Point" buttons at word level (when clicked, jumps to that timestamp)
- "Generate Speech" button (calls ElevenLabs TTS)
- Real-time scrolling to active narration

#### MusicSection
```tsx
<MusicSection
  isVisible={activeSidebarItem === 'music'}
  onClose={() => setActiveSidebarItem(null)}
  onMusicSelect={(url, filename) => {
    console.log('[Music] Selected:', filename, url);
  }}
/>
```

**Features**:
- Music library browser (fetches from S3)
- Category filters (All, Uploads, Corporate, Acoustic, etc.)
- Play/pause preview
- Favorite tracks
- Upload from device (multipart form upload)

#### MainCanvasSection
```tsx
<MainCanvasSection
  aspectRatio={aspectRatio}
  backgroundColor={backgroundColor}
  onAspectRatioChange={setAspectRatio}
  onBackgroundColorChange={setBackgroundColor}
  videoWidth={recordingDimensions?.recordingWidth}
  videoHeight={recordingDimensions?.recordingHeight}
  controls={<VideoControls ... />}
>
  <VideoLayer
    videoUrl={videoUrl}
    videoRef={videoRef}
    videoLayerRef={videoLayerRef}
  />
</MainCanvasSection>
```

**Features**:
- Aspect ratio dropdown (16:9, 9:16, 1:1, 4:5, etc.)
- Background color picker
- Dynamic canvas sizing (based on selected aspect ratio)
- Video scales to 85% of canvas (padding for background color)
- Timeline scrubber (3 clips: intro, video, outro)

---

## State Management

**Approach**: React Hooks - no Redux/Zustand overhead.

### useState Patterns

**Simple UI State**:
```typescript
const [isOpen, setIsOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<string | null>(null);
```

**Complex Object State**:
```typescript
const [clipAudioUrls, setClipAudioUrls] = useState({
  intro: null,
  video: null,
  outro: null
});

// Update specific clip
setClipAudioUrls(prev => ({
  ...prev,
  intro: 'https://cdn.../intro/generated.mp3'
}));
```

### useEffect Patterns

**Data Fetching**:
```typescript
useEffect(() => {
  if (!sessionId) return;
  
  const fetchData = async () => {
    const response = await processSession(sessionId);
    setResults(response);
  };
  
  fetchData();
}, [sessionId]);
```

**Audio Clip Switching**:
```typescript
useEffect(() => {
  if (!activeClip) return;
  
  const clipName = activeClip.name; // 'intro' | 'video' | 'outro'
  const audioUrl = clipAudioUrls[clipName];
  
  if (!audioUrl) {
    console.log('[Audio] No audio for clip:', clipName);
    return;
  }
  
  if (audioUrl !== currentClipAudio) {
    console.log('[Audio] Switching to:', clipName, audioUrl);
    
    const audio = audioRef.current;
    audio.pause();
    audio.src = formatCdnUrl(audioUrl);
    audio.load();
    
    audio.onloadeddata = () => {
      const clipRelativeTime = currentTime - activeClip.start;
      audio.currentTime = Math.max(0, clipRelativeTime);
      
      if (isPlaying) {
        audio.play();
      }
    };
    
    setCurrentClipAudio(audioUrl);
  }
}, [activeClip, clipAudioUrls, currentTime, isPlaying]);
```

**Video Metadata Loading**:
```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  
  const handleLoadedMetadata = () => {
    console.log('[Video] Metadata loaded:', {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration
    });
    
    setRecordingDimensions({
      recordingWidth: video.videoWidth,
      recordingHeight: video.videoHeight
    });
  };
  
  video.addEventListener('loadedmetadata', handleLoadedMetadata);
  
  return () => {
    video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  };
}, [videoUrl]);
```

### useCallback for Performance

```typescript
const handlePlayPause = useCallback(() => {
  const video = videoRef.current;
  if (!video) return;
  
  // Handle intro/outro (manual 60fps loop)
  if (activeClip?.name !== 'video') {
    if (isPlaying) {
      // Pause manual loop
      setIsPlaying(false);
    } else {
      // Start manual loop
      setIsPlaying(true);
      
      const audio = audioRef.current;
      const clipRelativeTime = currentTime - activeClip.start;
      audio.currentTime = clipRelativeTime;
      audio.play();
    }
    return;
  }
  
  // Handle video clip (native video playback)
  if (video.paused) {
    video.play();
    setIsPlaying(true);
  } else {
    video.pause();
    setIsPlaying(false);
  }
}, [isPlaying, activeClip, currentTime]);
```

### useRef for DOM Access

```typescript
const videoRef = useRef<HTMLVideoElement>(null);
const audioRef = useRef<HTMLAudioElement>(null);
const aiAudioRef = useRef<HTMLAudioElement>(null);
const videoLayerRef = useRef<HTMLDivElement>(null);
const rafRef = useRef<number | null>(null);

// Access DOM
videoRef.current.play();
videoLayerRef.current.style.transform = 'scale(1.5)';
```

---

## Video Player Logic

### Timeline Architecture

**3-Clip Structure**:
```typescript
interface Timeline {
  videoDuration: number;  // Total timeline (e.g., 45s)
  clips: [
    { name: 'intro', start: 0, end: 3, backgroundColor: '#1a1625' },
    { name: 'video', start: 3, end: 42.255, url: 'video.webm' },
    { name: 'outro', start: 42.255, end: 45.255, backgroundColor: '#1a1625' }
  ]
}
```

**Active Clip Detection**:
```typescript
function getActiveClip(timeline, currentTime) {
  for (const clip of timeline.clips) {
    if (currentTime >= clip.start && currentTime < clip.end) {
      return clip;
    }
  }
  return timeline.clips[timeline.clips.length - 1]; // Default to last
}
```

### Time Conversions

**Timeline Time → Raw Video Time**:
```typescript
function timelineToVideoTime(timeline, timelineTime) {
  const videoClip = timeline.clips.find(c => c.name === 'video');
  if (!videoClip) return 0;
  
  if (timelineTime < videoClip.start) return 0; // Intro
  if (timelineTime >= videoClip.end) return videoClip.end - videoClip.start; // Outro
  
  return timelineTime - videoClip.start; // Video
}

// Example:
timelineToVideoTime(timeline, 5)  // 5s timeline → 2s video (5 - 3)
timelineToVideoTime(timeline, 1)  // 1s timeline → 0s video (intro)
```

**Raw Video Time → Timeline Time**:
```typescript
function videoTimeToTimelineTime(timeline, videoTime) {
  const videoClip = timeline.clips.find(c => c.name === 'video');
  if (!videoClip) return videoTime;
  
  return videoClip.start + videoTime;
}

// Example:
videoTimeToTimelineTime(timeline, 10) // 10s video → 13s timeline (10 + 3)
```

### Playback Modes

```typescript
type PlaybackMode = 'intro' | 'video' | 'outro';

// Intro/Outro: Manual 60fps loop (video paused, audio plays)
// Video: Native video playback (video + audio sync)
```

### Manual Playback Loop (Intro/Outro)

```typescript
useEffect(() => {
  if (!isPlaying) return;
  if (!activeClip) return;
  if (activeClip.name === 'video') return; // Skip for video clip
  
  console.log('[Manual Loop] Starting for clip:', activeClip.name);
  
  const interval = setInterval(() => {
    setCurrentTime(prev => {
      const next = prev + 0.016; // 60fps (16ms)
      
      // Check if we've reached the end of this clip
      if (next >= activeClip.end) {
        console.log('[Manual Loop] Clip ended:', activeClip.name);
        
        // Transition to next clip
        const nextClip = getActiveClip(results.timeline, activeClip.end + 0.001);
        
        if (nextClip.name === 'video') {
          // Transition to video playback
          setActiveClip(nextClip);
          videoRef.current.currentTime = 0;
          videoRef.current.play();
        } else {
          // Continue manual loop for outro
          setActiveClip(nextClip);
        }
        
        return activeClip.end;
      }
      
      return next;
    });
  }, 16); // 60fps
  
  return () => clearInterval(interval);
}, [isPlaying, activeClip, results]);
```

### Video → Timeline Synchronization (RAF)

```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  
  let rafId: number | null = null;
  let lastSyncTime = 0;
  
  const updateTimeline = () => {
    if (!video.paused) {
      // Convert video time to timeline time
      const timelineTime = videoTimeToTimelineTime(results.timeline, video.currentTime);
      setCurrentTime(timelineTime);
      
      // Sync audio every 100ms (not every frame)
      const now = performance.now();
      if (now - lastSyncTime > 100) {
        const clipRelativeTime = timelineTime - activeClip.start;
        const audio = audioRef.current;
        const diff = Math.abs(clipRelativeTime - audio.currentTime);
        
        if (diff > 0.3) {
          console.log('[Sync] Correcting audio drift:', diff);
          audio.currentTime = clipRelativeTime;
        }
        
        lastSyncTime = now;
      }
      
      rafId = requestAnimationFrame(updateTimeline);
    }
  };
  
  video.addEventListener('play', () => {
    rafId = requestAnimationFrame(updateTimeline);
  });
  
  video.addEventListener('pause', () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });
  
  video.addEventListener('seeked', () => {
    const timelineTime = videoTimeToTimelineTime(results.timeline, video.currentTime);
    setCurrentTime(timelineTime);
  });
  
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}, [results, activeClip]);
```

### Audio Management

**Clip-Based Audio Structure**:
```typescript
// Before TTS generation
clipAudioUrls = {
  intro: 'recordings/session_123/intro/audio.webm',
  video: 'recordings/session_123/video/audio.webm',
  outro: 'recordings/session_123/outro/audio.webm'
}

// After TTS generation
clipAudioUrls = {
  intro: 'recordings/session_123/intro/generated.mp3',
  video: 'recordings/session_123/video/generated.mp3',
  outro: 'recordings/session_123/outro/generated.mp3'
}
```

**Audio Switching Logic**:
```typescript
useEffect(() => {
  if (!activeClip) return;
  
  const clipName = activeClip.name;
  const audioUrl = clipAudioUrls[clipName];
  
  if (!audioUrl) {
    console.log('[Audio] No audio for clip:', clipName);
    return;
  }
  
  if (audioUrl !== currentClipAudio) {
    console.log('[Audio] Switching to:', clipName, audioUrl);
    
    const audio = hasSpeechGenerated ? aiAudioRef.current : audioRef.current;
    audio.pause();
    audio.src = formatCdnUrl(audioUrl);
    audio.load();
    
    audio.onloadeddata = () => {
      const clipRelativeTime = currentTime - activeClip.start;
      audio.currentTime = Math.max(0, clipRelativeTime);
      
      if (isPlaying) {
        audio.play();
      }
    };
    
    setCurrentClipAudio(audioUrl);
  }
}, [activeClip, clipAudioUrls, hasSpeechGenerated]);
```

---

## Effect Processing

### effectProcessor.js

**Purpose**: Calculate CSS transforms for preview rendering (zoom, pan).

#### normalizeCoordinates

Converts recording coordinates to video space and calculates auto-scale.

```javascript
export function normalizeCoordinates(
  bounds,
  recordingWidth,
  recordingHeight,
  videoWidth,
  videoHeight
) {
  // 1. Normalize to video dimensions
  const scaleX = videoWidth / recordingWidth;
  const scaleY = videoHeight / recordingHeight;
  
  const x = bounds.x * scaleX;
  const y = bounds.y * scaleY;
  const width = bounds.width * scaleX;
  const height = bounds.height * scaleY;
  
  // 2. Calculate center point
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  // 3. Normalize to 0-1 (for FFmpeg)
  const anchorX = centerX / videoWidth;
  const anchorY = centerY / videoHeight;
  
  // 4. Calculate auto-scale
  const areaRatio = (width * height) / (videoWidth * videoHeight);
  const widthRatio = width / videoWidth;
  const heightRatio = height / videoHeight;
  const dominantRatio = Math.max(widthRatio, heightRatio);
  const effectiveRatio = Math.max(areaRatio, dominantRatio);
  
  let autoScale;
  if (effectiveRatio < 0.01) {
    autoScale = 2.0 + (0.01 - effectiveRatio) / 0.01 * 0.5; // 2.0-2.5x
  } else if (effectiveRatio < 0.1) {
    autoScale = 1.5 + (0.1 - effectiveRatio) / 0.09 * 0.5; // 1.5-2.0x
  } else if (effectiveRatio < 0.5) {
    autoScale = 1.2 + (0.5 - effectiveRatio) / 0.4 * 0.3; // 1.2-1.5x
  } else {
    autoScale = 1.15; // Minimal zoom for large elements
  }
  
  return {
    centerX,
    centerY,
    anchorX,
    anchorY,
    autoScale,
    startScale: 1.0,
    endScale: autoScale,
    effectiveRatio
  };
}
```

#### calculateZoomTransform

Camera-zoom formula with edge clamping.

```javascript
export function calculateZoomTransform(
  progress,
  anchorX,
  anchorY,
  targetScale,
  initialSizeRatio = 0.94
) {
  const scale = 1.0 + (targetScale - 1.0) * progress;
  
  // Camera-zoom: pan to keep anchor centered
  const translateX = (0.5 - anchorX) * (scale - 1) * 100; // Percentage
  const translateY = (0.5 - anchorY) * (scale - 1) * 100;
  
  return { scale, translateX, translateY };
}
```

#### computeEffectProgressWithContinuation

Fixed-time easing with continuation support.

```javascript
export function computeEffectProgressWithContinuation(
  currentTime,
  start,
  end,
  easeInPct,
  easeOutPct,
  hasContinuation
) {
  if (currentTime < start) return 0;
  if (currentTime >= end) return hasContinuation ? 1 : 0; // Hold if continuation
  
  const duration = end - start;
  const elapsed = currentTime - start;
  
  // FIXED TIME (not percentage)
  const easeInTime = Math.min(0.4, duration * easeInPct); // 0.4s or 15%
  const easeOutTime = Math.min(0.6, duration * easeOutPct); // 0.6s or 20%
  
  // Ease in
  if (elapsed < easeInTime) {
    const t = elapsed / easeInTime;
    return easeInOutCubic(t); // Fast zoom in
  }
  
  // Hold
  if (elapsed < duration - easeOutTime || hasContinuation) {
    return 1.0; // Stay at full zoom
  }
  
  // Ease out
  const t = (duration - elapsed) / easeOutTime;
  return easeInOutQuad(t); // Smooth zoom out
}
```

#### Effect Rendering (RAF)

```typescript
useEffect(() => {
  const video = videoRef.current;
  const videoLayer = videoLayerRef.current;
  if (!video || !videoLayer) return;
  
  let rafId: number | null = null;
  
  const renderFrame = () => {
    const activeEffects = getActiveEffects(normalizedEffects, video.currentTime);
    
    if (activeEffects.length > 0) {
      const effect = resolveZoomEffect(activeEffects);
      const { anchorX, anchorY, autoScale } = effect.normalizedBounds;
      
      const hasContinuation = hasEffectContinuation(effect, normalizedEffects);
      const progress = computeEffectProgressWithContinuation(
        video.currentTime,
        effect.start,
        effect.end,
        0.20,
        0.40,
        hasContinuation
      );
      
      const { scale, translateX, translateY } = calculateZoomTransform(
        progress,
        anchorX,
        anchorY,
        autoScale,
        0.94
      );
      
      const finalScale = 0.94 * scale; // Base video size = 94% of canvas
      videoLayer.style.transform = 
        `scale3d(${finalScale}, ${finalScale}, 1) translate3d(${translateX}%, ${translateY}%, 0)`;
    } else {
      // Reset to neutral
      videoLayer.style.transform = 'scale3d(0.94, 0.94, 1) translate3d(0%, 0%, 0)';
    }
    
    rafId = requestAnimationFrame(renderFrame);
  };
  
  video.addEventListener('play', () => {
    rafId = requestAnimationFrame(renderFrame);
  });
  
  video.addEventListener('pause', () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });
  
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}, [normalizedEffects, recordingDimensions]);
```

---

## Text Elements Rendering

### TextOverlayLayer Component

**Purpose**: Render text overlays on intro/outro clips with responsive positioning and styling.

**File**: `src/screens/Project/sections/VideoPlayerSection/TextOverlayLayer.tsx`

**TypeScript Interfaces**:
```typescript
interface TextElement {
    type: string;
    content: string;
    start: number;
    end: number;
    position: { x: number; y: number };
    dimension: { width: number; height: number };
    style: {
        fontFamily: string;
        fontSize: number;
        fontWeight: string;
        color: string;
        outline?: { width: number; color: string };
        shadow?: { color: string; position: { x: number; y: number } };
        background?: { color: string; borderRadius: number };
    };
}

interface TextOverlayLayerProps {
    textElements: TextElement[];
    currentTime: number;
    recordingWidth: number;
    recordingHeight: number;
}
```

**Rendering Logic**:
```typescript
export const TextOverlayLayer: React.FC<TextOverlayLayerProps> = ({
    textElements,
    currentTime,
    recordingWidth,
    recordingHeight
}) => {
    // Filter active text elements based on current time
    const activeElements = textElements.filter(
        element => currentTime >= element.start && currentTime <= element.end
    );
    
    // Convert pixel coordinates to percentages for responsive rendering
    const toPercentage = (value: number, total: number): number => {
        return (value / total) * 100;
    };
    
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1000 }}>
            {activeElements.map((element, index) => {
                const leftPercent = toPercentage(element.position.x, recordingWidth);
                const topPercent = toPercentage(element.position.y, recordingHeight);
                const widthPercent = toPercentage(element.dimension.width, recordingWidth);
                const heightPercent = toPercentage(element.dimension.height, recordingHeight);
                const fontSizePercent = (element.style.fontSize / recordingHeight) * 100;
                
                const textStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`,
                    fontFamily: `"${element.style.fontFamily}", "Inter", sans-serif`,
                    fontSize: `${fontSizePercent}%`,
                    fontWeight: element.style.fontWeight,
                    color: element.style.color,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                };
                
                // Add outline (WebkitTextStroke)
                if (element.style.outline) {
                    textStyle.WebkitTextStroke = `${element.style.outline.width}px ${element.style.outline.color}`;
                    textStyle.paintOrder = 'stroke fill';
                }
                
                // Add shadow
                if (element.style.shadow) {
                    textStyle.textShadow = `${element.style.shadow.position.x}px ${element.style.shadow.position.y}px 0px ${element.style.shadow.color}`;
                }
                
                // Add background (outro only)
                if (element.style.background) {
                    textStyle.backgroundColor = element.style.background.color;
                    textStyle.borderRadius = `${element.style.background.borderRadius}px`;
                    textStyle.padding = '0.5em 1.5em';
                }
                
                return (
                    <div key={index} style={textStyle}>
                        {element.content}
                    </div>
                );
            })}
        </div>
    );
};
```

**Font Loading** (`index.html`):
```html
<style>
  @import url("https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300;400;500;600;700;800&display=swap");
</style>
```

### VideoLayer Integration

**Updated VideoLayer Props**:
```typescript
interface VideoLayerProps {
    videoUrl: string | null;
    videoRef: React.RefObject<HTMLVideoElement>;
    videoLayerRef?: React.RefObject<HTMLDivElement>;
    isVideoVisible?: boolean;
    textElements?: TextElement[];
    currentTime?: number;
    recordingWidth?: number;
    recordingHeight?: number;
}
```

**Rendering**:
```tsx
export const VideoLayer: React.FC<VideoLayerProps> = ({
    videoUrl,
    videoRef,
    videoLayerRef,
    isVideoVisible = true,
    textElements = [],
    currentTime = 0,
    recordingWidth = 1920,
    recordingHeight = 1080
}) => {
    return (
        <div ref={videoLayerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Video element */}
            <video ref={videoRef} ...>
            
            {/* Text Overlay Layer */}
            <TextOverlayLayer
                textElements={textElements}
                currentTime={currentTime}
                recordingWidth={recordingWidth}
                recordingHeight={recordingHeight}
            />
        </div>
    );
};
```

### Text Elements Extraction (project.tsx)

**Data Flow**:
```typescript
// Parse and normalize effects when results are available
useEffect(() => {
    if (!recordingDimensions) return;

    // Extract effects from displayElements
    let effectsArray: any[] = [];
    let textElementsArray: any[] = [];
    
    if (results?.displayElements) {
        // Flatten effects from clip-based structure
        effectsArray = results.displayElements.flatMap((element: any) => element.effects || []);
        
        // Extract text elements from displayElements
        textElementsArray = results.displayElements.flatMap((element: any) => element.elements || []);
        console.log('[TextElements] Extracted:', textElementsArray.length, 'text elements');
    }
    
    // Store in state
    setTextElements(textElementsArray);
    setNormalizedEffects(effectsArray);
}, [results, recordingDimensions]);
```

**Props Passing**:
```tsx
<VideoLayer
    videoUrl={videoUrl}
    videoRef={videoRef}
    videoLayerRef={videoLayerRef}
    isVideoVisible={videoVisible}
    textElements={textElements}
    currentTime={currentTime}
    recordingWidth={recordingDimensions?.recordingWidth}
    recordingHeight={recordingDimensions?.recordingHeight}
/>
```

### Known Issues

⚠️ **CRITICAL**: Text overlays are not currently rendering on frontend despite correct implementation:

1. **Font Loading**: Funnel Display font imported from Google Fonts in index.html
2. **Data Extraction**: Text elements correctly extracted from `displayElements[].elements` array
3. **Component Rendering**: TextOverlayLayer component is rendered with correct props
4. **Positioning**: Using percentage-based coordinates for responsive layout
5. **Z-Index**: Text overlay layer has z-index: 1000 to appear on top
6. **Time Filtering**: Active elements filtered by currentTime (start <= currentTime <= end)

**Possible Causes**:
- Font size calculation using percentage units may not scale properly with parent container
- MainCanvasSection wraps video in 85% scaled container, affecting absolute positioning
- WebkitTextStroke outline (2px) may be too thick and obscure text
- Time filtering boundary conditions (start/end comparison)
- Container stacking context issues with transform/opacity applied to VideoLayer

**Debugging Steps**:
```typescript
// Console logs added for debugging
console.log('[VideoLayer] Text elements:', textElements.length, 'Current time:', currentTime);
console.log('[TextOverlayLayer] Total elements:', textElements.length, 'Active:', activeElements.length);
```

**Expected Behavior**:
- Intro clip (0-3s): Bold white text with black outline on pink background
- Video clip (3-N): No text overlay (empty elements array)
- Outro clip (N-N+3): Light white text with black outline + pink background (#C14B8A)

**Backend Data (Confirmed Working)**:
```json
{
  "displayElements": [
    {
      "clipName": "intro",
      "elements": [
        {
          "type": "text",
          "content": "Book Your Perfect Airbnb",
          "start": 0,
          "end": 3,
          "position": { "x": 0, "y": 420 },
          "dimension": { "width": 1920, "height": 180 },
          "style": { "fontFamily": "Funnel Display", "fontSize": 126, "fontWeight": "Bold", ... }
        }
      ]
    }
  ]
}
```

---

## API Integration

### backend-api.js

**Base URLs**:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
```

**CDN URL Formatting**:
```typescript
const CDN_BASE = 'https://cdn.vocallabs.ai';

export const formatCdnUrl = (url: string): string => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  
  const path = url.startsWith('/') ? url.slice(1) : url;
  return `${CDN_BASE}/${path}`;
};
```

**Process Session**:
```javascript
export async function processSession(sessionId) {
  const response = await fetch(`${API_BASE_URL}/api/process-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  
  if (!response.ok) {
    throw new Error('Processing failed');
  }
  
  const data = await response.json();
  
  // Convert S3 paths to CDN URLs
  return {
    ...data,
    videoUrl: formatCdnUrl(data.videoUrl),
    audioUrl: formatCdnUrl(data.audioUrl),
    processedAudioUrl: formatCdnUrl(data.processedAudioUrl),
    timeline: {
      ...data.timeline,
      clips: data.timeline.clips.map(clip => ({
        ...clip,
        url: clip.url ? formatCdnUrl(clip.url) : null
      }))
    },
    narrations: data.narrations.map(n => ({
      ...n,
      audioUrl: formatCdnUrl(n.audioUrl)
    }))
  };
}
```

**Generate Speech**:
```javascript
export async function generateSpeech(sessionId, provider = 'deepgram', speed = 1.0) {
  const response = await fetch(`${API_BASE_URL}/api/generate-speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, provider, speed })
  });
  
  if (!response.ok) {
    throw new Error('Speech generation failed');
  }
  
  const data = await response.json();
  return {
    ...data,
    audioUrl: formatCdnUrl(data.audioUrl)
  };
}
```

**Export Video**:
```javascript
export async function exportVideo(sessionId, instructions, dimensions, options) {
  const response = await fetch(`${API_BASE_URL}/api/export-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      frame: dimensions,
      effects: instructions,
      backgroundColor: options.backgroundColor,
      aspectRatio: options.aspectRatio,
      outputResolution: dimensions
    })
  });
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  const data = await response.json();
  return {
    ...data,
    renderedVideoUrl: formatCdnUrl(data.renderedVideoUrl)
  };
}
```

### WebSocket Integration (useProcessingWebSocket)

```javascript
export function useProcessingWebSocket(sessionId) {
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);
  
  const ws = useRef(null);
  
  useEffect(() => {
    if (!sessionId) return;
    
    const wsUrl = `${WS_BASE_URL}/ws/${sessionId}`;
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      console.log('[WS] Connected');
      setConnected(true);
    };
    
    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'progress':
          setProgress(message.data);
          break;
        case 'complete':
          setCompleted(true);
          break;
        case 'error':
          setError(message.data.message);
          break;
      }
    };
    
    ws.current.onerror = () => {
      setError('WebSocket connection error');
    };
    
    ws.current.onclose = () => {
      console.log('[WS] Disconnected');
      setConnected(false);
      
      // Auto-reconnect after 3s
      setTimeout(() => {
        if (ws.current && ws.current.readyState === WebSocket.CLOSED) {
          reconnect();
        }
      }, 3000);
    };
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [sessionId]);
  
  const reconnect = () => {
    if (ws.current) {
      ws.current.close();
    }
    // Trigger re-connection by toggling sessionId (hacky but works)
  };
  
  return { connected, progress, error, completed, reconnect };
}
```

**Usage**:
```typescript
const { progress, completed, error } = useProcessingWebSocket(sessionId);

// Show progress
{progress && (
  <div className="progress-bar">
    <div className="fill" style={{ width: `${progress.percent}%` }} />
    <span>{progress.message}</span>
  </div>
)}

// Show completion
{completed && <SuccessMessage />}

// Show error
{error && <ErrorAlert message={error} />}
```

---

## Deployment

### Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Output: dist/
```

### Environment Variables

```bash
# .env
VITE_API_URL=https://api.vocallabs.ai
VITE_WS_URL=wss://api.vocallabs.ai
VITE_GRAPHQL_URL=https://db.vocallabs.ai/v1/graphql
VITE_CDN_URL=https://cdn.vocallabs.ai
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name app.vocallabs.ai;
    
    root /var/www/explaino/dist;
    index index.html;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket proxy
    location /ws/ {
        proxy_pass http://localhost:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## Performance Optimizations

1. **RequestAnimationFrame** for 60fps effect rendering
2. **Throttled audio sync** (100ms instead of every frame)
3. **GPU acceleration** with `transform3d` and `will-change: transform`
4. **useCallback** to prevent unnecessary re-renders
5. **CDN caching** for media files (CloudFront)
6. **Code splitting** (React.lazy for heavy components)
7. **Tailwind purge** for minimal CSS bundle

---

## Video Selection System

### Overview
The video selection system allows users to click on the video to select it, showing a visual border and enabling editing features like border radius adjustment.

### Components

#### VideoSelectionBorder.tsx
**Location**: `src/screens/Project/sections/MainCanvasSection/VideoSelectionBorder.tsx`

**Purpose**: Renders a sky-blue border around the selected video with corner handles (like design tools).

**Props**:
```typescript
interface VideoSelectionBorderProps {
    isSelected: boolean;
    videoDimensions: { width: number; height: number } | null;
}
```

**Styling**:
- Color: Sky blue (`#38BDF8`) matching Clueso design system
- Border: Always sharp corners (0px radius), never rounded
- Positioning: Calculated based on actual rendered video dimensions
- Handles: Small circles at each corner for visual feedback

**Implementation**:
```tsx
export const VideoSelectionBorder: React.FC<VideoSelectionBorderProps> = ({ 
    isSelected, 
    videoDimensions 
}) => {
    if (!isSelected || !videoDimensions) return null;
    
    const { width, height } = videoDimensions;
    const handleSize = 8; // Size of corner handles
    
    return (
        <div 
            style={{
                position: 'absolute',
                border: '2px solid #38BDF8', // Sky blue
                borderRadius: '0px', // Always sharp corners
                pointerEvents: 'none',
                // Position using calc() based on actual video size
                top: `calc(50% - ${height / 2}px)`,
                left: `calc(50% - ${width / 2}px)`,
                width: `${width}px`,
                height: `${height}px`,
            }}
        >
            {/* Corner handles */}
            <div style={{ /* top-left handle */ }} />
            <div style={{ /* top-right handle */ }} />
            <div style={{ /* bottom-left handle */ }} />
            <div style={{ /* bottom-right handle */ }} />
        </div>
    );
};
```

### Responsive Positioning

The selection border automatically adapts to:

1. **Video Aspect Ratio**: Calculates actual rendered size using object-contain logic
2. **Window Resize**: Updates dimensions on window resize events
3. **Timeline Changes**: Uses ResizeObserver to detect container size changes
4. **Zoom Effects**: Maintains position during video zoom transformations

**Dimension Calculation** (VideoPlayerSection.tsx):
```typescript
const updateVideoDimensions = () => {
    const video = videoRef.current;
    const container = videoLayerRef.current;
    
    if (video && container) {
        // Get video's natural aspect ratio
        const videoAspect = video.videoWidth / video.videoHeight;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const containerAspect = containerWidth / containerHeight;
        
        let renderedWidth, renderedHeight;
        
        // Calculate actual rendered size (object-contain logic)
        if (videoAspect > containerAspect) {
            // Video is wider - limited by width
            renderedWidth = containerWidth;
            renderedHeight = containerWidth / videoAspect;
        } else {
            // Video is taller - limited by height
            renderedHeight = containerHeight;
            renderedWidth = containerHeight * videoAspect;
        }
        
        setVideoDimensions({ width: renderedWidth, height: renderedHeight });
    }
};

// Update on:
video.addEventListener('loadedmetadata', updateVideoDimensions);
window.addEventListener('resize', updateVideoDimensions);

// ResizeObserver for timeline height changes
const resizeObserver = new ResizeObserver(updateVideoDimensions);
resizeObserver.observe(container);
```

### Click Handling

**VideoLayer Component**:
```typescript
const handleVideoClick = (e: React.MouseEvent) => {
    if (!hasMedia) return; // Don't select empty clips
    
    e.stopPropagation(); // Prevent deselection
    if (onVideoClick) {
        onVideoClick(); // Notify parent
    }
};
```

**Project Component**:
```typescript
const [isVideoSelected, setIsVideoSelected] = useState(false);

const handleVideoClick = () => {
    setIsVideoSelected(true);
};

const handleDocumentClick = (e: MouseEvent) => {
    // Deselect when clicking outside
    if (!(e.target as HTMLElement).closest('.video-layer')) {
        setIsVideoSelected(false);
    }
};

useEffect(() => {
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
}, []);
```

---

## Border Radius Feature

### Overview
Users can adjust video corner rounding from 0% (sharp corners) to 20% (very rounded) using a slider in the toolbar.

### UI Components

#### RoundingDropdown.tsx
**Location**: `src/screens/Project/sections/MainCanvasSection/RoundingDropdown.tsx`

**Purpose**: Dropdown panel with a slider for adjusting border radius.

**Features**:
- Range: 0-20% (percentage of video dimensions)
- Default: 3% (subtle rounding)
- Real-time preview
- Visual feedback with rounded rectangle icon

**Implementation**:
```tsx
interface RoundingDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    value: number; // 0-20
    onChange: (value: number) => void;
}

export const RoundingDropdown: React.FC<RoundingDropdownProps> = ({
    isOpen,
    onClose,
    value,
    onChange
}) => {
    if (!isOpen) return null;
    
    return (
        <div className="absolute top-full mt-2 bg-[#2a2a3e] rounded-lg shadow-lg p-4 w-64">
            <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm font-medium">Corner Rounding</span>
                <span className="text-gray-400 text-sm">{value}%</span>
            </div>
            
            <input
                type="range"
                min="0"
                max="20"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-sky-500"
            />
            
            <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Sharp</span>
                <span>Rounded</span>
            </div>
        </div>
    );
};
```

#### VideoEditToolbar Integration
**Location**: `src/screens/Project/sections/MainCanvasSection/VideoEditToolbar.tsx`

```tsx
const [isRoundingDropdownOpen, setIsRoundingDropdownOpen] = useState(false);

<button
    onClick={() => setIsRoundingDropdownOpen(!isRoundingDropdownOpen)}
    className={`... ${isRoundingDropdownOpen ? 'bg-[#4a4a5e]' : 'bg-[#3b3b50]'}`}
>
    <RectangleHorizontal size={18} />
</button>

<RoundingDropdown
    isOpen={isRoundingDropdownOpen}
    onClose={() => setIsRoundingDropdownOpen(false)}
    value={roundingValue}
    onChange={onRoundingChange}
/>
```

### Data Flow

**1. MainCanvasSection State**:
```typescript
const [roundingValue, setRoundingValue] = useState(() => {
    return activeClip?.media?.[0]?.borderRadius ?? 3;
});

// Sync with activeClip changes
useEffect(() => {
    const newValue = activeClip?.media?.[0]?.borderRadius ?? 3;
    setRoundingValue(newValue);
}, [activeClip]);
```

**2. Handler Chain**:
```
User drags slider
    ↓
RoundingDropdown.onChange(value)
    ↓
VideoEditToolbar.onRoundingChange(value)
    ↓
MainCanvasSection.onBorderRadiusChange(value)
    ↓
ProjectScreen.handleBorderRadiusChange(value)
    ↓
Update timeline.clips[].media[].borderRadius
```

**3. ProjectScreen Implementation**:
```typescript
const handleBorderRadiusChange = (value: number) => {
    console.log('[BorderRadius] Changing to:', value, 'for clip:', activeClip?.name);
    
    if (!results?.timeline || !activeClip) return;
    
    // Update timeline state
    const updatedTimeline = {
        ...results.timeline,
        clips: results.timeline.clips.map((clip: any) => {
            if (clip.name === activeClip.name) {
                return {
                    ...clip,
                    media: clip.media?.map((m: any) => ({
                        ...m,
                        borderRadius: value
                    }))
                };
            }
            return clip;
        })
    };
    
    setResults({
        ...results,
        timeline: updatedTimeline
    });
};
```

**4. Video Element Application**:
```tsx
<video
    style={{
        borderRadius: `${borderRadius}%`,
        overflow: 'hidden',
    }}
/>
```

### Important Notes

- **Only video gets rounded**: Selection border stays sharp (always 0px)
- **Container doesn't round**: BorderRadius applied to `<video>` element, not wrapper
- **Percentage-based**: Uses % units for responsive scaling
- **Per-clip setting**: Each clip (intro, video, outro) has its own borderRadius
- **Default values**:
  - Intro/outro: 0% (sharp corners for background-only clips)
  - Video: 3% (subtle rounding)

### React Key Optimization

To force re-renders when borderRadius changes:

```typescript
<VideoLayer
    key={`video-${activeClip?.name}-${activeClip?.media?.[0]?.borderRadius}`}
    borderRadius={activeClip?.media?.[0]?.borderRadius ?? 3}
/>
```

This ensures the video element updates immediately when the slider changes.

---

## Beginner's Guide to Explaino Frontend

### What is Explaino Frontend?

The Explaino frontend is a **video editor web application** that lets users:
1. View screen recordings
2. Edit narration scripts
3. Add music
4. Adjust video styling (border radius, aspect ratio, background color)
5. Preview zoom effects in real-time
6. Export polished tutorial videos

Think of it as **iMovie meets Loom** - a simple yet powerful video editor specifically designed for tutorial videos.

### Technology Stack (What We Use)

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **React 18.2** | UI framework | Makes building interactive UIs easier |
| **TypeScript** | Programming language | JavaScript with type safety (catches bugs before runtime) |
| **Vite 6** | Build tool | Super fast development server and builds |
| **Tailwind CSS 3.4** | Styling | Utility-first CSS framework for rapid UI development |
| **Apollo Client** | GraphQL client | Connects to Hasura database for user auth |
| **WebSocket** | Real-time updates | Shows processing progress (10%, 20%, 30%...) |

### Project Structure (What's Inside)

```
Explaino_frontend_v1/
├── src/
│   ├── index.tsx                     # App entry point
│   ├── components/
│   │   ├── AuthRoute.tsx            # Protect routes (login required)
│   │   └── ui/                      # Reusable components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       └── ...
│   ├── screens/
│   │   ├── Login/                   # Phone auth with OTP
│   │   ├── MericodSaasRecord/       # Dashboard
│   │   └── Project/                 # Video editor (main screen)
│   │       ├── project.tsx          # Main component (1400+ lines)
│   │       └── sections/
│   │           ├── HeaderSection/
│   │           ├── SideNavigationSection/
│   │           ├── TranscriptionSection/
│   │           ├── MusicSection/
│   │           ├── MainCanvasSection/
│   │           │   ├── MainCanvasSection.tsx
│   │           │   ├── VideoEditToolbar.tsx
│   │           │   ├── RoundingDropdown.tsx  # NEW: Border radius slider
│   │           │   ├── AspectRatioDropdown.tsx
│   │           │   ├── BackgroundPanel.tsx
│   │           │   ├── TimelineSection.tsx
│   │           │   └── VideoSelectionBorder.tsx  # NEW: Selection UI
│   │           └── VideoPlayerSection/
│   │               ├── VideoPlayerSection.tsx
│   │               ├── VideoLayer.tsx
│   │               ├── VideoControls.tsx
│   │               └── TextOverlayLayer.tsx
│   ├── hooks/
│   │   └── useProcessingWebSocket.js  # Real-time progress
│   ├── services/
│   │   └── backend-api.js             # API calls
│   ├── utils/
│   │   ├── effectProcessor.js         # Zoom calculations
│   │   ├── timelineUtils.ts           # Time conversions
│   │   └── instructionGenerator.js    # Export format
│   └── lib/
│       ├── apolloClient.ts            # GraphQL setup
│       ├── authManager.ts             # JWT tokens
│       └── utils.ts
├── public/
│   ├── index.html
│   └── favicon.ico
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### Key Concepts

#### 1. **Screens**
- **Login**: Phone number + OTP authentication
- **Dashboard**: Project list, templates
- **Project Editor**: Main video editing interface

#### 2. **Sections**
The Project Editor is divided into sections:
- **Header**: Title, export button
- **Sidebar**: Script, music, elements, templates
- **Main Canvas**: Video preview with toolbar
- **Timeline**: Clip sequence, effects, narrations

#### 3. **Timeline**
- 3 clips: Intro → Video → Outro
- Total duration: Intro (3s) + Video (39s) + Outro (3s) = 45s
- Each clip can have different audio, effects, and styling

#### 4. **Effects**
- **Zoom**: Highlight UI elements
- Real-time preview using CSS transforms
- GPU-accelerated for smooth 60fps

#### 5. **Audio System**
- **Clip-based audio**: Each clip (intro, video, outro) has its own audio file
- **Raw audio**: Original voice recording
- **AI audio**: Generated TTS (Text-to-Speech) after script refinement
- **Audio switching**: Automatically switches audio when crossing clip boundaries

#### 6. **State Management**
- Uses React Hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
- No Redux/Zustand - keeps it simple
- 50+ state variables in ProjectScreen

### How Video Playback Works

**Timeline vs Video Time**:
```
Timeline Time (0-45s):
[===Intro===][========Video========][===Outro===]
0s         3s                    42.255s      45.255s

Video Time (0-39s):
            [========Video========]
            0s                39.255s
```

**Conversion Functions**:
```typescript
// Timeline → Video
timelineToVideoTime(10) → 7  // 10s timeline = 7s video (10 - 3 offset)

// Video → Timeline
videoTimeToTimelineTime(7) → 10  // 7s video = 10s timeline (7 + 3 offset)
```

**Playback Modes**:
- **Intro/Outro**: Manual 60fps loop (video paused, audio plays)
- **Video**: Native video playback (video + audio sync)

### Common Questions (FAQ)

**Q: What is JSX/TSX?**
A: JSX is HTML-like syntax in JavaScript. TSX is JSX with TypeScript. Instead of writing `React.createElement()`, we write `<div>Hello</div>`.

**Q: What is a component?**
A: A reusable piece of UI. Like LEGO blocks - you build complex UIs by combining simple components.

**Q: What is useState?**
A: A React Hook that lets components remember data. Like a variable that causes re-renders when changed.

**Q: What is useEffect?**
A: A React Hook that runs code when something changes. Like an event listener.

**Q: What is useRef?**
A: A React Hook that gives you direct access to DOM elements (like `document.getElementById`).

**Q: What is Tailwind CSS?**
A: A utility-first CSS framework. Instead of writing `.button { padding: 10px; ... }`, you write `<button className="p-4 bg-blue-500">`.

**Q: What is TypeScript?**
A: JavaScript with types. Catches errors before you run the code. Example:
```typescript
// JavaScript
function add(a, b) { return a + b; }
add("5", 3); // "53" (oops!)

// TypeScript
function add(a: number, b: number): number { return a + b; }
add("5", 3); // ERROR: Type 'string' is not assignable to type 'number'
```

**Q: What is GPU acceleration?**
A: Using the graphics card (not just CPU) to render effects. Makes animations 10x smoother. We use:
```typescript
style={{
    transform: 'scale3d(1.5, 1.5, 1)',  // Use 3D transform
    willChange: 'transform',             // Tell browser to optimize
    backfaceVisibility: 'hidden'         // Prevent flickering
}}
```

---

## Security

1. **JWT tokens** with automatic refresh (24h lifespan)
2. **Protected routes** with `<ProtectedRoute>` guards
3. **XSS prevention** via React's auto-escaping
4. **CORS** configured in backend
5. **Presigned S3 URLs** (1-hour expiry)

---

## Future Enhancements

- [ ] Keyboard shortcuts (Space = play/pause, Left/Right = seek)
- [ ] Undo/redo system
- [ ] Multi-track audio (background music + voice)
- [ ] Custom fonts for text overlays
- [ ] Fade transitions between clips
- [ ] Video trimming (cut intro/outro)
- [ ] Export presets (1080p, 720p, 4K)
- [ ] Collaboration (multiple users editing)
- [ ] Comments/annotations on timeline
- [ ] Version history

---

**End of Frontend Documentation**  
**Version**: 2.0  
**Last Updated**: January 2026
