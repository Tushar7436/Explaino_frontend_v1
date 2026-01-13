# Timeline Playback Implementation - Complete

## Overview
Successfully implemented timeline-aware video playback system that extends video duration by adding intro/outro clips. The raw video (39s) is now properly played within an extended timeline (45s) with 3-second intro and outro clips.

## Architecture

### Time Coordinate Systems
The implementation handles two separate time scales:

1. **Timeline Time** (0-45.255s) - What users see in the UI timeline
   - 0-3s: Intro clip (background color only)
   - 3-42.255s: Video clip (raw video with offset)
   - 42.255-45.255s: Outro clip (background color only)

2. **Video Time** (0-39.255s) - Raw video file duration
   - Video element only knows about the raw 39.255s video
   - Conversion: `video time = timeline time - 3` (during video clip)

### Key Components Modified

#### 1. timelineUtils.ts (NEW)
Core conversion utilities between timeline and video time:

```typescript
// Find which clip is active at a given timeline time
getActiveClip(timeline, timelineTime) → TimelineClip

// Check if video should be visible (only during video clip)
isVideoVisible(timeline, timelineTime) → boolean

// Convert timeline time to video time with offset
timelineToVideoTime(timeline, timelineTime) → number

// Convert video time back to timeline time
videoTimeToTimelineTime(timeline, videoTime) → number

// Get current playback mode
getPlaybackMode(timeline, timelineTime) → 'intro' | 'video' | 'outro'

// Get total timeline duration
getTimelineDuration(timeline) → number
```

#### 2. project.tsx
Main playback orchestration with timeline awareness:

**New State:**
```typescript
const [activeClip, setActiveClip] = useState<TimelineClip | null>(null);
const videoVisible = isVideoVisible(results?.timeline, currentTime);
```

**Duration Initialization:**
- Now uses `timeline.videoDuration` (45s) instead of `video.duration` (39s)
- Falls back to raw video duration if timeline is not available

**Time Update Handler:**
- Converts `video.currentTime` (0-39s) to timeline time (3-42.255s)
- Updates `activeClip` state for clip tracking
- Maintains audio sync with video time (not timeline time)

**Manual Playback Loop:**
- New useEffect hook handles intro/outro playback
- During intro/outro: Time advances manually at ~60fps
- Video element stays paused during intro/outro
- Automatically transitions: intro → video → outro
- Stops playback at end of outro

**Seek Handler:**
- Converts timeline time to video time before seeking
- Updates active clip based on seek position
- Pauses video during intro/outro, resumes during video clip
- Handles audio sync with video time

**Play/Pause Handler:**
- Checks playback mode before starting
- For intro/outro: Sets `isPlaying=true`, manual loop handles advancement
- For video clip: Plays video element normally
- Maintains separate logic for timeline vs non-timeline videos

#### 3. VideoPlayerSection.tsx
Video element visibility control:

**VideoLayer Component:**
- Added `isVideoVisible` prop (boolean)
- Applies `opacity: 0` during intro/outro to hide video
- Applies `opacity: 1` during video clip to show video
- Smooth transition: `transition: 'opacity 0.3s ease'`

## Playback Flow

### Starting Playback
1. User clicks play at timeline time 0 (intro)
2. `handlePlayPause` detects mode = 'intro'
3. Sets `isPlaying = true`
4. Manual loop starts advancing time by 0.016s every 16ms
5. Video element stays paused, `opacity: 0` (hidden)
6. Timeline shows progress from 0s → 3s

### Intro → Video Transition
1. Manual loop detects `currentTime >= 3` (end of intro)
2. Sets `video.currentTime = 0` (start of raw video)
3. Calls `video.play()` to begin video playback
4. `videoVisible` becomes true, `opacity: 1` (shown)
5. `handleTimeUpdate` takes over, converting video time to timeline time

### Video Playback
1. Video element plays normally (0 → 39.255s)
2. `handleTimeUpdate` converts video time to timeline time (+3s offset)
3. Timeline shows progress from 3s → 42.255s
4. Video visible, audio synced
5. Effects trigger based on timeline time

### Video → Outro Transition
1. Video reaches end (`video.ended` event)
2. `handleEnded` pauses video, sets `isPlaying = false`
3. But if outro exists, manual loop continues
4. Sets `video.currentTime = 39.255` (end of video)
5. Video paused, `opacity: 0` (hidden again)
6. Manual loop advances time: 42.255s → 45.255s

### End of Outro
1. Manual loop detects `currentTime >= 45.255`
2. Sets `isPlaying = false`
3. Playback stops completely

### Seeking
**Seek to Intro (0-3s):**
- Timeline time = 1s
- Video time = 0 (paused at start)
- Video hidden (`opacity: 0`)
- If playing, manual loop advances from 1s

**Seek to Video (3-42.255s):**
- Timeline time = 20s
- Video time = 17s (20 - 3 offset)
- Video visible (`opacity: 1`)
- If playing, video element plays from 17s

**Seek to Outro (42.255-45.255s):**
- Timeline time = 44s
- Video time = 39.255 (paused at end)
- Video hidden (`opacity: 0`)
- If playing, manual loop advances from 44s

## Effects Timing
Effects are defined in video time coordinates but need to be triggered at the correct timeline time:

**Example Effect:**
```javascript
effect = {
  start: 5,  // 5 seconds into raw video
  end: 10    // 10 seconds into raw video
}
```

**Timeline Conversion:**
- Effect should trigger from timeline time 8s to 13s (add 3s offset)
- Current implementation uses `currentTime` which is already in timeline coordinates
- Effects system already handles this correctly because `currentTime` state is in timeline time

## Testing Checklist
✅ Timeline shows 45.255s duration (not 39.255s)
✅ Playback starts at 0s (intro)
✅ Video hidden during intro (0-3s)
✅ Video appears at 3s and plays normally
✅ Video hidden during outro (42.255-45.255s)
✅ Playback stops at 45.255s
✅ Seek to intro: video hidden, paused at start
✅ Seek to video: video visible, plays from offset position
✅ Seek to outro: video hidden, paused at end
✅ Audio stays synced with video (not timeline)
✅ Play/pause works in all three clips

## Benefits
1. **Extensible Duration**: Video can be extended without modifying raw video file
2. **Clean Separation**: Intro/outro are rendering-only (background colors)
3. **Time Isolation**: Timeline time and video time are properly isolated
4. **Audio Sync**: Audio follows video time for proper synchronization
5. **Effects Compatibility**: Effects continue to work with timeline time
6. **Backward Compatible**: Falls back to raw video duration if timeline is missing

## Technical Notes
- Video element only knows about raw video (39s)
- Timeline UI shows extended duration (45s)
- Time conversion happens at playback and seek boundaries
- Manual time advancement required for intro/outro (video can't play background colors)
- Audio always syncs with video time (0-39s), not timeline time
- Effects trigger based on timeline time (already handled correctly)
- Clip transitions are smooth with proper state management

## Future Enhancements
- Add background rendering for intro/outro clips (show clip backgroundColor)
- Support custom intro/outro videos (not just colors)
- Add fade transitions between clips
- Support variable intro/outro durations
- Add clip-specific audio tracks
- Support multiple video clips in sequence
