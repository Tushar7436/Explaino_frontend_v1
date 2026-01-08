import React, { useState, useRef, useEffect } from 'react';
import { RectangleHorizontal } from 'lucide-react';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '4:5' | '5:4' | '1920:1080';

interface AspectRatioOption {
    value: AspectRatio;
    label: string;
    description?: string;
    iconAspect: string; // CSS aspect-ratio value for the icon
}

interface AspectRatioDropdownProps {
    currentRatio: AspectRatio;
    onRatioChange: (ratio: AspectRatio) => void;
    videoWidth?: number;
    videoHeight?: number;
}

export const AspectRatioDropdown: React.FC<AspectRatioDropdownProps> = ({
    currentRatio,
    onRatioChange,
    videoWidth,
    videoHeight
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Build aspect ratio options dynamically based on video dimensions
    const aspectRatioOptions: AspectRatioOption[] = React.useMemo(() => {
        const options: AspectRatioOption[] = [];
        
        // Add Original option if we have video dimensions
        if (videoWidth && videoHeight) {
            options.push({
                value: '1920:1080',
                label: 'Original',
                description: `(${videoWidth}-${videoHeight})`,
                iconAspect: `${videoWidth}/${videoHeight}`
            });
        }
        
        // Add standard options
        options.push(
            { value: '16:9', label: 'Wide Landscape', description: '(16:9)', iconAspect: '16/9' },
            { value: '4:3', label: 'Landscape', description: '(4:3)', iconAspect: '4/3' },
            { value: '5:4', label: 'Standard', description: '(5:4)', iconAspect: '5/4' },
            { value: '1:1', label: 'Square', description: '(1:1)', iconAspect: '1/1' },
            { value: '4:5', label: 'Portrait', description: '(4:5)', iconAspect: '4/5' },
            { value: '3:4', label: 'Classic Portrait', description: '(3:4)', iconAspect: '3/4' },
            { value: '9:16', label: 'Tall Portrait', description: '(9:16)', iconAspect: '9/16' }
        );
        
        return options;
    }, [videoWidth, videoHeight]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (ratio: AspectRatio) => {
        onRatioChange(ratio);
        setIsOpen(false);
    };

    const getCurrentLabel = () => {
        if (currentRatio === '1920:1080') {
            if (videoWidth && videoHeight) {
                return `${videoWidth}:${videoHeight}`;
            }
            return 'Original';
        }
        const option = aspectRatioOptions.find(opt => opt.value === currentRatio);
        return option?.value || currentRatio;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Dropdown Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-lg transition-all duration-200"
            >
                <RectangleHorizontal size={16} className="text-gray-300" />
                <span className="text-white text-sm font-medium">{getCurrentLabel()}</span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-[280px] bg-[#2a2a3e] rounded-lg shadow-2xl border border-[#3b3b50] py-2 z-50 animate-fade-in">
                    {aspectRatioOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 ${
                                currentRatio === option.value
                                    ? 'bg-[#4a4a5e] text-white'
                                    : 'text-gray-300 hover:bg-[#3b3b50] hover:text-white'
                            }`}
                        >
                            {/* Visual Aspect Ratio Indicator */}
                            <div
                                className={`border-2 transition-all duration-200 ${
                                    currentRatio === option.value
                                        ? 'bg-[#ec4899] border-[#ec4899]'
                                        : 'border-gray-500 bg-transparent'
                                }`}
                                style={{
                                    aspectRatio: option.iconAspect,
                                    width: option.iconAspect.startsWith('9/') || option.iconAspect.startsWith('4/5') || option.iconAspect.startsWith('3/4') ? '14px' : '24px',
                                    height: 'auto'
                                }}
                            />

                            {/* Label */}
                            <span className="flex-1 text-left text-sm">
                                {option.label} <span className="text-gray-500">{option.description}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AspectRatioDropdown;
