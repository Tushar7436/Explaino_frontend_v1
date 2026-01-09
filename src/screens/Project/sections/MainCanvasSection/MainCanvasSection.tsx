import React, { useState } from 'react';
import { Palette, Plus, RectangleHorizontal } from 'lucide-react';
import { BackgroundPanel } from './BackgroundPanel';
import { AspectRatioDropdown, AspectRatio } from './AspectRatioDropdown';

export type { AspectRatio };

interface MainCanvasSectionProps {
    children: React.ReactNode;
    controls: React.ReactNode; // Separate controls slot
    aspectRatio: AspectRatio;
    backgroundColor: string;
    onAspectRatioChange: (ratio: AspectRatio) => void;
    onBackgroundColorChange: (color: string) => void;
    videoWidth?: number;
    videoHeight?: number;
    isGeneratingSpeech?: boolean;
    // Timeline data
    timeline?: any[];
    displayEffects?: any[];
    narrations?: any[];
    intro?: string;
    outro?: string;
    videoDuration?: number;
    currentTime?: number;
    isPlaying?: boolean;
    onSeek?: (time: number) => void;
}

const aspectRatioValues: Record<string, string> = {
    '16:9': '16 / 9',
    '9:16': '9 / 16',
    '1:1': '1 / 1',
    '4:3': '4 / 3',
    '3:4': '3 / 4',
    '4:5': '4 / 5',
    '5:4': '5 / 4',
};

