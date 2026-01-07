import React from 'react';
import { Palette, Plus, RectangleHorizontal } from 'lucide-react';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

interface MainCanvasSectionProps {
    children: React.ReactNode;
    controls: React.ReactNode; // Separate controls slot
    aspectRatio: AspectRatio;
    backgroundColor: string;
    onAspectRatioChange: (ratio: AspectRatio) => void;
    onBackgroundColorChange: (color: string) => void;
}

const aspectRatioValues: Record<AspectRatio, string> = {
    '16:9': '16 / 9',
    '9:16': '9 / 16',
    '1:1': '1 / 1',
    '4:3': '4 / 3',
};

export const MainCanvasSection: React.FC<MainCanvasSectionProps> = ({
    children,
    controls,
    aspectRatio,
    backgroundColor,
    onAspectRatioChange,
    onBackgroundColorChange
}) => {
    const aspectRatioOptions: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3'];

    const colorPresets = [
        '#1a1625', // Dark purple
        '#000000', // Black
        '#1e3a5f', // Dark blue
        '#2d3748', // Gray
        '#3c1361', // Purple
        '#0f172a', // Slate
        '#4338ca', // Indigo
        '#7c3aed', // Violet
        '#6b8e6b', // Olive green (like reference)
    ];

    return (
        <div className="flex-1 flex flex-col bg-[#1e1e2e] overflow-hidden">
            {/* Toolbar */}
            <div className="h-12 border-b border-[#2a2a3e] flex items-center justify-center gap-4 px-4 flex-shrink-0">
                {/* Background Color Picker */}
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-lg transition-all duration-200">
                            <div
                                className="w-4 h-4 rounded border border-white/20"
                                style={{ backgroundColor }}
                            />
                            <span className="text-white text-xs font-medium">Background</span>
                            <Palette size={14} className="text-gray-400" />
                        </button>

                        {/* Color Picker Dropdown */}
                        <div className="absolute top-full left-0 mt-2 p-2 bg-[#2a2a3e] rounded-lg shadow-xl border border-[#3b3b50] hidden group-hover:block z-10">
                            <div className="grid grid-cols-3 gap-1">
                                {colorPresets.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => onBackgroundColorChange(color)}
                                        className={`w-6 h-6 rounded border-2 transition-all duration-200 ${backgroundColor === color
                                            ? 'border-indigo-500 scale-110'
                                            : 'border-transparent hover:border-white/50'
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            {/* Custom Color Input */}
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => onBackgroundColorChange(e.target.value)}
                                className="w-full h-6 mt-2 rounded cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="flex items-center gap-1 bg-[#252538] rounded-lg p-1">
                    {aspectRatioOptions.map((ratio) => (
                        <button
                            key={ratio}
                            onClick={() => onAspectRatioChange(ratio)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${aspectRatio === ratio
                                ? 'bg-indigo-500 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-[#3b3b50]'
                                }`}
                        >
                            <RectangleHorizontal size={12} className={ratio === '9:16' ? 'rotate-90' : ''} />
                            <span>{ratio}</span>
                        </button>
                    ))}
                </div>

                {/* Insert Button */}
                <button className="flex items-center gap-2 px-3 py-1.5 bg-[#3b3b50] hover:bg-[#4a4a5e] text-white rounded-lg text-xs font-medium transition-all duration-200">
                    <Plus size={14} />
                    <span>Insert</span>
                </button>
            </div>

            {/* Canvas Area - This is the viewing stage */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
                {/* 
                    LAYER 1: Background Stage (STATIC)
                    This is the "purple stage" that never moves.
                    overflow:hidden HERE clips the video when it expands beyond the background bounds.
                */}
                <div
                    className="relative overflow-hidden transition-colors duration-300 rounded-md"
                    style={{
                        backgroundColor,
                        aspectRatio: aspectRatioValues[aspectRatio],
                        maxWidth: aspectRatio === '9:16' ? '608px' : '1920px',
                        maxHeight: '100%',
                        width: '100%',
                    }}
                >
                    {/* 
                        LAYER 2: Video Container (TRANSFORMABLE)
                        This container fills the entire background.
                        The video inside starts at 94% size but CAN EXPAND to 100%+ when scaled.
                        The transform on VideoLayer handles both initial size and zoom.
                    */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {/* 
                            LAYER 3: Video Content (receives transform via ref)
                            Initial scale is handled by VideoLayer transform.
                            When zooming, it expands and the gap becomes zero.
                        */}
                        <div className="w-full h-full overflow-hidden">
                            {children}
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Section - BELOW the canvas, separate UI layer */}
            <div className="flex-shrink-0 border-t border-[#2a2a3e] bg-[#252538]">
                {controls}
            </div>
        </div>
    );
};

export default MainCanvasSection;
