import React from 'react';
import { Sparkles, X, MoreHorizontal } from 'lucide-react';

interface WordTiming {
    word: string;
    start: number;
    end: number;
}

interface Narration {
    windowIndex?: number;
    start: number;
    end: number;
    text: string;
    musicStyle?: string;
    words?: WordTiming[]; // Word-level timestamps from TTS
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
        <div className="w-96 bg-[#252538] border-r border-[#2a2a3e] flex flex-col animate-slide-in">
            {/* Toolbar - Generate Speech & AI Rewrite */}
            <div className="px-4 py-3 border-b border-[#2a2a3e] flex items-center gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* Generate Speech Button */}
                    <button
                        onClick={onGenerateScript}
                        disabled={isGenerating || hasProcessedAudio}
                        className={`h-10 flex-1 min-w-0 inline-flex items-center justify-center gap-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isGenerating
                                ? 'bg-[#4a4a5e] text-gray-400 cursor-not-allowed'
                                : hasProcessedAudio
                                    ? 'bg-green-600 text-white cursor-not-allowed'
                                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                        }`}
                    >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span className="truncate">Generating...</span>
                        </>
                    ) : hasProcessedAudio ? (
                        <>
                            <span>✅</span>
                            <span className="truncate">Generated</span>
                        </>
                    ) : (
                        <>
                            <span className="text-base">၊၊||၊</span>
                            <span className="truncate">Generate Speech</span>
                        </>
                    )}
                    </button>

                    {/* AI Rewrite Button - Removed dropdown for now */}
                    <button className="h-10 shrink-0 inline-flex items-center justify-center gap-2 px-3 bg-[#3b3b50] hover:bg-[#4a4a5e] text-white rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap">
                        <Sparkles size={15} />
                        <span>AI Rewrite</span>
                        {/* <ChevronDown size={14} /> */}
                    </button>

                    {/* Add Button - Commented out for now */}
                    {/* <button className="p-2 bg-[#3b3b50] hover:bg-[#4a4a5e] text-white rounded-lg transition-all duration-200">
                        <Plus size={18} />
                    </button> */}
                </div>

                <button
                    onClick={onClose}
                    className="h-10 w-10 inline-flex items-center justify-center shrink-0 text-gray-400 hover:text-white hover:bg-[#3b3b50] rounded-lg transition-all duration-200"
                    aria-label="Close script"
                    title="Close"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {/* Intro Section */}
                <div className="rounded-xl border border-[#2a2a3e] bg-[#1e1e2e]/30 overflow-hidden transition-all duration-200 hover:border-[#3b3b50] hover:bg-[#1e1e2e]/40 hover:-translate-y-[1px]">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-500 text-xs font-medium">1</span>
                            <span className="text-white text-sm font-semibold tracking-tight">Intro</span>
                        </div>
                        <button className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3b3b50] rounded-lg transition-all duration-200">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>
                    <div className="px-4 pb-4 text-gray-500 text-[12px]">
                        Coming soon...
                    </div>
                </div>

                {/* Video Section */}
                <div className="rounded-xl border border-[#2a2a3e] bg-[#1e1e2e]/30 overflow-hidden transition-all duration-200 hover:border-[#3b3b50] hover:bg-[#1e1e2e]/40">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-500 text-xs font-medium">2</span>
                            <span className="text-white text-sm font-semibold tracking-tight">Video</span>
                        </div>
                        <button className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3b3b50] rounded-lg transition-all duration-200">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>

                    {/* Video Content - Narrations/Script */}
                    <div className="px-4 pb-4">
                        {narrations.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">
                                <p className="text-xs">No script content yet.</p>
                                <p className="text-xs mt-2">Process the video to generate narrations.</p>
                            </div>
                        ) : (
                            <div className="text-[13px] leading-6 text-gray-300 tracking-[0.01em] antialiased">
                                {narrations.map((narration, idx) => {
                                    const isActiveNarration = activeIndex === idx;
                                    
                                    return (
                                        <span key={idx}>
                                            {/* Text with word-level highlighting */}
                                            {hasProcessedAudio && narration.words && narration.words.length > 0 ? (
                                                // Render with word-level highlighting
                                                narration.words.map((wordData, wordIdx) => {
                                                    // Check if this word is currently being spoken
                                                    const isCurrentWord = currentTime >= wordData.start && currentTime < wordData.end;
                                                    // Check if this word has been spoken already
                                                    const hasBeenSpoken = currentTime >= wordData.end;
                                                    
                                                    return (
                                                        <React.Fragment key={wordIdx}>
                                                            {/* Show Sync Point before the first word */}
                                                            {wordIdx === 0 && (
                                                                <button
                                                                    onClick={() => onSyncPointClick(narration.start)}
                                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-semibold bg-amber-500/90 text-gray-900 transition-all duration-150 mr-1 align-middle hover:bg-amber-400"
                                                                >
                                                                    <span className="text-[10px]">✦</span>
                                                                    <span>Sync Point</span>
                                                                </button>
                                                            )}
                                                            <span
                                                                className={`transition-colors duration-100 ${
                                                                    isCurrentWord
                                                                        ? 'text-white font-bold bg-amber-500/20 px-0.5 rounded'
                                                                        : hasBeenSpoken
                                                                            ? 'text-gray-300'
                                                                            : 'text-gray-500'
                                                                }`}
                                                            >
                                                                {wordData.word}
                                                            </span>
                                                            <span className="text-gray-600"> </span>
                                                        </React.Fragment>
                                                    );
                                                })
                                            ) : (
                                                // Fallback: render full text without highlighting (no audio generated yet)
                                                <>
                                                    <button
                                                        onClick={() => onSyncPointClick(narration.start)}
                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-semibold bg-amber-500/90 text-gray-900 transition-all duration-150 mr-1 align-middle hover:bg-amber-400"
                                                    >
                                                        <span className="text-[10px]">✦</span>
                                                        <span>Sync Point</span>
                                                    </button>
                                                    <span className="text-gray-400">
                                                        {narration.text}{' '}
                                                    </span>
                                                </>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Outro Section */}
                <div className="rounded-xl border border-[#2a2a3e] bg-[#1e1e2e]/30 overflow-hidden transition-all duration-200 hover:border-[#3b3b50] hover:bg-[#1e1e2e]/40 hover:-translate-y-[1px]">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-500 text-xs font-medium">3</span>
                            <span className="text-white text-sm font-semibold tracking-tight">Outro</span>
                        </div>
                        <button className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3b3b50] rounded-lg transition-all duration-200">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>
                    <div className="px-4 pb-4 text-gray-500 text-[12px]">
                        Coming soon...
                    </div>
                </div>
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

export default TranscriptionSection;
