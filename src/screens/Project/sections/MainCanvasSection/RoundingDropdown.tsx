import React from 'react';

interface RoundingDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    currentValue: number;
    onValueChange: (value: number) => void;
    buttonRef: React.RefObject<HTMLButtonElement>;
}

export const RoundingDropdown: React.FC<RoundingDropdownProps> = ({
    isOpen,
    onClose,
    currentValue,
    onValueChange,
    buttonRef,
}) => {
    if (!isOpen) return null;

    // Calculate position below the button
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    const dropdownStyle: React.CSSProperties = buttonRect
        ? {
              position: 'fixed',
              top: `${buttonRect.bottom + 8}px`,
              left: `${buttonRect.left}px`,
              zIndex: 1000,
          }
        : { display: 'none' };

    return (
        <>
            {/* Backdrop to close dropdown when clicking outside */}
            <div
                className="fixed inset-0 z-[999]"
                onClick={onClose}
            />

            {/* Dropdown Panel */}
            <div
                className="bg-[#2a2a3e] rounded-lg shadow-2xl border border-[#3a3a4e] p-4 min-w-[280px] z-[1000]"
                style={dropdownStyle}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">Rounding</span>
                    </div>
                    <span className="text-white text-sm font-semibold">{currentValue} %</span>
                </div>

                {/* Slider */}
                <div className="relative">
                    <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={currentValue}
                        onChange={(e) => onValueChange(Number(e.target.value))}
                        className="w-full h-2 bg-[#1a1a2e] rounded-lg appearance-none cursor-pointer slider-thumb"
                        style={{
                            background: `linear-gradient(to right, #FF1CF7 0%, #FF1CF7 ${(currentValue / 20) * 100}%, #1a1a2e ${(currentValue / 20) * 100}%, #1a1a2e 100%)`,
                        }}
                    />
                </div>

                {/* Slider Track Styling */}
                <style>{`
                    .slider-thumb::-webkit-slider-thumb {
                        appearance: none;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #FF1CF7;
                        cursor: pointer;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    }

                    .slider-thumb::-moz-range-thumb {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #FF1CF7;
                        cursor: pointer;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    }

                    .slider-thumb:hover::-webkit-slider-thumb {
                        transform: scale(1.1);
                    }

                    .slider-thumb:hover::-moz-range-thumb {
                        transform: scale(1.1);
                    }
                `}</style>
            </div>
        </>
    );
};
