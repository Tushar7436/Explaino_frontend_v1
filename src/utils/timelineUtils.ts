/**
 * Timeline Utilities
 * 
 * Handles time conversion between timeline time and raw video time
 * Timeline structure: [intro (0-3s)] [video (3-42.255s)] [outro (42.255-45.255s)]
 * Raw video: 0-39.255s
 * 
 * The intro and outro are NEW clips (background only), not part of raw video
 */

export interface MediaItem {
    type: 'video' | 'image' | 'audio';
    format: string; // 'webm' | 'mp4' | 'mov' | 'jpg' | 'png' etc.
    url: string;
    borderRadius?: number;
}

export interface TimelineClip {
    name: string;
    start: number;
    end: number;
    backgroundColor?: string;
    media: MediaItem[];
    
    // DEPRECATED: Keep for backward compatibility
    borderRadius?: number;
    url?: string | null;
}

export interface Timeline {
    videoDuration: number;
    clips: TimelineClip[];
}

/**
 * Get the active clip at a given timeline time
 */
export function getActiveClip(timeline: Timeline | undefined, timelineTime: number): TimelineClip | null {
    if (!timeline?.clips) return null;
    
    return timeline.clips.find(
        clip => timelineTime >= clip.start && timelineTime < clip.end
    ) || null;
}

/**
 * Check if video should be visible at given timeline time
 * Video is only visible during the "video" clip
 */
export function isVideoVisible(timeline: Timeline | undefined, timelineTime: number): boolean {
    const activeClip = getActiveClip(timeline, timelineTime);
    if (!activeClip) return false;
    
    // Check new media structure
    if (activeClip.media && activeClip.media.length > 0) {
        return activeClip.media.some(m => m.type === 'video');
    }
    
    // Fallback to old structure for backward compatibility
    return activeClip.url !== null && activeClip.url !== undefined;
}

/**
 * Get video URL from clip (supports both old and new structure)
 */
export function getClipVideoUrl(clip: TimelineClip | null): string | null {
    if (!clip) return null;
    
    // New structure: check media array
    if (clip.media && clip.media.length > 0) {
        const videoMedia = clip.media.find(m => m.type === 'video');
        return videoMedia?.url || null;
    }
    
    // Fallback to old structure
    return clip.url || null;
}

/**
 * Get border radius from clip (supports both old and new structure)
 */
export function getClipBorderRadius(clip: TimelineClip | null): number {
    if (!clip) return 0;
    
    // New structure: check first video media item
    if (clip.media && clip.media.length > 0) {
        const videoMedia = clip.media.find(m => m.type === 'video');
        return videoMedia?.borderRadius || 0;
    }
    
    // Fallback to old structure
    return clip.borderRadius || 0;
}

/**
 * Convert timeline time to raw video time
 * Timeline: 0-45s, Video: 0-39s
 * 
 * - Intro (0-3s): Video should be at 0
 * - Video (3-42.255s): Video time = timeline time - 3
 * - Outro (42.255-45s): Video should be at end (39.255s)
 */
export function timelineToVideoTime(timeline: Timeline | undefined, timelineTime: number): number {
    if (!timeline?.clips) return timelineTime;
    
    const activeClip = getActiveClip(timeline, timelineTime);
    
    if (!activeClip) return 0;
    
    // If it's the video clip, subtract the offset
    if (activeClip.name === 'video') {
        return timelineTime - activeClip.start;
    }
    
    // For intro, video stays at 0
    if (activeClip.name === 'intro') {
        return 0;
    }
    
    // For outro, video stays at end
    // Find the video clip to get its duration
    const videoClip = timeline.clips.find(clip => clip.name === 'video');
    if (videoClip) {
        return videoClip.end - videoClip.start;
    }
    
    return 0;
}

/**
 * Convert raw video time to timeline time
 * Video: 0-39s, Timeline: 0-45s
 * 
 * Video time is always during the "video" clip, so add the clip's start offset
 */
export function videoTimeToTimelineTime(timeline: Timeline | undefined, videoTime: number): number {
    if (!timeline?.clips) return videoTime;
    
    const videoClip = timeline.clips.find(clip => clip.name === 'video');
    if (!videoClip) return videoTime;
    
    return videoTime + videoClip.start;
}

/**
 * Get the playback mode for the current clip
 */
export type PlaybackMode = 'intro' | 'video' | 'outro';

export function getPlaybackMode(timeline: Timeline | undefined, timelineTime: number): PlaybackMode {
    const activeClip = getActiveClip(timeline, timelineTime);
    
    if (activeClip?.name === 'intro') return 'intro';
    if (activeClip?.name === 'outro') return 'outro';
    return 'video';
}

/**
 * Check if we should transition to the next clip
 */
export function shouldTransitionClip(
    timeline: Timeline | undefined,
    currentTimelineTime: number,
    nextTimelineTime: number
): boolean {
    const currentClip = getActiveClip(timeline, currentTimelineTime);
    const nextClip = getActiveClip(timeline, nextTimelineTime);
    
    return currentClip?.name !== nextClip?.name;
}

/**
 * Get the total timeline duration
 */
export function getTimelineDuration(timeline: Timeline | undefined): number {
    return timeline?.videoDuration || 0;
}
