import React, { useMemo, useEffect, useRef, memo, createContext, useContext } from 'react';
import { Sparkles, MoreHorizontal } from 'lucide-react';

interface WordTiming {
    word: string;
    start: number;
    end: number;
}

// Context for time subscription - WordHighlighters subscribe to get notified of time changes
interface TimeContextValue {
    subscribe: (callback: (time: number) => void) => () => void;
    getTime: () => number;
}

const TimeContext = createContext<TimeContextValue | null>(null);

// Provider that manages time updates for word highlighters
interface TimeProviderProps {
    currentTimeRef: React.RefObject<number>;
    isPlaying: boolean;
    children: React.ReactNode;
}

const TimeProvider = memo<TimeProviderProps>(({ currentTimeRef, isPlaying, children }) => {
    const subscribersRef = useRef<Set<(time: number) => void>>(new Set());
    const rafIdRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(-1);
    const isPlayingRef = useRef(isPlaying);

    // Keep isPlaying in ref to avoid effect restarts
    useEffect(() => {
        isPlayingRef.current = isPlaying;
        // When playback state changes, do one immediate update
        const currentTime = currentTimeRef.current ?? 0;
        subscribersRef.current.forEach(callback => callback(currentTime));
    }, [isPlaying, currentTimeRef]);

    useEffect(() => {
        let isActive = true;

        const tick = () => {
            if (!isActive) return;

            const currentTime = currentTimeRef.current ?? 0;

            // Only notify when time actually changes (with small threshold to avoid float issues)
            if (Math.abs(currentTime - lastTimeRef.current) > 0.01) {
                lastTimeRef.current = currentTime;
                // Notify all subscribers with the new time
                subscribersRef.current.forEach(callback => callback(currentTime));
            }

            rafIdRef.current = requestAnimationFrame(tick);
        };

        rafIdRef.current = requestAnimationFrame(tick);

        return () => {
            isActive = false;
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [currentTimeRef]);

    const contextValue = useMemo(() => ({
        subscribe: (callback: (time: number) => void) => {
            subscribersRef.current.add(callback);
            // Immediately call with current time
            callback(currentTimeRef.current ?? 0);
            return () => subscribersRef.current.delete(callback);
        },
        getTime: () => currentTimeRef.current ?? 0
    }), [currentTimeRef]);

    return (
        <TimeContext.Provider value={contextValue}>
            {children}
        </TimeContext.Provider>
    );
});

// Word highlighter - only updates when the highlighted word changes based on word timings
interface WordHighlighterProps {
    text: string;
    words: WordTiming[];
}

const WordHighlighter = memo<WordHighlighterProps>(({ text, words }) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    const lastHighlightedIndexRef = useRef<number>(-1);
    const timeContext = useContext(TimeContext);

    // Precompute word mappings once and create a sorted list for binary search
    const wordMappings = useMemo(() => {
        const textWords = text.split(' ');
        return textWords.map((word, idx) => {
            const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
            const wordData = words.find(w => w.word.toLowerCase() === cleanWord);
            return { word, wordData, idx };
        });
    }, [text, words]);

    // Subscribe to time updates - only update DOM when highlighted word changes
    useEffect(() => {
        if (!timeContext) return;

        const onTimeUpdate = (currentTime: number) => {
            if (!containerRef.current) return;

            let newHighlightedIndex = -1;

            // Find which word should be highlighted based on its timing
            for (let i = 0; i < wordMappings.length; i++) {
                const { wordData } = wordMappings[i];
                if (wordData && currentTime >= wordData.start && currentTime < wordData.end) {
                    newHighlightedIndex = i;
                    break;
                }
            }

            // Only update DOM if the highlighted word actually changed
            if (newHighlightedIndex !== lastHighlightedIndexRef.current) {
                const spans = containerRef.current.querySelectorAll('span[data-word-idx]');

                // Remove highlight from previous word
                if (lastHighlightedIndexRef.current >= 0 && spans[lastHighlightedIndexRef.current]) {
                    (spans[lastHighlightedIndexRef.current] as HTMLSpanElement).style.cssText = '';
                }

                // Add highlight to new word
                if (newHighlightedIndex >= 0 && spans[newHighlightedIndex]) {
                    const span = spans[newHighlightedIndex] as HTMLSpanElement;
                    span.style.cssText = 'color: white; background: rgba(99, 102, 241, 0.3); border-radius: 2px;';
                }

                lastHighlightedIndexRef.current = newHighlightedIndex;
            }
        };

        // Subscribe - this will immediately call onTimeUpdate with current time
        return timeContext.subscribe(onTimeUpdate);
    }, [timeContext, wordMappings]);

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
});

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
    currentTimeRef: React.RefObject<number>; // Ref for jitter-free highlighting
    isPlaying: boolean; // Playback state for RAF loop
    intro?: string; // Intro text from instructions
    outro?: string; // Outro text from instructions
}

