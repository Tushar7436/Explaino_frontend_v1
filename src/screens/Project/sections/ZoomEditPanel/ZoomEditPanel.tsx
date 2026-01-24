import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Trash2, Search } from 'lucide-react';

interface ZoomEffect {
    type: string;
    start: number;
    end: number;
    scale: number;
    style?: {
        zoom?: {
            enabled?: boolean;
            scale?: number;
        };
    };
    target?: {
        selector?: string;
        bounds?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
}

type UpdatePayload = Partial<{
    scale: number;
    start: number;
    end: number;
    target: { bounds: { x: number; y: number; width: number; height: number } };
}>;

interface ZoomEditPanelProps {
    isOpen: boolean;
    onClose: () => void;
    effect: ZoomEffect | null;
    clipName: string;
    effectIndex: number;
    clipStart: number;
    clipEnd: number;
    recordingWidth?: number;
    recordingHeight?: number;
    onUpdate: (updates: UpdatePayload) => void;
    onPreview?: (updates: UpdatePayload) => void; // Real-time preview without tracking
    onDelete: () => void;
}

// Convert time in seconds to HH:MM:SS format
const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const ZoomEditPanel: React.FC<ZoomEditPanelProps> = ({
    isOpen,
    onClose,
    effect,
    clipStart,
    clipEnd,
    recordingWidth = 1920,
    recordingHeight = 1080,
    onUpdate,
    onPreview,
    onDelete,
}) => {
    const [activeTab, setActiveTab] = useState<'design' | 'animation'>('design');
    const positionBoxRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isSliding, setIsSliding] = useState(false);
    
    // Local state for position (only updates parent on release)
    const [localPosition, setLocalPosition] = useState({ x: 0.5, y: 0.5 });
    // Local state for scale (only updates parent on release)
    const [localScale, setLocalScale] = useState(1.4);

    // Sync local state with effect when effect changes (but not during interaction)
    useEffect(() => {
        if (!isDragging && !isSliding && effect) {
            if (effect.target?.bounds) {
                const bounds = effect.target.bounds;
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;
                setLocalPosition({
                    x: centerX / recordingWidth,
                    y: centerY / recordingHeight
                });
            }
            setLocalScale(effect.scale || effect.style?.zoom?.scale || 1.4);
        }
    }, [effect, isDragging, isSliding, recordingWidth, recordingHeight]);

