import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableClipBlockProps {
    clipName: string;
    start: number;
    end: number;
    label: string;
    backgroundColor: string;
    pixelsPerSecond: number;
    isResizable: boolean; // false for "video" clip
    minDuration?: number; // Minimum duration for the clip
    prevClipEnd?: number; // End time of previous clip (for collision)
    nextClipStart?: number; // Start time of next clip (for collision)
    onResize?: (clipName: string, newStart: number, newEnd: number) => void;
    onSeek?: (time: number) => void;
}

export const ResizableClipBlock: React.FC<ResizableClipBlockProps> = ({
    clipName,
    start,
    end,
    label,
    backgroundColor,
    pixelsPerSecond,
    isResizable,
    minDuration = 0.5,
    prevClipEnd,
    onResize,
    onSeek
}) => {
    const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const blockRef = useRef<HTMLDivElement>(null);

    const duration = Math.abs(end - start);
    const left = start * pixelsPerSecond;
    const width = Math.max(duration * pixelsPerSecond, 30);

    // Handle resize start
    const handleResizeStart = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
        if (!isResizable) return;
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(side);
    }, [isResizable]);

    // Handle click to seek
    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onSeek?.(start);
    }, [onSeek, start]);

    // Handle resize move
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!blockRef.current) return;

            const timelineContainer = blockRef.current.closest('[class*="overflow-x-auto"]');
            if (!timelineContainer) return;

            const containerRect = timelineContainer.getBoundingClientRect();
            const scrollLeft = timelineContainer.scrollLeft;
            const mouseX = e.clientX - containerRect.left + scrollLeft;
            const timeAtMouse = mouseX / pixelsPerSecond;

            if (isResizing === 'left') {
                // For left resize
                // Intro clip: start is fixed at 0, left handle controls right edge
                // Outro clip: end is fixed, left handle controls right edge
                if (clipName === 'intro' || clipName === 'outro') {
                    // Map left handle movement to right edge adjustment
                    // If user drags left handle inward (mouse moves right), shrink from right
                    // If user drags left handle outward (mouse moves left), expand from right
                    const dragDelta = timeAtMouse - start; // How much the left handle moved
                    const newEnd = end - dragDelta; // Apply inverse to right edge
                    const clampedEnd = Math.max(start + minDuration, newEnd);
                    
                    if (Math.abs(clampedEnd - end) > 0.01) {
                        onResize?.(clipName, start, clampedEnd);
                    }
                    return;
                }
                
                const leftBound = prevClipEnd !== undefined ? prevClipEnd : 0;
                const newStart = Math.max(leftBound, Math.min(timeAtMouse, end - minDuration));
                
                if (Math.abs(newStart - start) > 0.01) {
                    onResize?.(clipName, newStart, end);
                }
            } else if (isResizing === 'right') {
                // For right resize (shrinking/expanding from right)
                // No upper bound since subsequent clips will shift
                const newEnd = Math.max(start + minDuration, timeAtMouse);
                
                if (Math.abs(newEnd - end) > 0.01) {
                    onResize?.(clipName, start, newEnd);
                }
            }
        };

        const handleMouseUp = () => {
            setIsResizing(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, start, end, minDuration, prevClipEnd, pixelsPerSecond, onResize, clipName]);

    const showHighlight = isHovered || isResizing;

    // Suppress unused variable warnings
    void duration;

    return (
        <div
            ref={blockRef}
            className="absolute top-0 rounded overflow-hidden transition-all duration-75"
            style={{ 
                left: `${left}px`, 
                width: `${width}px`,
                height: '28px',
                backgroundColor: backgroundColor,
                cursor: isResizable ? (isResizing ? 'ew-resize' : 'pointer') : 'pointer',
                border: showHighlight && isResizable ? '2px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: showHighlight && isResizable 
                    ? '0 2px 8px rgba(0,0,0,0.4)' 
                    : '0 1px 4px rgba(0,0,0,0.2)',
                zIndex: isResizing ? 100 : 10,
            }}
            title={`${label} (${start.toFixed(1)}s - ${end.toFixed(1)}s)`}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Left resize handle - only for resizable clips */}
            {isResizable && (
                <div
                    data-resize-handle="left"
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 flex items-center justify-center"
                    onMouseDown={(e) => handleResizeStart(e, 'left')}
                >
                    <div 
                        className="w-0.5 h-4 rounded-full"
                        style={{
                            backgroundColor: showHighlight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                        }}
                    />
                </div>
            )}

            {/* Content */}
            <div className="h-full flex items-center px-2">
                <span className="text-[10px] font-semibold text-white truncate drop-shadow-md">
                    {label}
                </span>
            </div>

            {/* Right resize handle - only for resizable clips */}
            {isResizable && (
                <div
                    data-resize-handle="right"
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 flex items-center justify-center"
                    onMouseDown={(e) => handleResizeStart(e, 'right')}
                >
                    <div 
                        className="w-0.5 h-4 rounded-full"
                        style={{
                            backgroundColor: showHighlight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                        }}
                    />
                </div>
            )}
        </div>
    );
};
