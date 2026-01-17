import React, { useMemo, useEffect, useRef, memo } from 'react';
import { Sparkles, MoreHorizontal } from 'lucide-react';

interface WordTiming {
    word: string;
    start: number;
    end: number;
}

// Word highlighter using direct DOM manipulation to avoid React re-renders
interface WordHighlighterProps {
    text: string;
    words: WordTiming[];
    currentTime: number;
}

const WordHighlighter: React.FC<WordHighlighterProps> = ({ text, words, currentTime }) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    const lastHighlightedRef = useRef<HTMLSpanElement | null>(null);
    
    // Precompute word mappings once
    const wordMappings = useMemo(() => {
        const textWords = text.split(' ');
        return textWords.map((word, idx) => {
            const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
            const wordData = words.find(w => w.word.toLowerCase() === cleanWord);
            return { word, wordData, idx };
        });
    }, [text, words]);

    // Direct DOM manipulation for highlighting - no React state updates
    useEffect(() => {
        if (!containerRef.current) return;
        
        const spans = containerRef.current.querySelectorAll('span[data-word-idx]');
        let newHighlightedSpan: HTMLSpanElement | null = null;
        
        // Find which word should be highlighted
        for (let i = 0; i < wordMappings.length; i++) {
            const { wordData } = wordMappings[i];
            if (wordData && currentTime >= wordData.start && currentTime < wordData.end) {
                newHighlightedSpan = spans[i] as HTMLSpanElement;
                break;
            }
        }
        
        // Only update DOM if the highlighted word changed
        if (newHighlightedSpan !== lastHighlightedRef.current) {
            // Remove highlight from previous word
            if (lastHighlightedRef.current) {
                lastHighlightedRef.current.className = 'text-gray-200';
            }
            // Add highlight to new word
            if (newHighlightedSpan) {
                newHighlightedSpan.className = 'text-white font-semibold bg-indigo-500/30 px-0.5 rounded';
            }
            lastHighlightedRef.current = newHighlightedSpan;
        }
    }, [currentTime, wordMappings]);

    // Render once, then DOM manipulation handles updates
    return (
        <span ref={containerRef}>
            {wordMappings.map((mapping, idx) => (
                <React.Fragment key={idx}>
                    <span data-word-idx={idx} className="text-gray-200">
                        {mapping.word}
                    </span>
                    {idx < wordMappings.length - 1 && ' '}
                </React.Fragment>
            ))}
            {' '}
        </span>
    );
};

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
    onRewriteScript?: () => void; // AI Rewrite handler
    isGenerating: boolean;
    isRewriting?: boolean; // AI Rewrite loading state
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
    onRewriteScript,
    isGenerating,
    isRewriting = false,
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
    const renderNarrations = (clipNarrations: Narration[], _clipName: string, clipIndex: number, clipText?: string) => {
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
                <div className="text-gray-500 text-[12px] italic">
                    No content yet...
                </div>
            );
        }

        return (
            <div className="text-[13px] leading-6 text-gray-200 font-normal">
                {clipNarrations.map((narration, idx) => {
                    // Don't show sync point badge for first narration in each clip
                    const isFirstInClip = idx === 0;
                    
                    return (
                        <span 
                            key={idx} 
                            className="relative inline"
                        >
                            {/* Sync Point - small icon badge */}
                            {!isFirstInClip && (
                                <button
                                    onClick={() => onSyncPointClick(narration.start)}
                                    className="inline-flex items-center justify-center mx-1 w-4 h-4 rounded-full bg-amber-500 text-white hover:bg-amber-400 hover:scale-110 align-middle"
                                    title={`Jump to ${narration.start.toFixed(2)}s`}
                                >
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="12" cy="12" r="4" />
                                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                </button>
                            )}
                            
                            {hasProcessedAudio && narration.words && narration.words.length > 0 ? (
                                // AFTER SPEECH GENERATION: Word-level highlighting on full text
                                // Only show if words array exists (cleared after AI rewrite)
                                <WordHighlighter 
                                    text={narration.text} 
                                    words={narration.words} 
                                    currentTime={currentTime} 
                                />
                            ) : (
                                <span className="text-gray-200">
                                    {narration.text}{' '}
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>
        );
    };

    // Script card component
    const ScriptCard: React.FC<{
        number: number;
        title: string;
        children: React.ReactNode;
    }> = ({ number, title, children }) => (
        <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden transition-all duration-200 hover:border-white/10 hover:bg-white/[0.04] group">
            {/* Card Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 text-gray-400 text-xs font-medium">
                        {number}
                    </span>
                    <span className="text-white text-sm font-medium">{title}</span>
                </div>
                <button className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100">
                    <MoreHorizontal size={14} />
                </button>
            </div>
            {/* Card Content */}
            <div className="px-4 py-3">
                {children}
            </div>
        </div>
    );

    return (
        <div className="w-[360px] bg-gradient-to-b from-[#1e1e2e] to-[#1a1a28] border-r border-white/5 flex flex-col">
            {/* Header with collapse button */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                <button 
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Collapse panel"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            {/* Toolbar - Generate Speech & AI Rewrite */}
            <div className="px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    {/* Generate Speech Button */}
                    <button
                        onClick={onGenerateScript}
                        disabled={isGenerating || hasProcessedAudio}
                        className={`h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                            isGenerating
                                ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                                : hasProcessedAudio
                                    ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed border border-emerald-500/30'
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                        }`}
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : hasProcessedAudio ? (
                            <>
                                <span>✓</span>
                                <span>Generated</span>
                            </>
                        ) : (
                            <>
                                <span className="text-sm">၊၊||၊</span>
                                <span>Generate Speech</span>
                            </>
                        )}
                    </button>

                    {/* AI Rewrite Button */}
                    <button 
                        onClick={onRewriteScript}
                        disabled={isRewriting || !onRewriteScript}
                        className={`h-9 inline-flex items-center justify-center gap-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 border ${
                            isRewriting 
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 cursor-not-allowed'
                                : 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-white/20'
                        }`}
                    >
                        {isRewriting ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
                                <span>Rewriting...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={14} className="text-purple-400" />
                                <span>AI Rewrite</span>
                            </>
                        )}
                    </button>

                    {/* Add button */}
                    <button className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10">
                        <span className="text-lg">+</span>
                    </button>
                </div>
            </div>

            {/* Content - Script Cards */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {/* Intro Card */}
                <ScriptCard number={1} title="Intro">
                    {renderNarrations(introClip?.narrations || [], 'intro', 0, intro)}
                </ScriptCard>

                {/* Video Card */}
                <ScriptCard number={2} title="Video">
                    {!videoClip || videoClip.narrations.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                            <p className="text-sm">No script content yet.</p>
                            <p className="text-xs mt-1 text-gray-600">Process the video to generate narrations.</p>
                        </div>
                    ) : (
                        renderNarrations(videoClip.narrations, 'video', 1)
                    )}
                </ScriptCard>

                {/* Outro Card */}
                <ScriptCard number={3} title="Outro">
                    {renderNarrations(outroClip?.narrations || [], 'outro', 2, outro)}
                </ScriptCard>
            </div>
        </div>
    );
};

export default TranscriptionSection;
