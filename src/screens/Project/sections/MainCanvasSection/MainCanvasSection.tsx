import React, { useState } from 'react';
import { Palette, Plus, RectangleHorizontal } from 'lucide-react';
import { BackgroundPanel } from './BackgroundPanel';
import { AspectRatioDropdown, AspectRatio } from './AspectRatioDropdown';

export type { AspectRatio };

interface MainCanvasSectionProps {
    children: React.ReactNode;
    controls: React.ReactNode; // Separate controls slot
    aspectRatio: AspectRatio;
    backgroundColor: string;
    onAspectRatioChange: (ratio: AspectRatio) => void;
    onBackgroundColorChange: (color: string) => void;
    videoWidth?: number;
    videoHeight?: number;
}

const aspectRatioValues: Record<string, string> = {
    '16:9': '16 / 9',
    '9:16': '9 / 16',
    '1:1': '1 / 1',
    '4:3': '4 / 3',
    '3:4': '3 / 4',
    '4:5': '4 / 5',
    '5:4': '5 / 4',
};

export const MainCanvasSection: React.FC<MainCanvasSectionProps> = ({
    children,
    controls,
    aspectRatio,
    backgroundColor,
    onAspectRatioChange,
    onBackgroundColorChange,
    videoWidth,
    videoHeight
}) => {
    const [isBackgroundPanelOpen, setIsBackgroundPanelOpen] = useState(false);

    // Background canvas aspect ratio: prefer actual video dimensions; fallback to chosen preset
    const getBackgroundAspectRatio = (): string => {
        if (videoWidth && videoHeight) {
            return `${videoWidth} / ${videoHeight}`;
        }
        return aspectRatioValues[aspectRatio] || '16 / 9';
    };

    return (
        <div className="flex-1 flex flex-col bg-[#1e1e2e] overflow-hidden">
            {/* Background Panel */}
            <BackgroundPanel
                isOpen={isBackgroundPanelOpen}
                onClose={() => setIsBackgroundPanelOpen(false)}
                currentColor={backgroundColor}
                onColorChange={onBackgroundColorChange}
            />

            {/* Canvas Controls Toolbar - Above the canvas */}
            <div className="h-12 flex items-center justify-center border-b border-[#2a2a3e]/50 bg-[#1e1e2e] flex-shrink-0">
                <div className="flex items-center gap-2">
                    {/* Background Button */}
                    <button 
                        onClick={() => setIsBackgroundPanelOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-lg transition-all duration-200"
                    >
                        <div
                            className="w-5 h-5 rounded-full border border-white/20"
                            style={{ backgroundColor }}
                        />
                        <span className="text-white text-sm font-medium">Background</span>
                    </button>

                    {/* Aspect Ratio Dropdown */}
                    <AspectRatioDropdown
                        currentRatio={aspectRatio}
                        onRatioChange={onAspectRatioChange}
                        videoWidth={videoWidth}
                        videoHeight={videoHeight}
                    />

                    {/* Insert Button */}
                    <button className="flex items-center gap-2 px-3 py-2 bg-[#3b3b50] hover:bg-[#4a4a5e] text-white rounded-lg text-sm font-medium transition-all duration-200">
                        <Plus size={16} />
                        <span>Insert</span>
                    </button>
                </div>
            </div>

            {/* Main Canvas Area - Video Display */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                {/* Background Canvas - Sized to SELECTED aspect ratio, centered with margins */}
                <div
                    className="relative transition-all duration-300"
                    style={{
                        backgroundColor,
                        aspectRatio: getBackgroundAspectRatio(),
                        width: 'auto',
                        height: '100%',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        borderRadius: '8px',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}
                >
                    {/* Video scales to fit inside with 85% sizing to show background border */}
                    <div style={{ maxWidth: '85%', maxHeight: '85%', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {children}
                    </div>
                </div>
            </div>

            {/* Timeline Section - Like Clueso */}
            <div className="flex-shrink-0 border-t border-[#2a2a3e] bg-[#0d0d15]" style={{ height: '260px' }}>
                {/* Timeline Tools and Controls */}
                <div className="h-full flex flex-col">
                    {/* Timeline Toolbar */}
                    <div className="h-12 flex items-center justify-between px-4 border-b border-[#2a2a3e] bg-[#1a1a2e]">
                        {/* Left Side - Split and Add Clip */}
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-2 px-3 py-1.5 text-white hover:bg-[#2a2a3e] rounded text-sm transition-all duration-200">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                </svg>
                                <span>Split</span>
                            </button>
                            <button className="flex items-center gap-2 px-3 py-1.5 text-white hover:bg-[#2a2a3e] rounded text-sm transition-all duration-200">
                                <Plus size={14} />
                                <span>Add Clip</span>
                            </button>
                        </div>

                        {/* Center - Playback Controls */}
                        <div className="flex items-center">
                            {controls}
                        </div>

                        {/* Right Side - Zoom Control */}
                        <div className="flex items-center gap-3">
                            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded transition-all duration-200">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                </svg>
                            </button>
                            <input 
                                type="range" 
                                min="10" 
                                max="200" 
                                defaultValue="50"
                                className="w-24 h-1 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer"
                                style={{
                                    background: 'linear-gradient(to right, #ec4899 0%, #ec4899 50%, #2a2a3e 50%, #2a2a3e 100%)'
                                }}
                            />
                            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded transition-all duration-200">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                </svg>
                            </button>
                            <span className="text-sm text-gray-400 font-medium min-w-[3rem]">50%</span>
                        </div>
                    </div>
                    
                    {/* Timeline Area - Placeholder */}
                    <div className="flex-1 bg-[#0d0d15] p-4">
                        <div className="text-gray-500 text-xs text-center py-4">
                            Timeline clips coming soon...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainCanvasSection;
