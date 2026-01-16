import React from 'react';

interface VideoSelectionBorderProps {
    isSelected: boolean;
    videoDimensions?: { width: number; height: number } | null;
}

/**
 * VideoSelectionBorder - Shows selection feedback with border and corner handles
 * Renders when video clip is selected, similar to Clueso's selection UI
 */
export const VideoSelectionBorder: React.FC<VideoSelectionBorderProps> = ({ isSelected, videoDimensions }) => {
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

            {/* Corner Handles */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((position) => {
                const getPositionStyles = (): React.CSSProperties => {
                    const baseStyles: React.CSSProperties = {
                        position: 'absolute',
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#38BDF8', // Sky blue
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
                        className="transition-transform duration-150 hover:scale-125"
                        style={getPositionStyles()}
                    />
                );
            })}
        </div>
    );
};
