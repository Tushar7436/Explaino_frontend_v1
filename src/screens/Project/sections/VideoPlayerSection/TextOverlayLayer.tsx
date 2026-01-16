import React, { useRef, useEffect, useState } from 'react';

interface TextPosition {
    x: number;
    y: number;
}

interface TextDimension {
    width: number;
    height: number;
}

interface TextOutline {
    width: number;
    color: string;
}

interface TextShadowPosition {
    x: number;
    y: number;
}

interface TextShadow {
    color: string;
    position: TextShadowPosition;
}

interface TextBackground {
    color: string;
    borderRadius: number;
}

interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
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
}

interface TextOverlayLayerProps {
    textElements: TextElement[];
    currentTime: number;
    recordingWidth: number;
    recordingHeight: number;
}

/**
 * TextOverlayLayer - Renders text overlays on top of video
 * Uses absolute positioning with percentage-based coordinates
 */
export const TextOverlayLayer: React.FC<TextOverlayLayerProps> = ({
    textElements,
    currentTime,
    recordingWidth,
    recordingHeight
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(1080);
    
    // Track container height changes for dynamic font scaling
    useEffect(() => {
        if (!containerRef.current) return;
        
        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
            }
        };
        
        // Initial measurement
        updateHeight();
        
        // Update on resize
        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(containerRef.current);
        
        return () => resizeObserver.disconnect();
    }, []);
    
    // Filter active text elements based on current time
    // Use <= for end to include elements that start exactly at their end time
    const activeElements = textElements.filter(
        element => currentTime >= element.start && currentTime <= element.end
    );
    
    console.log('[TextOverlayLayer] Total elements:', textElements.length, 'Active:', activeElements.length, 'Time:', currentTime);
    if (activeElements.length > 0) {
        console.log('[TextOverlayLayer] Active element:', activeElements[0]);
    }

    // Convert pixel position to percentage
    const toPercentage = (value: number, total: number): number => {
        return (value / total) * 100;
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1000,
            }}
        >
            {activeElements.map((element, index) => {
                const { position, dimension, style } = element;
                
                // Convert pixel coordinates to percentages for responsive rendering
                const leftPercent = toPercentage(position.x, recordingWidth);
                const topPercent = toPercentage(position.y, recordingHeight);
                const widthPercent = toPercentage(dimension.width, recordingWidth);
                const heightPercent = toPercentage(dimension.height, recordingHeight);
                
                // Calculate font size based on actual container height (not viewport)
                // This ensures text scales with the video player container size
                const fontSizePx = (style.fontSize / recordingHeight) * containerHeight;
                
                // Build CSS styles with fallback fonts
                const textStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`,
                    fontFamily: `"${style.fontFamily}", "Inter", -apple-system, BlinkMacSystemFont, sans-serif`,
                    fontSize: `${fontSizePx}px`,
                    fontWeight: style.fontWeight,
                    color: style.color,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: '1.2',
                };
                
                // Add text outline using WebkitTextStroke (reduce width for better visibility)
                if (style.outline) {
                    const outlineWidth = Math.min(style.outline.width, 1); // Max 1px outline
                    textStyle.WebkitTextStroke = `${outlineWidth}px ${style.outline.color}`;
                    textStyle.paintOrder = 'stroke fill';
                }
                
                // Add text shadow
                if (style.shadow) {
                    const { shadow } = style;
                    textStyle.textShadow = `${shadow.position.x}px ${shadow.position.y}px 0px ${shadow.color}`;
                }
                
                // Container style for background - wraps content instead of full width
                const containerStyle: React.CSSProperties = style.background ? {
                    display: 'inline-block',
                    backgroundColor: style.background.color,
                    borderRadius: `${style.background.borderRadius}px`,
                    padding: '0.2em 0.8em',
                } : {};
                
                return (
                    <div key={index} style={textStyle}>
                        {style.background ? (
                            <span style={containerStyle}>{element.content}</span>
                        ) : (
                            element.content
                        )}
                    </div>
                );
            })}
        </div>
    );
};
