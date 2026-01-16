import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { TextOverlayLayer } from './TextOverlayLayer';
import { VideoSelectionBorder } from '../MainCanvasSection/VideoSelectionBorder';

// Helper to get video MIME type from URL
function getVideoMimeType(url: string | null): string {
    if (!url) return 'video/webm';
    
    if (url.endsWith('.mp4')) return 'video/mp4';
    if (url.endsWith('.mov')) return 'video/quicktime';
    if (url.endsWith('.webm')) return 'video/webm';
    if (url.endsWith('.avi')) return 'video/x-msvideo';
    
    return 'video/webm'; // default
}

interface TextElement {
    type: string;
    content: string;
    start: number;
    end: number;
    position: { x: number; y: number };
    dimension: { width: number; height: number };
    style: any;
}

interface VideoLayerProps {
    videoUrl: string | null;
    videoRef: React.RefObject<HTMLVideoElement>;
    videoLayerRef?: React.RefObject<HTMLDivElement>;
    isVideoVisible?: boolean;
    textElements?: TextElement[];
    currentTime?: number;
    recordingWidth?: number;
    recordingHeight?: number;
    onVideoClick?: () => void;
    hasMedia?: boolean;
    borderRadius?: number; // Border radius value (0-20%)
    isVideoSelected?: boolean; // Whether video is selected
}

/**
 * VideoLayer - Just the video element, no controls
 * This is the dynamic layer that receives zoom/pan effects
 */
export const VideoLayer: React.FC<VideoLayerProps> = ({
    videoUrl,
    videoRef,
    videoLayerRef,
    isVideoVisible = true,
    textElements = [],
    currentTime = 0,
    recordingWidth = 1920,
    recordingHeight = 1080,
    onVideoClick,
    hasMedia = true,
    borderRadius = 3, // Default to 3% for subtle rounding
    isVideoSelected = false
}) => {
    console.log('[VideoLayer] borderRadius:', borderRadius, 'isVideoSelected:', isVideoSelected);
    
    // Track actual rendered video dimensions for selection border
    const [videoDimensions, setVideoDimensions] = useState<{width: number, height: number} | null>(null);
    
    // Calculate actual video dimensions when video loads or window resizes
    useEffect(() => {
        const updateVideoDimensions = () => {
            if (videoRef.current && videoLayerRef.current) {
                const video = videoRef.current;
                const container = videoLayerRef.current;
                
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
        
        // Update on video load
        const video = videoRef.current;
        const container = videoLayerRef.current;
        
        if (video) {
            video.addEventListener('loadedmetadata', updateVideoDimensions);
            // Also update immediately if video is already loaded
            if (video.videoWidth && video.videoHeight) {
                updateVideoDimensions();
            }
        }
        
        // Update on window resize
        window.addEventListener('resize', updateVideoDimensions);
        
        // Use ResizeObserver to detect container size changes (e.g., timeline height changes)
        let resizeObserver: ResizeObserver | null = null;
        if (container) {
            resizeObserver = new ResizeObserver(() => {
                updateVideoDimensions();
            });
            resizeObserver.observe(container);
        }
        
        return () => {
            if (video) {
                video.removeEventListener('loadedmetadata', updateVideoDimensions);
            }
            window.removeEventListener('resize', updateVideoDimensions);
            if (resizeObserver && container) {
                resizeObserver.unobserve(container);
                resizeObserver.disconnect();
            }
        };
    }, [videoRef, videoLayerRef]);
    
    const handleVideoClick = (e: React.MouseEvent) => {
        if (!hasMedia) return; // Don't handle click if no media
        
        e.stopPropagation(); // Prevent event from bubbling to document
        if (onVideoClick) {
            onVideoClick();
        }
    };

    return (
        <div
            ref={videoLayerRef}
            onClick={handleVideoClick}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: hasMedia ? 'pointer' : 'default',
                // CRITICAL: Camera-zoom requires transform-origin at center
                transformOrigin: 'center center',
                // GPU acceleration hints
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                // Transition is now managed dynamically in the rendering loop
                // This will be overridden by the zoom transform when effects are active
                transform: 'scale3d(1, 1, 1)',
            }}
        >
            {videoUrl ? (
                <video
                    ref={videoRef}
                    className="max-w-full max-h-full object-contain"
                    style={{
                        // Control video visibility for timeline clips (intro/outro)
                        opacity: isVideoVisible ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        // Apply border radius to video element itself
                        borderRadius: `${borderRadius}%`,
                        overflow: 'hidden',
                    }}
                    playsInline
                    preload="auto"
                    muted
                >
                    <source src={videoUrl} type={getVideoMimeType(videoUrl)} />
                </video>
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-gray-400 text-center">
                        <div className="text-4xl mb-2">🎬</div>
                        <p className="text-sm">No video loaded</p>
                    </div>
                </div>
            )}
            {/* Text Overlay Layer - Always visible, independent of video visibility */}
            <TextOverlayLayer
                textElements={textElements}
                currentTime={currentTime}
                recordingWidth={recordingWidth}
                recordingHeight={recordingHeight}
            />
            
            {/* Video Selection Border - Shows when video is selected (always sharp corners) */}
            <VideoSelectionBorder 
                isSelected={isVideoSelected} 
                videoDimensions={videoDimensions}
            />
        </div>
    );
};

