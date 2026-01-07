import React from 'react';
import { Sparkles, X } from 'lucide-react';

interface Narration {
    windowIndex?: number;
    start: number;
    end: number;
    text: string;
    musicStyle?: string;
}

interface TranscriptionSectionProps {
    narrations: Narration[];
    isVisible: boolean;
    onClose: () => void;
    onSyncPointClick: (timestamp: number) => void;
    onGenerateScript: () => void;
    isGenerating: boolean;
    hasProcessedAudio: boolean;
    currentTime?: number;
}

export const TranscriptionSection: React.FC<TranscriptionSectionProps> = ({
    narrations,
    isVisible,
    onClose,
    onSyncPointClick,
    onGenerateScript,
    isGenerating,
    hasProcessedAudio,
    currentTime = 0
}) => {
    if (!isVisible) return null;

    // Find the active narration based on currentTime
    const activeIndex = narrations.findIndex(
        (n) => currentTime >= n.start && currentTime <= n.end
    );

    return (
        <div className="w-80 bg-[#252538] border-r border-[#2a2a3e] flex flex-col animate-slide-in">
            {/* Header */}
            <div className="p-4 border-b border-[#2a2a3e] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <h2 className="text-white font-semibold text-sm">Script</h2>
                </div>
                <div className="flex items-center gap-2">
                    {/* Generate Script Button */}
                    <button
                        onClick={onGenerateScript}
                        disabled={isGenerating || hasProcessedAudio}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${isGenerating
                                ? 'bg-[#4a4a5e] text-gray-400 cursor-not-allowed'
                                : hasProcessedAudio
                                    ? 'bg-green-600 text-white cursor-not-allowed'
                                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                            }`}
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : hasProcessedAudio ? (
                            <>
                                <span>✅</span>
                                <span>Generated</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={12} />
                                <span>Generate Speech</span>
                            </>
                        )}
                    </button>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white hover:bg-[#3b3b50] rounded-lg transition-all duration-200"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {narrations.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p className="text-sm">No script content yet.</p>
                        <p className="text-xs mt-2">Process the video to generate narrations.</p>
                    </div>
                ) : (
                    narrations.map((narration, idx) => (
                        <div
                            key={idx}
                            className={`relative transition-all duration-200 ${activeIndex === idx ? 'scale-[1.02]' : ''
                                }`}
                        >
                            {/* Section Number */}
                            <div className="absolute -left-2 top-0 text-gray-600 text-xs font-medium">
                                {idx + 1}
                            </div>

                            {/* Sync Point Badge */}
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    onClick={() => onSyncPointClick(narration.start)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all duration-200 ${activeIndex === idx
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40'
                                        }`}
                                >
                                    <span className="w-4 h-4 rounded-full bg-indigo-500/50 flex items-center justify-center text-[10px]">
                                        👤
                                    </span>
                                    Sync Point {idx + 1}
                                </button>
                                <span className="text-xs text-gray-500">
                                    {formatTime(narration.start)}
                                </span>
                            </div>

                            {/* Narration Text */}
                            <p className={`text-sm leading-relaxed pl-2 border-l-2 transition-all duration-200 ${activeIndex === idx
                                    ? 'text-white border-indigo-500'
                                    : 'text-gray-300 border-gray-700'
                                }`}>
                                {narration.text}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Info */}
            {narrations.length > 0 && (
                <div className="p-4 border-t border-[#2a2a3e] text-center">
                    <p className="text-xs text-gray-500">
                        {narrations.length} sync point{narrations.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
};

// Helper function to format time
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default TranscriptionSection;
