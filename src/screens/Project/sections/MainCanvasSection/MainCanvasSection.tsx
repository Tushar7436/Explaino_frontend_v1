import React, { useState, useMemo } from 'react';
import { Palette, Plus, RectangleHorizontal, Search, Type } from 'lucide-react';
import { BackgroundPanel } from './BackgroundPanel';
import { AspectRatioDropdown, AspectRatio } from './AspectRatioDropdown';
import { VideoEditToolbar } from './VideoEditToolbar';

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
    isVideoSelected?: boolean; // NEW: Track if video is selected
    // Timeline data
    timeline?: any[];
    displayElements?: any[]; // Renamed from displayEffects and typed broadly for now
    displayEffects?: any[]; // Keeping for backward compat if needed, but we rely on displayElements
    narrations?: any[];
    intro?: string;
    outro?: string;
    videoDuration?: number;
    currentTime?: number;
    isPlaying?: boolean;
    onSeek?: (time: number) => void;
    activeClip?: any; // Active timeline clip for border radius
    onBorderRadiusChange?: (value: number) => void; // Handler for border radius changes
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

// Helper to determine visual layers for elements/effects
interface VisualItem {
    id: string;
    type: 'zoom' | 'text' | 'other';
    start: number;
    end: number;
    label: string;
    color: string;
    icon: React.ReactNode;
    row: number;
}

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
    isVideoSelected = false, // NEW: Default to false
    timeline = [],
    displayElements = [],
    displayEffects = [], // ignored in favor of displayElements
    narrations = [],
    intro,
    outro,
    videoDuration = 0,
    currentTime = 0,
    isPlaying = false,
    onSeek,
    activeClip,
    onBorderRadiusChange
}) => {
    const [isBackgroundPanelOpen, setIsBackgroundPanelOpen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(77.5); // 30% on the 0-100% scale
    // Initialize roundingValue from activeClip's borderRadius, default to 3
    const [roundingValue, setRoundingValue] = useState(() => {
        return activeClip?.media?.[0]?.borderRadius ?? 3;
    });
    const timelineRef = React.useRef<HTMLDivElement>(null);
    const [timelineHeight, setTimelineHeight] = useState(260);
    const [isResizing, setIsResizing] = useState(false);

    // Sync roundingValue when activeClip changes
    React.useEffect(() => {
        const newValue = activeClip?.media?.[0]?.borderRadius ?? 3;
        console.log('[MainCanvasSection] Syncing roundingValue from activeClip:', newValue, 'activeClip:', activeClip?.name);
        if (activeClip?.media?.[0]?.borderRadius !== undefined) {
            setRoundingValue(activeClip.media[0].borderRadius);
        } else {
            setRoundingValue(3); // Default to 3%
        }
    }, [activeClip]);

    // Calculate dynamic time step based on zoom level
    // Higher zoom = more space = smaller step (show every second)
    // Lower zoom = less space = larger step (skip seconds)
    const getTimeStep = (zoom: number): number => {
        if (zoom >= 100) return 1;      // Show every second (1s, 2s, 3s...)
        if (zoom >= 60) return 2;       // Show every 2 seconds (1s, 3s, 5s...)
        if (zoom >= 40) return 4;       // Show every 4 seconds (1s, 5s, 9s...)
        return 5;                       // Show every 5 seconds (1s, 6s, 11s...)
    };

    const timeStep = getTimeStep(zoomLevel);

    // Handle timeline resize
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            
            const newHeight = window.innerHeight - e.clientY;
            // Clamp between 200px and 600px
            setTimelineHeight(Math.max(200, Math.min(600, newHeight)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Process display elements into visual items with row assignment per clip
    const visualItems = useMemo(() => {
        const items: VisualItem[] = [];
        const sourceData = displayElements?.length > 0 ? displayElements : displayEffects;

        console.log('[Timeline] Processing visual items:', {
            displayElements,
            displayEffects,
            sourceData,
            sourceDataLength: sourceData?.length
        });

        if (!sourceData || sourceData.length === 0) {
            console.log('[Timeline] No source data for visual items');
            return [];
        }

        // Track the current layer per clip
        const clipLayerCounters: { [clipName: string]: number } = {};

        // 1. Process elements and effects per clip, assigning sequential layers
        sourceData.forEach((clipData: any, clipIdx: number) => {
            console.log(`[Timeline] Processing clip ${clipIdx}:`, {
                clipName: clipData.clipName,
                effects: clipData.effects?.length || 0,
                elements: clipData.elements?.length || 0,
                clipData
            });

            const clipName = clipData.clipName || `clip-${clipIdx}`;
            
            // Initialize layer counter for this clip
            if (!clipLayerCounters[clipName]) {
                clipLayerCounters[clipName] = 0;
            }

            // Collect all items from this clip
            const clipItems: VisualItem[] = [];

            // Process Effects (Zooms)
            if (clipData.effects) {
                clipData.effects.forEach((effect: any, effIdx: number) => {
                    clipItems.push({
                        id: `eff-${clipIdx}-${effIdx}`,
                        type: effect.type === 'zoom' ? 'zoom' : 'other',
                        start: effect.start,
                        end: effect.end,
                        label: effect.type === 'zoom' ? 'Zoom' : effect.type,
                        color: effect.type === 'zoom' ? '#3B82F6' : '#6366F1', // Blue for Zoom
                        icon: <Search size={10} className="text-white" />,
                        row: 0 // Will be assigned below
                    });
                });
            }
            
            // Process Elements (Text)
            if (clipData.elements) {
                clipData.elements.forEach((element: any, elIdx: number) => {
                    clipItems.push({
                        id: `el-${clipIdx}-${elIdx}`,
                        type: element.type === 'text' ? 'text' : 'other',
                        start: element.start,
                        end: element.end,
                        label: 'Text box', // As per Clueso style
                        color: '#EA580C', // Orange for Text
                        icon: <Type size={10} className="text-white" />,
                        row: 0 // Will be assigned below
                    });
                });
            }

            // Sort items within this clip by start time
            clipItems.sort((a, b) => a.start - b.start);

            // Assign sequential layers to each item in this clip
            // Each item gets its own layer, no sharing
            clipItems.forEach((item) => {
                item.row = clipLayerCounters[clipName];
                clipLayerCounters[clipName]++;
                items.push(item);
            });
        });

        console.log('[Timeline] Total visual items created:', items.length, items);
        console.log('[Timeline] Items after layer assignment:', items);

        return items;
    }, [displayElements, displayEffects]);

    // Calculate max row index to determine scrollable height
    const maxRow = useMemo(() => {
        if (visualItems.length === 0) return 0;
        return Math.max(...visualItems.map(item => item.row));
    }, [visualItems]);

    // Calculate content height: (maxRow + 1) * 24px for layers + 50px for clip layer + padding
    const timelineContentHeight = (maxRow + 1) * 24 + 50;

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
                    {/* Show VideoEditToolbar when video is selected */}
                    {isVideoSelected ? (
                        <VideoEditToolbar
                            roundingValue={roundingValue}
                            onRoundingChange={(value) => {
                                console.log('[MainCanvasSection] Slider changed to:', value);
                                setRoundingValue(value);
                                if (onBorderRadiusChange) {
                                    console.log('[MainCanvasSection] Calling onBorderRadiusChange with:', value);
                                    onBorderRadiusChange(value);
                                } else {
                                    console.warn('[MainCanvasSection] onBorderRadiusChange is undefined!');
                                }
                            }}
                        />
                    ) : (
                        <>
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
                        </>
                    )}
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
                    <div style={{ maxWidth: '85%', maxHeight: '85%', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
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
            <div className="flex-shrink-0 border-t border-[#2a2a3e] bg-[#0d0d15]" style={{ height: `${timelineHeight}px` }}>
                {/* Resize Handle */}
                <div
                    className={`h-1 bg-[#2a2a3e] cursor-ns-resize hover:bg-[#3a3a4e] transition-colors ${isResizing ? 'bg-[#3a3a4e]' : ''}`}
                    onMouseDown={handleMouseDown}
                    style={{ userSelect: 'none' }}
                />
                
                {/* Timeline Tools and Controls */}
                <div className="h-full flex flex-col" style={{ height: `${timelineHeight - 4}px` }}>
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
                            <span className="text-sm text-gray-400 font-medium min-w-[3rem]">{Math.round(((zoomLevel - 25) / (200 - 25)) * 100)}%</span>
                        </div>
                    </div>
                    
                    {/* Timeline Area */}
                    <div className="flex-1 bg-[#0d0d15] overflow-x-auto overflow-y-hidden flex flex-col">
                        {videoDuration > 0 ? (
                            <div className="flex-1 flex flex-col relative overflow-visible" style={{ width: `${Math.max(videoDuration * zoomLevel, 800)}px`, minWidth: '100%' }}>
                                {/* Global Playhead - spans entire timeline height */}
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-pink-500 pointer-events-none"
                                    style={{ 
                                        left: `${currentTime * zoomLevel}px`,
                                        zIndex: 100
                                    }}
                                >
                                    <div className="absolute top-2 -left-2 w-4 h-4 bg-pink-500 rounded-full border-2 border-white shadow-lg" />
                                </div>

                                {/* Time Ruler */}
                                <div className="sticky top-0 z-30 bg-[#1a1a2e] border-b border-[#2a2a3e] flex-shrink-0">
                                    <div className="relative h-10" style={{ width: `${videoDuration * zoomLevel}px` }}>
                                        {Array.from({ length: Math.ceil(videoDuration / timeStep) + 1 }, (_, i) => {
                                            const time = i * timeStep;
                                            if (time > videoDuration) return null;
                                            return (
                                                <div
                                                    key={time}
                                                    className="absolute bottom-0"
                                                    style={{ left: `${time * zoomLevel}px` }}
                                                >
                                                    <span className="absolute bottom-2 -left-2 text-xs text-gray-400 font-medium">
                                                        {time}s
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Spacer to push tracks to bottom */}
                                <div className="flex-1" />

                                {/* Tracks Container */}
                                <div 
                                    className="relative flex-shrink-0 overflow-visible"
                                    style={{
                                        // Slightly reduce tracks height so bottom row feels tighter
                                        height: `${timelineHeight - 96}px`
                                    }}
                                >
                                    {/* Scrollable Upper Layers - fills available space */}
                                    <div
                                        className="absolute top-0 left-0 right-0 bottom-[52px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-transparent hover:scrollbar-thumb-gray-500/70"
                                        style={{
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: 'rgba(75, 85, 99, 0.5) transparent',
                                            pointerEvents: 'auto',
                                            zIndex: 10
                                        }}
                                    >
                                    <div 
                                        ref={timelineRef}
                                        className="relative bg-[#1e1e2e]"
                                        style={{ minHeight: `100%`, height: `${Math.max((maxRow + 1) * 24, 100)}px` }}
                                        onClick={(e) => {
                                            if (!timelineRef.current || !onSeek) return;
                                            const rect = timelineRef.current.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const time = x / zoomLevel;
                                            onSeek(Math.max(0, Math.min(time, videoDuration)));
                                        }}
                                    >
                                        {/* Upper layers for visual items - anchored to bottom */}
                                        <div 
                                            className="absolute bottom-0 left-0 right-0 pointer-events-none"
                                            style={{ height: `${(maxRow + 1) * 24}px` }}
                                        >
                                                {/* Render Visual Items (Upper Layers) */}
                                                {console.log('[Timeline Render] Rendering visualItems:', visualItems.length)}
                                                {visualItems.length === 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                                                        No effects or elements
                                                    </div>
                                                )}
                                                {visualItems.map((item) => {
                                                    const duration = Math.abs(item.end - item.start);
                                                    const left = item.start * zoomLevel;
                                                    const width = Math.max(duration * zoomLevel, 10);
                                                    
                                                    // Calculate bottom position based on row index
                                                    // Each row is 24px high
                                                    const bottom = item.row * 24 + 2; 

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="absolute h-6 rounded px-2 flex items-center gap-2 shadow-sm cursor-pointer hover:brightness-110 transition-all pointer-events-auto"
                                                            style={{
                                                                left: `${left}px`,
                                                                width: `${width}px`,
                                                                bottom: `${bottom}px`,
                                                                backgroundColor: item.color,
                                                                zIndex: 10 + item.row
                                                            }}
                                                            title={`${item.label} (${item.start.toFixed(1)}s - ${item.end.toFixed(1)}s)`}
                                                        >
                                                            {item.icon}
                                                            <span className="text-[10px] font-medium text-white truncate w-full">
                                                                {item.label}
                                                            </span>
                                                            
                                                            {/* Simple resize handles - purely visual for now */}
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/20"></div>
                                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/20"></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                    </div>
                                    </div>

                                    {/* Fixed Bottom Layer: Clip Blocks */}
                                    <div 
                                        className="absolute left-0 right-0 bg-[#1e1e2e] border-t border-[#2a2a3e]/50 h-12"
                                        style={{ pointerEvents: 'auto', zIndex: 50, bottom: '0px' }}
                                    >
                                        <div className="relative h-full" style={{ paddingTop: '4px' }}>
                                            {timeline && timeline.length > 0 ? timeline.map((clip, idx) => {
                                                const duration = Math.abs(clip.end - clip.start);
                                                const startTime = Math.min(clip.start, clip.end);
                                                const left = startTime * zoomLevel;
                                                const width = Math.max(duration * zoomLevel, 2); // Minimum width to be visible
                                                
                                                // Default colors based on user request
                                                let bgColor = '#64748B'; // Default video gray
                                                let label = clip.name;
                                                
                                                if (clip.name === 'intro') {
                                                    bgColor = '#E91E8C'; // Pink
                                                    label = '1 Intro';
                                                } else if (clip.name === 'outro') {
                                                    bgColor = '#9333EA'; // Purple
                                                    label = '3 Outro';
                                                } else {
                                                    bgColor = '#64748B'; // Slate Blue/Gray
                                                    label = '2 Video';
                                                }

                                                // Use color from JSON if available and specific override needed, 
                                                // but user requested specific mapping so we stick to the if/else mostly.
                                                // clip.backgroundColor is available in JSON, we could use it too.
                                                if (clip.backgroundColor) {
                                                    bgColor = clip.backgroundColor;
                                                }

                                                return (
                                                    <div
                                                        key={`clip-${idx}`}
                                                        className="absolute top-0 h-10 rounded-md border border-white/10 shadow-sm overflow-hidden cursor-pointer hover:brightness-110 transition-all duration-200"
                                                        style={{ 
                                                            left: `${left}px`, 
                                                            width: `${width}px`,
                                                            backgroundColor: bgColor
                                                        }}
                                                        title={`${label} (${clip.start.toFixed(1)}s - ${clip.end.toFixed(1)}s)`}
                                                    >
                                                        <div className="h-full flex flex-col justify-center px-3">
                                                            <span className="text-xs font-semibold text-white truncate shadow-black/50 drop-shadow-md">
                                                                {label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="absolute inset-0 flex items-center justify-center border-t border-dashed border-gray-700">
                                                    <span className="text-[10px] text-gray-500">No clips data</span>
                                                </div>
                                            )}
                                        </div>
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
