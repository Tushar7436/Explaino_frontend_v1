import React, { useState, useEffect, useRef, useCallback } from 'react';
import './project.css';

// Section Components
import { HeaderSection } from './sections/HeaderSection';
import { SideNavigationSection, SidebarMenuItem } from './sections/SideNavigationSection';
import { TranscriptionSection } from './sections/TranscriptionSection';
import { MusicSection } from './sections/MusicSection';
import { MainCanvasSection, AspectRatio } from './sections/MainCanvasSection';
import { VideoLayer, VideoControls } from './sections/VideoPlayerSection';

// Services & Hooks
import { useProcessingWebSocket } from '../../hooks/useProcessingWebSocket';
import { processSession, generateSpeech, exportVideo } from '../../services/backend-api';
import {
    normalizeCoordinates,
    calculateZoomTransform,
    computeEffectProgressWithContinuation,
    hasEffectContinuation,
    getActiveEffects,
    resolveZoomEffect
} from '../../utils/effectProcessor';

interface ProjectScreenProps {
    sessionId?: string;
}

interface Narration {
    windowIndex?: number;
    start: number;
    end: number;
    text: string;
    musicStyle?: string;
}

interface RecordingDimensions {
    recordingWidth: number;
    recordingHeight: number;
}

export const ProjectScreen: React.FC<ProjectScreenProps> = ({ sessionId }) => {
    // ============== UI STATE ==============
    const [activeTab, setActiveTab] = useState<'video' | 'article'>('video');
    const [activeSidebarItem, setActiveSidebarItem] = useState<SidebarMenuItem | null>('script');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [backgroundColor, setBackgroundColor] = useState('#1a1625');

    // ============== VIDEO STATE ==============
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // ============== PROCESSING STATE ==============
    const [preparing, setPreparing] = useState(true);
    const [generatingSpeech, setGeneratingSpeech] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // ============== EFFECTS STATE ==============
    const [normalizedEffects, setNormalizedEffects] = useState<any[]>([]);
    const [recordingDimensions, setRecordingDimensions] = useState<RecordingDimensions | null>(null);

    // ============== REFS ==============
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const aiAudioRef = useRef<HTMLAudioElement>(null);
    const videoLayerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);

    // ============== WEBSOCKET ==============
    const { progress } = useProcessingWebSocket(sessionId || '') as { progress: { message: string } | null };

    // ============== COMPUTED VALUES ==============
    const narrations: Narration[] = results?.narrations || [];
    const showTranscriptionPanel = activeSidebarItem === 'script';
    const showMusicPanel = activeSidebarItem === 'music';

    // ============== EFFECTS ==============

    // Auto-start processing when sessionId is available
    useEffect(() => {
        if (!sessionId) {
            setPreparing(false);
            return;
        }

        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        const startProcessing = async () => {
            try {
                setPreparing(true);
                const response = await processSession(sessionId);

                // Get video and audio URLs from backend response
                let videoUrlFromBackend = response.videoUrl;
                let audioUrlFromBackend = response.audioUrl;

                // Add API_BASE prefix if URLs are relative
                if (videoUrlFromBackend && !videoUrlFromBackend.startsWith('http')) {
                    videoUrlFromBackend = videoUrlFromBackend.startsWith('/')
                        ? `${API_BASE}${videoUrlFromBackend}`
                        : `${API_BASE}/${videoUrlFromBackend}`;
                }
                if (audioUrlFromBackend && !audioUrlFromBackend.startsWith('http')) {
                    audioUrlFromBackend = audioUrlFromBackend.startsWith('/')
                        ? `${API_BASE}${audioUrlFromBackend}`
                        : `${API_BASE}/${audioUrlFromBackend}`;
                }

                // Fallback to old pattern if backend doesn't provide URLs
                const finalVideoUrl = videoUrlFromBackend || `${API_BASE}/uploads/video_${sessionId}.webm`;
                const finalAudioUrl = audioUrlFromBackend || `${API_BASE}/uploads/audio_${sessionId}.webm`;

                console.log('[Session] Setting URLs:', { finalVideoUrl, finalAudioUrl });

                setVideoUrl(finalVideoUrl);
                setAudioUrl(finalAudioUrl);

                if (response.videoDuration && response.videoDuration > 0) {
                    setDuration(response.videoDuration);
                }

                setResults(response);
                setPreparing(false);
            } catch (err: any) {
                console.error('[Session] Processing error:', err);
                setError(err.message);
                setPreparing(false);
            }
        };

        startProcessing();
    }, [sessionId]);

    // Synchronize video with audio
    useEffect(() => {
        const video = videoRef.current;
        const audio = processedAudioUrl ? aiAudioRef.current : audioRef.current;

        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            // Keep audio in sync - only if audio exists and drift is significant
            if (audio && !video.paused) {
                const diff = Math.abs(video.currentTime - audio.currentTime);
                if (diff > 0.5) { // Increased threshold to avoid jitter
                    audio.currentTime = video.currentTime;
                }
            }
        };

        const handleLoadedMetadata = () => {
            const newDuration = video.duration;
            if (newDuration && !isNaN(newDuration) && isFinite(newDuration)) {
                setDuration(prev => prev || newDuration);
            }
            console.log('[Video] Loaded metadata - Width:', video.videoWidth, 'Height:', video.videoHeight);
            setRecordingDimensions({
                recordingWidth: video.videoWidth,
                recordingHeight: video.videoHeight
            });
            // Set aspect ratio to original video dimensions
            console.log('[Video] Setting aspect ratio to 1920:1080 (original)');
            setAspectRatio('1920:1080');
        };

        const handleEnded = () => {
            setIsPlaying(false);
            if (audio) audio.pause();
            video.pause();
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, [processedAudioUrl, videoUrl]);

    // Parse and normalize effects when results are available
    useEffect(() => {
        if (!results?.displayEffects || !recordingDimensions) return;

        const filtered = results.displayEffects
            .filter((effect: any) => effect.target?.bounds && effect.style?.zoom?.enabled);

        const normalized = filtered.map((effect: any) => {
            const normalizedBounds = normalizeCoordinates(
                effect.target.bounds,
                recordingDimensions.recordingWidth,
                recordingDimensions.recordingHeight,
                recordingDimensions.recordingWidth,
                recordingDimensions.recordingHeight
            );
            return { ...effect, normalizedBounds };
        });

        setNormalizedEffects(normalized);
    }, [results, recordingDimensions]);

    // If backend provides recording dimensions, use them before metadata loads
    useEffect(() => {
        if (recordingDimensions) return;
        const width = (results as any)?.recordingWidth;
        const height = (results as any)?.recordingHeight;
        if (width && height) {
            setRecordingDimensions({ recordingWidth: width, recordingHeight: height });
            setAspectRatio('1920:1080');
            console.log('[Recording] Using backend dimensions', width, height);
        }
    }, [results, recordingDimensions]);

    // Rendering loop for CSS effects
    useEffect(() => {
        const video = videoRef.current;
        const videoLayer = videoLayerRef.current;

        if (!video || !videoLayer || normalizedEffects.length === 0) return;

        const renderFrame = () => {
            const time = video.currentTime;
            const activeEffects = getActiveEffects(normalizedEffects, time);

            if (activeEffects.length > 0) {
                const effect = resolveZoomEffect(activeEffects);

                if (effect) {
                    // CRITICAL: Use anchorX/anchorY (normalized 0-1 range) for camera-zoom
                    // NOT centerX/centerY which are in pixel coordinates
                    const { anchorX, anchorY, autoScale } = effect.normalizedBounds;
                    const targetScale = autoScale || effect.style?.zoom?.scale || 1;

                    // Check if there's a continuation effect at the same position
                    // If so, don't zoom out - maintain the zoom level
                    const hasContinuation = hasEffectContinuation(effect, normalizedEffects, 0.5);

                    const effectProgress = computeEffectProgressWithContinuation(
                        time, effect.start, effect.end, 0.20, 0.40, hasContinuation
                    );
                    const { scale, translateX, translateY } = calculateZoomTransform(
                        effectProgress, anchorX, anchorY, targetScale as number
                    );

                    // Apply scale with base of 0.94 (initial video size)
                    // When scale = 1. video is at 94% size
                    // When scale > 1, video expands beyond 94% toward filling background
                    const finalScale = 0.94 * scale;
                    videoLayer.style.transform = `scale(${finalScale}) translate(${translateX}%, ${translateY}%)`;
                }
            } else {
                // Reset to neutral state - 94% size with no translation
                videoLayer.style.transform = 'scale(0.94) translate(0%, 0%)';
            }

            if (!video.paused && !video.ended) {
                rafRef.current = requestAnimationFrame(renderFrame);
            }
        };

        const handlePlay = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(renderFrame);
        };

        const handlePause = () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        if (!video.paused && !video.ended) {
            rafRef.current = requestAnimationFrame(renderFrame);
        }

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [normalizedEffects]);

    // ============== HANDLERS ==============

    const handlePlayPause = useCallback(() => {
        // Disable controls during speech generation
        if (generatingSpeech) return;

        const video = videoRef.current;
        const audio = processedAudioUrl ? aiAudioRef.current : audioRef.current;

        if (!video) return;

        if (isPlaying) {
            video.pause();
            if (audio) audio.pause();
            setIsPlaying(false);
        } else {
            video.play()
                .then(() => {
                    setIsPlaying(true);
                    if (audio) {
                        audio.currentTime = video.currentTime;
                        audio.play().catch(err => console.error('Audio play error:', err));
                    }
                })
                .catch(err => console.error('Video play error:', err));
        }
    }, [isPlaying, processedAudioUrl, generatingSpeech]);

    const handleSeek = useCallback((time: number) => {
        // Disable seek during speech generation
        if (generatingSpeech) return;

        const video = videoRef.current;
        const audio = processedAudioUrl ? aiAudioRef.current : audioRef.current;

        if (video) {
            video.currentTime = time;
        }
        if (audio) {
            audio.currentTime = time;
        }
        // Don't manually set currentTime state - let timeupdate event handle it
    }, [processedAudioUrl, generatingSpeech]);

    const handleVolumeChange = useCallback((newVolume: number) => {
        const video = videoRef.current;
        const audio = processedAudioUrl ? aiAudioRef.current : audioRef.current;

        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        if (video) video.volume = newVolume;
        if (audio) audio.volume = newVolume;
    }, [processedAudioUrl]);

    const handleToggleMute = useCallback(() => {
        const video = videoRef.current;
        const audio = processedAudioUrl ? aiAudioRef.current : audioRef.current;

        const newMuted = !isMuted;
        setIsMuted(newMuted);
        if (video) video.muted = newMuted;
        if (audio) audio.muted = newMuted;
    }, [isMuted, processedAudioUrl]);

    const handleGenerateSpeech = async () => {
        if (!sessionId) return;

        // Pause playback and stop audio (don't reset position)
        const video = videoRef.current;
        const audio = audioRef.current;
        const aiAudio = aiAudioRef.current;

        if (video) video.pause();
        if (audio) audio.pause();
        if (aiAudio) aiAudio.pause();
        setIsPlaying(false);

        setGeneratingSpeech(true);
        setError(null);

        try {
            const response = await generateSpeech(sessionId);
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            let newAudioUrl = response.processedAudioUrl;

            if (!newAudioUrl.startsWith('http')) {
                newAudioUrl = newAudioUrl.startsWith('/') ? newAudioUrl : `/${newAudioUrl}`;
                newAudioUrl = `${API_BASE}${newAudioUrl}`;
            }

            setProcessedAudioUrl(newAudioUrl);
            
            // Auto-play after generation completes
            setTimeout(() => {
                if (video) {
                    video.currentTime = 0;
                    video.play();
                }
                if (aiAudioRef.current) {
                    aiAudioRef.current.currentTime = 0;
                    aiAudioRef.current.play();
                }
                setCurrentTime(0);
                setIsPlaying(true);
            }, 500); // Small delay to ensure audio is loaded
        } catch (err: any) {
            console.error('Speech generation error:', err);
            setError('Speech generation failed: ' + err.message);
        } finally {
            setGeneratingSpeech(false);
        }
    };

    const handleSyncPointClick = (timestamp: number) => {
        handleSeek(timestamp);
    };

    const handleSidebarItemClick = (item: SidebarMenuItem) => {
        setActiveSidebarItem(activeSidebarItem === item ? null : item);
    };

    const handleExport = async () => {
        if (!sessionId || !results || !recordingDimensions) {
            setError('Cannot export: missing session data');
            return;
        }

        setExporting(true);
        setError(null);

        try {
            // Import instruction generator
            const { generateZoomInstructions } = await import('../../utils/instructionGenerator');

            // Generate instructions from displayEffects
            const instructions = generateZoomInstructions(
                results.displayEffects || [],
                {
                    width: recordingDimensions.recordingWidth,
                    height: recordingDimensions.recordingHeight
                }
            );

            console.log('[Export] Exporting with', instructions.length, 'effects');
            console.log('[Export] Background:', backgroundColor, 'Aspect Ratio:', aspectRatio);

            // Call export API with background color and aspect ratio
            const response = await exportVideo(sessionId, instructions, recordingDimensions, {
                backgroundColor,
                aspectRatio
            });

            console.log('[Export] Success:', response);

            if (response.videoUrl) {
                // Automatically download the video
                const link = document.createElement('a');
                link.href = response.videoUrl;
                link.download = `explaino_video_${sessionId}.mp4`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                console.log('[Export] Download triggered for:', response.videoUrl);
            }
        } catch (err: any) {
            console.error('[Export] Error:', err);
            setError('Export failed: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    // ============== LOADING STATE ==============
    if (preparing) {
        return (
            <div className="h-screen bg-[#1e1e2e] flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <h1 className="text-white text-xl font-medium">Preparing your video...</h1>
                {progress && (
                    <p className="text-gray-400 text-sm">{progress.message}</p>
                )}
            </div>
        );
    }

    // ============== NO SESSION ==============
    if (!sessionId) {
        return (
            <div className="h-screen bg-[#1e1e2e] flex flex-col items-center justify-center">
                <h1 className="text-white text-2xl font-bold mb-4">No Session ID</h1>
                <p className="text-gray-400">Please record a video first using the extension.</p>
            </div>
        );
    }

    // ============== MAIN RENDER ==============
    return (
        <div className="h-screen bg-[#1e1e2e] flex flex-col overflow-hidden">
            {/* Top Navigation */}
            <HeaderSection
                projectTitle="Video Project"
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onExport={handleExport}
                isExporting={exporting}
                canExport={!!results && !!recordingDimensions}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <SideNavigationSection
                    activeItem={activeSidebarItem}
                    onItemClick={handleSidebarItemClick}
                />

                {/* Transcription Panel (conditionally shown) */}
                {showTranscriptionPanel && (
                    <TranscriptionSection
                        narrations={narrations}
                        isVisible={showTranscriptionPanel}
                        onClose={() => setActiveSidebarItem(null)}
                        onSyncPointClick={handleSyncPointClick}
                        onGenerateScript={handleGenerateSpeech}
                        isGenerating={generatingSpeech}
                        hasProcessedAudio={!!processedAudioUrl}
                        currentTime={currentTime}
                    />
                )}

                {/* Music Panel (conditionally shown) */}
                {showMusicPanel && (
                    <MusicSection
                        isVisible={showMusicPanel}
                        onClose={() => setActiveSidebarItem(null)}
                        onMusicSelect={(url, filename) => {
                            console.log('[Music] Selected:', filename, url);
                            // TODO: Integrate with video export or timeline
                        }}
                    />
                )}

                {/* Main Canvas */}
                <MainCanvasSection
                    aspectRatio={aspectRatio}
                    backgroundColor={backgroundColor}
                    onAspectRatioChange={setAspectRatio}
                    onBackgroundColorChange={setBackgroundColor}
                    videoWidth={recordingDimensions?.recordingWidth}
                    videoHeight={recordingDimensions?.recordingHeight}
                    isGeneratingSpeech={generatingSpeech}
                    timeline={results?.timeline}
                    displayEffects={results?.displayEffects}
                    narrations={narrations}
                    intro={results?.intro}
                    outro={results?.outro}
                    videoDuration={duration}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onSeek={handleSeek}
                    controls={
                        <VideoControls
                            audioUrl={audioUrl}
                            processedAudioUrl={processedAudioUrl}
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            duration={duration}
                            volume={volume}
                            isMuted={isMuted}
                            onPlayPause={handlePlayPause}
                            onSeek={handleSeek}
                            onVolumeChange={handleVolumeChange}
                            onToggleMute={handleToggleMute}
                            audioRef={audioRef}
                            aiAudioRef={aiAudioRef}
                            disabled={generatingSpeech}
                        />
                    }
                >
                    <VideoLayer
                        videoUrl={videoUrl}
                        videoRef={videoRef}
                        videoLayerRef={videoLayerRef}
                    />
                </MainCanvasSection>
            </div>

            {/* Error Display */}
            {error && (
                <div className="absolute bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-2 text-white/80 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProjectScreen;
