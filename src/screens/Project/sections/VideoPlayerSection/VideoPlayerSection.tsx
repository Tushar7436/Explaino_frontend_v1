import React, { useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize2 } from 'lucide-react';

interface VideoLayerProps {
    videoUrl: string | null;
    videoRef: React.RefObject<HTMLVideoElement>;
    videoLayerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * VideoLayer - Just the video element, no controls
 * This is the dynamic layer that receives zoom/pan effects
 */
export const VideoLayer: React.FC<VideoLayerProps> = ({
    videoUrl,
    videoRef,
    videoLayerRef
}) => {
    return (
        <div
            ref={videoLayerRef}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // CRITICAL: Camera-zoom requires transform-origin at center
                transformOrigin: 'center center',
                willChange: 'transform',
                // Smooth transform transitions
                transition: 'transform 0.05s linear',
                // This will be overridden by the zoom transform when effects are active
                transform: 'scale(1)',
            }}
        >
            {videoUrl ? (
                <video
                    ref={videoRef}
                    className="max-w-full max-h-full object-contain"
                    playsInline
                    preload="auto"
                    muted
                >
                    <source src={videoUrl} type="video/webm" />
                </video>
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-gray-400 text-center">
                        <div className="text-4xl mb-2">🎬</div>
                        <p className="text-sm">No video loaded</p>
                    </div>
                </div>
            )}
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
    volume,
    isMuted,
    onPlayPause,
    onSeek,
    onVolumeChange,
    onToggleMute,
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

    return (
        <>
            {/* Hidden Audio Elements */}
            {audioUrl && (
                <audio ref={audioRef} preload="auto" style={{ display: 'none' }}>
                    <source src={audioUrl} type="audio/webm" />
                </audio>
            )}
            {processedAudioUrl && (
                <audio ref={aiAudioRef} preload="auto" style={{ display: 'none' }}>
                    <source src={processedAudioUrl} type="audio/mpeg" />
                </audio>
            )}

            {/* Simple Playback Controls - Clueso Style */}
            <div className="flex items-center gap-3">
                {/* Previous/Skip Back */}
                <button
                    onClick={skipBack}
                    disabled={disabled}
                    className={`w-9 h-9 flex items-center justify-center text-white rounded-full transition-all duration-200 ${
                        disabled 
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
                    className={`w-10 h-10 flex items-center justify-center text-white rounded-full transition-all duration-200 shadow-lg ${
                        disabled
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
                    className={`w-9 h-9 flex items-center justify-center text-white rounded-full transition-all duration-200 ${
                        disabled 
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
