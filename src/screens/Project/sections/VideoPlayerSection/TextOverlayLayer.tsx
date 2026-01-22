import React, { useRef, useEffect, useState, useCallback } from 'react';

// Map font weight names to CSS font-weight values
const fontWeightMap: Record<string, number | string> = {
    'Light': 300,
    'Regular': 400,
    'Normal': 400,
    'normal': 400,
    'Medium': 500,
    'SemiBold': 600,
    'Semi Bold': 600,
    'Bold': 700,
    'bold': 700,
    'ExtraBold': 800,
    'Extra Bold': 800,
    'Black': 900,
};

// Helper function to convert named font weights to CSS values
const getFontWeight = (weight: string | number): number | string => {
    if (typeof weight === 'number') return weight;
    return fontWeightMap[weight] || weight;
};

interface TextPosition {
    x: number;
    y: number;
}

interface TextDimension {
    width: number;
    height: number;
}

interface TextOutline {
    enabled?: boolean;
    width: number;
    color: string;
}

interface TextShadowPosition {
    x: number;
    y: number;
}

interface TextShadow {
    enabled?: boolean;
    color: string;
    position: TextShadowPosition;
    blur?: number;
    opacity?: number;
}

interface TextBackground {
    enabled?: boolean;
    color: string;
    borderRadius?: number;
    radius?: number;
    padding?: number;
    opacity?: number;
}

interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: string;
    lineHeight?: number;
    letterSpacing?: number;
    color: string;
    outline?: TextOutline;
    shadow?: TextShadow;
    background?: TextBackground;
}

interface TextElement {
    type: string;
    content: string;
    start: number;
    end: number;
    position: TextPosition;
    dimension: TextDimension;
    style: TextStyle;
    // Clip boundaries for calculating absolute timeline time
    clipStart?: number;
    clipEnd?: number;
}

interface SelectedTextInfo {
    clipName: string;
    elementIndex: number;
    element: TextElement;
}

interface TextOverlayLayerProps {
    textElements: TextElement[];
    currentTime: number;
    recordingWidth: number;
    recordingHeight: number;
    // Selection props
    selectedTextElement?: SelectedTextInfo | null;
    onTextSelect?: (clipName: string, elementIndex: number, element: TextElement) => void;
    onTextDeselect?: () => void;
    onTextMove?: (clipName: string, elementIndex: number, newX: number, newY: number) => void;
    onTextResize?: (clipName: string, elementIndex: number, newWidth: number, newHeight: number, resizeType?: 'horizontal' | 'diagonal') => void;
    onTextContentChange?: (clipName: string, elementIndex: number, newContent: string) => void;
    // Clip info for element mapping
    displayElements?: any[];
}

/**
 * TextOverlayLayer - Renders text overlays on top of video
 * Uses absolute positioning with percentage-based coordinates
 * Supports selection, drag-to-move, and resize
 */
