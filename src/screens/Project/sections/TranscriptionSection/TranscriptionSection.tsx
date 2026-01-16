import React from 'react';
import { Sparkles, X, MoreHorizontal } from 'lucide-react';

interface WordTiming {
    word: string;
    start: number;
    end: number;
}

interface Narration {
    start: number;
    end: number;
    text: string;
    musicStyle?: string;
    speed?: number;
    words?: WordTiming[]; // Word-level timestamps from TTS
}

interface ClipNarration {
    clipName: string;
    clipStart: number;
    clipEnd: number;
    generatedAudioUrl?: string;
    narrations: Narration[];
}

interface TranscriptionSectionProps {
    narrations: Narration[] | ClipNarration[]; // Support both flat and clip-based structures
    isVisible: boolean;
    onClose: () => void;
    onSyncPointClick: (timestamp: number) => void;
    onGenerateScript: () => void;
    isGenerating: boolean;
    hasProcessedAudio: boolean;
    currentTime?: number;
    intro?: string; // Intro text from instructions
    outro?: string; // Outro text from instructions
}

export const TranscriptionSection: React.FC<TranscriptionSectionProps> = ({
    narrations,
    isVisible,
    onClose,
    onSyncPointClick,
    onGenerateScript,
    isGenerating,
    hasProcessedAudio,
    currentTime = 0,
    intro,
    outro
}) => {
    if (!isVisible) return null;

    // Detect if narrations are clip-based or flat
    const isClipBased = narrations.length > 0 && 'clipName' in narrations[0];
    
    // Extract clips if clip-based
    const clips: { name: string; narrations: Narration[] }[] = isClipBased 
        ? (narrations as ClipNarration[]).map(clip => ({
            name: clip.clipName,
            narrations: clip.narrations || []
          }))
        : [{ name: 'video', narrations: narrations as Narration[] }];

    // Find intro, video, outro clips
    const introClip = clips.find(c => c.name === 'intro');
    const videoClip = clips.find(c => c.name === 'video');
    const outroClip = clips.find(c => c.name === 'outro');

    // Helper to render narrations for a clip
    const renderNarrations = (clipNarrations: Narration[], clipName: string, clipIndex: number, clipText?: string) => {
        // If no narrations but we have intro/outro text, create a temporary narration
        if ((!clipNarrations || clipNarrations.length === 0) && clipText) {
            clipNarrations = [{
                start: clipIndex === 0 ? 0 : clipIndex === 2 ? 31.432 : 3,
                end: clipIndex === 0 ? 3 : clipIndex === 2 ? 34.432 : 31.432,
                text: clipText
            }];
        }
        
        if (!clipNarrations || clipNarrations.length === 0) {
            return (
                <div className="text-gray-500 text-[12px]">
                    Coming soon...
                </div>
            );
        }

        return (
            <div className="text-[15px] leading-7 text-gray-300 tracking-[0.01em] antialiased">
                {clipNarrations.map((narration, idx) => {
                    // Don't show sync point badge for first narration in each clip
                    const isFirstInClip = idx === 0;
                    
                    return (
                        <span key={idx} className={`relative inline ${!isFirstInClip ? 'ml-6' : ''}`}>
                            {/* Sync Point - Always show, skip for first narration in clip */}
                            {!isFirstInClip && (
                                <button
                                    onClick={() => onSyncPointClick(narration.start)}
                                    className="absolute -left-5 top-1 inline-flex items-center justify-center w-4 h-4 rounded text-[11px] bg-amber-500/90 text-gray-900 transition-all duration-150 hover:bg-amber-400 hover:scale-110 z-10"
                                    title={`Sync point at ${narration.start.toFixed(2)}s`}
                                >
                                    <span>✦</span>
                                </button>
                            )}
                            
                            {hasProcessedAudio ? (
                                // AFTER SPEECH GENERATION: Word-level highlighting on full text
                                <>
                                    {/* Always render full text from narration.text */}
                                    {narration.text.split(' ').map((word, wordIdx) => {
                                        // Clean the word for matching (remove punctuation)
                                        const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
                                        
                                        // Find matching word timing data if available
                                        // Use findIndex to track which word we're matching to avoid duplicates
                                        const wordData = narration.words && narration.words.length > 0
                                            ? narration.words.find(w => w.word.toLowerCase() === cleanWord)
                                            : null;
                                        
                                        const isCurrentWord = wordData 
                                            ? currentTime >= wordData.start && currentTime < wordData.end
                                            : false;
                                        
                                        return (
                                            <React.Fragment key={wordIdx}>
                                                <span
                                                    className={`transition-colors duration-100 ${
                                                        isCurrentWord
                                                            ? 'text-white font-bold bg-amber-500/20 px-0.5 rounded'
                                                            : 'text-gray-300'
                                                    }`}
                                                >
                                                    {word}
                                                </span>
                                                {wordIdx < narration.text.split(' ').length - 1 && ' '}
                                            </React.Fragment>
                                        );
                                    })}
                                    {' '}
                                </>
                            ) : (
                                // BEFORE SPEECH GENERATION: Plain text, no sync points, no highlighting
                                <span className="text-gray-300">
                                    {narration.text}{' '}
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>
        );
    };

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
                    <div className="px-4 pb-4">
                        {renderNarrations(introClip?.narrations || [], 'intro', 0, intro)}
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
                        {!videoClip || videoClip.narrations.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">
                                <p className="text-xs">No script content yet.</p>
                                <p className="text-xs mt-2">Process the video to generate narrations.</p>
                            </div>
                        ) : (
                            renderNarrations(videoClip.narrations, 'video', 1)
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
                    <div className="px-4 pb-4">
                        {renderNarrations(outroClip?.narrations || [], 'outro', 2, outro)}
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            {clips.length > 0 && (
                <div className="p-4 border-t border-[#2a2a3e] text-center">
                    <p className="text-xs text-gray-500">
                        {clips.reduce((sum, clip) => sum + clip.narrations.length, 0)} sync point
                        {clips.reduce((sum, clip) => sum + clip.narrations.length, 0) !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
};

export default TranscriptionSection;
