import React, { useState, useCallback, useEffect } from 'react';

interface VideoSelectionBorderProps {
    isSelected: boolean;
    videoDimensions?: { width: number; height: number } | null;
    currentScale?: number; // Current scale value (10-150)
    onScaleChange?: (scale: number, isComplete?: boolean) => void; // Callback for scale changes
}

/**
 * VideoSelectionBorder - Shows selection feedback with border and corner handles
 * Renders when video clip is selected, similar to Clueso's selection UI
 * Corner handles can be dragged to resize (change scale)
 */
export const VideoSelectionBorder: React.FC<VideoSelectionBorderProps> = ({ 
    isSelected, 
    videoDimensions,
    currentScale = 85,
    onScaleChange,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [dragStartScale, setDragStartScale] = useState(currentScale);
    const [dragCorner, setDragCorner] = useState<string | null>(null);

    // Handle mouse move during drag
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !dragCorner || !videoDimensions) return;

        // Calculate distance moved from start
        const dx = e.clientX - dragStartPos.x;
        const dy = e.clientY - dragStartPos.y;

        // Use diagonal distance for scaling (average of x and y movement)
        // Positive = away from center = scale up, Negative = toward center = scale down
        let scaleDelta = 0;
        
        if (dragCorner === 'top-left') {
            // Moving up-left = scale up, down-right = scale down
            scaleDelta = (-dx - dy) / 4;
        } else if (dragCorner === 'top-right') {
            // Moving up-right = scale up, down-left = scale down
            scaleDelta = (dx - dy) / 4;
        } else if (dragCorner === 'bottom-left') {
            // Moving down-left = scale up, up-right = scale down
            scaleDelta = (-dx + dy) / 4;
        } else if (dragCorner === 'bottom-right') {
            // Moving down-right = scale up, up-left = scale down
            scaleDelta = (dx + dy) / 4;
        }

        // Calculate new scale (clamp to 10-150)
        const newScale = Math.max(10, Math.min(150, dragStartScale + scaleDelta));
        
        // Update scale (visual only, not saving yet)
        onScaleChange?.(newScale, false);
    }, [isDragging, dragCorner, dragStartPos, dragStartScale, videoDimensions, onScaleChange]);

    // Handle mouse up - end drag and save
    const handleMouseUp = useCallback(() => {
        if (isDragging && onScaleChange) {
            // Complete the scale change (save to localStorage)
            onScaleChange(currentScale, true);
        }
        setIsDragging(false);
        setDragCorner(null);
    }, [isDragging, currentScale, onScaleChange]);

    // Add/remove global mouse listeners
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Prevent text selection during drag
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Start drag from a corner handle
    const handleCornerMouseDown = (corner: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragCorner(corner);
        setDragStartPos({ x: e.clientX, y: e.clientY });
        setDragStartScale(currentScale);
    };

    if (!isSelected || !videoDimensions) return null;

    // Calculate centering offset
    const leftOffset = `calc(50% - ${videoDimensions.width / 2}px)`;
    const topOffset = `calc(50% - ${videoDimensions.height / 2}px)`;

    return (
        <div
            className="absolute pointer-events-none"
            style={{
                top: topOffset,
                left: leftOffset,
                width: `${videoDimensions.width}px`,
                height: `${videoDimensions.height}px`,
                zIndex: 100,
            }}
        >
            {/* Selection Border - Sky blue with sharp corners like Clueso */}
            <div
                className="absolute"
                style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    border: '2.5px solid #38BDF8', // Sky blue color
                    borderRadius: '0px', // Always sharp corners for selection indicator
                    boxShadow: '0 0 0 1px rgba(56, 189, 248, 0.3)', // Sky blue shadow
                }}
            />

            {/* Corner Handles - Draggable for resize */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((position) => {
                const getPositionStyles = (): React.CSSProperties => {
                    const baseStyles: React.CSSProperties = {
                        position: 'absolute',
                        width: '12px',
                        height: '12px',
                        backgroundColor: dragCorner === position ? '#0ea5e9' : '#38BDF8', // Darker when dragging
                        border: '2px solid white',
                        borderRadius: '50%',
                        pointerEvents: 'auto',
                        cursor: position.includes('top')
                            ? position.includes('left')
                                ? 'nw-resize'
                                : 'ne-resize'
                            : position.includes('left')
                            ? 'sw-resize'
                            : 'se-resize',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                        transform: dragCorner === position ? 'scale(1.2)' : 'scale(1)',
                        transition: isDragging ? 'none' : 'transform 0.15s, background-color 0.15s',
                    };

                    if (position === 'top-left') {
                        return { ...baseStyles, top: '-6px', left: '-6px' };
                    } else if (position === 'top-right') {
                        return { ...baseStyles, top: '-6px', right: '-6px' };
                    } else if (position === 'bottom-left') {
                        return { ...baseStyles, bottom: '-6px', left: '-6px' };
                    } else {
                        return { ...baseStyles, bottom: '-6px', right: '-6px' };
                    }
                };

                return (
                    <div
                        key={position}
                        className="hover:scale-125"
                        style={getPositionStyles()}
                        onMouseDown={handleCornerMouseDown(position)}
                    />
                );
            })}
        </div>
    );
};
