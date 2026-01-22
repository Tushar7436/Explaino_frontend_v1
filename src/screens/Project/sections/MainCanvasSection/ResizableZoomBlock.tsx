import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Search, MoreHorizontal, Trash2, AlertCircle } from 'lucide-react';

interface ZoomEffect {
    start: number;
    end: number;
    scale: number;
    type: string;
}

interface ResizableZoomBlockProps {
    id: string;
    clipName: string;
    effectIndex: number;
    start: number;
    end: number;
    scale: number;
    clipStart: number;
    clipEnd: number;
    pixelsPerSecond: number;
    row: number;
    isSelected: boolean;
    allZoomEffects: ZoomEffect[]; // All zoom effects in this clip for collision detection
    onResize: (clipName: string, effectIndex: number, newStart: number, newEnd: number) => void;
    onDelete: (clipName: string, effectIndex: number) => void;
    onClick: (clipName: string, effectIndex: number, effect: any) => void;
    effectData: any;
    onDragStateChange?: (isDragging: boolean, effectIndex: number) => void;
}

// Helper to darken/lighten color
const adjustColor = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const ResizableZoomBlock: React.FC<ResizableZoomBlockProps> = ({
    id,
    clipName,
    effectIndex,
    start,
    end,
    scale,
    clipStart,
    clipEnd,
    pixelsPerSecond,
    row,
    isSelected,
    allZoomEffects,
    onResize,
    onDelete,
    onClick,
    effectData,
    onDragStateChange
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const blockRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ mouseX: number; startTime: number; endTime: number } | null>(null);

    // Minimum duration in seconds (0.5s)
    const MIN_DURATION = 0.5;
    const color = '#3B82F6'; // Blue for zoom

    const duration = Math.abs(end - start);
    
    // Calculate visual bounds
    const visualStart = Math.max(start, clipStart);
    const visualEnd = Math.min(end, clipEnd);
    const visualDuration = Math.max(visualEnd - visualStart, 0);
    
    const left = visualStart * pixelsPerSecond;
    const width = Math.max(visualDuration * pixelsPerSecond, 30);
    const bottom = row * 24 + 6;

    // Is any interaction happening?
    const isInteracting = isDragging || isResizing !== null;

    // Notify parent of drag state changes
    useEffect(() => {
        onDragStateChange?.(isInteracting, effectIndex);
    }, [isInteracting, effectIndex, onDragStateChange]);

    // Calculate blocked zones (other zoom effects)
    const blockedZones = useMemo(() => {
        if (!isInteracting) return [];
        
        return allZoomEffects
            .filter((_, idx) => idx !== effectIndex)
            .map((effect, idx) => ({
                start: effect.start,
                end: effect.end,
                left: effect.start * pixelsPerSecond,
                width: (effect.end - effect.start) * pixelsPerSecond,
                idx
            }));
    }, [isInteracting, allZoomEffects, effectIndex, pixelsPerSecond]);

    // Check for collision with other zoom effects
    const checkCollision = useCallback((newStart: number, newEnd: number): boolean => {
        for (let i = 0; i < allZoomEffects.length; i++) {
            if (i === effectIndex) continue; // Skip self
            const other = allZoomEffects[i];
            // Check for overlap (exclusive - touching is allowed)
            if (newStart < other.end && newEnd > other.start) {
                return true; // Collision detected
            }
        }
        return false;
    }, [allZoomEffects, effectIndex]);

    // Find the maximum extent for resizing/dragging without collision
    const findMaxExtent = useCallback((direction: 'left' | 'right' | 'move', _proposedStart: number, _proposedEnd: number): { start: number; end: number } => {
        // _proposedStart and _proposedEnd reserved for future use
        void _proposedStart;
        void _proposedEnd;
        let maxStart = clipStart;
        let maxEnd = clipEnd;
        
        // Find boundaries from other zooms
        for (let i = 0; i < allZoomEffects.length; i++) {
            if (i === effectIndex) continue;
            const other = allZoomEffects[i];
            
            if (direction === 'left' || direction === 'move') {
                // When extending left or moving left, find the closest zoom that ends before our start
                if (other.end <= start && other.end > maxStart) {
                    maxStart = other.end;
                }
            }
            if (direction === 'right' || direction === 'move') {
                // When extending right or moving right, find the closest zoom that starts after our end
                if (other.start >= end && other.start < maxEnd) {
                    maxEnd = other.start;
                }
            }
            if (direction === 'move') {
                // For moving, also check zooms that are currently after us (we might move into them)
                if (other.start > start && other.start < maxEnd) {
                    maxEnd = other.start;
                }
                // And zooms currently before us
                if (other.end < end && other.end > maxStart) {
                    maxStart = other.end;
                }
            }
        }
        
        return { start: maxStart, end: maxEnd };
    }, [allZoomEffects, effectIndex, clipStart, clipEnd, start, end]);

    // Handle resize start
    const handleResizeStart = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(side);
        onClick(clipName, effectIndex, effectData);
    }, [onClick, clipName, effectIndex, effectData]);

    // Handle drag start
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-resize-handle]') || target.closest('[data-menu]')) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        const timelineContainer = blockRef.current?.closest('[class*="overflow-x-auto"]');
        if (!timelineContainer) return;
        
        const containerRect = timelineContainer.getBoundingClientRect();
        const scrollLeft = timelineContainer.scrollLeft;
        const mouseX = e.clientX - containerRect.left + scrollLeft;
        
        dragStartRef.current = {
            mouseX,
            startTime: start,
            endTime: end
        };
        
        setIsDragging(true);
        onClick(clipName, effectIndex, effectData);
    }, [start, end, onClick, clipName, effectIndex, effectData]);

    // Handle block click
    const handleBlockClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(clipName, effectIndex, effectData);
    }, [onClick, clipName, effectIndex, effectData]);

    // Handle drag/resize move
    useEffect(() => {
        if (!isResizing && !isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!blockRef.current) return;

            const timelineContainer = blockRef.current.closest('[class*="overflow-x-auto"]');
            if (!timelineContainer) return;

            const containerRect = timelineContainer.getBoundingClientRect();
            const scrollLeft = timelineContainer.scrollLeft;
            const mouseX = e.clientX - containerRect.left + scrollLeft;
            const timeAtMouse = mouseX / pixelsPerSecond;

            if (isResizing === 'left') {
                const bounds = findMaxExtent('left', timeAtMouse, end);
                let newStart = Math.max(bounds.start, Math.min(timeAtMouse, end - MIN_DURATION));
                newStart = Math.max(clipStart, newStart);
                
                // Check collision before applying
                if (!checkCollision(newStart, end) && Math.abs(newStart - start) > 0.01) {
                    onResize(clipName, effectIndex, newStart, end);
                }
            } else if (isResizing === 'right') {
                const bounds = findMaxExtent('right', start, timeAtMouse);
                let newEnd = Math.min(bounds.end, Math.max(timeAtMouse, start + MIN_DURATION));
                newEnd = Math.min(clipEnd, newEnd);
                
                // Check collision before applying
                if (!checkCollision(start, newEnd) && Math.abs(newEnd - end) > 0.01) {
                    onResize(clipName, effectIndex, start, newEnd);
                }
            } else if (isDragging && dragStartRef.current) {
                const deltaX = mouseX - dragStartRef.current.mouseX;
                const deltaTime = deltaX / pixelsPerSecond;
                
                const originalDuration = dragStartRef.current.endTime - dragStartRef.current.startTime;
                let newStart = dragStartRef.current.startTime + deltaTime;
                let newEnd = dragStartRef.current.endTime + deltaTime;
                
                // Clamp to clip boundaries
                if (newStart < clipStart) {
                    newStart = clipStart;
                    newEnd = clipStart + originalDuration;
                }
                if (newEnd > clipEnd) {
                    newEnd = clipEnd;
                    newStart = clipEnd - originalDuration;
                }
                
                // Check collision before applying
                if (!checkCollision(newStart, newEnd)) {
                    if (Math.abs(newStart - start) > 0.01 || Math.abs(newEnd - end) > 0.01) {
                        onResize(clipName, effectIndex, newStart, newEnd);
                    }
                }
            }
        };

        const handleMouseUp = () => {
            setIsResizing(null);
            setIsDragging(false);
            dragStartRef.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        document.body.style.cursor = isResizing ? 'ew-resize' : 'grabbing';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, isDragging, start, end, clipStart, clipEnd, pixelsPerSecond, onResize, clipName, effectIndex, checkCollision, findMaxExtent]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const showHighlight = isSelected || isHovered || isResizing || isDragging;

    // Suppress unused variable warnings
    void id;
    void duration;
    void scale;
    void AlertCircle; // Reserved for future use

    return (
        <>
            {/* Blocked zone indicators - show when dragging/resizing */}
            {isInteracting && blockedZones.map((zone) => (
                <div
                    key={`blocked-${zone.idx}`}
                    className="absolute pointer-events-none"
                    style={{
                        left: `${zone.left}px`,
                        width: `${zone.width}px`,
                        bottom: `${bottom}px`,
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '2px dashed rgba(239, 68, 68, 0.6)',
                        zIndex: 90,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <span className="text-[9px] font-medium text-red-400/80 truncate px-2">
                        Occupied
                    </span>
                </div>
            ))}
            
            {/* The zoom block itself */}
            <div
                ref={blockRef}
                data-zoom-block="true"
                className="absolute flex items-center transition-all duration-75"
                style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    bottom: `${bottom}px`,
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: color,
                    zIndex: isResizing || isSelected || isDragging || isMenuOpen ? 100 : 20 + row,
                    cursor: isDragging ? 'grabbing' : isResizing ? 'ew-resize' : 'grab',
                    pointerEvents: 'auto',
                    border: showHighlight ? '2px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: showHighlight 
                        ? '0 2px 8px rgba(0,0,0,0.4)' 
                        : '0 1px 4px rgba(0,0,0,0.3)',
                    background: `linear-gradient(180deg, ${color} 0%, ${adjustColor(color, -15)} 100%)`,
                }}
                title={`Zoom ${(effectData?.scale || 1.4).toFixed(1)}x (${start.toFixed(2)}s - ${end.toFixed(2)}s)`}
                onClick={handleBlockClick}
                onMouseDown={handleDragStart}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Left resize handle */}
            <div
                data-resize-handle="left"
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 flex items-center justify-center"
                onMouseDown={(e) => handleResizeStart(e, 'left')}
            >
                <div 
                    className="w-0.5 h-3 rounded-full"
                    style={{
                        backgroundColor: showHighlight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                    }}
                />
            </div>

            {/* Content area */}
            <div className="flex-1 flex items-center justify-start gap-1.5 pl-3 pr-1 min-w-0 overflow-hidden">
                <Search size={10} className="text-white flex-shrink-0" style={{ opacity: 0.9 }} />
                <span className="text-[10px] font-semibold text-white truncate" style={{ opacity: 0.95 }}>
                    Zoom
                </span>
            </div>

            {/* Three-dot menu button */}
            <div 
                data-menu="true"
                className="relative flex-shrink-0 mr-1"
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMenuOpen(prev => !prev);
                        onClick(clipName, effectIndex, effectData);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-0.5 rounded hover:bg-white/20 transition-colors"
                >
                    <MoreHorizontal size={14} className="text-white/80" />
                </button>

                {/* Menu dropdown */}
                {isMenuOpen && (
                    <div 
                        className="absolute right-0 top-full mt-1 bg-[#1e1e2e] border border-white/10 rounded-lg shadow-xl z-50 py-1 min-w-[120px]"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onDelete(clipName, effectIndex);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors text-left"
                        >
                            <Trash2 size={14} />
                            <span className="text-sm">Delete</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Right resize handle */}
            <div
                data-resize-handle="right"
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 flex items-center justify-center"
                onMouseDown={(e) => handleResizeStart(e, 'right')}
            >
                <div 
                    className="w-0.5 h-3 rounded-full"
                    style={{
                        backgroundColor: showHighlight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                    }}
                />
            </div>
        </div>
        </>
    );
};

export default ResizableZoomBlock;