export const TextOverlayLayer: React.FC<TextOverlayLayerProps> = ({
    textElements,
    currentTime,
    recordingWidth,
    recordingHeight,
    selectedTextElement,
    onTextSelect,
    onTextDeselect,
    onTextMove,
    onTextResize,
    onTextContentChange,
    displayElements = [],
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(1080);
    const [containerWidth, setContainerWidth] = useState(1920);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<string | null>(null); // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
    const [isEditing, setIsEditing] = useState(false); // Inline text editing mode
    const [editingContent, setEditingContent] = useState(''); // Content being edited
    const editInputRef = useRef<HTMLTextAreaElement>(null);
    const [alignmentGuides, setAlignmentGuides] = useState<{
        showVerticalCenter: boolean;
        showHorizontalCenter: boolean;
        showLeft: boolean;
        showRight: boolean;
        showTop: boolean;
        showBottom: boolean;
    }>({ showVerticalCenter: false, showHorizontalCenter: false, showLeft: false, showRight: false, showTop: false, showBottom: false });
    const dragStartRef = useRef<{ 
        mouseX: number; 
        mouseY: number; 
        startX: number; 
        startY: number; 
        width: number; 
        height: number;
        fontSize: number;
        textContent: string;
        clipName: string;
        elementIndex: number;
    } | null>(null);
    const wasJustDraggingRef = useRef<boolean>(false);
    
    // Track container dimensions for dynamic scaling
    useEffect(() => {
        if (!containerRef.current) return;
        
        const updateDimensions = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
                setContainerWidth(containerRef.current.clientWidth);
            }
        };
        
        updateDimensions();
        
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(containerRef.current);
        
        return () => resizeObserver.disconnect();
    }, []);
    
    // Filter active text elements based on current time
    // Text element start/end are in ABSOLUTE timeline coordinates (not relative to clip)
    const activeElements = textElements.filter(element => {
        // Start and end are already absolute timeline times
        const isActive = currentTime >= element.start && currentTime <= element.end;
        if (textElements.length > 0) {
            console.log(`[TextOverlay] Element "${element.content?.substring(0, 20)}...": start=${element.start.toFixed(2)}, end=${element.end.toFixed(2)}, currentTime=${currentTime.toFixed(2)}, isActive=${isActive}`);
        }
        return isActive;
    });

    // Find clip info for an element
    const findElementClipInfo = useCallback((element: TextElement) => {
        for (const clip of displayElements) {
            const elementIndex = clip.elements?.findIndex((el: TextElement) => 
                el.content === element.content && 
                el.start === element.start && 
                el.end === element.end
            );
            if (elementIndex !== undefined && elementIndex !== -1) {
                return { clipName: clip.clipName, elementIndex };
            }
        }
        return null;
    }, [displayElements]);

    // Convert pixel position to percentage
    const toPercentage = (value: number, total: number): number => {
        return (value / total) * 100;
    };

    // Convert percentage to pixels (for drag calculations)
    const fromPercentage = (percent: number, total: number): number => {
        return (percent / 100) * total;
    };

    // Handle element click for selection
    const handleElementClick = useCallback((e: React.MouseEvent, element: TextElement, index: number) => {
        e.stopPropagation();
        
        const clipInfo = findElementClipInfo(element);
        if (clipInfo && onTextSelect) {
            onTextSelect(clipInfo.clipName, clipInfo.elementIndex, element);
        }
    }, [findElementClipInfo, onTextSelect]);

    // Handle element mousedown - select and start drag in one action
    const handleElementMouseDown = useCallback((e: React.MouseEvent, element: TextElement, index: number, isCurrentlySelected: boolean) => {
        if (!containerRef.current) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Find clip info first
        const clipInfo = findElementClipInfo(element);
        if (!clipInfo) return;
        
        // If not selected, select it first
        if (!isCurrentlySelected && onTextSelect) {
            onTextSelect(clipInfo.clipName, clipInfo.elementIndex, element);
        }
        
        // Start drag immediately
        const rect = containerRef.current.getBoundingClientRect();
        
        dragStartRef.current = {
            mouseX: e.clientX - rect.left,
            mouseY: e.clientY - rect.top,
            startX: element.position.x,
            startY: element.position.y,
            width: element.dimension.width,
            height: element.dimension.height,
            fontSize: element.style.fontSize,
            textContent: element.content,
            clipName: clipInfo.clipName,
            elementIndex: clipInfo.elementIndex,
        };
        
        setIsDragging(true);
    }, [findElementClipInfo, onTextSelect]);

    // Handle drag start (legacy - kept for compatibility)
    const handleDragStart = useCallback((e: React.MouseEvent, element: TextElement) => {
        if (!containerRef.current) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const clipInfo = findElementClipInfo(element);
        if (!clipInfo) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        
        dragStartRef.current = {
            mouseX: e.clientX - rect.left,
            mouseY: e.clientY - rect.top,
            startX: element.position.x,
            startY: element.position.y,
            width: element.dimension.width,
            height: element.dimension.height,
            fontSize: element.style.fontSize,
            textContent: element.content,
            clipName: clipInfo.clipName,
            elementIndex: clipInfo.elementIndex,
        };
        
        setIsDragging(true);
    }, [findElementClipInfo]);

    // Handle resize start
    const handleResizeStart = useCallback((e: React.MouseEvent, element: TextElement, handle: string) => {
        if (!containerRef.current) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const clipInfo = findElementClipInfo(element);
        if (!clipInfo) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        
        dragStartRef.current = {
            mouseX: e.clientX - rect.left,
            mouseY: e.clientY - rect.top,
            startX: element.position.x,
            startY: element.position.y,
            width: element.dimension.width,
            height: element.dimension.height,
            fontSize: element.style.fontSize,
            textContent: element.content,
            clipName: clipInfo.clipName,
            elementIndex: clipInfo.elementIndex,
        };
        
        setIsResizing(handle);
    }, [findElementClipInfo]);

    // Handle mouse move for drag/resize
    useEffect(() => {
        if (!isDragging && !isResizing) return;
        if (!dragStartRef.current) return;
        
        // Use stored clip info instead of relying on selectedTextElement state
        const { clipName, elementIndex } = dragStartRef.current;
        
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || !dragStartRef.current) return;
            
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Scale factor from container to recording dimensions
            const scaleX = recordingWidth / containerWidth;
            const scaleY = recordingHeight / containerHeight;
            
            if (isDragging && onTextMove) {
                const deltaX = (mouseX - dragStartRef.current.mouseX) * scaleX;
                const deltaY = (mouseY - dragStartRef.current.mouseY) * scaleY;
                
                let newX = dragStartRef.current.startX + deltaX;
                let newY = dragStartRef.current.startY + deltaY;
                
                const elementWidth = dragStartRef.current.width;
                const elementHeight = dragStartRef.current.height;
                
                // Calculate element center
                const elementCenterX = newX + elementWidth / 2;
                const elementCenterY = newY + elementHeight / 2;
                
                // Canvas center
                const canvasCenterX = recordingWidth / 2;
                const canvasCenterY = recordingHeight / 2;
                
                // Snap threshold in recording coordinates
                const snapThreshold = 15;
                
                // Check alignment and snap
                const guides = {
                    showVerticalCenter: false,
                    showHorizontalCenter: false,
                    showLeft: false,
                    showRight: false,
                    showTop: false,
                    showBottom: false,
                };
                
                // Vertical center alignment (element center to canvas center)
                if (Math.abs(elementCenterX - canvasCenterX) < snapThreshold) {
                    newX = canvasCenterX - elementWidth / 2;
                    guides.showVerticalCenter = true;
                }
                
                // Horizontal center alignment (element center to canvas center)
                if (Math.abs(elementCenterY - canvasCenterY) < snapThreshold) {
                    newY = canvasCenterY - elementHeight / 2;
                    guides.showHorizontalCenter = true;
                }
                
                // Left edge alignment
                if (Math.abs(newX) < snapThreshold) {
                    newX = 0;
                    guides.showLeft = true;
                }
                
                // Right edge alignment
                if (Math.abs(newX + elementWidth - recordingWidth) < snapThreshold) {
                    newX = recordingWidth - elementWidth;
                    guides.showRight = true;
                }
                
                // Top edge alignment
                if (Math.abs(newY) < snapThreshold) {
                    newY = 0;
                    guides.showTop = true;
                }
                
                // Bottom edge alignment
                if (Math.abs(newY + elementHeight - recordingHeight) < snapThreshold) {
                    newY = recordingHeight - elementHeight;
                    guides.showBottom = true;
                }
                
                setAlignmentGuides(guides);
                
                // Allow movement beyond video frame but keep at least 50px visible within the full canvas
                // The full canvas includes the background area, not just the video frame
                const minVisible = 50; // At least 50px must remain visible
                const clampedX = Math.max(-dragStartRef.current.width + minVisible, Math.min(recordingWidth - minVisible, newX));
                const clampedY = Math.max(-dragStartRef.current.height + minVisible, Math.min(recordingHeight - minVisible, newY));
                
                onTextMove(clipName, elementIndex, clampedX, clampedY);
            }
            
            if (isResizing && onTextResize) {
                let newWidth = dragStartRef.current.width;
                let newHeight = dragStartRef.current.height;
                let newX = dragStartRef.current.startX;
                let newY = dragStartRef.current.startY;
                
                // Calculate minimum width based on longest word in text
                const textContent = dragStartRef.current.textContent || '';
                const currentFontSize = dragStartRef.current.fontSize || 100;
                const words = textContent.split(/\s+/);
                const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '');
                
                // Check if it's a corner (diagonal) resize
                const isCornerResize = isResizing === 'nw' || isResizing === 'ne' || isResizing === 'sw' || isResizing === 'se';
                
                if (isCornerResize) {
                    // DIAGONAL RESIZE: Dragged corner follows cursor, opposite corner stays anchored
                    // Convert mouse position to recording coordinates
                    const cursorX = mouseX * scaleX;
                    const cursorY = mouseY * scaleY;
                    
                    const originalWidth = dragStartRef.current.width;
                    const originalHeight = dragStartRef.current.height;
                    const originalX = dragStartRef.current.startX;
                    const originalY = dragStartRef.current.startY;
                    const aspectRatio = originalWidth / originalHeight;
                    
                    // Calculate anchor position (opposite corner from the one being dragged)
                    let anchorX: number, anchorY: number;
                    
                    switch (isResizing) {
                        case 'se': // Anchor at top-left
                            anchorX = originalX;
                            anchorY = originalY;
                            break;
                        case 'sw': // Anchor at top-right
                            anchorX = originalX + originalWidth;
                            anchorY = originalY;
                            break;
                        case 'ne': // Anchor at bottom-left
                            anchorX = originalX;
                            anchorY = originalY + originalHeight;
                            break;
                        case 'nw': // Anchor at bottom-right
                            anchorX = originalX + originalWidth;
                            anchorY = originalY + originalHeight;
                            break;
                        default:
                            anchorX = originalX;
                            anchorY = originalY;
                    }
                    
                    // Calculate distance from anchor to cursor (this determines size)
                    // Use signed distance to handle direction
                    let distX: number, distY: number;
                    
                    switch (isResizing) {
                        case 'se': // Cursor should be to the right and below anchor
                            distX = cursorX - anchorX;
                            distY = cursorY - anchorY;
                            break;
                        case 'sw': // Cursor should be to the left and below anchor
                            distX = anchorX - cursorX;
                            distY = cursorY - anchorY;
                            break;
                        case 'ne': // Cursor should be to the right and above anchor
                            distX = cursorX - anchorX;
                            distY = anchorY - cursorY;
                            break;
                        case 'nw': // Cursor should be to the left and above anchor
                            distX = anchorX - cursorX;
                            distY = anchorY - cursorY;
                            break;
                        default:
                            distX = originalWidth;
                            distY = originalHeight;
                    }
                    
                    // For proportional resize, use average scale and maintain aspect ratio
                    const scaleFromX = distX / originalWidth;
                    const scaleFromY = distY / originalHeight;
                    const avgScale = (scaleFromX + scaleFromY) / 2;
                    
                    // Calculate minimum size based on minimum font size (24px)
                    const MIN_FONT_SIZE = 24;
                    const minScale = MIN_FONT_SIZE / currentFontSize;
                    const clampedScale = Math.max(minScale, Math.max(0.2, avgScale));
                    
                    // Apply clamped scale
                    newWidth = originalWidth * clampedScale;
                    newHeight = originalHeight * clampedScale;
                    
                    // Calculate new position based on anchor and size
                    switch (isResizing) {
                        case 'se': // Anchor at top-left, box extends right and down
                            newX = anchorX;
                            newY = anchorY;
                            break;
                        case 'sw': // Anchor at top-right, box extends left and down
                            newX = anchorX - newWidth;
                            newY = anchorY;
                            break;
                        case 'ne': // Anchor at bottom-left, box extends right and up
                            newX = anchorX;
                            newY = anchorY - newHeight;
                            break;
                        case 'nw': // Anchor at bottom-right, box extends left and up
                            newX = anchorX - newWidth;
                            newY = anchorY - newHeight;
                            break;
                    }
                    
                    // Update position
                    if (onTextMove) {
                        onTextMove(clipName, elementIndex, newX, newY);
                    }
                    
                    onTextResize(clipName, elementIndex, newWidth, newHeight, 'diagonal');
                } else {
                    // EDGE RESIZE: Only horizontal (e/w) allowed
                    const deltaX = (mouseX - dragStartRef.current.mouseX) * scaleX;
                    
                    // Estimate minimum width: longest word * fontSize * 0.65
                    const minWidthForText = Math.max(100, longestWord.length * currentFontSize * 0.65);
                    const clipName = dragStartRef.current.clipName;
                    const elementIndex = dragStartRef.current.elementIndex;
                    
                    if (isResizing === 'e') {
                        newWidth = dragStartRef.current.width + deltaX;
                    }
                    if (isResizing === 'w') {
                        newWidth = dragStartRef.current.width - deltaX;
                        newX = dragStartRef.current.startX + deltaX;
                    }
                    
                    // Enforce minimum width based on text content
                    if (newWidth < minWidthForText) {
                        newWidth = minWidthForText;
                        if (isResizing === 'w') {
                            newX = dragStartRef.current.startX + dragStartRef.current.width - minWidthForText;
                        }
                    }
                    
                    // Update position for west handle
                    if (isResizing === 'w' && onTextMove) {
                        onTextMove(clipName, elementIndex, newX, newY);
                    }
                    
                    onTextResize(clipName, elementIndex, newWidth, newHeight, 'horizontal');
                }
            }
        };
        
        const handleMouseUp = () => {
            // Set a flag to prevent click deselection after drag/resize
            if (isDragging || isResizing) {
                // Small delay to prevent the click event from firing
                setTimeout(() => {
                    wasJustDraggingRef.current = false;
                }, 100);
                wasJustDraggingRef.current = true;
            }
            setIsDragging(false);
            setIsResizing(null);
            setAlignmentGuides({ showVerticalCenter: false, showHorizontalCenter: false, showLeft: false, showRight: false, showTop: false, showBottom: false });
            dragStartRef.current = null;
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        document.body.style.cursor = isDragging ? 'grabbing' : 'nwse-resize';
        document.body.style.userSelect = 'none';
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, isResizing, selectedTextElement, onTextMove, onTextResize, containerWidth, containerHeight, recordingWidth, recordingHeight]);

    // Check if an element is selected
    const isElementSelected = (element: TextElement) => {
        if (!selectedTextElement) return false;
        return selectedTextElement.element.content === element.content &&
               selectedTextElement.element.start === element.start &&
               selectedTextElement.element.end === element.end;
    };

    console.log('[TextOverlayLayer] Total elements:', textElements.length, 'Active:', activeElements.length, 'Time:', currentTime);

    return (
        <div
            ref={containerRef}
            data-text-overlay="true"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: selectedTextElement ? 'auto' : 'none',
                zIndex: 1000,
            }}
            onClick={(e) => {
                // Deselect when clicking on empty area, but not after drag/resize
                if (e.target === containerRef.current && onTextDeselect && !wasJustDraggingRef.current) {
                    onTextDeselect();
                }
            }}
        >
            {/* Alignment Guide Lines */}
            {isDragging && (
                <>
                    {/* Vertical center guide */}
                    {alignmentGuides.showVerticalCenter && (
                        <div
                            style={{
                                position: 'fixed',
                                left: '50%',
                                top: 0,
                                width: '1px',
                                height: '100vh',
                                backgroundColor: '#0ea5e9',
                                pointerEvents: 'none',
                                zIndex: 9999,
                            }}
                        />
                    )}
                    {/* Horizontal center guide */}
                    {alignmentGuides.showHorizontalCenter && (
                        <div
                            style={{
                                position: 'fixed',
                                left: 0,
                                top: '50%',
                                width: '100vw',
                                height: '1px',
                                backgroundColor: '#0ea5e9',
                                pointerEvents: 'none',
                                zIndex: 9999,
                            }}
                        />
                    )}
                    {/* Left edge guide */}
                    {alignmentGuides.showLeft && (
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '1px',
                                height: '100%',
                                backgroundColor: '#0ea5e9',
                                pointerEvents: 'none',
                                zIndex: 9999,
                            }}
                        />
                    )}
                    {/* Right edge guide */}
                    {alignmentGuides.showRight && (
                        <div
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                width: '1px',
                                height: '100%',
                                backgroundColor: '#0ea5e9',
                                pointerEvents: 'none',
                                zIndex: 9999,
                            }}
                        />
                    )}
                    {/* Top edge guide */}
                    {alignmentGuides.showTop && (
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '1px',
                                backgroundColor: '#0ea5e9',
                                pointerEvents: 'none',
                                zIndex: 9999,
                            }}
                        />
                    )}
                    {/* Bottom edge guide */}
                    {alignmentGuides.showBottom && (
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                bottom: 0,
                                width: '100%',
                                height: '1px',
                                backgroundColor: '#0ea5e9',
                                pointerEvents: 'none',
                                zIndex: 9999,
                            }}
                        />
                    )}
                </>
            )}
            
            {activeElements.map((element, index) => {
                const { position, dimension, style } = element;
                const isSelected = isElementSelected(element);
                
                // Convert pixel coordinates to percentages for responsive rendering
                const leftPercent = toPercentage(position.x, recordingWidth);
                const topPercent = toPercentage(position.y, recordingHeight);
                const widthPercent = toPercentage(dimension.width, recordingWidth);
                const heightPercent = toPercentage(dimension.height, recordingHeight);
                
                // Calculate font size based on actual container height
                const fontSizePx = (style.fontSize / recordingHeight) * containerHeight;
                
                // Determine text alignment and justify content
                const textAlignValue = style.textAlign || 'center';
                const justifyContentMap: Record<string, string> = {
                    'left': 'flex-start',
                    'center': 'center',
                    'right': 'flex-end',
                };
                const justifyContent = justifyContentMap[textAlignValue] || 'center';

                // Build CSS styles
                const textStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    minHeight: `${heightPercent}%`,
                    fontFamily: `"${style.fontFamily}", "Inter", -apple-system, BlinkMacSystemFont, sans-serif`,
                    fontSize: `${fontSizePx}px`,
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    fontWeight: getFontWeight(style.fontWeight),
                    fontStyle: style.fontStyle || 'normal',
                    textDecoration: style.textDecoration || 'none',
                    color: style.color,
                    textAlign: textAlignValue as React.CSSProperties['textAlign'],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: justifyContent,
                    flexWrap: 'wrap',
                    lineHeight: style.lineHeight || 1.3,
                    letterSpacing: style.letterSpacing ? `${style.letterSpacing * 0.01}em` : 'normal',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    // Selection border
                    boxSizing: 'border-box',
                    border: isSelected ? '2px solid #0ea5e9' : '2px solid transparent',
                    borderRadius: isSelected ? '4px' : '0',
                    transition: 'border-color 0.15s ease',
                };
                
                // Add text outline (only if enabled)
                if (style.outline && style.outline.enabled !== false) {
                    const outlineWidth = style.outline.width || 2;
                    textStyle.WebkitTextStroke = `${outlineWidth}px ${style.outline.color}`;
                    textStyle.paintOrder = 'stroke fill';
                }
                
                // Add text shadow with blur and opacity support (only if enabled)
                if (style.shadow && style.shadow.enabled !== false) {
                    const { shadow } = style;
                    const blur = shadow.blur || 0;
                    const opacity = (shadow.opacity ?? 100) / 100;
                    // Convert hex color to rgba for opacity support
                    const hexToRgba = (hex: string, alpha: number): string => {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    };
                    const shadowColor = shadow.color.startsWith('#') ? hexToRgba(shadow.color, opacity) : shadow.color;
                    textStyle.textShadow = `${shadow.position.x}px ${shadow.position.y}px ${blur}px ${shadowColor}`;
                }
                
                // Background container style (only if enabled)
                const showBackground = style.background?.enabled === true;
                const backgroundStyle: React.CSSProperties = showBackground ? {
                    display: 'inline-block',
                    backgroundColor: style.background!.color,
                    opacity: (style.background!.opacity ?? 100) / 100,
                    borderRadius: `${style.background!.radius || style.background!.borderRadius || 0}px`,
                    padding: `${style.background!.padding || 0}%`,
                } : {};

                // Check if this element is currently being edited
                const isCurrentlyEditing = isSelected && isEditing;

                // Handle double-click to start editing
                const handleDoubleClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (isSelected && onTextContentChange) {
                        setEditingContent(element.content);
                        setIsEditing(true);
                        // Focus the input after state update
                        setTimeout(() => {
                            editInputRef.current?.focus();
                            editInputRef.current?.select();
                        }, 10);
                    }
                };

                // Handle finishing edit
                const finishEditing = () => {
                    if (isEditing && onTextContentChange) {
                        const clipInfo = findElementClipInfo(element);
                        if (clipInfo && editingContent !== element.content) {
                            onTextContentChange(clipInfo.clipName, clipInfo.elementIndex, editingContent);
                        }
                    }
                    setIsEditing(false);
                };

                // Handle key press in edit mode
                const handleKeyDown = (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        finishEditing();
                    } else if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditingContent(element.content);
                    }
                };
                
                return (
                    <div 
                        key={index} 
                        style={textStyle}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => !isEditing && handleElementMouseDown(e, element, index, isSelected)}
                        onDoubleClick={handleDoubleClick}
                    >
                        {/* Text Content or Edit Input */}
                        {isCurrentlyEditing ? (
                            <textarea
                                ref={editInputRef}
                                value={editingContent}
                                onChange={(e) => {
                                    setEditingContent(e.target.value);
                                    // Update in real-time
                                    if (onTextContentChange) {
                                        const clipInfo = findElementClipInfo(element);
                                        if (clipInfo) {
                                            onTextContentChange(clipInfo.clipName, clipInfo.elementIndex, e.target.value);
                                        }
                                    }
                                }}
                                onBlur={() => setIsEditing(false)}
                                onKeyDown={handleKeyDown}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                    fontSize: 'inherit',
                                    fontWeight: 'inherit',
                                    fontStyle: 'inherit',
                                    textDecoration: 'inherit',
                                    color: 'inherit',
                                    textAlign: 'inherit',
                                    lineHeight: 'inherit',
                                    letterSpacing: 'inherit',
                                    WebkitTextStroke: textStyle.WebkitTextStroke,
                                    textShadow: textStyle.textShadow,
                                }}
                                className="placeholder-gray-400"
                            />
                        ) : showBackground ? (
                            <span style={backgroundStyle}>{element.content}</span>
                        ) : (
                            element.content
                        )}
                        
                        {/* Selection Handles (when selected) */}
                        {isSelected && (
                            <>
                                {/* Corner handles - Allow diagonal resize */}
                                <div
                                    className="absolute w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-nw-resize"
                                    style={{ top: '-6px', left: '-6px' }}
                                    onMouseDown={(e) => handleResizeStart(e, element, 'nw')}
                                />
                                <div
                                    className="absolute w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-ne-resize"
                                    style={{ top: '-6px', right: '-6px' }}
                                    onMouseDown={(e) => handleResizeStart(e, element, 'ne')}
                                />
                                <div
                                    className="absolute w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-sw-resize"
                                    style={{ bottom: '-6px', left: '-6px' }}
                                    onMouseDown={(e) => handleResizeStart(e, element, 'sw')}
                                />
                                <div
                                    className="absolute w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-se-resize"
                                    style={{ bottom: '-6px', right: '-6px' }}
                                    onMouseDown={(e) => handleResizeStart(e, element, 'se')}
                                />
                                
                                {/* Left/Right edge handles only - Horizontal resize */}
                                <div
                                    className="absolute w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-e-resize"
                                    style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
                                    onMouseDown={(e) => handleResizeStart(e, element, 'e')}
                                />
                                <div
                                    className="absolute w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-w-resize"
                                    style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
                                    onMouseDown={(e) => handleResizeStart(e, element, 'w')}
                                />
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
