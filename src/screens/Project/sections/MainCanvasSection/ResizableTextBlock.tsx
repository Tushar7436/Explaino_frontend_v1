import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Type, MoreHorizontal, Trash2 } from 'lucide-react';

interface ResizableTextBlockProps {
    id: string;
    clipName: string;
    elementIndex: number;
    start: number;
    end: number;
    label: string; // This is now the actual text content
    color: string;
    clipStart: number;
    clipEnd: number;
    pixelsPerSecond: number;
    row: number;
    isExternallySelected?: boolean; // External selection state from parent
    onResize: (clipName: string, elementIndex: number, newStart: number, newEnd: number) => void;
    onDelete: (clipName: string, elementIndex: number) => void;
    onClick?: (clipName: string, elementIndex: number) => void; // Click handler for selection
}

export const ResizableTextBlock: React.FC<ResizableTextBlockProps> = ({
    id,
    clipName,
    elementIndex,
    start,
    end,
    label,
    color,
    clipStart,
    clipEnd,
    pixelsPerSecond,
    row,
    isExternallySelected = false,
    onResize,
    onDelete,
    onClick
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const blockRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ mouseX: number; startTime: number; endTime: number } | null>(null);

    // Minimum duration in seconds (0.5s)
    const MIN_DURATION = 0.5;

    const duration = Math.abs(end - start);
    
    // Calculate visual bounds - clip to parent clip area
    const visualStart = Math.max(start, clipStart);
    const visualEnd = Math.min(end, clipEnd);
    const visualDuration = Math.max(visualEnd - visualStart, 0);
    
    const left = visualStart * pixelsPerSecond;
    const width = Math.max(visualDuration * pixelsPerSecond, 30);

    // Calculate bottom position based on row index (each row is 24px)
    const bottom = row * 24 + 6;

    // Handle resize start
    const handleResizeStart = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(side);
        onClick?.(clipName, elementIndex); // Notify parent of selection
    }, [onClick, clipName, elementIndex]);

    // Handle drag start (for moving the block)
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        // Don't start drag if clicking on menu or resize handles
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
        onClick?.(clipName, elementIndex); // Notify parent of selection
    }, [start, end, onClick, clipName, elementIndex]);

    // Handle block click (select)
    const handleBlockClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClick?.(clipName, elementIndex); // Notify parent of selection
    }, [onClick, clipName, elementIndex]);

    // Handle drag/resize move
    React.useEffect(() => {
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
                let newStart = Math.max(clipStart, Math.min(timeAtMouse, end - MIN_DURATION));
                newStart = Math.max(clipStart, newStart);
                
                if (Math.abs(newStart - start) > 0.01) {
                    onResize(clipName, elementIndex, newStart, end);
                }
            } else if (isResizing === 'right') {
                let newEnd = Math.min(clipEnd, Math.max(timeAtMouse, start + MIN_DURATION));
                newEnd = Math.min(clipEnd, newEnd);
                
                if (Math.abs(newEnd - end) > 0.01) {
                    onResize(clipName, elementIndex, start, newEnd);
                }
            } else if (isDragging && dragStartRef.current) {
                // Calculate the delta movement
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
                
                // Ensure we stay within bounds
                newStart = Math.max(clipStart, newStart);
                newEnd = Math.min(clipEnd, newEnd);
                
                if (Math.abs(newStart - start) > 0.01 || Math.abs(newEnd - end) > 0.01) {
                    onResize(clipName, elementIndex, newStart, newEnd);
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

        // Add cursor style to body during resize/drag
        document.body.style.cursor = isResizing ? 'ew-resize' : 'grabbing';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, isDragging, start, end, clipStart, clipEnd, pixelsPerSecond, onResize, clipName, elementIndex]);

    // Close menu and deselect when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Determine if we should show the selection/hover state
    const showHighlight = isExternallySelected || isHovered || isResizing || isDragging;

    // Suppress unused variable warning
    void id;
    void duration;

    return (
        <div
            ref={blockRef}
            data-text-block="true"
            className="absolute flex items-center transition-all duration-75"
            style={{
                left: `${left}px`,
                width: `${width}px`,
                bottom: `${bottom}px`,
                height: '20px', // Same height as zoom blocks
                borderRadius: '4px',
                backgroundColor: color,
                zIndex: isResizing || isExternallySelected || isDragging || isMenuOpen ? 100 : 20 + row,
                cursor: isDragging ? 'grabbing' : isResizing ? 'ew-resize' : 'grab',
                pointerEvents: 'auto',
                // Clueso-style: always show border/outline
                border: showHighlight ? '2px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: showHighlight 
                    ? '0 2px 8px rgba(0,0,0,0.4)' 
                    : '0 1px 4px rgba(0,0,0,0.3)',
                // Subtle gradient overlay like Clueso
                background: `linear-gradient(180deg, ${color} 0%, ${adjustColor(color, -15)} 100%)`,
            }}
            title={`${label} (${start.toFixed(2)}s - ${end.toFixed(2)}s)`}
            onClick={handleBlockClick}
            onMouseDown={handleDragStart}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Left resize handle - visible bar */}
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

            {/* Content area - LEFT ALIGNED */}
            <div className="flex-1 flex items-center justify-start gap-1.5 pl-3 pr-1 min-w-0 overflow-hidden">
                <Type size={12} className="text-white flex-shrink-0" style={{ opacity: 0.9 }} />
                <span className="text-[10px] font-semibold text-white truncate" style={{ opacity: 0.95 }}>
                    {label}
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
                        console.log('[ResizableTextBlock] Menu button clicked');
                        setIsMenuOpen(prev => !prev);
                        onClick?.(clipName, elementIndex); // Notify parent of selection
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    className="p-0.5 hover:bg-white/25 rounded transition-colors flex items-center justify-center"
                    style={{ 
                        pointerEvents: 'auto',
                        backgroundColor: isMenuOpen ? 'rgba(255,255,255,0.25)' : 'transparent',
                        opacity: showHighlight ? 1 : 0.7,
                    }}
                >
                    <MoreHorizontal size={14} className="text-white" />
                </button>

                {/* Dropdown menu - positioned ABOVE the button */}
                {isMenuOpen && (
                    <div
                        ref={menuRef}
                        className="absolute right-0 bottom-full mb-1 bg-[#1a1a2e] border border-[#3a3a5e] rounded-lg shadow-2xl py-1 min-w-[140px]"
                        style={{ 
                            pointerEvents: 'auto',
                            zIndex: 9999,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* Bring forward option */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[ResizableTextBlock] Bring forward clicked');
                                setIsMenuOpen(false);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            <span>Bring forward</span>
                        </button>
                        
                        {/* Bring to front option */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[ResizableTextBlock] Bring to front clicked');
                                setIsMenuOpen(false);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4M7 21h10a2 2 0 002-2v-4H5v4a2 2 0 002 2z" />
                            </svg>
                            <span>Bring to front</span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-[#3a3a5e] my-1" />
                        
                        {/* Duplicate option */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[ResizableTextBlock] Duplicate clicked');
                                setIsMenuOpen(false);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Duplicate</span>
                        </button>
                        
                        {/* Copy option */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[ResizableTextBlock] Copy clicked');
                                setIsMenuOpen(false);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            <span>Copy</span>
                            <span className="ml-auto text-xs text-gray-500">Ctrl+C</span>
                        </button>
                        
                        {/* Paste option */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[ResizableTextBlock] Paste clicked');
                                setIsMenuOpen(false);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>Paste</span>
                            <span className="ml-auto text-xs text-gray-500">Ctrl+V</span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-[#3a3a5e] my-1" />
                        
                        {/* Delete option */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[ResizableTextBlock] Delete clicked for:', clipName, elementIndex);
                                setIsMenuOpen(false);
                                onDelete(clipName, elementIndex);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                        >
                            <Trash2 size={14} />
                            <span>Delete</span>
                            <span className="ml-auto text-xs text-gray-500">Del</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Right resize handle - visible bar */}
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
    );
};

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
    // Handle hex colors
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
        return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
}

export default ResizableTextBlock;
