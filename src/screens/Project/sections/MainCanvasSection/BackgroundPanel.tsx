import React, { useState } from 'react';
import { X, ArrowLeft, Upload, Plus } from 'lucide-react';

interface BackgroundPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentColor: string;
    onColorChange: (color: string) => void;
}

type BackgroundTab = 'Color' | 'Image' | 'Video';

export const BackgroundPanel: React.FC<BackgroundPanelProps> = ({
    isOpen,
    onClose,
    currentColor,
    onColorChange
}) => {
    const [activeTab, setActiveTab] = useState<BackgroundTab>('Color');
    const [useForAllClips, setUseForAllClips] = useState(false);

    const colorPresets = [
        // Row 1 - Pinks/Magentas
        '#D43F8C', '#EC4899', '#DB2777',
        // Row 2 - More Pinks
        '#F472B6', '#F9A8D4', '#FBE2EE',
        // Row 3 - Whites/Light
        '#FFFFFF', '#FEF3F8', '#E5E7EB',
        // Row 4 - Darks/Purples
        '#1F1B2E', '#2D1B4E', '#4C1D95',
        // Row 5 - Gradients (will use solid colors for now)
        '#DDA8E8', '#C084FC', '#E9D5FF',
    ];

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Side Panel */}
            <div className="fixed left-0 top-0 bottom-0 w-[420px] bg-[#1a1a2e] border-r border-[#2a2a3e] z-50 flex flex-col animate-slide-in">
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-[#2a2a3e]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded-lg transition-all duration-200"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h2 className="text-white text-lg font-semibold">Background</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded-lg transition-all duration-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Settings Section */}
                    <div className="p-6 border-b border-[#2a2a3e]">
                        <h3 className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-4">
                            SETTINGS
                        </h3>
                        <div className="flex items-center justify-between p-3 bg-[#0d0d15] rounded-lg">
                            <span className="text-white text-sm">Use same background for all clips</span>
                            <button
                                onClick={() => setUseForAllClips(!useForAllClips)}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                                    useForAllClips ? 'bg-[#ec4899]' : 'bg-[#3b3b50]'
                                }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                                        useForAllClips ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Backgrounds Section */}
                    <div className="p-6">
                        <h3 className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-4">
                            BACKGROUNDS
                        </h3>

                        {/* Upload Button */}
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg font-medium transition-all duration-200 mb-4">
                            <Plus size={18} />
                            <span>Upload media</span>
                        </button>

                        {/* Tabs */}
                        <div className="flex items-center gap-1 mb-6 p-1 bg-[#0d0d15] rounded-lg">
                            {(['Color', 'Image', 'Video'] as BackgroundTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                        activeTab === tab
                                            ? 'bg-[#2a2a3e] text-white'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Color Tab Content */}
                        {activeTab === 'Color' && (
                            <div>
                                {/* Primary Color Display */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-gray-400 text-sm">Primary Color</span>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 rounded-full border border-white/20"
                                            style={{ backgroundColor: currentColor }}
                                        />
                                        <span className="text-white text-sm font-mono">{currentColor.toUpperCase()}</span>
                                    </div>
                                </div>

                                {/* Color Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    {colorPresets.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => onColorChange(color)}
                                            className={`aspect-video rounded-lg transition-all duration-200 hover:scale-105 ${
                                                currentColor.toUpperCase() === color.toUpperCase()
                                                    ? 'ring-2 ring-[#ec4899] ring-offset-2 ring-offset-[#1a1a2e]'
                                                    : ''
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Image Tab Content */}
                        {activeTab === 'Image' && (
                            <div className="text-center py-12">
                                <Upload size={48} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400 text-sm">Upload background images</p>
                                <p className="text-gray-500 text-xs mt-2">Coming soon...</p>
                            </div>
                        )}

                        {/* Video Tab Content */}
                        {activeTab === 'Video' && (
                            <div className="text-center py-12">
                                <Upload size={48} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400 text-sm">Upload background videos</p>
                                <p className="text-gray-500 text-xs mt-2">Coming soon...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default BackgroundPanel;
