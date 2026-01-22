import React, { useState, useMemo } from 'react';
import { Palette, Plus, RectangleHorizontal, Search, Type, MoreHorizontal } from 'lucide-react';
import { BackgroundPanel } from './BackgroundPanel';
import { AspectRatioDropdown, AspectRatio } from './AspectRatioDropdown';
import { VideoEditToolbar } from './VideoEditToolbar';
import { TextEditToolbar } from './TextEditToolbar';
import { ResizableTextBlock } from './ResizableTextBlock';
import { ResizableZoomBlock } from './ResizableZoomBlock';
import { ResizableClipBlock } from './ResizableClipBlock';

export type { AspectRatio };

interface SelectedTextInfo {
    clipName: string;
    elementIndex: number;
    element: any;
}

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
    isVideoSelected?: boolean; // Track if video is selected
    isTextSelected?: boolean; // Track if text is selected
    selectedTextElement?: SelectedTextInfo | null; // Currently selected text element
    // Timeline data
    timeline?: any[];
    displayElements?: any[];
    displayEffects?: any[];
    narrations?: any[];
    intro?: string;
    outro?: string;
    videoDuration?: number;
    currentTime?: number;
    isPlaying?: boolean;
    onSeek?: (time: number) => void;
    activeClip?: any;
    onBorderRadiusChange?: (value: number) => void;
    // Text element handlers
    onTextElementResize?: (clipName: string, elementIndex: number, newStart: number, newEnd: number) => void;
    onTextElementDelete?: (clipName: string, elementIndex: number) => void;
    // Text editing handlers
    onTextFontFamilyChange?: (value: string) => void;
    onTextFontSizeChange?: (value: number) => void;
    onTextFontWeightChange?: (value: string) => void;
    onTextColorChange?: (color: string) => void;
    onTextBoldToggle?: () => void;
    onTextItalicToggle?: () => void;
    onTextUnderlineToggle?: () => void;
    onTextAlignChange?: (align: 'left' | 'center' | 'right') => void;
    onTextDelete?: () => void;
    // Text selection from timeline
    onTextBlockClick?: (clipName: string, elementIndex: number, element: any) => void;
    // Zoom selection from timeline
    onZoomSelect?: (clipName: string, effectIndex: number, effect: any) => void;
    isZoomSelected?: boolean;
    selectedZoomEffect?: { clipName: string; effectIndex: number; effect: any } | null;
    onZoomResize?: (clipName: string, effectIndex: number, newStart: number, newEnd: number) => void;
    onZoomDelete?: (clipName: string, effectIndex: number) => void;
    // Clip resize (for intro/outro)
    onClipResize?: (clipName: string, newStart: number, newEnd: number) => void;
}

const aspectRatioValues: Record<string, string> = {
    '16:9': '16 / 9',
    '9:16': '9 / 16',
    '1:1': '1 / 1',
    '4:3': '4 / 3',
    '3:4': '3 / 4',
    '4:5': '4 / 5',
    '5:4': '5 / 4',
    '1920:1080': '1920 / 1080', // Original - will be overridden by actual video dimensions
};

