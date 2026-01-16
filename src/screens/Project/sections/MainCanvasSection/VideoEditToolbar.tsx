import React, { useState, useRef } from 'react';
import { Square, CircleDot, Circle, Crop } from 'lucide-react';
import { RoundingDropdown } from './RoundingDropdown';

interface VideoEditToolbarProps {
    // Future: Add handlers for each button
    onBorderClick?: () => void;
    onShadowClick?: () => void;
    onRoundingClick?: () => void;
    onCropClick?: () => void;
    // Rounding state
    roundingValue?: number;
    onRoundingChange?: (value: number) => void;
}

/**
 * VideoEditToolbar - Shows when video is selected
 * Matches Clueso's edit toolbar: Border, Shadow, Rounding, Crop
 */
export const VideoEditToolbar: React.FC<VideoEditToolbarProps> = ({
    onBorderClick,
    onShadowClick,
    onRoundingClick,
    onCropClick,
    roundingValue = 0,
    onRoundingChange,
}) => {
    const [isRoundingDropdownOpen, setIsRoundingDropdownOpen] = useState(false);
    const roundingButtonRef = useRef<HTMLButtonElement>(null);

    const handleRoundingClick = () => {
        setIsRoundingDropdownOpen(!isRoundingDropdownOpen);
        if (onRoundingClick) {
            onRoundingClick();
        }
    };

    return (
        <>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {/* Border Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onBorderClick) onBorderClick();
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-md transition-all duration-200"
                >
                    <Square size={12} className="text-white" />
                    <span className="text-white text-xs font-medium">Border</span>
                </button>

                {/* Shadow Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onShadowClick) onShadowClick();
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-md transition-all duration-200"
                >
                    <CircleDot size={12} className="text-white" />
                    <span className="text-white text-xs font-medium">Shadow</span>
                </button>

                {/* Rounding Button */}
                <button
                    ref={roundingButtonRef}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRoundingClick();
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 ${
                        isRoundingDropdownOpen ? 'bg-[#4a4a5e]' : 'bg-[#3b3b50]'
                    } hover:bg-[#4a4a5e] rounded-md transition-all duration-200`}
                >
                    <Circle size={12} className="text-white" />
                    <span className="text-white text-xs font-medium">Rounding</span>
                </button>

                {/* Crop Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onCropClick) onCropClick();
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-md transition-all duration-200"
                >
                    <Crop size={12} className="text-white" />
                    <span className="text-white text-xs font-medium">Crop</span>
                </button>
            </div>

            {/* Rounding Dropdown */}
            <RoundingDropdown
                isOpen={isRoundingDropdownOpen}
                onClose={() => setIsRoundingDropdownOpen(false)}
                currentValue={roundingValue}
                onValueChange={(value) => {
                    if (onRoundingChange) {
                        onRoundingChange(value);
                    }
                }}
                buttonRef={roundingButtonRef}
            />
        </>
    );
};
