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
            className="w-full h-full"
            style={{
                // CRITICAL: Camera-zoom requires transform-origin at center
                // This ensures the frame stays static while content zooms
                transformOrigin: 'center center',
                willChange: 'transform',
                // Smooth transform transitions
                transition: 'transform 0.05s linear',
                // Initial scale creates the margin effect (94% size = 3% margin on each side)
                // This will be overridden by the zoom transform when effects are active
                transform: 'scale(0.94)',
            }}
        >
            {videoUrl ? (
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    playsInline
                    preload="auto"
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
    aiAudioRef
}) => {
    const progressBarRef = useRef<HTMLDivElement>(null);

    const formatTime = (time: number): string => {
        if (!time || isNaN(time) || !isFinite(time)) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <div className="px-6 py-3">
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

            {/* Progress Bar */}
            <div
                ref={progressBarRef}
                onClick={handleProgressClick}
                className="w-full h-1.5 bg-[#3b3b50] rounded-full cursor-pointer group mb-3 hover:h-2 transition-all duration-200"
            >
                <div
                    className="h-full bg-indigo-500 rounded-full relative transition-all duration-100"
                    style={{ width: `${progressPercent}%` }}
                >
                    {/* Playhead */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Skip Back */}
                    <button
                        onClick={skipBack}
                        className="p-2 text-gray-400 hover:text-white hover:bg-[#3b3b50] rounded-full transition-all duration-200"
                        title="Skip back 10s"
                    >
                        <SkipBack size={18} />
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={onPlayPause}
                        className="p-3 bg-[#3b3b50] hover:bg-[#4a4a5e] text-white rounded-full transition-all duration-200"
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </button>

                    {/* Skip Forward */}
                    <button
                        onClick={skipForward}
                        className="p-2 text-gray-400 hover:text-white hover:bg-[#3b3b50] rounded-full transition-all duration-200"
                        title="Skip forward 10s"
                    >
                        <SkipForward size={18} />
                    </button>

                    {/* Time Display */}
                    <div className="text-gray-300 text-sm font-mono ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Volume Control */}
                    <div className="flex items-center gap-2 group">
                        <button
                            onClick={onToggleMute}
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#3b3b50] rounded-full transition-all duration-200"
                        >
                            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                            className="w-16 h-1 bg-[#3b3b50] rounded-full appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>

                    {/* Fullscreen */}
                    <button
                        className="p-2 text-gray-400 hover:text-white hover:bg-[#3b3b50] rounded-full transition-all duration-200"
                        title="Fullscreen"
                    >
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>
        </div>
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