// Script card component - defined outside to prevent recreation
const ScriptCard: React.FC<{
    number: number;
    title: string;
    children: React.ReactNode;
}> = memo(({ number, title, children }) => (
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
));

// Memoized TranscriptionSection to prevent re-renders from parent's currentTime state updates
export const TranscriptionSection = memo<TranscriptionSectionProps>(({
    narrations,
    isVisible,
    onClose,
    onSyncPointClick,
    onGenerateScript,
    onRewriteScript,
    isGenerating,
    isRewriting = false,
    hasProcessedAudio,
    currentTimeRef,
    isPlaying,
    intro,
    outro
}) => {
    if (!isVisible) return null;

    // Detect if narrations are clip-based or flat
    const isClipBased = narrations.length > 0 && 'clipName' in narrations[0];

    // Extract clips if clip-based - supports any number of clips dynamically
    const clips: { name: string; narrations: Narration[] }[] = isClipBased
        ? (narrations as ClipNarration[]).map(clip => ({
            name: clip.clipName,
            narrations: clip.narrations || []
        }))
        : [{ name: 'video', narrations: narrations as Narration[] }];

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

    return (
        <TimeProvider currentTimeRef={currentTimeRef} isPlaying={isPlaying}>
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
                            className={`h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${isGenerating
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
                            className={`h-9 inline-flex items-center justify-center gap-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 border ${isRewriting
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

                {/* Content - Script Cards - Dynamic clip rendering */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {clips.map((clip, index) => {
                        // Get fallback text for intro/outro
                        const fallbackText = clip.name === 'intro' ? intro : clip.name === 'outro' ? outro : undefined;
                        // Capitalize clip name for display
                        const displayName = clip.name.charAt(0).toUpperCase() + clip.name.slice(1);

                        return (
                            <ScriptCard key={clip.name} number={index + 1} title={displayName}>
                                {clip.name === 'video' && clip.narrations.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4">
                                        <p className="text-sm">No script content yet.</p>
                                        <p className="text-xs mt-1 text-gray-600">Process the video to generate narrations.</p>
                                    </div>
                                ) : (
                                    renderNarrations(clip.narrations, clip.name, index, fallbackText)
                                )}
                            </ScriptCard>
                        );
                    })}
                </div>
            </div>
        </TimeProvider>
    );
}, (prevProps, nextProps) => {
    // Custom comparator - only re-render when these specific props change
    // Ignore callback function references (they're stable in behavior even if reference changes)
    return (
        prevProps.narrations === nextProps.narrations &&
        prevProps.isVisible === nextProps.isVisible &&
        prevProps.isGenerating === nextProps.isGenerating &&
        prevProps.isRewriting === nextProps.isRewriting &&
        prevProps.hasProcessedAudio === nextProps.hasProcessedAudio &&
        prevProps.isPlaying === nextProps.isPlaying &&
        prevProps.intro === nextProps.intro &&
        prevProps.outro === nextProps.outro &&
        prevProps.currentTimeRef === nextProps.currentTimeRef
    );
});

export default TranscriptionSection;