// Helper to determine visual layers for elements/effects
interface VisualItem {
    id: string;
    type: 'zoom' | 'text' | 'other';
    start: number;
    end: number;
    label: string;
    content?: string; // Actual text content for text elements
    color: string;
    icon: React.ReactNode;
    row: number;
    // Additional properties for text elements (resizable)
    clipName?: string;
    clipStart?: number;
    clipEnd?: number;
    elementIndex?: number;
    // Additional properties for zoom effects
    effectIndex?: number;
    effectData?: any;
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
    isVideoSelected = false,
    isTextSelected = false,
    selectedTextElement = null,
    timeline = [],
    displayElements = [],
    displayEffects = [],
    narrations = [],
    intro,
    outro,
    videoDuration = 0,
    currentTime = 0,
    isPlaying = false,
    onSeek,
    activeClip,
    onBorderRadiusChange,
    onTextElementResize,
    onTextElementDelete,
    // Text editing handlers
    onTextFontFamilyChange,
    onTextFontSizeChange,
    onTextFontWeightChange,
    onTextColorChange,
    onTextBoldToggle,
    onTextItalicToggle,
    onTextUnderlineToggle,
    onTextAlignChange,
    onTextDelete,
    onTextBlockClick,
    onZoomSelect,
    isZoomSelected = false,
    selectedZoomEffect = null,
    onZoomResize,
    onZoomDelete,
    onClipResize,
}) => {
    const [isBackgroundPanelOpen, setIsBackgroundPanelOpen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(50); // 50% on the 0-100% scale (default like Clueso)
    // Initialize roundingValue from activeClip's borderRadius, default to 3
    const [roundingValue, setRoundingValue] = useState(() => {
        return activeClip?.media?.[0]?.borderRadius ?? 3;
    });
    const timelineRef = React.useRef<HTMLDivElement>(null);
    const timelineContainerRef = React.useRef<HTMLDivElement>(null);
    const [timelineHeight, setTimelineHeight] = useState(200);
    const [isResizing, setIsResizing] = useState(false);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    // Track which zoom block is being dragged/resized (for showing blocked zones)
    const [draggingZoomIndex, setDraggingZoomIndex] = useState<number | null>(null);

    // Sync roundingValue when activeClip changes
    React.useEffect(() => {
        if (activeClip?.media?.[0]?.borderRadius !== undefined) {
            setRoundingValue(activeClip.media[0].borderRadius);
        } else {
            setRoundingValue(3); // Default to 3%
        }
    }, [activeClip]);

    // Convert 0-100% slider to pixels per second
    // 0% = 10px/s (very compressed), 50% = 50px/s, 100% = 150px/s
    const pixelsPerSecond = 10 + (zoomLevel / 100) * 140;

    // Calculate dynamic time step based on pixels per second
    // More pixels = show finer intervals
    const getTimeStep = (pps: number): number => {
        if (pps >= 100) return 1;      // Show every second (1s, 2s, 3s...)
        if (pps >= 60) return 1;       // Show every second
        if (pps >= 40) return 2;       // Show every 2 seconds
        if (pps >= 25) return 5;       // Show every 5 seconds
        return 5;                      // Show every 5 seconds
    };

    const timeStep = getTimeStep(pixelsPerSecond);

    // Handle timeline resize
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            
            const newHeight = window.innerHeight - e.clientY;
            // Clamp between 100px and 500px
            setTimelineHeight(Math.max(100, Math.min(500, newHeight)));
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

    // Playhead drag handlers for smooth scrubbing
    const handlePlayheadMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPlayhead(true);
    };

    // Calculate time from mouse position
    const getTimeFromMouseEvent = React.useCallback((e: MouseEvent | React.MouseEvent) => {
        const container = timelineContainerRef.current;
        if (!container) return currentTime;
        
        const rect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft;
        const time = x / pixelsPerSecond;
        return Math.max(0, Math.min(time, videoDuration));
    }, [pixelsPerSecond, videoDuration, currentTime]);

    // Effect for playhead dragging
    React.useEffect(() => {
        if (!isDraggingPlayhead) return;

        const handleMouseMove = (e: MouseEvent) => {
            const time = getTimeFromMouseEvent(e);
            onSeek?.(time);
        };

        const handleMouseUp = () => {
            setIsDraggingPlayhead(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingPlayhead, getTimeFromMouseEvent, onSeek]);

    // Process display elements into visual items with row assignment per clip
    const visualItems = useMemo(() => {
        const items: VisualItem[] = [];
        const sourceData = displayElements?.length > 0 ? displayElements : displayEffects;

        if (!sourceData || sourceData.length === 0) {
            return [];
        }

        // Track the current layer per clip
        const clipLayerCounters: { [clipName: string]: number } = {};

        // 1. Process elements and effects per clip, assigning sequential layers
        sourceData.forEach((clipData: any, clipIdx: number) => {
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
                        row: 0, // Will be assigned below
                        // Zoom-specific properties
                        clipName: clipName,
                        clipStart: clipData.clipStart,
                        clipEnd: clipData.clipEnd,
                        effectIndex: effIdx,
                        effectData: effect,
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
                        label: element.content || 'Text box', // Use actual content
                        content: element.content || 'Text box', // Store content separately too
                        color: '#EA580C', // Orange for Text
                        icon: <Type size={10} className="text-white" />,
                        row: 0, // Will be assigned below
                        // Additional info for resizable text blocks
                        clipName: clipName,
                        clipStart: clipData.clipStart,
                        clipEnd: clipData.clipEnd,
                        elementIndex: elIdx
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

        return items;
    }, [displayElements, displayEffects]);

    // Calculate max row index to determine scrollable height
    const maxRow = useMemo(() => {
        if (visualItems.length === 0) return 0;
        return Math.max(...visualItems.map(item => item.row));
    }, [visualItems]);

    // Calculate content height: (maxRow + 1) * 24px for layers + 50px for clip layer + padding
    const timelineContentHeight = (maxRow + 1) * 24 + 50;

    // Background canvas aspect ratio: use selected aspect ratio from dropdown
    // Only use actual video dimensions when 'Original' (1920:1080) is selected
    const getBackgroundAspectRatio = (): string => {
        if (aspectRatio === '1920:1080' && videoWidth && videoHeight) {
            // Original mode - use actual video dimensions
            return `${videoWidth} / ${videoHeight}`;
        }
        // Use the selected aspect ratio
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
            <div className="h-8 flex items-center justify-center border-b border-[#2a2a3e]/50 bg-[#1e1e2e] flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    {/* Show TextEditToolbar when text is selected */}
                    {isTextSelected && selectedTextElement ? (
                        <TextEditToolbar
                            fontFamily={selectedTextElement.element?.style?.fontFamily || 'Oswald'}
                            fontSize={selectedTextElement.element?.style?.fontSize || 129}
                            fontWeight={selectedTextElement.element?.style?.fontWeight || 'Light'}
                            textColor={selectedTextElement.element?.style?.color || '#FFFFFF'}
                            onFontFamilyChange={onTextFontFamilyChange || (() => {})}
                            onFontSizeChange={onTextFontSizeChange || (() => {})}
                            onFontWeightChange={onTextFontWeightChange || (() => {})}
                            onColorChange={onTextColorChange || (() => {})}
                            onBoldToggle={onTextBoldToggle || (() => {})}
                            onItalicToggle={onTextItalicToggle || (() => {})}
                            onUnderlineToggle={onTextUnderlineToggle || (() => {})}
                            onAlignChange={onTextAlignChange || (() => {})}
                            onDelete={onTextDelete || (() => {})}
                            isBold={['Bold', 'SemiBold', 'ExtraBold', 'Black'].includes(selectedTextElement.element?.style?.fontWeight || '')}
                            isItalic={selectedTextElement.element?.style?.fontStyle === 'italic'}
                            isUnderline={selectedTextElement.element?.style?.textDecoration === 'underline'}
                            textAlign={selectedTextElement.element?.style?.textAlign || 'center'}
                        />
                    ) : isVideoSelected ? (
                        <VideoEditToolbar
                            roundingValue={roundingValue}
                            onRoundingChange={(value) => {
                                setRoundingValue(value);
                                if (onBorderRadiusChange) {
                                    onBorderRadiusChange(value);
                                }
                            }}
                        />
                    ) : (
                        <>
                            {/* Background Button */}
                            <button 
                                onClick={() => setIsBackgroundPanelOpen(true)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-md transition-all duration-200"
                            >
                                <div
                                    className="w-4 h-4 rounded-full border border-white/20"
                                    style={{ backgroundColor }}
                                />
                                <span className="text-white text-xs font-medium">Background</span>
                            </button>

                            {/* Aspect Ratio Dropdown */}
                            <AspectRatioDropdown
                                currentRatio={aspectRatio}
                                onRatioChange={onAspectRatioChange}
                                videoWidth={videoWidth}
                                videoHeight={videoHeight}
                            />

                            {/* Insert Button */}
                            <button className="flex items-center gap-1.5 px-2 py-1 bg-[#3b3b50] hover:bg-[#4a4a5e] text-white rounded-md text-xs font-medium transition-all duration-200">
                                <Plus size={12} />
                                <span>Insert</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Canvas Area - Video Display */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
                {/* Background Canvas - Sized to SELECTED aspect ratio, centered and responsive */}
                <div
                    className="relative transition-all duration-300 w-full h-full flex items-center justify-center"
                >
                    <div
                        className="relative"
                        style={{
                            backgroundColor,
                            aspectRatio: getBackgroundAspectRatio(),
                            // Use object-fit logic: fit within container while maintaining aspect ratio
                            width: 'auto',
                            height: 'auto',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            // Calculate size based on aspect ratio to fit container
                            // For portrait: limit width more aggressively
                            // For landscape: let height be the constraint
                            // For square: balance both
                            ...(aspectRatio === '9:16' 
                                ? { maxWidth: 'min(100%, 40vh)' }
                                : aspectRatio === '3:4' || aspectRatio === '4:5'
                                ? { maxWidth: 'min(100%, 55vh)' }
                                : aspectRatio === '1:1'
                                ? { maxWidth: 'min(100%, 70vh)', maxHeight: 'min(100%, 70vw)' }
                                : { maxHeight: '100%' }
                            ),
                            // Ensure minimum size on small screens
                            minWidth: '200px',
                            minHeight: '150px',
                            borderRadius: '8px',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Video scales to fit inside - uses scale from media data (default 85%) */}
                        {(() => {
                            // Get scale from activeClip's first media item, default to 85
                            const mediaScale = activeClip?.media?.[0]?.scale ?? 85;
                            // For scale > 100%, we use transform scale to zoom in (and overflow:hidden clips it)
                            // For scale <= 100%, we use max-width/max-height percentage
                            const isZoomedIn = mediaScale > 100;
                            const containerScale = isZoomedIn ? '100%' : `${mediaScale}%`;
                            const transformScale = isZoomedIn ? mediaScale / 100 : 1;
                            
                            return (
                                <div 
                                    style={{ 
                                        maxWidth: containerScale, 
                                        maxHeight: containerScale, 
                                        width: '100%', 
                                        height: '100%', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        position: 'relative',
                                        transform: isZoomedIn ? `scale(${transformScale})` : 'none',
                                        transformOrigin: 'center center',
                                    }}
                                >
                                    {children}
                                </div>
                            );
                        })()}

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
            </div>

            {/* Timeline Section - Like Clueso */}
            <div className="flex-shrink-0 border-t border-[#2a2a3e] bg-[#0d0d15]" style={{ height: `${timelineHeight}px` }}>
                {/* Resize Handle - drag to expand/shrink timeline */}
                <div
                    className={`h-1.5 bg-[#2a2a3e] cursor-ns-resize hover:bg-pink-500/50 transition-colors relative group ${isResizing ? 'bg-pink-500/70' : ''}`}
                    onMouseDown={handleMouseDown}
                    style={{ userSelect: 'none' }}
                >
                    {/* Visual indicator */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                        <div className="w-8 h-0.5 bg-gray-500 rounded group-hover:bg-pink-400 transition-colors"></div>
                    </div>
                </div>
                
                {/* Timeline Tools and Controls */}
                <div className="h-full flex flex-col" style={{ height: `${timelineHeight - 6}px` }}>
                    {/* Timeline Toolbar */}
                    <div className="h-8 flex items-center justify-between px-3 border-b border-[#2a2a3e] bg-[#1a1a2e]">
                        {/* Left Side - Split and Add Clip */}
                        <div className="flex items-center gap-1.5">
                            <button className="flex items-center gap-1.5 px-2 py-1 text-white hover:bg-[#2a2a3e] rounded text-xs transition-all duration-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                </svg>
                                <span>Split</span>
                            </button>
                            <button className="flex items-center gap-1.5 px-2 py-1 text-white hover:bg-[#2a2a3e] rounded text-xs transition-all duration-200">
                                <Plus size={10} />
                                <span>Add Clip</span>
                            </button>
                        </div>

                        {/* Center - Playback Controls */}
                        <div className="flex items-center">
                            {controls}
                        </div>

                        {/* Right Side - Zoom Control */}
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setZoomLevel(prev => Math.max(prev - 10, 0))}
                                className="p-1 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded transition-all duration-200"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                </svg>
                            </button>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={zoomLevel}
                                onChange={(e) => setZoomLevel(Number(e.target.value))}
                                className="w-20 h-1 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer"
                            />
                            <button 
                                onClick={() => setZoomLevel(prev => Math.min(prev + 10, 100))}
                                className="p-1 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded transition-all duration-200"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                </svg>
                            </button>
                            <span className="text-xs text-gray-400 font-medium min-w-[2.5rem]">{zoomLevel}%</span>
                        </div>
                    </div>
                    
                    {/* Timeline Area */}
                    <div 
                        ref={timelineContainerRef}
                        className="flex-1 bg-[#0d0d15] overflow-x-auto overflow-y-hidden flex flex-col"
                    >
                        {videoDuration > 0 ? (
                            <div className="flex-1 flex flex-col relative overflow-visible" style={{ width: `${Math.max(videoDuration * pixelsPerSecond + 16, 800)}px`, minWidth: '100%' }}>
                                {/* Global Playhead - spans entire timeline height, draggable */}
                                <div
                                    className={`absolute top-0 bottom-0 w-px bg-pink-500 ${isDraggingPlayhead ? 'cursor-grabbing' : ''}`}
                                    style={{ 
                                        left: `${currentTime * pixelsPerSecond}px`,
                                        zIndex: 100,
                                        pointerEvents: 'none'
                                    }}
                                >
                                    {/* Draggable playhead handle */}
                                    <div 
                                        className={`absolute top-0 -left-2 w-4 h-4 bg-pink-500 rounded-full border-2 border-white shadow-lg cursor-grab hover:scale-110 transition-transform ${isDraggingPlayhead ? 'cursor-grabbing scale-125' : ''}`}
                                        style={{ pointerEvents: 'auto' }}
                                        onMouseDown={handlePlayheadMouseDown}
                                    />
                                </div>

                                {/* Time Ruler */}
                                <div className="sticky top-0 z-30 bg-[#1a1a2e] border-b border-[#2a2a3e] flex-shrink-0" style={{ paddingLeft: '8px' }}>
                                    <div className="relative h-5" style={{ width: `${videoDuration * pixelsPerSecond}px` }}>
                                        {Array.from({ length: Math.ceil(videoDuration / timeStep) + 1 }, (_, i) => {
                                            const time = i * timeStep;
                                            if (time > videoDuration) return null;
                                            return (
                                                <div
                                                    key={time}
                                                    className="absolute bottom-0"
                                                    style={{ left: `${time * pixelsPerSecond}px` }}
                                                >
                                                    <span className="absolute bottom-0.5 -left-2 text-[9px] text-gray-400 font-medium">
                                                        {time}s
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Tracks Container - fills remaining space, clips at bottom */}
                                <div 
                                    className="relative flex-1 overflow-visible"
                                >
                                    {/* Upper Layers area - effects/elements, scrollable if many rows */}
                                    <div
                                        className="absolute top-0 right-0 overflow-y-auto overflow-x-hidden bg-[#0d0d15]"
                                        style={{
                                            left: '8px',
                                            bottom: '36px',
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: 'rgba(75, 85, 99, 0.5) transparent',
                                            pointerEvents: 'auto',
                                            zIndex: 10
                                        }}
                                    >
                                    <div 
                                        ref={timelineRef}
                                        className="relative"
                                        style={{ 
                                            minHeight: '100%',
                                            height: `${Math.max((maxRow + 1) * 18 + 8, 50)}px`
                                        }}
                                        onClick={(e) => {
                                            if (!timelineRef.current || !onSeek) return;
                                            const rect = timelineRef.current.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const time = x / pixelsPerSecond;
                                            onSeek(Math.max(0, Math.min(time, videoDuration)));
                                        }}
                                    >
                                        {/* Visual items layer - fills the area, items positioned from bottom */}
                                        <div 
                                            className="absolute inset-0"
                                            style={{ pointerEvents: 'none' }}
                                        >
                                                {/* Render Visual Items (Upper Layers) */}
                                                {visualItems.length === 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-[10px]">
                                                        Effects & elements will appear here
                                                    </div>
                                                )}
                                                {visualItems.map((item) => {
                                                    // For text elements, use the ResizableTextBlock component
                                                    if (item.type === 'text' && item.clipName !== undefined && item.elementIndex !== undefined) {
                                                        // Check if this text block is selected
                                                        const isThisSelected = selectedTextElement?.clipName === item.clipName && 
                                                                               selectedTextElement?.elementIndex === item.elementIndex;
                                                        return (
                                                            <ResizableTextBlock
                                                                key={item.id}
                                                                id={item.id}
                                                                clipName={item.clipName}
                                                                elementIndex={item.elementIndex}
                                                                start={item.start}
                                                                end={item.end}
                                                                label={item.label}
                                                                color={item.color}
                                                                clipStart={item.clipStart ?? 0}
                                                                clipEnd={item.clipEnd ?? videoDuration}
                                                                pixelsPerSecond={pixelsPerSecond}
                                                                row={item.row}
                                                                isExternallySelected={isThisSelected}
                                                                onResize={onTextElementResize || (() => {})}
                                                                onDelete={onTextElementDelete || (() => {})}
                                                                onClick={(clipName, elementIndex, clickedTime) => {
                                                                    // Seek to clicked position on the element
                                                                    if (onSeek && clickedTime !== undefined) {
                                                                        onSeek(clickedTime);
                                                                    }
                                                                    // Find the element data from displayElements
                                                                    const clip = displayElements.find((c: any) => c.clipName === clipName);
                                                                    const element = clip?.elements?.[elementIndex];
                                                                    if (element && onTextBlockClick) {
                                                                        onTextBlockClick(clipName, elementIndex, element);
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    }

                                                    // For zoom effects, use ResizableZoomBlock
                                                    if (item.type === 'zoom' && item.clipName && item.effectIndex !== undefined) {
                                                        // Get all zoom effects in this clip for collision detection
                                                        const clipData = displayElements.find((c: any) => c.clipName === item.clipName);
                                                        const allZoomEffects = clipData?.effects?.filter((e: any) => e.type === 'zoom') || [];
                                                        
                                                        // Check if this specific zoom is selected
                                                        const isThisZoomSelected = isZoomSelected && 
                                                            selectedZoomEffect?.clipName === item.clipName && 
                                                            selectedZoomEffect?.effectIndex === item.effectIndex;
                                                        
                                                        return (
                                                            <ResizableZoomBlock
                                                                key={item.id}
                                                                id={item.id}
                                                                clipName={item.clipName}
                                                                effectIndex={item.effectIndex}
                                                                start={item.start}
                                                                end={item.end}
                                                                scale={item.effectData?.scale || 1.4}
                                                                clipStart={item.clipStart || 0}
                                                                clipEnd={item.clipEnd || 100}
                                                                pixelsPerSecond={pixelsPerSecond}
                                                                row={item.row}
                                                                isSelected={isThisZoomSelected}
                                                                allZoomEffects={allZoomEffects}
                                                                onResize={onZoomResize || (() => {})}
                                                                onDelete={onZoomDelete || (() => {})}
                                                                onClick={(clipName, effectIndex, effect) => {
                                                                    if (onSeek) {
                                                                        onSeek(item.start);
                                                                    }
                                                                    if (onZoomSelect) {
                                                                        onZoomSelect(clipName, effectIndex, effect);
                                                                    }
                                                                }}
                                                                effectData={item.effectData}
                                                                onDragStateChange={(isDragging, effIdx) => {
                                                                    setDraggingZoomIndex(isDragging ? effIdx : null);
                                                                }}
                                                            />
                                                        );
                                                    }

                                                    // Fallback for other effect types
                                                    const duration = Math.abs(item.end - item.start);
                                                    const left = item.start * pixelsPerSecond;
                                                    const width = Math.max(duration * pixelsPerSecond, 30);
                                                    const bottom = item.row * 24 + 2; // small gap from clip layer 

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="absolute rounded flex items-center gap-1.5 shadow-sm cursor-pointer hover:brightness-110 transition-all pointer-events-auto"
                                                            style={{
                                                                left: `${left}px`,
                                                                width: `${width}px`,
                                                                bottom: `${bottom}px`,
                                                                height: '20px',
                                                                backgroundColor: item.color,
                                                                zIndex: 10 + item.row,
                                                                border: '1px solid rgba(255,255,255,0.3)',
                                                                paddingLeft: '8px',
                                                                paddingRight: '8px',
                                                            }}
                                                            title={`${item.label} (${item.start.toFixed(1)}s - ${item.end.toFixed(1)}s)`}
                                                            onClick={() => {
                                                                if (onSeek) {
                                                                    onSeek(item.start);
                                                                }
                                                            }}
                                                        >
                                                            {item.icon}
                                                            <span className="text-[10px] font-semibold text-white truncate">
                                                                {item.label}
                                                            </span>
                                                            <div className="ml-auto flex-shrink-0">
                                                                <MoreHorizontal size={14} className="text-white/70" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                    </div>
                                    </div>

                                    {/* Fixed Bottom Layer: Clip Blocks - taller as the main base layer */}
                                    <div 
                                        className="absolute right-0 bg-[#1e1e2e] border-t border-[#2a2a3e]/50 h-9"
                                        style={{ pointerEvents: 'auto', zIndex: 50, bottom: '0px', left: '8px' }}
                                    >
                                        <div className="relative h-full" style={{ paddingTop: '2px' }}>
                                            {timeline && timeline.length > 0 ? timeline.map((clip, idx) => {
                                                const duration = Math.abs(clip.end - clip.start);
                                                const startTime = Math.min(clip.start, clip.end);
                                                const left = startTime * pixelsPerSecond;
                                                const width = Math.max(duration * pixelsPerSecond, 2); // Minimum width to be visible
                                                
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

                                                // Use color from JSON if available
                                                if (clip.backgroundColor) {
                                                    bgColor = clip.backgroundColor;
                                                }

                                                // Calculate collision boundaries from adjacent clips
                                                const sortedTimeline = [...timeline].sort((a, b) => a.start - b.start);
                                                const sortedIdx = sortedTimeline.findIndex(c => c.name === clip.name);
                                                const prevClip = sortedIdx > 0 ? sortedTimeline[sortedIdx - 1] : null;
                                                const nextClip = sortedIdx < sortedTimeline.length - 1 ? sortedTimeline[sortedIdx + 1] : null;
                                                
                                                const prevClipEnd = prevClip ? prevClip.end : 0;
                                                const nextClipStart = nextClip ? nextClip.start : videoDuration;

                                                // Use ResizableClipBlock for all clips (video is non-resizable)
                                                return (
                                                    <ResizableClipBlock
                                                        key={`clip-${idx}`}
                                                        clipName={clip.name}
                                                        start={clip.start}
                                                        end={clip.end}
                                                        backgroundColor={bgColor}
                                                        label={label}
                                                        pixelsPerSecond={pixelsPerSecond}
                                                        isResizable={clip.name !== 'video'}
                                                        prevClipEnd={prevClipEnd}
                                                        nextClipStart={nextClipStart}
                                                        onResize={onClipResize}
                                                        onSeek={onSeek}
                                                    />
                                                );
                                            }) : (
                                                <div className="absolute inset-0 flex items-center justify-center border-t border-dashed border-gray-700">
                                                    <span className="text-[9px] text-gray-500">No clips data</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500 text-[10px] text-center py-6">
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
