import React, { useState, useEffect, useCallback } from 'react';
import { Maximize2, X } from 'lucide-react';

interface MediaBarSectionProps {
    isOpen: boolean;
    onClose: () => void;
    scale: number; // 10-150
    onScaleChange: (scale: number, isComplete?: boolean) => void; // isComplete = true when user releases
    onFitToScreen: () => void;
}

export const MediaBarSection: React.FC<MediaBarSectionProps> = ({
    isOpen,
    onClose,
    scale,
    onScaleChange,
    onFitToScreen,
}) => {
    const [inputValue, setInputValue] = useState(scale.toFixed(1));
    const [localScale, setLocalScale] = useState(scale);
    const [isDragging, setIsDragging] = useState(false);

    // Sync input value and local scale when scale prop changes (from external source)
    useEffect(() => {
        if (!isDragging) {
            setInputValue(scale.toFixed(1));
            setLocalScale(scale);
        }
    }, [scale, isDragging]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newScale = parseFloat(e.target.value);
        setLocalScale(newScale);
        setInputValue(newScale.toFixed(1));
        // Update visually but don't save to localStorage yet
        onScaleChange(newScale, false);
    };

    const handleSliderMouseDown = () => {
        setIsDragging(true);
    };

    const handleSliderMouseUp = () => {
        setIsDragging(false);
        // Now save to localStorage - this is the "complete" action
        onScaleChange(localScale, true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
        let newScale = parseFloat(inputValue);
        if (isNaN(newScale)) {
            newScale = scale;
        }
        // Clamp to 10-150
        newScale = Math.max(10, Math.min(150, newScale));
        setLocalScale(newScale);
        onScaleChange(newScale, true); // Complete action
        setInputValue(newScale.toFixed(1));
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleInputBlur();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-[360px] h-full bg-gradient-to-b from-[#1e1e2e] to-[#1a1a28] border-r border-white/5 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                    <span className="text-white font-medium text-sm">Video Clip</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* LAYOUT Section */}
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        Layout
                    </h3>

                    {/* Size Control */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-300 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                Size
                            </span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onBlur={handleInputBlur}
                                    onKeyDown={handleInputKeyDown}
                                    className="w-16 px-2 py-1 bg-[#0d0d15] border border-[#2a2a3e] rounded text-white text-sm text-right focus:border-pink-500 focus:outline-none"
                                />
                                <span className="text-gray-400 text-sm">%</span>
                            </div>
                        </div>

                        {/* Slider */}
                        <div className="relative">
                            <input
                                type="range"
                                min="10"
                                max="150"
                                step="0.1"
                                value={localScale}
                                onChange={handleSliderChange}
                                onMouseDown={handleSliderMouseDown}
                                onMouseUp={handleSliderMouseUp}
                                onTouchStart={handleSliderMouseDown}
                                onTouchEnd={handleSliderMouseUp}
                                className="w-full h-1.5 bg-[#2a2a3e] rounded-full appearance-none cursor-pointer slider-pink"
                                style={{
                                    background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${((localScale - 10) / 140) * 100}%, #2a2a3e ${((localScale - 10) / 140) * 100}%, #2a2a3e 100%)`
                                }}
                            />
                            {/* Scale markers - positioned correctly on the slider track */}
                            <div className="relative mt-1 text-[10px] text-gray-500 h-4">
                                {/* 10% at start */}
                                <span className="absolute left-0">10%</span>
                                {/* 100% at 64.3% position: (100-10)/(150-10) = 0.643 */}
                                <span className="absolute" style={{ left: '64.3%', transform: 'translateX(-50%)' }}>100%</span>
                                {/* 150% at end */}
                                <span className="absolute right-0">150%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QUICK ACTIONS Section */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        Quick Actions
                    </h3>

                    <button
                        onClick={onFitToScreen}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white rounded-lg transition-colors"
                    >
                        <Maximize2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Fit to Screen</span>
                    </button>
                </div>
            </div>

            {/* Custom slider styles */}
            <style>{`
                .slider-pink::-webkit-slider-thumb {
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    background: #ec4899;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .slider-pink::-moz-range-thumb {
                    width: 14px;
                    height: 14px;
                    background: #ec4899;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
            `}</style>
        </div>
    );
};

export default MediaBarSection;