export const MainCanvasSection: React.FC<MainCanvasSectionProps> = ({
    children,
    controls,
    aspectRatio,
    backgroundColor,
    onAspectRatioChange,
    onBackgroundColorChange,
    videoWidth,
    videoHeight,
    isGeneratingSpeech = false,
    timeline = [],
    displayEffects = [],
    narrations = [],
    intro,
    outro,
    videoDuration = 0,
    currentTime = 0,
    isPlaying = false,
    onSeek
}) => {
    const [isBackgroundPanelOpen, setIsBackgroundPanelOpen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(50);
    const timelineRef = React.useRef<HTMLDivElement>(null);

    // Background canvas aspect ratio: prefer actual video dimensions; fallback to chosen preset
    const getBackgroundAspectRatio = (): string => {
        if (videoWidth && videoHeight) {
            return `${videoWidth} / ${videoHeight}`;
        }
        return aspectRatioValues[aspectRatio] || '16 / 9';
    };

    return (
        <div className="flex-1 flex flex-col bg-[#1e1e2e] overflow-hidden">
            {/* Background Panel */}
            <BackgroundPanel
                isOpen={isBackgroundPanelOpen}
                onClose={() => setIsBackgroundPanelOpen(false)}
                currentColor={backgroundColor}
                onColorChange={onBackgroundColorChange}
            />

            {/* Canvas Controls Toolbar - Above the canvas */}
            <div className="h-12 flex items-center justify-center border-b border-[#2a2a3e]/50 bg-[#1e1e2e] flex-shrink-0">
                <div className="flex items-center gap-2">
                    {/* Background Button */}
                    <button 
                        onClick={() => setIsBackgroundPanelOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-lg transition-all duration-200"
                    >
                        <div
                            className="w-5 h-5 rounded-full border border-white/20"
                            style={{ backgroundColor }}
                        />
                        <span className="text-white text-sm font-medium">Background</span>
                    </button>

                    {/* Aspect Ratio Dropdown */}
                    <AspectRatioDropdown
                        currentRatio={aspectRatio}
                        onRatioChange={onAspectRatioChange}
                        videoWidth={videoWidth}
                        videoHeight={videoHeight}
                    />

                    {/* Insert Button */}
                    <button className="flex items-center gap-2 px-3 py-2 bg-[#3b3b50] hover:bg-[#4a4a5e] text-white rounded-lg text-sm font-medium transition-all duration-200">
                        <Plus size={16} />
                        <span>Insert</span>
                    </button>
                </div>
            </div>

            {/* Main Canvas Area - Video Display */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                {/* Background Canvas - Sized to SELECTED aspect ratio, centered with margins */}
                <div
                    className="relative transition-all duration-300"
                    style={{
                        backgroundColor,
                        aspectRatio: getBackgroundAspectRatio(),
                        width: 'auto',
                        height: '100%',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        borderRadius: '8px',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}
                >
                    {/* Video scales to fit inside with 85% sizing to show background border */}
                    <div style={{ maxWidth: '85%', maxHeight: '85%', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {children}
                    </div>

                    {/* Generating Speech Overlay */}
                    {isGeneratingSpeech && (
                        <div className="absolute inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50 animate-fade-in">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
                                <p className="text-white text-xl font-semibold">Generating...</p>
                                <p className="text-white/70 text-sm mt-2">Processing speech audio</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline Section - Like Clueso */}
            <div className="flex-shrink-0 border-t border-[#2a2a3e] bg-[#0d0d15]" style={{ height: '260px' }}>
                {/* Timeline Tools and Controls */}
                <div className="h-full flex flex-col">
                    {/* Timeline Toolbar */}
                    <div className="h-12 flex items-center justify-between px-4 border-b border-[#2a2a3e] bg-[#1a1a2e]">
                        {/* Left Side - Split and Add Clip */}
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-2 px-3 py-1.5 text-white hover:bg-[#2a2a3e] rounded text-sm transition-all duration-200">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                </svg>
                                <span>Split</span>
                            </button>
                            <button className="flex items-center gap-2 px-3 py-1.5 text-white hover:bg-[#2a2a3e] rounded text-sm transition-all duration-200">
                                <Plus size={14} />
                                <span>Add Clip</span>
                            </button>
                        </div>

                        {/* Center - Playback Controls */}
                        <div className="flex items-center">
                            {controls}
                        </div>

                        {/* Right Side - Zoom Control */}
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setZoomLevel(prev => Math.max(prev / 1.5, 25))}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded transition-all duration-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                </svg>
                            </button>
                            <input 
                                type="range" 
                                min="25" 
                                max="200" 
                                value={zoomLevel}
                                onChange={(e) => setZoomLevel(Number(e.target.value))}
                                className="w-24 h-1 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer"
                            />
                            <button 
                                onClick={() => setZoomLevel(prev => Math.min(prev * 1.5, 200))}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded transition-all duration-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                </svg>
                            </button>
                            <span className="text-sm text-gray-400 font-medium min-w-[3rem]">{Math.round((zoomLevel / 50) * 100)}%</span>
                        </div>
                    </div>
                    
                    {/* Timeline Area */}
                    <div className="flex-1 bg-[#0d0d15] overflow-auto">
                        {videoDuration > 0 ? (
                            <div className="relative" style={{ width: `${Math.max(videoDuration * zoomLevel, 800)}px`, minWidth: '100%' }}>
                                {/* Time Ruler */}
                                <div className="sticky top-0 z-20 bg-[#1a1a2e] border-b border-[#2a2a3e]">
                                    <div className="relative h-8" style={{ width: `${videoDuration * zoomLevel}px` }}>
                                        {Array.from({ length: Math.ceil(videoDuration) + 1 }, (_, i) => i).map(time => (
                                            <div
                                                key={time}
                                                className="absolute top-0 h-full border-l border-[#3a3a4e]"
                                                style={{ left: `${time * zoomLevel}px` }}
                                            >
                                                <span className="absolute top-1 left-1 text-[10px] text-gray-400 font-mono">
                                                    {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Tracks */}
                                <div 
                                    ref={timelineRef}
                                    className="relative"
                                    onClick={(e) => {
                                        if (!timelineRef.current || !onSeek) return;
                                        const rect = timelineRef.current.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const time = x / zoomLevel;
                                        onSeek(Math.max(0, Math.min(time, videoDuration)));
                                    }}
                                >
                                    {/* Visual Track */}
                                    <div className="border-b border-[#2a2a3e]">
                                        <div className="flex items-center h-7 px-3 bg-[#252538] border-b border-[#2a2a3e]">
                                            <span className="text-[11px] font-medium text-gray-300">Visual</span>
                                        </div>
                                        <div className="relative h-16 bg-[#1e1e2e]">
                                            {timeline && timeline.length > 0 ? timeline.map((clip, idx) => {
                                                const duration = Math.abs(clip.end - clip.start);
                                                const startTime = Math.min(clip.start, clip.end);
                                                const left = startTime * zoomLevel;
                                                const width = Math.max(duration * zoomLevel, 60);
                                                
                                                let bgColor = 'bg-gray-700';
                                                let label = clip.name;
                                                let icon = '';
                                                
                                                if (clip.name === 'intro') {
                                                    bgColor = 'bg-gradient-to-r from-pink-600 to-pink-500';
                                                    label = '1 Intro';
                                                    icon = '📝';
                                                } else if (clip.name === 'outro') {
                                                    bgColor = 'bg-gradient-to-r from-purple-700 to-purple-600';
                                                    label = '3 Outro';
                                                    icon = '👋';
                                                } else {
                                                    bgColor = 'bg-gradient-to-r from-gray-700 to-gray-600';
                                                    label = '2 Video';
                                                    icon = '🎥';
                                                }

                                                return (
                                                    <div
                                                        key={`clip-${idx}`}
                                                        className={`absolute top-2 h-12 ${bgColor} rounded-lg border border-white/20 shadow-lg overflow-hidden cursor-pointer hover:brightness-110 hover:scale-[1.02] transition-all duration-200`}
                                                        style={{ left: `${left}px`, width: `${width}px` }}
                                                        title={clip.heading || clip.name}
                                                    >
                                                        <div className="h-full flex flex-col justify-center px-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs">{icon}</span>
                                                                <span className="text-[10px] font-bold text-white truncate">{label}</span>
                                                            </div>
                                                            {(clip.heading || intro || outro) && (
                                                                <span className="text-[8px] text-white/70 truncate mt-0.5">
                                                                    {clip.name === 'intro' && intro ? intro.slice(0, 40) : 
                                                                     clip.name === 'outro' && outro ? outro.slice(0, 40) :
                                                                     clip.heading?.slice(0, 40)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-[10px] text-gray-500">No clips</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Effects Track */}
                                    {displayEffects && displayEffects.length > 0 && (
                                        <div className="border-b border-[#2a2a3e]">
                                            <div className="flex items-center h-7 px-3 bg-[#252538] border-b border-[#2a2a3e]">
                                                <span className="text-[11px] font-medium text-gray-300">Effects</span>
                                            </div>
                                            <div className="relative h-11 bg-[#1e1e2e]">
                                                {displayEffects.map((effect, idx) => {
                                                    const duration = effect.end - effect.start;
                                                    const left = effect.start * zoomLevel;
                                                    const width = Math.max(duration * zoomLevel, 50);
                                                    
                                                    let bgColor = 'bg-cyan-500';
                                                    let icon = '✨';
                                                    if (effect.type === 'zoom') {
                                                        bgColor = 'bg-blue-500';
                                                        icon = '🔍';
                                                    } else if (effect.type === 'highlight') {
                                                        bgColor = 'bg-indigo-500';
                                                        icon = '💡';
                                                    }

                                                    return (
                                                        <div
                                                            key={`effect-${idx}`}
                                                            className={`absolute top-1.5 h-8 ${bgColor} rounded-md border border-white/20 shadow-md overflow-hidden cursor-pointer hover:brightness-110 hover:scale-[1.02] transition-all duration-200`}
                                                            style={{ left: `${left}px`, width: `${width}px` }}
                                                            title={`${effect.type} (${effect.start.toFixed(1)}s - ${effect.end.toFixed(1)}s)`}
                                                        >
                                                            <div className="h-full flex items-center justify-center gap-1 px-2">
                                                                <span className="text-xs">{icon}</span>
                                                                <span className="text-[9px] font-semibold text-white truncate capitalize">
                                                                    {effect.type}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Narration Track */}
                                    {narrations && narrations.length > 0 && (
                                        <div className="border-b border-[#2a2a3e]">
                                            <div className="flex items-center h-7 px-3 bg-[#252538] border-b border-[#2a2a3e]">
                                                <span className="text-[11px] font-medium text-gray-300">Narration</span>
                                            </div>
                                            <div className="relative h-20 bg-[#1e1e2e]">
                                                {narrations.map((narration, idx) => {
                                                    const duration = narration.end - narration.start;
                                                    const left = narration.start * zoomLevel;
                                                    const width = Math.max(duration * zoomLevel, 60);

                                                    return (
                                                        <div
                                                            key={`narration-${idx}`}
                                                            className="absolute top-2 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg border border-white/20 shadow-lg overflow-hidden cursor-pointer hover:brightness-110 hover:scale-[1.01] transition-all duration-200"
                                                            style={{ left: `${left}px`, width: `${width}px` }}
                                                            title={narration.text}
                                                        >
                                                            <div className="p-2 h-full flex flex-col justify-center">
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <span className="text-xs">🎙️</span>
                                                                    <span className="text-[9px] font-bold text-emerald-100">
                                                                        Narration {idx + 1}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] font-medium text-white line-clamp-2 leading-tight">
                                                                    {narration.text}
                                                                </span>
                                                                {narration.musicStyle && (
                                                                    <span className="text-[8px] text-emerald-200 mt-1 truncate">
                                                                        🎵 {narration.musicStyle}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Playhead */}
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-pink-500 pointer-events-none z-30"
                                        style={{ left: `${currentTime * zoomLevel}px` }}
                                    >
                                        <div className="absolute -top-1 -left-2 w-4 h-4 bg-pink-500 rounded-full border-2 border-white shadow-lg" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500 text-xs text-center py-8">
                                Process video to see timeline
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainCanvasSection;