    // Handle dragging the position dot
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !positionBoxRef.current) return;

        const rect = positionBoxRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        // Update local state during drag
        setLocalPosition({ x, y });

        // Call onPreview for real-time video preview update
        if (onPreview && effect?.target?.bounds) {
            const bounds = effect.target.bounds;
            const newCenterX = x * recordingWidth;
            const newCenterY = y * recordingHeight;
            const newX = newCenterX - bounds.width / 2;
            const newY = newCenterY - bounds.height / 2;

            onPreview({
                target: {
                    bounds: {
                        x: Math.round(newX),
                        y: Math.round(newY),
                        width: bounds.width,
                        height: bounds.height
                    }
                }
            });
        }
    }, [isDragging, effect, recordingWidth, recordingHeight, onPreview]);

    const handleDragEnd = useCallback(() => {
        if (isDragging && effect?.target?.bounds) {
            // On release, save to parent/storage
            const bounds = effect.target.bounds;
            const newCenterX = localPosition.x * recordingWidth;
            const newCenterY = localPosition.y * recordingHeight;
            const newX = newCenterX - bounds.width / 2;
            const newY = newCenterY - bounds.height / 2;

            console.log('[ZoomEditPanel] handleDragEnd - calling onUpdate with bounds:', { x: Math.round(newX), y: Math.round(newY), width: bounds.width, height: bounds.height });
            onUpdate({
                target: {
                    bounds: {
                        x: Math.round(newX),
                        y: Math.round(newY),
                        width: bounds.width,
                        height: bounds.height
                    }
                }
            });
        }
        setIsDragging(false);
    }, [isDragging, effect, localPosition, recordingWidth, recordingHeight, onUpdate]);

    // Handle scale slider
    const handleScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setIsSliding(true);
        const newScale = parseFloat(e.target.value);
        setLocalScale(newScale);

        // Call onPreview for real-time video preview update
        if (onPreview) {
            onPreview({ scale: newScale });
        }
    }, [onPreview]);

    const handleScaleRelease = useCallback(() => {
        if (isSliding) {
            // On release, save to parent/storage
            console.log('[ZoomEditPanel] handleScaleRelease - calling onUpdate with scale:', localScale);
            onUpdate({ scale: localScale });
        }
        setIsSliding(false);
    }, [isSliding, localScale, onUpdate]);

    // Add/remove mouse event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    if (!isOpen || !effect) return null;

    return (
        <div 
            data-zoom-edit-panel
            className="w-[360px] bg-gradient-to-b from-[#1e1e2e] to-[#1a1a28] border-r border-white/5 flex flex-col h-full"
        >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Search size={16} className="text-blue-400" />
                    <span className="text-white text-sm font-medium">Edit Zoom</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Tabs */}
            <div className="px-4 py-2 border-b border-white/5">
                <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('design')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeTab === 'design'
                                ? 'bg-pink-500/80 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                        </svg>
                        Design
                    </button>
                    <button
                        onClick={() => setActiveTab('animation')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeTab === 'animation'
                                ? 'bg-pink-500/80 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Animation
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'design' && (
                    <div className="p-4 space-y-5">
                        {/* Position Box - Clueso style */}
                        <div className="space-y-3">
                            <div 
                                ref={positionBoxRef}
                                className="relative bg-[#2a2a3e] rounded-lg overflow-hidden"
                                style={{ aspectRatio: '16/9' }}
                            >
                                {/* Grid lines */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
                                    <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
                                </div>
                                
                                {/* Draggable position dot */}
                                <div
                                    onMouseDown={handleDragStart}
                                    className="absolute w-5 h-5 bg-pink-500 rounded-full cursor-grab active:cursor-grabbing shadow-lg shadow-pink-500/50 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform z-10"
                                    style={{
                                        left: `${localPosition.x * 100}%`,
                                        top: `${localPosition.y * 100}%`
                                    }}
                                />
                            </div>

                            {/* Position display */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-xs">⊕ Position</span>
                                </div>
                                <div className="flex items-center gap-3 ml-auto">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 text-xs">X:</span>
                                        <span className="text-white text-xs font-mono bg-white/5 px-2 py-1 rounded">
                                            {localPosition.x.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 text-xs">Y:</span>
                                        <span className="text-white text-xs font-mono bg-white/5 px-2 py-1 rounded">
                                            {localPosition.y.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Zoom Scale Slider */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Search size={14} className="text-gray-400" />
                                <span className="text-gray-400 text-xs">Zoom scale</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="0.1"
                                    value={localScale}
                                    onChange={handleScaleChange}
                                    onMouseUp={handleScaleRelease}
                                    onTouchEnd={handleScaleRelease}
                                    className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                                        [&::-webkit-slider-thumb]:appearance-none
                                        [&::-webkit-slider-thumb]:w-4
                                        [&::-webkit-slider-thumb]:h-4
                                        [&::-webkit-slider-thumb]:bg-pink-500
                                        [&::-webkit-slider-thumb]:rounded-full
                                        [&::-webkit-slider-thumb]:cursor-grab
                                        [&::-webkit-slider-thumb]:active:cursor-grabbing
                                        [&::-webkit-slider-thumb]:shadow-lg
                                        [&::-webkit-slider-thumb]:shadow-pink-500/30"
                                />
                                <span className="text-white text-sm font-medium w-12 text-right">
                                    {localScale.toFixed(1)} x
                                </span>
                            </div>
                        </div>

                        {/* Duration Section */}
                        <div className="space-y-3">
                            <span className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                                Duration
                            </span>
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        <span className="text-gray-400 text-xs">Start</span>
                                        <span className="text-pink-400 text-xs font-mono">
                                            {formatTime(effect.start)}
                                        </span>
                                    </div>
                                    <div className="w-px h-4 bg-white/10" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-xs">End</span>
                                        <span className="text-pink-400 text-xs font-mono">
                                            {formatTime(effect.end)}
                                        </span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    </div>
                                </div>
                                
                                {/* Duration display */}
                                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-center">
                                    <span className="text-gray-500 text-xs">
                                        Duration: {(effect.end - effect.start).toFixed(2)}s
                                    </span>
                                </div>
                            </div>
                            
                            {/* Clip boundary info */}
                            <div className="text-[10px] text-gray-600 text-center">
                                Clip: {formatTime(clipStart)} - {formatTime(clipEnd)}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'animation' && (
                    <div className="p-4 space-y-4">
                        <div className="text-center text-gray-500 py-8">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-gray-600">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <p className="text-xs">Animation options</p>
                            <p className="text-[10px] text-gray-600 mt-1">Coming soon...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Button */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={onDelete}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                >
                    <Trash2 size={14} />
                    <span className="text-sm">Delete</span>
                </button>
            </div>
        </div>
    );
};

export default ZoomEditPanel;