interface VideoControlsProps {
    audioUrl: string | null;
    processedAudioUrl: string | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
    audioRef: React.RefObject<HTMLAudioElement>;
    aiAudioRef: React.RefObject<HTMLAudioElement>;
    disabled?: boolean;
}

/**
 * VideoControls - Playback controls, timeline, volume
 * This is a separate UI layer below the canvas
 */
export const VideoControls: React.FC<VideoControlsProps> = ({
    audioUrl,
    processedAudioUrl,
    isPlaying,
    currentTime,
    duration,
    volume: _volume,
    isMuted: _isMuted,
    onPlayPause,
    onSeek,
    onVolumeChange: _onVolumeChange,
    onToggleMute: _onToggleMute,
    audioRef,
    aiAudioRef,
    disabled = false
}) => {
    const progressBarRef = useRef<HTMLDivElement>(null);

    const formatTime = (time: number): string => {
        if (!time || isNaN(time) || !isFinite(time)) return '00 : 00 : 00';
        const hours = Math.floor(time / 3600);
        const mins = Math.floor((time % 3600) / 60);
        const secs = Math.floor(time % 60);
        return `${hours.toString().padStart(2, '0')} : ${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !duration) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(pos * duration, duration));
        onSeek(newTime);
    };

    const skipForward = () => {
        onSeek(Math.min(currentTime + 10, duration));
    };

    const skipBack = () => {
        onSeek(Math.max(currentTime - 10, 0));
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Suppress unused variable warnings - these are used for type checking
    void handleProgressClick;
    void progressPercent;

    return (
        <>
            {/* Hidden Audio Elements */}
            {audioUrl && (
                <audio ref={audioRef} preload="auto" style={{ display: 'none' }}>
                    <source src={audioUrl} type="audio/webm" />
                </audio>
            )}
            {/* AI Audio element - always rendered, src set dynamically via currentClipAudio */}
            <audio ref={aiAudioRef} preload="auto" style={{ display: 'none' }} />

            {/* Simple Playback Controls - Clueso Style */}
            <div className="flex items-center gap-3">
                {/* Previous/Skip Back */}
                <button
                    onClick={skipBack}
                    disabled={disabled}
                    className={`w-9 h-9 flex items-center justify-center text-white rounded-full transition-all duration-200 ${disabled
                        ? 'bg-[#2a2a3e]/50 cursor-not-allowed opacity-50'
                        : 'bg-[#2a2a3e] hover:bg-[#3b3b50] hover:text-gray-300'
                        }`}
                    title="Skip back 10s"
                >
                    <SkipBack size={16} />
                </button>

                {/* Play/Pause - Pink/Magenta like Clueso */}
                <button
                    onClick={onPlayPause}
                    disabled={disabled}
                    className={`w-10 h-10 flex items-center justify-center text-white rounded-full transition-all duration-200 shadow-lg ${disabled
                        ? 'bg-[#ec4899]/50 cursor-not-allowed opacity-50'
                        : 'bg-[#ec4899] hover:bg-[#db2777]'
                        }`}
                >
                    {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
                </button>

                {/* Next/Skip Forward */}
                <button
                    onClick={skipForward}
                    disabled={disabled}
                    className={`w-9 h-9 flex items-center justify-center text-white rounded-full transition-all duration-200 ${disabled
                        ? 'bg-[#2a2a3e]/50 cursor-not-allowed opacity-50'
                        : 'bg-[#2a2a3e] hover:bg-[#3b3b50] hover:text-gray-300'
                        }`}
                    title="Skip forward 10s"
                >
                    <SkipForward size={16} />
                </button>

                {/* Time Display - Clueso Format */}
                <div className={`text-sm font-medium ml-2 ${disabled ? 'text-gray-500' : 'text-white'}`}>
                    {formatTime(currentTime)} <span className="text-gray-500">/</span> {formatTime(duration)}
                </div>
            </div>
        </>
    );
};

// For backward compatibility, also export a combined component
interface VideoPlayerSectionProps {
    videoUrl: string | null;
    audioUrl: string | null;
    processedAudioUrl: string | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    audioRef: React.RefObject<HTMLAudioElement>;
    aiAudioRef: React.RefObject<HTMLAudioElement>;
    videoLayerRef?: React.RefObject<HTMLDivElement>;
}

export const VideoPlayerSection: React.FC<VideoPlayerSectionProps> = (props) => {
    return (
        <VideoLayer
            videoUrl={props.videoUrl}
            videoRef={props.videoRef}
            videoLayerRef={props.videoLayerRef}
        />
    );
};

export default VideoPlayerSection;
