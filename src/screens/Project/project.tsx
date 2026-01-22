import React, { useState, useEffect, useRef, useCallback } from 'react';
import './project.css';

// Section Components
import { HeaderSection } from './sections/HeaderSection';
import { SideNavigationSection, SidebarMenuItem } from './sections/SideNavigationSection';
import { TranscriptionSection } from './sections/TranscriptionSection';
import { MusicSection } from './sections/MusicSection';
import { MainCanvasSection, AspectRatio } from './sections/MainCanvasSection';
import { VideoLayer, VideoControls } from './sections/VideoPlayerSection';
import { TextEditPanel } from './sections/TextEditPanel';
import { ZoomEditPanel } from './sections/ZoomEditPanel';
import { MediaBarSection } from './sections/MediaBarSection';

// Services & Hooks
import { useProcessingWebSocket } from '../../hooks/useProcessingWebSocket';
import { useChangeTracking } from '../../hooks/useChangeTracking';
import { generateSpeech, exportVideo, rewriteScript } from '../../services/backend-api';
import { getJSONPath } from '../../utils/changeTrackingHelpers';
import {
    normalizeCoordinates,
    calculateZoomTransform,
    computeEffectProgressWithContinuation,
    hasEffectContinuation,
    getActiveEffects,
    resolveZoomEffect
} from '../../utils/effectProcessor';
import {
    getActiveClip,
    isVideoVisible,
    timelineToVideoTime,
    getTimelineDuration,
    getPlaybackMode,
    type TimelineClip
} from '../../utils/timelineUtils';

interface ProjectScreenProps {
    sessionId?: string;
}

interface Narration {
    start: number;
    end: number;
    text: string;
    musicStyle?: string;
}

interface RecordingDimensions {
    recordingWidth: number;
    recordingHeight: number;
}

export const ProjectScreen: React.FC<ProjectScreenProps> = ({ sessionId }) => {
    // ============== COMPONENT MOUNT DEBUG ==============
    console.log('[ProjectScreen] Component mounting/rendering with sessionId:', sessionId);
    console.log('[ProjectScreen] Window location:', window.location.href);

    // ============== CDN CONFIGURATION ==============
    const CDN_BASE = 'https://cdn.vocallabs.ai';
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // Helper to convert S3 paths to CDN URLs with optional cache-busting
    const formatCdnUrl = (url: string | null | undefined, cacheBuster?: number): string | null => {
        if (!url) return null;

        let fullUrl: string;

        // If already a full URL, use as-is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            fullUrl = url;
        } else {
            // Remove leading slash if present
            const path = url.startsWith('/') ? url.slice(1) : url;
            fullUrl = `${CDN_BASE}/${path}`;
        }

        // Add cache-busting query parameter if provided
        if (cacheBuster) {
            const separator = fullUrl.includes('?') ? '&' : '?';
            return `${fullUrl}${separator}v=${cacheBuster}`;
        }

        return fullUrl;
    };

    // ============== UI STATE ==============
    const [activeTab, setActiveTab] = useState<'video' | 'article'>('video');
    const [activeSidebarItem, setActiveSidebarItem] = useState<SidebarMenuItem | null>('script');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [backgroundColor, setBackgroundColor] = useState('#1a1625');
    const [aspectRatioInitialized, setAspectRatioInitialized] = useState(false);

    // ============== VIDEO STATE ==============
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // ============== CLIP-BASED AUDIO ==============
    // Dynamic clip audio URLs - supports any number of clips
    const [clipAudioUrls, setClipAudioUrls] = useState<Record<string, string | null>>({});
    const [currentClipAudio, setCurrentClipAudio] = useState<string | null>(null);
    const [hasSpeechGenerated, setHasSpeechGenerated] = useState(false);

    // Reset audio state when sessionId changes (new session)
    useEffect(() => {
        setHasSpeechGenerated(false);
        setClipAudioUrls({});
        setCurrentClipAudio(null);
        setIsVideoSelected(false); // Reset selection on new session
    }, [sessionId]);

    // ============== PROCESSING STATE ==============
    const [preparing, setPreparing] = useState(true);
    const [generatingSpeech, setGeneratingSpeech] = useState(false);
    const [rewritingScript, setRewritingScript] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cdnData, setCdnData] = useState<any>(null); // Raw CDN data, hook will merge with localStorage
    const [cacheBustVersion, setCacheBustVersion] = useState<number>(Date.now()); // Force refetch after saves

    // ============== CHANGE TRACKING (replaces results state) ==============
    const {
        results,
        setResults,
        trackChange,
        saveChanges,
        changeStack,
        isSaving,
        isMerging,
        lastSavedAt,
        hasUnsavedChanges
    } = useChangeTracking(
        sessionId || null,
        cdnData,
        () => {
            // Trigger refetch with cache-busting after save
            console.log('[Project] Save complete, triggering cache-busted refetch...');
            setCacheBustVersion(Date.now());
        }
    );

    // ============== EFFECTS STATE ==============
    const [normalizedEffects, setNormalizedEffects] = useState<any[]>([]);
    const [textElements, setTextElements] = useState<any[]>([]);
    const [recordingDimensions, setRecordingDimensions] = useState<RecordingDimensions | null>(null);

    // ============== TIMELINE STATE ==============
    const [activeClip, setActiveClip] = useState<TimelineClip | null>(null);

    // ============== VIDEO SELECTION STATE ==============
    const [isVideoSelected, setIsVideoSelected] = useState(false);

    // ============== TEXT SELECTION STATE ==============
    const [isTextSelected, setIsTextSelected] = useState(false);
    const [selectedTextElement, setSelectedTextElement] = useState<{
        clipName: string;
        elementIndex: number;
        element: any;
    } | null>(null);
    const [isTextEditPanelOpen, setIsTextEditPanelOpen] = useState(false);

    // ============== ZOOM EFFECT SELECTION STATE ==============
    const [isZoomSelected, setIsZoomSelected] = useState(false);
    const [selectedZoomEffect, setSelectedZoomEffect] = useState<{
        clipName: string;
        effectIndex: number;
        effect: any;
    } | null>(null);
    const [isZoomEditPanelOpen, setIsZoomEditPanelOpen] = useState(false);

    // Check if current active clip has media (video/image)
    const currentClipHasMedia = activeClip?.media && activeClip.media.length > 0;

    // Compute video visibility based on current clip
    const videoVisible = results?.timeline ? isVideoVisible(results.timeline, currentTime) : true;

    // ============== ASPECT RATIO HANDLER ==============
    const handleAspectRatioChange = (newRatio: AspectRatio) => {
        console.log('[handleAspectRatioChange] Called with value:', newRatio);
        const oldRatio = aspectRatio;
        
        // Update local state
        setAspectRatio(newRatio);

        // Update in results timeline
        if (results?.timeline) {
            setResults({
                ...results,
                timeline: {
                    ...results.timeline,
                    aspectRatio: newRatio
                }
            });

            // Track change
            trackChange({
                type: 'aspectRatio',
                path: 'timeline.aspectRatio',
                oldValue: oldRatio,
                newValue: newRatio
            });
        }
    };

    // ============== BORDER RADIUS HANDLER ==============
    const handleBorderRadiusChange = (value: number) => {
        console.log('[handleBorderRadiusChange] Called with value:', value);
        if (!activeClip || !activeClip.media || activeClip.media.length === 0) {
            console.log('[handleBorderRadiusChange] No active clip or media, returning');
            return;
        }

        const oldBorderRadius = activeClip.media[0]?.borderRadius || 0;
        console.log('[handleBorderRadiusChange] Old borderRadius:', oldBorderRadius, '→ New:', value);

        // Update the active clip's media borderRadius
        const updatedClip = {
            ...activeClip,
            media: activeClip.media.map((mediaItem: any, index: number) =>
                index === 0 ? { ...mediaItem, borderRadius: value } : mediaItem
            )
        };

        console.log('[handleBorderRadiusChange] Updated clip borderRadius:', updatedClip.media[0].borderRadius);

        setActiveClip(updatedClip);

        // Update in results timeline as well
        if (results?.timeline?.clips) {
            const updatedClips = results.timeline.clips.map((clip: any) =>
                clip.name === activeClip.name ? updatedClip : clip
            );

            setResults({
                ...results,
                timeline: {
                    ...results.timeline,
                    clips: updatedClips
                }
            });

            // Track change
            trackChange({
                type: 'borderRadius',
                clipName: activeClip.name,
                path: getJSONPath('borderRadius', activeClip.name),
                oldValue: oldBorderRadius,
                newValue: value
            });
        }
    };

    // ============== MEDIA SCALE HANDLER ==============
    // Track initial scale for change tracking (only set when drag starts)
    const [initialScaleForTracking, setInitialScaleForTracking] = useState<number | null>(null);

    const handleMediaScaleChange = (value: number, isComplete: boolean = true) => {
        console.log('[handleMediaScaleChange] Called with value:', value, 'isComplete:', isComplete);
        if (!activeClip || !activeClip.media || activeClip.media.length === 0) {
            console.log('[handleMediaScaleChange] No active clip or media, returning');
            return;
        }

        const currentScale = activeClip.media[0]?.scale ?? 85;
        
        // Store initial scale when drag starts (for change tracking)
        if (initialScaleForTracking === null) {
            setInitialScaleForTracking(currentScale);
        }

        // Clamp value to 10-150
        const clampedValue = Math.max(10, Math.min(150, value));

        // Update the active clip's media scale
        const updatedClip = {
            ...activeClip,
            media: activeClip.media.map((mediaItem: any, index: number) =>
                index === 0 ? { ...mediaItem, scale: clampedValue } : mediaItem
            )
        };

        setActiveClip(updatedClip);

        // Update in results timeline as well
        if (results?.timeline?.clips) {
            const updatedClips = results.timeline.clips.map((clip: any) =>
                clip.name === activeClip.name ? updatedClip : clip
            );

            setResults({
                ...results,
                timeline: {
                    ...results.timeline,
                    clips: updatedClips
                }
            });

            // Only track change when complete (user released slider/handle)
            if (isComplete) {
                const oldScale = initialScaleForTracking ?? currentScale;
                console.log('[handleMediaScaleChange] Tracking change - Old:', oldScale, '→ New:', clampedValue);
                trackChange({
                    type: 'mediaScale',
                    clipName: activeClip.name,
                    path: `timeline.clips[${activeClip.name}].media[0].scale`,
                    oldValue: oldScale,
                    newValue: clampedValue
                });
                // Reset initial scale tracker
                setInitialScaleForTracking(null);
            }
        }
    };

    // ============== FIT TO SCREEN HANDLER ==============
    const handleFitToScreen = () => {
        console.log('[handleFitToScreen] Fitting video to screen');
        // Fit to screen means scale to 100% (fills the frame)
        handleMediaScaleChange(100, true);
    };

    // ============== TEXT ELEMENT RESIZE HANDLER ==============
    const handleTextElementResize = useCallback((clipName: string, elementIndex: number, newStart: number, newEnd: number) => {
        if (!results?.displayElements) {
            console.log('[handleTextElementResize] No displayElements, returning');
            return;
        }

        console.log('[handleTextElementResize] Resizing text element:', { clipName, elementIndex, newStart, newEnd });

        // Find the clip in displayElements
        const clipIndex = results.displayElements.findIndex((clip: any) => clip.clipName === clipName);
        if (clipIndex === -1) {
            console.log('[handleTextElementResize] Clip not found:', clipName);
            return;
        }

        const clip = results.displayElements[clipIndex];
        if (!clip.elements || !clip.elements[elementIndex]) {
            console.log('[handleTextElementResize] Element not found:', elementIndex);
            return;
        }

        const element = clip.elements[elementIndex];
        const oldStart = element.start;
        const oldEnd = element.end;

        // Update the element
        const updatedElements = [...clip.elements];
        updatedElements[elementIndex] = {
            ...element,
            start: newStart,
            end: newEnd
        };

        // Update the clip
        const updatedDisplayElements = [...results.displayElements];
        updatedDisplayElements[clipIndex] = {
            ...clip,
            elements: updatedElements
        };

        // Update results
        setResults({
            ...results,
            displayElements: updatedDisplayElements
        });

        // Update textElements state for live preview
        const allTextElements = updatedDisplayElements.flatMap((c: any) => c.elements || []);
        setTextElements(allTextElements);

        // Track change
        trackChange({
            type: 'textElementDuration',
            clipName: clipName,
            path: getJSONPath('textElementDuration', clipName, elementIndex),
            oldValue: { start: oldStart, end: oldEnd },
            newValue: { start: newStart, end: newEnd }
        });

        console.log('[handleTextElementResize] Updated element:', { oldStart, oldEnd, newStart, newEnd });
    }, [results, setResults, trackChange, setTextElements]);

    // ============== TEXT ELEMENT DELETE HANDLER ==============
    const handleTextElementDelete = useCallback((clipName: string, elementIndex: number) => {
        if (!results?.displayElements) {
            console.log('[handleTextElementDelete] No displayElements, returning');
            return;
        }

        console.log('[handleTextElementDelete] Deleting text element:', { clipName, elementIndex });

        // Find the clip in displayElements
        const clipIndex = results.displayElements.findIndex((clip: any) => clip.clipName === clipName);
        if (clipIndex === -1) {
            console.log('[handleTextElementDelete] Clip not found:', clipName);
            return;
        }

        const clip = results.displayElements[clipIndex];
        if (!clip.elements || !clip.elements[elementIndex]) {
            console.log('[handleTextElementDelete] Element not found:', elementIndex);
            return;
        }

        const deletedElement = clip.elements[elementIndex];

        // Remove the element from the array
        const updatedElements = clip.elements.filter((_: any, idx: number) => idx !== elementIndex);

        // Update the clip
        const updatedDisplayElements = [...results.displayElements];
        updatedDisplayElements[clipIndex] = {
            ...clip,
            elements: updatedElements
        };

        // Update results
        setResults({
            ...results,
            displayElements: updatedDisplayElements
        });

        // Update textElements state for live preview
        const allTextElements = updatedDisplayElements.flatMap((c: any) => c.elements || []);
        setTextElements(allTextElements);

        // Track change
        trackChange({
            type: 'textElementDelete',
            clipName: clipName,
            path: getJSONPath('textElementDelete', clipName, elementIndex),
            oldValue: deletedElement,
            newValue: null
        });

        console.log('[handleTextElementDelete] Deleted element:', deletedElement);
    }, [results, setResults, trackChange, setTextElements]);

    // ============== TEXT SELECTION HANDLERS ==============
    const handleTextSelect = useCallback((clipName: string, elementIndex: number, element: any) => {
        console.log('[handleTextSelect] Selected text element:', { clipName, elementIndex, element });
        setSelectedTextElement({ clipName, elementIndex, element });
        setIsTextSelected(true);
        setIsVideoSelected(false); // Deselect video when text is selected
        setIsTextEditPanelOpen(true); // Open the edit panel
    }, []);

    const handleTextDeselect = useCallback(() => {
        console.log('[handleTextDeselect] Deselecting text element');
        setSelectedTextElement(null);
        setIsTextSelected(false);
        setIsTextEditPanelOpen(false);
        // Reopen script/transcription panel when text is deselected
        setActiveSidebarItem('script');
    }, []);

    // ============== ZOOM EFFECT SELECTION HANDLERS ==============
    const handleZoomSelect = useCallback((clipName: string, effectIndex: number, effect: any) => {
        console.log('[handleZoomSelect] Selected zoom effect:', { clipName, effectIndex, effect });
        setSelectedZoomEffect({ clipName, effectIndex, effect });
        setIsZoomSelected(true);
        setIsVideoSelected(false); // Deselect video when zoom is selected
        setIsTextSelected(false); // Deselect text when zoom is selected
        setIsTextEditPanelOpen(false);
        setIsZoomEditPanelOpen(true);
        setActiveSidebarItem('elements'); // Highlight Elements in sidebar
    }, []);

    const handleZoomDeselect = useCallback(() => {
        console.log('[handleZoomDeselect] Deselecting zoom effect');
        setSelectedZoomEffect(null);
        setIsZoomSelected(false);
        setIsZoomEditPanelOpen(false);
        setActiveSidebarItem('script'); // Return to script panel
    }, []);

    const handleZoomEffectUpdate = useCallback((updates: Partial<{
        scale: number;
        start: number;
        end: number;
        target: { bounds: { x: number; y: number; width: number; height: number } };
    }>) => {
        if (!selectedZoomEffect || !results?.displayElements) return;

        const { clipName, effectIndex } = selectedZoomEffect;
        
        // Get old effect for change tracking
        const clip = results.displayElements.find((c: any) => c.clipName === clipName);
        const oldEffect = clip?.effects?.[effectIndex];

        // Track change for undo/redo on final release
        trackChange({
            type: 'effect',
            clipName,
            path: `displayElements.${clipName}.effects[${effectIndex}]`,
            oldValue: oldEffect,
            newValue: { ...oldEffect, ...updates }
        });

        setResults((prev: any) => {
            if (!prev?.displayElements) return prev;

            const updatedDisplayElements = prev.displayElements.map((clip: any) => {
                if (clip.clipName !== clipName) return clip;

                const updatedEffects = [...(clip.effects || [])];
                if (effectIndex >= 0 && effectIndex < updatedEffects.length) {
                    const currentEffect = updatedEffects[effectIndex];
                    
                    // Validate start/end don't exceed clip boundaries
                    let newStart = updates.start ?? currentEffect.start;
                    let newEnd = updates.end ?? currentEffect.end;
                    
                    // Clamp to clip boundaries
                    newStart = Math.max(clip.clipStart, Math.min(newStart, clip.clipEnd));
                    newEnd = Math.max(clip.clipStart, Math.min(newEnd, clip.clipEnd));
                    
                    // Ensure start < end
                    if (newStart >= newEnd) {
                        newEnd = newStart + 0.5; // Minimum 0.5s duration
                    }

                    updatedEffects[effectIndex] = {
                        ...currentEffect,
                        ...updates,
                        start: newStart,
                        end: newEnd,
                        target: updates.target ? {
                            ...currentEffect.target,
                            bounds: {
                                ...currentEffect.target?.bounds,
                                ...updates.target.bounds
                            }
                        } : currentEffect.target
                    };
                }

                return { ...clip, effects: updatedEffects };
            });

            return { ...prev, displayElements: updatedDisplayElements };
        });

        // Update selectedZoomEffect with the new values
        setSelectedZoomEffect(prev => prev ? {
            ...prev,
            effect: {
                ...prev.effect,
                ...updates,
                target: updates.target ? {
                    ...prev.effect.target,
                    bounds: {
                        ...prev.effect.target?.bounds,
                        ...updates.target.bounds
                    }
                } : prev.effect.target
            }
        } : null);

        console.log('[handleZoomEffectUpdate] Updated zoom effect:', updates);
    }, [selectedZoomEffect, results, setResults, trackChange]);

    // Real-time preview without change tracking (for drag/slide during interaction)
    const handleZoomEffectPreview = useCallback((updates: Partial<{
        scale: number;
        start: number;
        end: number;
        target: { bounds: { x: number; y: number; width: number; height: number } };
    }>) => {
        if (!selectedZoomEffect || !results?.displayElements) return;

        const { clipName, effectIndex } = selectedZoomEffect;

        setResults((prev: any) => {
            if (!prev?.displayElements) return prev;

            const updatedDisplayElements = prev.displayElements.map((clip: any) => {
                if (clip.clipName !== clipName) return clip;

                const updatedEffects = [...(clip.effects || [])];
                if (effectIndex >= 0 && effectIndex < updatedEffects.length) {
                    const currentEffect = updatedEffects[effectIndex];
                    
                    // Validate start/end don't exceed clip boundaries
                    let newStart = updates.start ?? currentEffect.start;
                    let newEnd = updates.end ?? currentEffect.end;
                    
                    // Clamp to clip boundaries
                    newStart = Math.max(clip.clipStart, Math.min(newStart, clip.clipEnd));
                    newEnd = Math.max(clip.clipStart, Math.min(newEnd, clip.clipEnd));
                    
                    // Ensure start < end
                    if (newStart >= newEnd) {
                        newEnd = newStart + 0.5; // Minimum 0.5s duration
                    }

                    updatedEffects[effectIndex] = {
                        ...currentEffect,
                        ...updates,
                        start: newStart,
                        end: newEnd,
                        target: updates.target ? {
                            ...currentEffect.target,
                            bounds: {
                                ...currentEffect.target?.bounds,
                                ...updates.target.bounds
                            }
                        } : currentEffect.target
                    };
                }

                return { ...clip, effects: updatedEffects };
            });

            return { ...prev, displayElements: updatedDisplayElements };
        });

        // Update selectedZoomEffect with the new values (for preview)
        setSelectedZoomEffect(prev => prev ? {
            ...prev,
            effect: {
                ...prev.effect,
                ...updates,
                target: updates.target ? {
                    ...prev.effect.target,
                    bounds: {
                        ...prev.effect.target?.bounds,
                        ...updates.target.bounds
                    }
                } : prev.effect.target
            }
        } : null);
    }, [selectedZoomEffect, results, setResults]);

    const handleZoomEffectDelete = useCallback(() => {
        if (!selectedZoomEffect || !results?.displayElements) return;

        const { clipName, effectIndex } = selectedZoomEffect;

        setResults((prev: any) => {
            if (!prev?.displayElements) return prev;

            const updatedDisplayElements = prev.displayElements.map((clip: any) => {
                if (clip.clipName !== clipName) return clip;

                const updatedEffects = [...(clip.effects || [])];
                updatedEffects.splice(effectIndex, 1);

                return { ...clip, effects: updatedEffects };
            });

            return { ...prev, displayElements: updatedDisplayElements };
        });

        handleZoomDeselect();
        console.log('[handleZoomEffectDelete] Deleted zoom effect');
    }, [selectedZoomEffect, results, setResults, handleZoomDeselect]);

    // Handler for resizing zoom effects from timeline
    const handleZoomResize = useCallback((clipName: string, effectIndex: number, newStart: number, newEnd: number) => {
        if (!results?.displayElements) return;

        setResults((prev: any) => {
            if (!prev?.displayElements) return prev;

            const updatedDisplayElements = prev.displayElements.map((clip: any) => {
                if (clip.clipName !== clipName) return clip;

                const updatedEffects = [...(clip.effects || [])];
                if (effectIndex >= 0 && effectIndex < updatedEffects.length) {
                    updatedEffects[effectIndex] = {
                        ...updatedEffects[effectIndex],
                        start: newStart,
                        end: newEnd,
                    };
                }

                return { ...clip, effects: updatedEffects };
            });

            return { ...prev, displayElements: updatedDisplayElements };
        });

        // Update selected zoom effect if it's the one being resized
        if (selectedZoomEffect?.clipName === clipName && selectedZoomEffect?.effectIndex === effectIndex) {
            setSelectedZoomEffect(prev => prev ? {
                ...prev,
                effect: { ...prev.effect, start: newStart, end: newEnd }
            } : null);
        }
    }, [results, selectedZoomEffect]);

    // Handler for resizing clips (intro/outro) from timeline
    // When shrinking a clip:
    // 1. Clamp any effects/elements on THAT SPECIFIC clip to fit within new bounds
    // 2. Shift adjacent clips to maintain continuity (no gaps)
    // 3. Update clipStart/clipEnd for ALL shifted clips in displayElements
    const handleClipResize = useCallback((clipName: string, newStart: number, newEnd: number) => {
        if (!results?.timeline?.clips) return;

        setResults((prev: any) => {
            if (!prev?.timeline?.clips) return prev;

            // Sort clips by start time to ensure proper order
            const sortedClips = [...prev.timeline.clips].sort((a: any, b: any) => a.start - b.start);
            
            // Find the clip being resized
            const clipIndex = sortedClips.findIndex((c: any) => c.name === clipName);
            if (clipIndex === -1) return prev;

            const oldClip = sortedClips[clipIndex];
            const newDuration = newEnd - newStart;

            // Update the resized clip
            const updatedClips = [...sortedClips];
            updatedClips[clipIndex] = { ...oldClip, start: newStart, end: newEnd };

            // Shift subsequent clips to maintain continuity
            // If clip shrinks, move next clips earlier; if expands, move later
            for (let i = clipIndex + 1; i < updatedClips.length; i++) {
                const clip = updatedClips[i];
                const clipDuration = clip.end - clip.start;
                const newClipStart = updatedClips[i - 1].end;
                updatedClips[i] = {
                    ...clip,
                    start: newClipStart,
                    end: newClipStart + clipDuration
                };
            }

            // Build a map of clip name -> new clip boundaries
            const clipBoundariesMap: Record<string, { start: number; end: number }> = {};
            for (const clip of updatedClips) {
                clipBoundariesMap[clip.name] = { start: clip.start, end: clip.end };
            }
            
            console.log('[handleClipResize] Clip boundaries map:', clipBoundariesMap);
            console.log('[handleClipResize] DisplayElements before update:', prev.displayElements);

            // Update ALL displayElements with new clipStart/clipEnd
            // For resized clip: clamp effects/elements
            // For shifted clips: shift effects/elements by the same delta
            let updatedDisplayElements = prev.displayElements;
            if (prev.displayElements) {
                updatedDisplayElements = prev.displayElements.map((displayClip: any) => {
                    const newBounds = clipBoundariesMap[displayClip.clipName];
                    console.log(`[handleClipResize] Processing displayClip: ${displayClip.clipName}, newBounds:`, newBounds);
                    if (!newBounds) return displayClip;

                    const oldClipStart = displayClip.clipStart || 0;
                    const shiftDelta = newBounds.start - oldClipStart;

                    // Update clipStart and clipEnd for ALL clips (for proper timeline positioning)
                    let updatedClip = {
                        ...displayClip,
                        clipStart: newBounds.start,
                        clipEnd: newBounds.end
                    };

                    // For the RESIZED clip: clamp effects/elements to new duration
                    if (displayClip.clipName === clipName) {
                        // Clamp effects to fit within new clip bounds
                        const clampedEffects = (displayClip.effects || []).map((effect: any) => {
                            const effectDuration = effect.end - effect.start;
                            let newEffectStart = Math.max(newBounds.start, Math.min(effect.start, newBounds.end - 0.1));
                            let newEffectEnd = Math.min(newBounds.end, Math.max(newEffectStart + 0.1, effect.end));
                            
                            if (newEffectEnd > newBounds.end) {
                                newEffectEnd = newBounds.end;
                                newEffectStart = Math.max(newBounds.start, newEffectEnd - effectDuration);
                            }

                            return { ...effect, start: newEffectStart, end: newEffectEnd };
                        }).filter((effect: any) => effect.start < effect.end);

                        // Clamp elements to fit within new clip bounds
                        const clampedElements = (displayClip.elements || []).map((element: any) => {
                            const elemDuration = element.end - element.start;
                            let newElemStart = Math.max(newBounds.start, Math.min(element.start, newBounds.end - 0.1));
                            let newElemEnd = Math.min(newBounds.end, Math.max(newElemStart + 0.1, element.end));
                            
                            if (newElemEnd > newBounds.end) {
                                newElemEnd = newBounds.end;
                                newElemStart = Math.max(newBounds.start, newElemEnd - elemDuration);
                            }

                            return { ...element, start: newElemStart, end: newElemEnd };
                        }).filter((element: any) => element.start < element.end);

                        updatedClip = {
                            ...updatedClip,
                            effects: clampedEffects,
                            elements: clampedElements
                        };
                    } else if (shiftDelta !== 0) {
                        // For OTHER clips that shifted: shift effects/elements by the delta
                        console.log(`[handleClipResize] Shifting ${displayClip.clipName} effects/elements by ${shiftDelta}s`);
                        
                        const shiftedEffects = (displayClip.effects || []).map((effect: any) => {
                            const shifted = {
                                ...effect,
                                start: effect.start + shiftDelta,
                                end: effect.end + shiftDelta
                            };
                            console.log(`[handleClipResize] Effect shifted: ${effect.start.toFixed(2)} -> ${shifted.start.toFixed(2)}`);
                            return shifted;
                        });

                        const shiftedElements = (displayClip.elements || []).map((element: any) => {
                            const shifted = {
                                ...element,
                                start: element.start + shiftDelta,
                                end: element.end + shiftDelta
                            };
                            console.log(`[handleClipResize] Element "${element.content?.substring(0, 20)}..." shifted: ${element.start.toFixed(2)} -> ${shifted.start.toFixed(2)}`);
                            return shifted;
                        });

                        updatedClip = {
                            ...updatedClip,
                            effects: shiftedEffects,
                            elements: shiftedElements
                        };
                    }

                    return updatedClip;
                });
                
                console.log('[handleClipResize] DisplayElements after update:', updatedDisplayElements);
            }

            // Calculate new total duration
            const lastClip = updatedClips[updatedClips.length - 1];
            const newTotalDuration = lastClip.end;

            console.log(`[handleClipResize] Resized ${clipName}: ${newStart.toFixed(2)}s - ${newEnd.toFixed(2)}s, total duration: ${newTotalDuration.toFixed(2)}s`);
            console.log('[handleClipResize] Updated clips:', updatedClips);

            return { 
                ...prev, 
                timeline: { 
                    ...prev.timeline, 
                    clips: updatedClips 
                },
                displayElements: updatedDisplayElements
            };
        });
    }, [results]);

    // Click outside detection to deselect text elements
    // Deselect when clicking anywhere except:
    // - Textbox block in timeline track (has data-text-block)
    // - TextEditPanel sidebar (has data-text-edit-panel)
    // - Elements button in sidebar (has data-sidebar-elements)
    // - Play/pause button (has data-play-pause)
    // - TextOverlay on canvas (has data-text-overlay)
    // - TextEditToolbar (has data-text-toolbar)
    useEffect(() => {
        if (!isTextSelected) return;

        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Check if clicking on allowed elements
            const isAllowed =
                target.closest('[data-text-block]') ||
                target.closest('[data-text-edit-panel]') ||
                target.closest('[data-sidebar-elements]') ||
                target.closest('[data-play-pause]') ||
                target.closest('[data-text-overlay]') ||
                target.closest('[data-text-toolbar]') ||
                target.closest('[data-color-picker]');

            if (!isAllowed) {
                console.log('[Click Outside] Deselecting text element');
                handleTextDeselect();
            }
        };

        // Use setTimeout to allow click events to propagate first
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleGlobalClick);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleGlobalClick);
        };
    }, [isTextSelected, handleTextDeselect]);

    // Click outside detection to deselect zoom effects
    useEffect(() => {
        if (!isZoomSelected) return;

        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Check if clicking on allowed elements
            const isAllowed =
                target.closest('[data-zoom-edit-panel]') ||
                target.closest('[data-zoom-block]') ||
                target.closest('[data-play-pause]') ||
                target.closest('[data-color-picker]') ||
                target.closest('[data-sidebar-elements]');

            if (!isAllowed) {
                console.log('[Click Outside] Deselecting zoom effect');
                handleZoomDeselect();
            }
        };

        // Use setTimeout to allow click events to propagate first
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleGlobalClick);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleGlobalClick);
        };
    }, [isZoomSelected, handleZoomDeselect]);

    const handleTextMove = useCallback((clipName: string, elementIndex: number, newX: number, newY: number) => {
        if (!results?.displayElements) return;

        const clipIndex = results.displayElements.findIndex((clip: any) => clip.clipName === clipName);
        if (clipIndex === -1) return;

        const clip = results.displayElements[clipIndex];
        if (!clip.elements || !clip.elements[elementIndex]) return;

        const element = clip.elements[elementIndex];
        const oldPosition = { ...element.position };

        // Update the element position
        const updatedElements = [...clip.elements];
        updatedElements[elementIndex] = {
            ...element,
            position: { x: newX, y: newY }
        };

        // Update the clip
        const updatedDisplayElements = [...results.displayElements];
        updatedDisplayElements[clipIndex] = {
            ...clip,
            elements: updatedElements
        };

        // Update results
        setResults({
            ...results,
            displayElements: updatedDisplayElements
        });

        // Update textElements state for live preview
        const allTextElements = updatedDisplayElements.flatMap((c: any) => c.elements || []);
        setTextElements(allTextElements);

        // Update selected element reference
        setSelectedTextElement(prev => prev ? {
            ...prev,
            element: updatedElements[elementIndex]
        } : null);

        // Track change (debounced - only track on mouse up, not during drag)
    }, [results, setResults, setTextElements]);

    const handleTextResize = useCallback((clipName: string, elementIndex: number, newWidth: number, newHeight: number, resizeType?: 'horizontal' | 'diagonal') => {
        if (!results?.displayElements) return;

        const clipIndex = results.displayElements.findIndex((clip: any) => clip.clipName === clipName);
        if (clipIndex === -1) return;

        const clip = results.displayElements[clipIndex];
        if (!clip.elements || !clip.elements[elementIndex]) return;

        const element = clip.elements[elementIndex];
        const originalFontSize = element.style?.fontSize || 129;

        let finalWidth = newWidth;
        let finalHeight = newHeight;
        let finalFontSize = originalFontSize;

        if (resizeType === 'horizontal') {
            // Horizontal resize: keep font size, auto-calculate height based on text content
            // The height needs to accommodate the text at the current font size
            // We'll calculate how many lines the text would need at the new width

            // Estimate character width (roughly 0.5 * fontSize for most fonts)
            const avgCharWidth = originalFontSize * 0.55;
            const textContent = element.content || '';
            const charsPerLine = Math.max(1, Math.floor(newWidth / avgCharWidth));

            // Split text into words and calculate lines needed
            const words = textContent.split(' ');
            let lines = 1;
            let currentLineLength = 0;

            for (const word of words) {
                const wordLength = word.length * avgCharWidth + avgCharWidth; // +1 for space
                if (currentLineLength + wordLength > newWidth && currentLineLength > 0) {
                    lines++;
                    currentLineLength = wordLength;
                } else {
                    currentLineLength += wordLength;
                }
            }

            // Calculate height based on number of lines (line height ~1.2)
            const lineHeight = originalFontSize * 1.3;
            const padding = originalFontSize * 0.5; // Some padding
            finalHeight = Math.max(originalFontSize + padding, lines * lineHeight + padding);
            finalWidth = newWidth;
            finalFontSize = originalFontSize; // Keep font size unchanged
        } else {
            // Diagonal resize: scale font size proportionally
            const originalHeight = element.dimension.height;
            const heightRatio = newHeight / originalHeight;

            // Minimum font size is 24px (industry standard minimum for readability)
            const MIN_FONT_SIZE = 24;
            const calculatedFontSize = Math.round(originalFontSize * heightRatio);

            if (calculatedFontSize < MIN_FONT_SIZE) {
                // Hit minimum font size - stop scaling, just adjust dimensions
                finalFontSize = MIN_FONT_SIZE;
                // Recalculate dimensions to maintain aspect ratio at minimum font size
                const minRatio = MIN_FONT_SIZE / originalFontSize;
                finalWidth = element.dimension.width * minRatio;
                finalHeight = element.dimension.height * minRatio;
            } else {
                finalFontSize = Math.min(500, calculatedFontSize); // Max 500px
                finalWidth = newWidth;
                finalHeight = newHeight;
            }
        }

        // Update the element dimension and font size
        const updatedElements = [...clip.elements];
        updatedElements[elementIndex] = {
            ...element,
            dimension: { width: finalWidth, height: finalHeight },
            style: {
                ...element.style,
                fontSize: finalFontSize
            }
        };

        // Update the clip
        const updatedDisplayElements = [...results.displayElements];
        updatedDisplayElements[clipIndex] = {
            ...clip,
            elements: updatedElements
        };

        // Update results
        setResults({
            ...results,
            displayElements: updatedDisplayElements
        });

        // Update textElements state for live preview
        const allTextElements = updatedDisplayElements.flatMap((c: any) => c.elements || []);
        setTextElements(allTextElements);

        // Update selected element reference
        setSelectedTextElement(prev => prev ? {
            ...prev,
            element: updatedElements[elementIndex]
        } : null);
    }, [results, setResults, setTextElements]);

    const handleTextElementUpdate = useCallback((updates: Partial<any>) => {
        if (!selectedTextElement || !results?.displayElements) return;

        const { clipName, elementIndex } = selectedTextElement;
        const clipIndex = results.displayElements.findIndex((clip: any) => clip.clipName === clipName);
        if (clipIndex === -1) return;

        const clip = results.displayElements[clipIndex];
        if (!clip.elements || !clip.elements[elementIndex]) return;

        const element = clip.elements[elementIndex];
        // Deep clone for proper change tracking
        const oldElement = JSON.parse(JSON.stringify(element));

        // Calculate new dimensions if font size is changing
        let dimensionUpdate = {};
        if (updates.style?.fontSize && element.style?.fontSize) {
            const oldFontSize = element.style.fontSize;
            const newFontSize = updates.style.fontSize;
            const scale = newFontSize / oldFontSize;

            // Scale dimensions proportionally with font size
            dimensionUpdate = {
                dimension: {
                    width: element.dimension.width * scale,
                    height: element.dimension.height * scale
                }
            };
        }

        // Deep merge style updates to preserve nested objects like outline, shadow, background
        const mergedStyle = updates.style ? {
            ...element.style,
            ...updates.style,
            // Deep merge nested style objects
            outline: updates.style.outline !== undefined ? {
                ...(element.style?.outline || {}),
                ...updates.style.outline
            } : element.style?.outline,
            shadow: updates.style.shadow !== undefined ? {
                ...(element.style?.shadow || {}),
                ...updates.style.shadow,
                position: updates.style.shadow?.position !== undefined ? {
                    ...(element.style?.shadow?.position || {}),
                    ...updates.style.shadow.position
                } : element.style?.shadow?.position
            } : element.style?.shadow,
            background: updates.style.background !== undefined ? {
                ...(element.style?.background || {}),
                ...updates.style.background
            } : element.style?.background,
        } : element.style;

        // Merge updates into element
        const updatedElement = {
            ...element,
            ...updates,
            ...dimensionUpdate,
            style: mergedStyle
        };

        // Update the element
        const updatedElements = [...clip.elements];
        updatedElements[elementIndex] = updatedElement;

        // Update the clip
        const updatedDisplayElements = [...results.displayElements];
        updatedDisplayElements[clipIndex] = {
            ...clip,
            elements: updatedElements
        };

        // Update results
        setResults({
            ...results,
            displayElements: updatedDisplayElements
        });

        // Update textElements state for live preview
        const allTextElements = updatedDisplayElements.flatMap((c: any) => c.elements || []);
        setTextElements(allTextElements);

        // Update selected element reference
        setSelectedTextElement(prev => prev ? {
            ...prev,
            element: updatedElement
        } : null);

        // Track change
        trackChange({
            type: 'textElement',
            clipName: clipName,
            path: `displayElements.${clipIndex}.elements.${elementIndex}`,
            oldValue: oldElement,
            newValue: updatedElement
        });

        console.log('[handleTextElementUpdate] Updated element:', updatedElement);
    }, [selectedTextElement, results, setResults, setTextElements, trackChange]);

    // Handler for updating text content directly (from inline editing on canvas)
    const handleTextContentChange = useCallback((clipName: string, elementIndex: number, newContent: string) => {
        if (!results?.displayElements) return;

        const clipIndex = results.displayElements.findIndex((clip: any) => clip.clipName === clipName);
        if (clipIndex === -1) return;

        const clip = results.displayElements[clipIndex];
        if (!clip.elements || !clip.elements[elementIndex]) return;

        const element = clip.elements[elementIndex];
        const oldContent = element.content;

        // Update the element with new content
        const updatedElement = {
            ...element,
            content: newContent
        };

        // Update the elements array
        const updatedElements = [...clip.elements];
        updatedElements[elementIndex] = updatedElement;

        // Update the clip
        const updatedDisplayElements = [...results.displayElements];
        updatedDisplayElements[clipIndex] = {
            ...clip,
            elements: updatedElements
        };

        // Update results
        setResults({
            ...results,
            displayElements: updatedDisplayElements
        });

        // Update textElements state for live preview
        const allTextElements = updatedDisplayElements.flatMap((c: any) => c.elements || []);
        setTextElements(allTextElements);

        // Update selected element reference if this element is selected
        if (selectedTextElement?.clipName === clipName && selectedTextElement?.elementIndex === elementIndex) {
            setSelectedTextElement(prev => prev ? {
                ...prev,
                element: updatedElement
            } : null);
        }

        // Track change
        trackChange({
            type: 'textElement',
            clipName: clipName,
            path: `displayElements.${clipIndex}.elements.${elementIndex}.content`,
            oldValue: oldContent,
            newValue: newContent
        });

        console.log('[handleTextContentChange] Updated text content:', { clipName, elementIndex, oldContent, newContent });
    }, [results, setResults, setTextElements, selectedTextElement, trackChange]);

    // ============== GLOBAL CLICK LISTENER FOR VIDEO DESELECTION ==============
    // Deselect video when clicking outside video area (on background or other UI elements)
    useEffect(() => {
        const handleDocumentClick = () => {
            // Only deselect if video is currently selected
            if (isVideoSelected) {
                setIsVideoSelected(false);
            }
        };

        // Add listener to document
        document.addEventListener('click', handleDocumentClick);

        // Cleanup
        return () => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [isVideoSelected]);

    // Deselect video when active clip changes or clip has no media
    useEffect(() => {
        if (!currentClipHasMedia) {
            setIsVideoSelected(false);
        }
    }, [activeClip?.name, currentClipHasMedia]);

    // Sync activeClip with merged results (after localStorage merge)
    useEffect(() => {
        if (!results?.timeline || !activeClip) return;

        // Find the updated clip from merged results
        const updatedClip = getActiveClip(results.timeline, currentTime);

        if (updatedClip && updatedClip.name === activeClip.name) {
            // Check if backgroundColor or other properties changed
            const bgChanged = updatedClip.backgroundColor !== activeClip.backgroundColor;
            const borderRadiusChanged = updatedClip.media?.[0]?.borderRadius !== activeClip.media?.[0]?.borderRadius;

            if (bgChanged || borderRadiusChanged) {
                console.log('[ActiveClip] Syncing with merged results:', {
                    old: { bg: activeClip.backgroundColor, br: activeClip.media?.[0]?.borderRadius },
                    new: { bg: updatedClip.backgroundColor, br: updatedClip.media?.[0]?.borderRadius }
                });
                setActiveClip(updatedClip);
            }
        }
    }, [results, currentTime]); // Trigger when results change (after merge)

    // Track current clip audio URL in state (unified RAF loop handles actual playback)
    useEffect(() => {
        if (!activeClip) return;

        const clipName = activeClip.name;
        const audioUrl = clipAudioUrls[clipName] || null;

        // Just update state tracking - RAF loop handles actual audio loading/playback
        if (audioUrl && currentClipAudio !== audioUrl) {
            console.log(`[Audio] Clip changed to ${clipName}, tracking audio URL:`, audioUrl);
            setCurrentClipAudio(audioUrl);
        } else if (!audioUrl && currentClipAudio) {
            console.log(`[Audio] No audio URL for ${clipName} clip`);
            setCurrentClipAudio(null);
        }
    }, [activeClip, clipAudioUrls, currentClipAudio]);

    // Compute background color based on active clip - use clip's backgroundColor if available
    const currentBackgroundColor = (activeClip && activeClip.backgroundColor)
        ? activeClip.backgroundColor
        : backgroundColor;

    // ============== REFS ==============
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const aiAudioRef = useRef<HTMLAudioElement>(null);
    const videoLayerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
    const audioStartedRef = useRef<boolean>(false); // Track if audio started for current playback
    
    // ============== PLAYBACK REFS ==============
    const currentTimeRef = useRef<number>(0); // Mutable ref to track time without re-renders

    // ============== WEBSOCKET ==============
    const { progress } = useProcessingWebSocket(sessionId || '') as { progress: { message: string } | null };

    // ============== COMPUTED VALUES ==============
    const narrations: Narration[] = results?.narrations || [];

    // Extract clip audio URLs from clip-based narrations structure
    useEffect(() => {
        if (!results?.narrations || !Array.isArray(results.narrations)) return;

        const clipNarrations = results.narrations;

        // Build dynamic audio URLs for all clips
        const urls: Record<string, string | null> = {};
        let allHaveGeneratedAudio = true;

        for (const clip of clipNarrations) {
            const clipName = clip.clipName;
            if (clip.generatedAudioUrl) {
                urls[clipName] = formatCdnUrl(clip.generatedAudioUrl, cacheBustVersion);
            } else {
                urls[clipName] = formatCdnUrl(clip.rawAudioUrl, cacheBustVersion);
                allHaveGeneratedAudio = false;
            }
        }

        // Check if speech has been generated (all clips must have generated audio)
        setHasSpeechGenerated(allHaveGeneratedAudio);
        setClipAudioUrls(urls);

        if (allHaveGeneratedAudio) {
            console.log('[Audio] Using generated audio URLs (CDN with cache bust):', urls);
        } else {
            console.log('[Audio] Using raw audio URLs (CDN with cache bust, speech not generated):', urls);
        }

        // Initialize active clip if not set and timeline exists
        if (results?.timeline && !activeClip) {
            const initialClip = getActiveClip(results.timeline, currentTime);
            if (initialClip) {
                console.log('[Audio] Setting initial active clip:', initialClip.name, 'at time', currentTime);
                setActiveClip(initialClip);
            }
        }

        // Initialize aspectRatio from timeline data (only once)
        if (results?.timeline?.aspectRatio && !aspectRatioInitialized) {
            const dataAspectRatio = results.timeline.aspectRatio as AspectRatio;
            console.log('[Timeline] Initializing aspectRatio from data:', dataAspectRatio);
            setAspectRatio(dataAspectRatio);
            setAspectRatioInitialized(true);
        }
    }, [results, aspectRatioInitialized, cacheBustVersion]); // Added cacheBustVersion to reload audio when cache changes
    
    // Preload all clip audio files for smooth transitions
    useEffect(() => {
        const preloadedAudio: HTMLAudioElement[] = [];
        
        Object.entries(clipAudioUrls).forEach(([clipName, url]) => {
            if (url) {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.src = url;
                audio.load();
                preloadedAudio.push(audio);
                console.log(`[Audio Preload] Preloading ${clipName}:`, url);
            }
        });
        
        return () => {
            // Cleanup preloaded audio on unmount
            preloadedAudio.forEach(audio => {
                audio.src = '';
            });
        };
    }, [clipAudioUrls]);
    
    const showTranscriptionPanel = activeSidebarItem === 'script';
    const showMusicPanel = activeSidebarItem === 'music';
    // Note: Elements panel logic moved to TextEditPanel which shows based on isTextSelected

    // ============== EFFECTS ==============

    // Auto-start processing when sessionId is available
    useEffect(() => {
        console.log('[Session] useEffect triggered, sessionId:', sessionId);

        if (!sessionId) {
            console.log('[Session] No sessionId, skipping processing');
            setPreparing(false);
            return;
        }

        let isCancelled = false;
        let retryCount = 0;
        const maxRetries = 30; // 30 retries = ~60 seconds with exponential backoff

        const loadInstructionsFromCDN = async () => {
            const cdnUrl = `${CDN_BASE}/recordings/${sessionId}/session/instructions.json?v=${cacheBustVersion}`;
            const backendUrl = `${API_BASE}/api/session/${sessionId}/instructions?v=${cacheBustVersion}`;

            const attemptFetch = async (): Promise<boolean> => {
                if (isCancelled) return false;

                try {
                    console.log(`[Session] Attempt ${retryCount + 1}/${maxRetries}: Fetching instructions.json`);

                    let response: Response | undefined;
                    let sessionData: any;

                    // Try CDN first with aggressive cache-busting headers
                    try {
                        console.log('[Session] Trying CDN:', cdnUrl);
                        response = await fetch(cdnUrl, {
                            cache: 'no-cache', // Forces revalidation with server
                            headers: {
                                'Cache-Control': 'no-cache, no-store, must-revalidate',
                                'Pragma': 'no-cache',
                                'Expires': '0'
                            }
                        });

                        if (response?.ok) {
                            sessionData = await response.json();
                            console.log('[Session] ✅ Loaded from CDN');
                        }
                    } catch (cdnErr) {
                        console.warn('[Session] CDN failed (CORS or network), trying backend proxy...', cdnErr);
                    }

                    // Fallback to backend proxy if CDN failed
                    if (!sessionData) {
                        console.log('[Session] Trying backend:', backendUrl);
                        response = await fetch(backendUrl, {
                            cache: 'no-cache',
                            headers: {
                                'Cache-Control': 'no-cache, no-store, must-revalidate'
                            }
                        });

                        if (response?.ok) {
                            sessionData = await response.json();
                            console.log('[Session] ✅ Loaded from backend proxy');
                        }
                    }

                    if (sessionData && !isCancelled) {

                        console.log('[Session] Successfully loaded instructions.json:', sessionData);

                        // Get video URL from timeline structure (new media format)
                        let finalVideoUrl: string | null = null;
                        if (sessionData.timeline?.clips) {
                            const videoClip = sessionData.timeline.clips.find((c: any) => c.name === 'video');
                            if (videoClip) {
                                // Check new media structure
                                if (videoClip.media && videoClip.media.length > 0) {
                                    const videoMedia = videoClip.media.find((m: any) => m.type === 'video');
                                    finalVideoUrl = videoMedia?.url || null;
                                    console.log('[Session] Extracted video URL from media array:', finalVideoUrl);
                                } else if (videoClip.url) {
                                    // Fallback to old structure
                                    finalVideoUrl = videoClip.url;
                                    console.log('[Session] Using legacy clip.url:', finalVideoUrl);
                                }
                            }
                        }

                        // Fallback to hardcoded path if not in timeline
                        if (!finalVideoUrl) {
                            finalVideoUrl = formatCdnUrl(`recordings/${sessionId}/rawvideo/video.webm`);
                            console.log('[Session] Using fallback CDN URL:', finalVideoUrl);
                        }

                        const finalAudioUrl = formatCdnUrl(`recordings/${sessionId}/rawaudio/audio.webm`);

                        console.log('[Session] Setting URLs:', { finalVideoUrl, finalAudioUrl });

                        setVideoUrl(finalVideoUrl);
                        setAudioUrl(finalAudioUrl);

                        if (sessionData.videoDuration && sessionData.videoDuration > 0) {
                            setDuration(sessionData.videoDuration);
                        }

                        console.log('[Session] Setting CDN data (hook will merge with localStorage)...');
                        setCdnData(sessionData);
                        console.log('[Session] CDN data set, hook will apply localStorage changes');

                        // Initialize active clip to intro at time 0 if timeline exists
                        if (sessionData.timeline) {
                            const initialClip = getActiveClip(sessionData.timeline, 0);
                            if (initialClip) {
                                console.log('[Timeline] Setting initial clip:', initialClip.name);
                                setActiveClip(initialClip);
                                setCurrentTime(0);
                            }
                        }

                        setPreparing(false);
                        console.log('[Session] Loading complete from instructions.json');
                        return true; // Success
                    }

                    // File not ready yet (404, 403, etc.)
                    if (response) {
                        console.log(`[Session] Instructions.json not ready yet (status: ${response.status}), will retry...`);
                    }
                    return false;
                } catch (err: any) {
                    console.warn(`[Session] Fetch attempt ${retryCount + 1} failed:`, err.message);
                    return false;
                }
            };

            // Retry loop with exponential backoff
            setPreparing(true);

            while (retryCount < maxRetries && !isCancelled) {
                const success = await attemptFetch();

                if (success) {
                    return; // Successfully loaded
                }

                retryCount++;

                if (retryCount < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s, then stay at 4s
                    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 4000);
                    console.log(`[Session] Waiting ${delay}ms before retry ${retryCount + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            // Max retries reached
            if (!isCancelled) {
                console.error('[Session] Max retries reached, instructions.json still not available');
                setError('Session processing is taking longer than expected. Please refresh the page to try again.');
                setPreparing(false);
            }
        };

        loadInstructionsFromCDN();

        // Cleanup function to cancel polling if component unmounts
        return () => {
            isCancelled = true;
        };
    }, [sessionId, cacheBustVersion]); // Refetch when cacheBustVersion changes

    // ============== STABLE PLAYBACK LOOP ==============
    // Uses setInterval instead of RAF to avoid React lifecycle issues
    // Uses refs for all mutable state to prevent effect restarts
    const isPlayingRef = useRef(false);
    const timelineRef = useRef<any>(null);
    const clipAudioUrlsRef = useRef(clipAudioUrls);
    const lastAudioSyncRef = useRef(0);
    const playbackStartTimeRef = useRef(0);
    const playbackStartTimelineTimeRef = useRef(0);
    const seekFlagRef = useRef(false);
    const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastClipNameRef = useRef<string | null>(null); // Track current clip to detect changes
    
    // Keep refs in sync with state
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { timelineRef.current = results?.timeline; }, [results?.timeline]);
    useEffect(() => { clipAudioUrlsRef.current = clipAudioUrls; }, [clipAudioUrls]);
    
    // Helper to load and play audio for a clip
    const loadAudioForClip = useCallback((clipName: 'intro' | 'video' | 'outro', clipRelativeTime: number) => {
        const audio = aiAudioRef.current;
        if (!audio) return;
        
        const audioUrl = clipAudioUrlsRef.current[clipName];
        if (!audioUrl) {
            console.log(`[Playback] No audio URL for ${clipName}`);
            return;
        }
        
        // Check if source needs to change
        const currentSrc = audio.src || '';
        const urlFilename = audioUrl.split('?')[0].split('/').pop() || '';
        const needsSourceChange = urlFilename && !currentSrc.includes(urlFilename);
        
        if (needsSourceChange) {
            console.log(`[Playback] Loading audio for ${clipName}:`, audioUrl);
            audio.src = audioUrl;
            audio.currentTime = clipRelativeTime;
            audio.play().catch(err => console.error(`[${clipName}] Audio play error:`, err));
        } else {
            // Same source - just sync and play
            audio.currentTime = clipRelativeTime;
            if (audio.paused) {
                audio.play().catch(err => console.error(`[${clipName}] Audio play error:`, err));
            }
        }
    }, []);
    
    // Stop playback interval
    const stopPlayback = useCallback(() => {
        if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current);
            playbackIntervalRef.current = null;
            console.log('[Playback] Stopped');
        }
    }, []);
    
    // Start playback interval
    const startPlayback = useCallback(() => {
        if (playbackIntervalRef.current) {
            console.log('[Playback] Already running');
            return;
        }
        
        const timeline = timelineRef.current;
        if (!timeline) {
            console.log('[Playback] No timeline available');
            return;
        }
        
        if (!videoRef.current) {
            console.log('[Playback] No video element');
            return;
        }
        
        playbackStartTimeRef.current = performance.now();
        playbackStartTimelineTimeRef.current = currentTimeRef.current;
        // DON'T reset audioStartedRef here - handlePlayPause already set it up correctly
        
        console.log(`[Playback] Starting at timeline ${playbackStartTimelineTimeRef.current}s, audioStarted: ${audioStartedRef.current}`);
        
        // Playback tick - runs every 16ms (~60fps)
        playbackIntervalRef.current = setInterval(() => {
            const video = videoRef.current;
            const audio = aiAudioRef.current;
            
            if (!video || !isPlayingRef.current || !timelineRef.current) {
                return;
            }
            
            // Check if seek happened - reset playback reference but NOT audioStartedRef
            // (handleSeek already correctly set up audio for the target position)
            if (seekFlagRef.current) {
                playbackStartTimeRef.current = performance.now();
                playbackStartTimelineTimeRef.current = currentTimeRef.current;
                // DON'T reset audioStartedRef - handleSeek already handled audio correctly
                seekFlagRef.current = false;
                console.log(`[Playback] Seek detected, continuing from ${currentTimeRef.current}s`);
            }
            
            const timeline = timelineRef.current;
            const elapsedMs = performance.now() - playbackStartTimeRef.current;
            const elapsedSec = elapsedMs / 1000;
            let newTime = playbackStartTimelineTimeRef.current + elapsedSec;
            
            // Get current clip
            const clip = getActiveClip(timeline, newTime);
            const mode = getPlaybackMode(timeline, newTime);
            
            if (!clip) {
                console.log('[Playback] No clip at time', newTime);
                stopPlayback();
                setIsPlaying(false);
                return;
            }
            
            // Detect clip changes and reload audio
            if (lastClipNameRef.current !== clip.name) {
                lastClipNameRef.current = clip.name;
                // Update activeClip state so background color and other clip properties update
                setActiveClip(clip);
                // Reset audio so it gets reloaded for new clip
                audioStartedRef.current = false;
            }
            
            // Handle clip transitions
            if (newTime >= clip.end) {
                const nextClip = getActiveClip(timeline, clip.end + 0.001);
                
                if (clip.name === 'intro' && nextClip?.name === 'video') {
                    console.log('[Playback] Transition: intro → video');
                    newTime = clip.end;
                    
                    // Start video from beginning
                    video.currentTime = 0;
                    video.play().catch(e => console.error('Video play error:', e));
                    
                    // Load video audio
                    loadAudioForClip('video', 0);
                    audioStartedRef.current = true;
                    lastClipNameRef.current = 'video';
                    setActiveClip(nextClip);
                    
                    // Reset playback reference for new clip
                    playbackStartTimeRef.current = performance.now();
                    playbackStartTimelineTimeRef.current = newTime;
                    
                } else if (clip.name === 'video' && nextClip?.name === 'outro') {
                    console.log('[Playback] Transition: video → outro');
                    newTime = clip.end;
                    
                    // Pause video
                    video.pause();
                    
                    // Load outro audio
                    loadAudioForClip('outro', 0);
                    audioStartedRef.current = true;
                    lastClipNameRef.current = 'outro';
                    setActiveClip(nextClip);
                    
                    // Reset playback reference for new clip
                    playbackStartTimeRef.current = performance.now();
                    playbackStartTimelineTimeRef.current = newTime;
                    
                } else if (clip.name === 'outro' && newTime >= clip.end) {
                    console.log('[Playback] End of outro, stopping');
                    newTime = clip.end;
                    stopPlayback();
                    setIsPlaying(false);
                    if (audio) audio.pause();
                    video.pause();
                    setCurrentTime(newTime);
                    return;
                }
            }
            
            // Clamp time
            const totalDuration = getTimelineDuration(timeline) || 0;
            newTime = Math.min(newTime, totalDuration);
            
            // Update state
            currentTimeRef.current = newTime;
            setCurrentTime(newTime);
            
            // Mode-specific handling
            if (mode === 'video') {
                // Keep video in sync
                const expectedVideoTime = timelineToVideoTime(timeline, newTime);
                
                if (video.paused) {
                    video.currentTime = expectedVideoTime;
                    video.play().catch(e => console.error('Video resume error:', e));
                }
                
                // Start audio if not started
                if (!audioStartedRef.current) {
                    const clipRelativeTime = newTime - clip.start;
                    loadAudioForClip('video', clipRelativeTime);
                    audioStartedRef.current = true;
                }
                
                // Periodic audio sync (every 500ms)
                const now = performance.now();
                if (audio && now - lastAudioSyncRef.current > 500) {
                    const clipRelativeTime = newTime - clip.start;
                    const drift = Math.abs(audio.currentTime - clipRelativeTime);
                    if (drift > 0.3) {
                        console.log(`[Playback] Audio drift ${drift.toFixed(2)}s, syncing`);
                        audio.currentTime = clipRelativeTime;
                    }
                    lastAudioSyncRef.current = now;
                }
            } else {
                // Intro/Outro - ensure video is paused
                if (!video.paused) {
                    video.pause();
                }
                
                // Start audio if not started
                if (!audioStartedRef.current) {
                    const clipRelativeTime = newTime - clip.start;
                    loadAudioForClip(clip.name as 'intro' | 'video' | 'outro', clipRelativeTime);
                    audioStartedRef.current = true;
                }
            }
            
        }, 16); // ~60fps
    }, [loadAudioForClip, stopPlayback]);
    
    // Watch for isPlaying state changes
    useEffect(() => {
        if (isPlaying) {
            startPlayback();
        } else {
            stopPlayback();
            // Also pause media elements
            if (videoRef.current) videoRef.current.pause();
            if (aiAudioRef.current) aiAudioRef.current.pause();
        }
    }, [isPlaying, startPlayback, stopPlayback]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPlayback();
        };
    }, [stopPlayback]);
    
    // Keep currentTimeRef in sync when currentTime changes externally (e.g., seek)
    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    // Video event handlers for metadata and ended events
    useEffect(() => {
        const video = videoRef.current;
        const audio = aiAudioRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            // Use timeline duration if available, otherwise fall back to raw video duration
            if (results?.timeline) {
                const timelineDuration = getTimelineDuration(results.timeline);
                if (timelineDuration && !isNaN(timelineDuration) && isFinite(timelineDuration)) {
                    setDuration(timelineDuration);
                    console.log('[Video] Using timeline duration:', timelineDuration);
                }
            } else {
                const newDuration = video.duration;
                if (newDuration && !isNaN(newDuration) && isFinite(newDuration)) {
                    setDuration(prev => prev || newDuration);
                    console.log('[Video] Using raw video duration:', newDuration);
                }
            }

            // Try to get recording dimensions from backend timeline first
            // Fall back to video element dimensions
            let width = video.videoWidth;
            let height = video.videoHeight;

            // Check if backend provided recording dimensions in timeline media
            if (results?.timeline?.clips) {
                const videoClip = results.timeline.clips.find((c: any) => c.name === 'video');
                if (videoClip?.media?.[0]) {
                    const media = videoClip.media[0];
                    if (media.recordingWidth && media.recordingHeight) {
                        width = media.recordingWidth;
                        height = media.recordingHeight;
                        console.log('[Video] Using backend-provided dimensions:', width, 'x', height);
                    }
                }
            }

            console.log('[Video] Loaded metadata - Width:', width, 'Height:', height);
            setRecordingDimensions({
                recordingWidth: width,
                recordingHeight: height
            });
            // Set aspect ratio to original video dimensions
            console.log('[Video] Setting aspect ratio to 1920:1080 (original)');
            setAspectRatio('1920:1080');
        };

        const handleEnded = () => {
            // When video element ends naturally, the unified RAF loop will handle transition to outro
            // This is a fallback in case RAF loop doesn't catch it
            if (results?.timeline) {
                const videoClip = results.timeline.clips.find((c: any) => c.name === 'video');
                if (videoClip && isPlaying) {
                    console.log('[Video] Video ended event, RAF loop should handle outro transition');
                    // Update timeline time to end of video clip
                    const endTime = videoClip.end;
                    setCurrentTime(endTime);
                    currentTimeRef.current = endTime;
                    // RAF loop will detect this and transition to outro
                    return;
                }
            }
            // Fallback: stop playback if not handled by RAF
            if (!isPlaying) {
                setIsPlaying(false);
                if (audio) audio.pause();
                video.pause();
            }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, [results, isPlaying]);

    // Parse and normalize effects when results are available
    useEffect(() => {
        if (!results) {
            console.log('[Effects] No results yet, skipping effect extraction');
            return;
        }

        // Extract effects and text elements FIRST (don't depend on recordingDimensions for extraction)
        let effectsArray: any[] = [];
        let textElementsArray: any[] = [];

        if (results?.displayElements) {
            // New format: flatten effects from clip-based structure
            // CRITICAL: Include clip boundaries with each effect to prevent bleeding into other clips
            effectsArray = results.displayElements.flatMap((element: any) => {
                const clipStart = element.clipStart;
                const clipEnd = element.clipEnd;
                return (element.effects || []).map((effect: any) => ({
                    ...effect,
                    clipStart,
                    clipEnd
                }));
            });
            console.log('[Effects] Extracted from displayElements:', effectsArray.length, 'effects with clip boundaries');

            // Extract text elements from displayElements
            // CRITICAL: Include clip boundaries so TextOverlayLayer can calculate absolute times
            textElementsArray = results.displayElements.flatMap((element: any) => {
                const clipStart = element.clipStart;
                const clipEnd = element.clipEnd;
                return (element.elements || []).map((el: any) => ({
                    ...el,
                    clipStart,
                    clipEnd
                }));
            });
            console.log('[TextElements] Extracted from displayElements:', textElementsArray.length, 'text elements with clip boundaries');
        } else if (results?.displayEffects) {
            // Legacy format: use displayEffects directly
            effectsArray = results.displayEffects;
            console.log('[Effects] Using legacy displayEffects:', effectsArray.length, 'effects');
        }

        // Store text elements in state ALWAYS (don't wait for recordingDimensions)
        setTextElements(textElementsArray);

        // Only normalize effects if we have recordingDimensions
        if (!recordingDimensions) {
            console.log('[Effects] No recording dimensions yet, text elements stored but effects not normalized');
            return;
        }

        if (effectsArray.length === 0) {
            console.log('[Effects] No effects to normalize');
            return;
        }

        // Filter effects that have bounds and are zoom-type effects
        // Accept effects with either: style.zoom.enabled OR type === 'zoom'
        const filtered = effectsArray
            .filter((effect: any) => {
                const hasBounds = !!effect.target?.bounds;
                const hasZoomEnabled = !!effect.style?.zoom?.enabled;
                const isZoomType = effect.type === 'zoom';
                // Include effect if it has bounds AND (is zoom type OR has zoom enabled)
                return hasBounds && (isZoomType || hasZoomEnabled);
            });
        
        console.log('[Effects] Filtering results:', {
            totalEffects: effectsArray.length,
            withBoundsAndZoom: filtered.length,
            sampleEffects: effectsArray.slice(0, 3).map((e: any) => ({
                start: e.start,
                end: e.end,
                type: e.type,
                hasZoomEnabled: !!e.style?.zoom?.enabled,
                hasBounds: !!e.target?.bounds
            }))
        });

        const normalized = filtered.map((effect: any) => {
            // Use backend-computed scale if available, otherwise calculate locally
            const precomputedScale = effect.scale && effect.scale > 0 ? effect.scale : undefined;
            const normalizedBounds = normalizeCoordinates(
                effect.target.bounds,
                recordingDimensions.recordingWidth,
                recordingDimensions.recordingHeight,
                recordingDimensions.recordingWidth,
                recordingDimensions.recordingHeight,
                precomputedScale
            );
            return { ...effect, normalizedBounds };
        });

        setNormalizedEffects(normalized);
    }, [results, recordingDimensions]);

    // NOTE: Manual playback loop removed - now using unified RAF playback loop above

    // If backend provides recording dimensions, use them before metadata loads
    useEffect(() => {
        if (recordingDimensions) return;
        const width = (results as any)?.recordingWidth;
        const height = (results as any)?.recordingHeight;
        if (width && height) {
            setRecordingDimensions({ recordingWidth: width, recordingHeight: height });
            setAspectRatio('1920:1080');
            console.log('[Recording] Using backend dimensions', width, height);
        }
    }, [results, recordingDimensions]);

    // Function to apply effects at a specific time (used for both playback and seeking while paused)
    const applyEffectsAtTime = useCallback((time: number) => {
        const videoLayer = videoLayerRef.current;
        if (!videoLayer) return;

        // Get base scale from media data (default 85 → 0.85)
        const mediaScale = activeClip?.media?.[0]?.scale ?? 85;
        const baseScale = mediaScale / 100;

        // If no effects, just apply base scale
        if (normalizedEffects.length === 0) {
            videoLayer.style.transition = 'transform 0.15s ease-out';
            videoLayer.style.transform = `scale3d(${baseScale}, ${baseScale}, 1) translate3d(0%, 0%, 0)`;
            return;
        }

        const activeEffects = getActiveEffects(normalizedEffects, time);

        if (activeEffects.length > 0) {
            const effect = resolveZoomEffect(activeEffects);

            if (effect) {
                const { anchorX, anchorY, autoScale } = effect.normalizedBounds;
                const targetScale = autoScale || effect.style?.zoom?.scale || 1;

                // For seek/pause, show effects at full strength (progress = 1)
                const { scale, translateX, translateY } = calculateZoomTransform(
                    1, anchorX, anchorY, targetScale as number
                );

                const finalScale = baseScale * scale;
                videoLayer.style.transition = 'transform 0.15s ease-out';
                videoLayer.style.transform = `scale3d(${finalScale}, ${finalScale}, 1) translate3d(${translateX}%, ${translateY}%, 0)`;
            }
        } else {
            // No active effects - reset to base scale
            videoLayer.style.transition = 'transform 0.15s ease-out';
            videoLayer.style.transform = `scale3d(${baseScale}, ${baseScale}, 1) translate3d(0%, 0%, 0)`;
        }
    }, [normalizedEffects, activeClip]);

    // Rendering loop for CSS effects - OPTIMIZED
    // Now runs based on isPlaying state, not video element events (for intro/outro support)
    useEffect(() => {
        const video = videoRef.current;
        const videoLayer = videoLayerRef.current;

        if (!video || !videoLayer) return;

        // Get base scale from media data (default 85 → 0.85)
        const mediaScale = activeClip?.media?.[0]?.scale ?? 85;
        const baseScale = mediaScale / 100;

        // If no effects, just apply base scale and handle play state
        if (normalizedEffects.length === 0) {
            // Apply base scale
            videoLayer.style.transition = 'transform 0.15s ease-out';
            videoLayer.style.transform = `scale3d(${baseScale}, ${baseScale}, 1) translate3d(0%, 0%, 0)`;
            return;
        }

        // Enable GPU acceleration
        videoLayer.style.willChange = 'transform';

        // Track current effect to minimize recalculations
        let currentEffectId: string | null = null;
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 16; // ~60fps, but throttled

        const renderFrame = () => {
            // Use timeline time from ref (works for all modes: intro, video, outro)
            const time = currentTimeRef.current;
            const now = performance.now();

            // Throttle updates to reduce CPU load
            if (now - lastUpdateTime < UPDATE_INTERVAL) {
                if (isPlayingRef.current) {
                    rafRef.current = requestAnimationFrame(renderFrame);
                }
                return;
            }
            
            lastUpdateTime = now;

            const activeEffects = getActiveEffects(normalizedEffects, time);

            // Get base scale from media data (default 85 → 0.85)
            const mediaScale = activeClip?.media?.[0]?.scale ?? 85;
            const baseScale = mediaScale / 100;

            if (activeEffects.length > 0) {
                const effect = resolveZoomEffect(activeEffects);

                if (effect) {
                    const effectId = `${effect.start}-${effect.end}`;

                    // CRITICAL: Use anchorX/anchorY (normalized 0-1 range) for camera-zoom
                    const { anchorX, anchorY, autoScale } = effect.normalizedBounds;
                    const targetScale = autoScale || effect.style?.zoom?.scale || 1;

                    // Check if there's a continuation effect at the same position
                    const hasContinuation = hasEffectContinuation(effect, normalizedEffects, 0.5);

                    const effectProgress = computeEffectProgressWithContinuation(
                        time, effect.start, effect.end, 0.20, 0.40, hasContinuation
                    );
                    const { scale, translateX, translateY } = calculateZoomTransform(
                        effectProgress, anchorX, anchorY, targetScale as number
                    );

                    // Apply scale with base from media data (default 85% → 0.85)
                    const finalScale = baseScale * scale;

                    // Use transform3d for GPU acceleration
                    videoLayer.style.transform = `scale3d(${finalScale}, ${finalScale}, 1) translate3d(${translateX}%, ${translateY}%, 0)`;

                    // Add smooth transition when effect changes
                    if (currentEffectId !== effectId) {
                        videoLayer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
                        currentEffectId = effectId;
                    } else {
                        // Remove transition during active animation for smooth frame-by-frame updates
                        videoLayer.style.transition = 'none';
                    }
                }
            } else {
                // Reset to neutral state with smooth transition
                videoLayer.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
                videoLayer.style.transform = `scale3d(${baseScale}, ${baseScale}, 1) translate3d(0%, 0%, 0)`;
                currentEffectId = null;
            }

            // Continue loop while playing
            if (isPlayingRef.current) {
                rafRef.current = requestAnimationFrame(renderFrame);
            }
        };

        // Start/stop based on isPlaying state
        if (isPlaying) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            lastUpdateTime = 0;
            rafRef.current = requestAnimationFrame(renderFrame);
        } else {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            // Apply effects at current position when paused (for initial load and seeking)
            applyEffectsAtTime(currentTimeRef.current);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            // Clean up GPU hint
            if (videoLayer) videoLayer.style.willChange = 'auto';
        };
    }, [normalizedEffects, results?.timeline, activeClip, isPlaying, applyEffectsAtTime]);

    // ============== HANDLERS ==============

    const handlePlayPause = useCallback(() => {
        // Disable controls during speech generation
        if (generatingSpeech) return;

        const video = videoRef.current;
        const audio = aiAudioRef.current;

        if (!video) return;

        if (isPlaying) {
            // Pause playback
            video.pause();
            if (audio) audio.pause();
            setIsPlaying(false);
        } else {
            // Start/resume playback
            if (results?.timeline) {
                const clip = getActiveClip(results.timeline, currentTime);
                const mode = getPlaybackMode(results.timeline, currentTime);

                if (!clip) return;

                // Update active clip state
                setActiveClip(clip);
                lastClipNameRef.current = clip.name; // Track current clip
                
                const clipRelativeTime = Math.max(0, currentTime - clip.start);
                const clipName = clip.name as 'intro' | 'video' | 'outro';
                
                // For video mode, prepare video element
                if (mode === 'video') {
                    const videoTime = timelineToVideoTime(results.timeline, currentTime);
                    video.currentTime = videoTime;
                    video.play().catch(e => console.error('Video play error:', e));
                }
                
                // Start audio immediately for the current clip
                const audioUrl = clipAudioUrls[clipName];
                if (audioUrl && audio) {
                    // Check if we need to change source
                    const currentSrc = audio.src || '';
                    const urlFilename = audioUrl.split('?')[0].split('/').pop() || '';
                    const needsSourceChange = urlFilename && !currentSrc.includes(urlFilename);
                    
                    if (needsSourceChange) {
                        console.log(`[Play] Loading audio for ${clipName}:`, audioUrl);
                        audio.src = audioUrl;
                    }
                    audio.currentTime = clipRelativeTime;
                    audio.play().catch(err => console.error(`[${clipName}] Audio play error:`, err));
                }
                
                // Mark audio as started so playback loop doesn't restart it
                audioStartedRef.current = true;
                
                // Set playing state - this triggers the stable playback loop
                setIsPlaying(true);
                
                console.log(`[Playback] Starting at timeline ${currentTime}s, mode: ${mode}, clip: ${clip?.name}, clipTime: ${clipRelativeTime}s`);
            } else {
                // Fallback for non-timeline videos
                video.play()
                    .then(() => {
                        setIsPlaying(true);
                        if (audio) {
                            audio.currentTime = video.currentTime;
                            audio.play().catch(err => console.error('Audio play error:', err));
                        }
                    })
                    .catch(err => console.error('Video play error:', err));
            }
        }
    }, [isPlaying, generatingSpeech, results, currentTime, clipAudioUrls]);

    const handleSeek = useCallback((timelineTime: number) => {
        // Disable seek during speech generation
        if (generatingSpeech) return;

        const video = videoRef.current;
        const audio = aiAudioRef.current;

        if (!video) return;

        // Clamp to valid range
        const totalDuration = results?.timeline ? getTimelineDuration(results.timeline) : duration;
        const clampedTime = Math.max(0, Math.min(timelineTime, totalDuration || timelineTime));
        
        // Update timeline time and ref immediately
        setCurrentTime(clampedTime);
        currentTimeRef.current = clampedTime;
        
        // Signal to the playback loop that a seek happened
        seekFlagRef.current = true;
        
        // For any seek while playing, pause and let user resume manually
        if (isPlaying) {
            console.log(`[Seek] Seek detected while playing (${currentTime}s → ${clampedTime}s), pausing playback`);
            video.pause();
            if (audio) audio.pause();
            setIsPlaying(false);
            // Update lastClipNameRef so next play knows to load audio
            lastClipNameRef.current = null;
            audioStartedRef.current = false;
            
            // Still update video position for preview
            if (results?.timeline) {
                const mode = getPlaybackMode(results.timeline, clampedTime);
                const clip = getActiveClip(results.timeline, clampedTime);
                if (clip) {
                    setActiveClip(clip);
                    if (mode === 'video') {
                        const videoTime = timelineToVideoTime(results.timeline, clampedTime);
                        video.currentTime = videoTime;
                    }
                }
            }
            // Apply effects at the new time position
            applyEffectsAtTime(clampedTime);
            return;
        }

        if (results?.timeline) {
            const mode = getPlaybackMode(results.timeline, clampedTime);
            const clip = getActiveClip(results.timeline, clampedTime);

            if (!clip) return;

            const clipRelativeTime = Math.max(0, clampedTime - clip.start);

            // Update active clip and track it
            setActiveClip(clip);
            lastClipNameRef.current = clip.name;

            const clipName = clip.name as 'intro' | 'video' | 'outro';
            const audioUrl = clipAudioUrls[clipName];
            
            if (mode === 'intro' || mode === 'outro') {
                // For intro/outro: ensure video is paused
                video.pause();
                
                // Load and sync audio for this clip
                if (audio && audioUrl) {
                    const currentSrc = audio.src || '';
                    const urlFilename = audioUrl.split('?')[0].split('/').pop() || '';
                    const needsSourceChange = urlFilename && !currentSrc.includes(urlFilename);
                    
                    if (needsSourceChange) {
                        console.log(`[Seek] Loading audio for ${clipName}:`, audioUrl);
                        audio.src = audioUrl;
                    }
                    audio.currentTime = clipRelativeTime;
                    
                    // If playing, start audio playback
                    if (isPlaying) {
                        audio.play().catch(err => console.error(`[${clipName}] Audio play error:`, err));
                        audioStartedRef.current = true;
                    }
                }
                
                console.log(`[Seek] ${mode} at timeline ${clampedTime}s, clip time ${clipRelativeTime}s`);
            } else if (mode === 'video') {
                // For video clip: sync video element
                const videoTime = timelineToVideoTime(results.timeline, clampedTime);
                video.currentTime = videoTime;
                
                // Load and sync audio for video clip
                if (audio && audioUrl) {
                    const currentSrc = audio.src || '';
                    const urlFilename = audioUrl.split('?')[0].split('/').pop() || '';
                    const needsSourceChange = urlFilename && !currentSrc.includes(urlFilename);
                    
                    if (needsSourceChange) {
                        console.log(`[Seek] Loading audio for ${clipName}:`, audioUrl);
                        audio.src = audioUrl;
                    }
                    audio.currentTime = clipRelativeTime;
                    
                    // If playing, start video and audio playback
                    if (isPlaying) {
                        video.play().catch(e => console.error('Video play error:', e));
                        audio.play().catch(err => console.error(`[${clipName}] Audio play error:`, err));
                        audioStartedRef.current = true;
                    }
                }

                console.log(`[Seek] video at timeline ${clampedTime}s, video time ${videoTime}s, clip time ${clipRelativeTime}s`);
            }
            
            // Apply effects at the new time position (important for seeking while paused)
            applyEffectsAtTime(clampedTime);
        } else {
            // Fallback for non-timeline videos
            video.currentTime = clampedTime;
            if (audio) audio.currentTime = clampedTime;
        }
    }, [generatingSpeech, results, isPlaying, clipAudioUrls, duration, currentTime, applyEffectsAtTime]);

    const handleVolumeChange = useCallback((newVolume: number) => {
        const video = videoRef.current;
        const audio = audioRef.current;

        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        if (video) video.volume = newVolume;
        if (audio) audio.volume = newVolume;
    }, []);

    const handleToggleMute = useCallback(() => {
        const video = videoRef.current;
        const audio = audioRef.current;

        const newMuted = !isMuted;
        setIsMuted(newMuted);
        if (video) video.muted = newMuted;
        if (audio) audio.muted = newMuted;
    }, [isMuted]);

    const handleGenerateSpeech = async () => {
        if (!sessionId) return;

        // Pause playback and stop audio (don't reset position)
        const video = videoRef.current;
        const audio = audioRef.current;
        const aiAudio = aiAudioRef.current;

        if (video) video.pause();
        if (audio) audio.pause();
        if (aiAudio) aiAudio.pause();
        setIsPlaying(false);

        setGeneratingSpeech(true);
        setError(null);

        try {
            await generateSpeech(sessionId);

            // Generate a new cache buster for the newly generated audio
            const newCacheBust = Date.now();
            setCacheBustVersion(newCacheBust);

            // Refetch session data to get updated generatedAudioUrl fields (with cache-busting)
            // Use CDN_BASE for the recordings path, not API_BASE
            const sessionResponse = await fetch(`${CDN_BASE}/recordings/${sessionId}/session/instructions.json?v=${newCacheBust}`);
            const sessionData = await sessionResponse.json();

            // Update results with new clip narrations
            setResults((prev: any) => ({
                ...prev,
                narrations: sessionData.narrations
            }));

            // Load clip audio URLs from updated session data with cache-busting
            const clipNarrations = sessionData.narrations;
            if (clipNarrations && Array.isArray(clipNarrations)) {
                const urls: Record<string, string | null> = {};
                for (const clip of clipNarrations) {
                    urls[clip.clipName] = formatCdnUrl(clip.generatedAudioUrl, newCacheBust);
                }

                setClipAudioUrls(urls);

                // Force audio reload by clearing current audio
                setCurrentClipAudio(null);

                // Update hasSpeechGenerated state
                setHasSpeechGenerated(true);

                console.log('[Audio] Updated clip audio URLs after speech generation (CDN with cache bust):', urls);
            }

            // CRITICAL: Reset timeline to start (intro clip at time 0) to play from beginning
            // Don't reset video.currentTime because intro clip doesn't use raw video
            // Video will be positioned correctly when transitioning to video clip
            setCurrentTime(0);

            // Use the timeline from results to get the intro clip
            if (results?.timeline) {
                const introClipData = getActiveClip(results.timeline, 0);
                if (introClipData) {
                    setActiveClip(introClipData);
                    console.log('[Audio] Reset to intro clip at timeline 0 after speech generation');
                }
            }

            // Reset AI audio position
            if (aiAudioRef.current) {
                aiAudioRef.current.currentTime = 0;
            }
        } catch (err: any) {
            console.error('Speech generation error:', err);
            setError('Speech generation failed: ' + err.message);
        } finally {
            setGeneratingSpeech(false);
        }
    };

    // Handle AI Rewrite button click
    const handleRewriteScript = async () => {
        if (!sessionId) return;

        // Pause playback
        const video = videoRef.current;
        const audio = audioRef.current;
        if (video) video.pause();
        if (audio) audio.pause();
        setIsPlaying(false);

        setRewritingScript(true);
        setError(null);

        try {
            console.log('[AI Rewrite] Starting rewrite for session:', sessionId);

            // Call the rewrite API
            const result = await rewriteScript(sessionId);

            console.log('[AI Rewrite] Received result:', result);

            // Update the narrations in results state with animation
            if (result.narrations) {
                setResults((prev: any) => ({
                    ...prev,
                    narrations: result.narrations
                }));

                // Clear speech generated flag since script changed
                setHasSpeechGenerated(false);

                console.log('[AI Rewrite] Updated narrations in state');
            }
        } catch (err: any) {
            console.error('[AI Rewrite] Error:', err);
            setError('AI Rewrite failed: ' + err.message);
        } finally {
            setRewritingScript(false);
        }
    };

    const handleSyncPointClick = (timestamp: number) => {
        handleSeek(timestamp);
    };

    const handleSidebarItemClick = (item: SidebarMenuItem) => {
        setActiveSidebarItem(activeSidebarItem === item ? null : item);
    };

    const handleExport = async () => {
        if (!sessionId || !results || !recordingDimensions) {
            setError('Cannot export: missing session data');
            return;
        }

        setExporting(true);
        setError(null);

        try {
            // Import instruction generator
            const { generateZoomInstructions } = await import('../../utils/instructionGenerator');

            // Extract effects from displayElements or fall back to legacy displayEffects
            let effectsArray: any[] = [];

            if (results.displayElements) {
                // New format: flatten effects from clip-based structure
                effectsArray = results.displayElements.flatMap((element: any) => element.effects || []);
                console.log('[Export] Extracted from displayElements:', effectsArray.length, 'effects');
            } else if (results.displayEffects) {
                // Legacy format: use displayEffects directly
                effectsArray = results.displayEffects;
                console.log('[Export] Using legacy displayEffects:', effectsArray.length, 'effects');
            }

            // Generate instructions from effects
            const instructions = generateZoomInstructions(
                effectsArray,
                {
                    width: recordingDimensions.recordingWidth,
                    height: recordingDimensions.recordingHeight
                }
            );

            console.log('[Export] Exporting with', instructions.length, 'effects');
            console.log('[Export] Background:', backgroundColor, 'Aspect Ratio:', aspectRatio);

            // Prepare Intro/Outro for export
            let introConfig = null;
            let outroConfig = null;

            if (results.timeline?.clips) {
                // Find clips
                const introClip = results.timeline.clips.find((c: any) => c.name === 'intro');
                const outroClip = results.timeline.clips.find((c: any) => c.name === 'outro');

                // Find texts (prioritize explicit intro/outro fields)
                const introNarration = results.narrations?.find((n: any) => n.clipName === 'intro');
                const outroNarration = results.narrations?.find((n: any) => n.clipName === 'outro');

                if (introClip && (results.intro || introNarration)) {
                    introConfig = {
                        text: results.intro || introNarration?.text || '',
                        backgroundColor: introClip.backgroundColor || backgroundColor,
                        durationMs: (introClip.end - introClip.start) * 1000,
                        hasBorder: true,
                        borderColor: '#FFFFFF'
                    };
                }

                if (outroClip && (results.outro || outroNarration)) {
                    outroConfig = {
                        text: results.outro || outroNarration?.text || '',
                        backgroundColor: outroClip.backgroundColor || backgroundColor,
                        durationMs: (outroClip.end - outroClip.start) * 1000,
                        hasBorder: true,
                        borderColor: '#FFFFFF'
                    };
                }
            }

            // Call export API with background color and aspect ratio
            const response = await exportVideo(sessionId, instructions, recordingDimensions, {
                backgroundColor,
                aspectRatio: aspectRatio as AspectRatio,
                intro: introConfig,
                outro: outroConfig
            });

            console.log('[Export] Success:', response);

            const videoUrl = response.data?.renderedVideoUrl || response.videoUrl;
            const finalSessionId = response.data?.sessionId || sessionId;

            if (videoUrl) {
                // Automatically download the video
                const link = document.createElement('a');
                link.href = videoUrl;
                link.download = `explaino_video_${finalSessionId}.mp4`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                console.log('[Export] Download triggered for:', videoUrl);
            } else {
                console.error('[Export] No video URL found in response:', response);
                setError('Export succeeded but no video URL was returned');
            }
        } catch (err: any) {
            console.error('[Export] Error:', err);
            setError('Export failed: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    // ============== LOADING STATE ==============
    if (preparing || isMerging) {
        return (
            <div className="h-screen bg-[#1e1e2e] flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <h1 className="text-white text-xl font-medium">
                    {isMerging ? 'Restoring your changes...' : 'Preparing your video...'}
                </h1>
                {isMerging && changeStack.length > 0 && (
                    <p className="text-gray-400 text-sm">
                        Applying {changeStack.length} unsaved change{changeStack.length !== 1 ? 's' : ''}
                    </p>
                )}
                {!isMerging && progress && (
                    <p className="text-gray-400 text-sm">{progress.message}</p>
                )}
            </div>
        );
    }

    // ============== NO SESSION ==============
    if (!sessionId) {
        return (
            <div className="h-screen bg-[#1e1e2e] flex flex-col items-center justify-center">
                <h1 className="text-white text-2xl font-bold mb-4">No Session ID</h1>
                <p className="text-gray-400">Please record a video first using the extension.</p>
            </div>
        );
    }

    // ============== MAIN RENDER ==============
    return (
        <div className="h-screen bg-[#1e1e2e] flex flex-col overflow-hidden">
            {/* Top Navigation */}
            <HeaderSection
                projectTitle="Video Project"
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onExport={handleExport}
                onSave={async () => {
                    try {
                        await saveChanges();
                        console.log('[Save] Changes saved successfully');
                    } catch (err: any) {
                        console.error('[Save] Failed:', err);
                        alert('Failed to save changes: ' + err.message);
                    }
                }}
                isExporting={exporting}
                canExport={!!results && !!recordingDimensions}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
                lastSavedAt={lastSavedAt}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <SideNavigationSection
                    activeItem={activeSidebarItem}
                    onItemClick={handleSidebarItemClick}
                />

                {/* Media Bar Section (shown when video is selected) */}
                {isVideoSelected && !isTextSelected && (
                    <MediaBarSection
                        isOpen={isVideoSelected}
                        onClose={() => {
                            setIsVideoSelected(false);
                            // Reopen script/transcription panel when video is deselected
                            setActiveSidebarItem('script');
                        }}
                        scale={activeClip?.media?.[0]?.scale ?? 85}
                        onScaleChange={handleMediaScaleChange}
                        onFitToScreen={handleFitToScreen}
                    />
                )}

                {/* Text Edit Panel (shown when text is selected - overrides other panels) */}
                {isTextSelected && !isVideoSelected && (
                    <TextEditPanel
                        isOpen={isTextEditPanelOpen && isTextSelected}
                        onClose={handleTextDeselect}
                        element={selectedTextElement?.element || null}
                        clipName={selectedTextElement?.clipName || ''}
                        elementIndex={selectedTextElement?.elementIndex || 0}
                        clipStart={(() => {
                            if (!selectedTextElement?.clipName || !results?.displayElements) return 0;
                            const clip = results.displayElements.find((c: any) => c.clipName === selectedTextElement.clipName);
                            return clip?.clipStart || 0;
                        })()}
                        clipEnd={(() => {
                            if (!selectedTextElement?.clipName || !results?.displayElements) return duration;
                            const clip = results.displayElements.find((c: any) => c.clipName === selectedTextElement.clipName);
                            return clip?.clipEnd || duration;
                        })()}
                        onUpdate={handleTextElementUpdate}
                        onDelete={() => {
                            if (selectedTextElement) {
                                handleTextElementDelete(selectedTextElement.clipName, selectedTextElement.elementIndex);
                                handleTextDeselect();
                            }
                        }}
                    />
                )}

                {/* Zoom Edit Panel (shown when zoom effect is selected) */}
                {isZoomSelected && !isVideoSelected && !isTextSelected && selectedZoomEffect && (
                    <ZoomEditPanel
                        isOpen={isZoomEditPanelOpen && isZoomSelected}
                        onClose={handleZoomDeselect}
                        effect={selectedZoomEffect.effect}
                        clipName={selectedZoomEffect.clipName}
                        effectIndex={selectedZoomEffect.effectIndex}
                        clipStart={(() => {
                            if (!selectedZoomEffect?.clipName || !results?.displayElements) return 0;
                            const clip = results.displayElements.find((c: any) => c.clipName === selectedZoomEffect.clipName);
                            return clip?.clipStart || 0;
                        })()}
                        clipEnd={(() => {
                            if (!selectedZoomEffect?.clipName || !results?.displayElements) return duration;
                            const clip = results.displayElements.find((c: any) => c.clipName === selectedZoomEffect.clipName);
                            return clip?.clipEnd || duration;
                        })()}
                        recordingWidth={1920}
                        recordingHeight={1080}
                        onUpdate={handleZoomEffectUpdate}
                        onPreview={handleZoomEffectPreview}
                        onDelete={() => {
                            handleZoomEffectDelete();
                            handleZoomDeselect();
                        }}
                    />
                )}

                {/* Transcription Panel (shown when nothing is selected and sidebar is 'script') */}
                {showTranscriptionPanel && !isVideoSelected && !isTextSelected && (
                    <TranscriptionSection
                        narrations={narrations}
                        isVisible={showTranscriptionPanel && !isVideoSelected && !isTextSelected}
                        onClose={() => setActiveSidebarItem(null)}
                        onSyncPointClick={handleSyncPointClick}
                        onGenerateScript={handleGenerateSpeech}
                        onRewriteScript={handleRewriteScript}
                        isGenerating={generatingSpeech}
                        isRewriting={rewritingScript}
                        hasProcessedAudio={hasSpeechGenerated}
                        currentTimeRef={currentTimeRef}
                        isPlaying={isPlaying}
                        intro={results?.intro || undefined}
                        outro={results?.outro || undefined}
                    />
                )}

                {/* Music Panel (conditionally shown - hidden when video/text selected) */}
                {showMusicPanel && !isVideoSelected && !isTextSelected && (
                    <MusicSection
                        isVisible={showMusicPanel && !isVideoSelected && !isTextSelected}
                        onClose={() => setActiveSidebarItem(null)}
                        onMusicSelect={(url, filename) => {
                            console.log('[Music] Selected:', filename, url);
                            // TODO: Integrate with video export or timeline
                        }}
                    />
                )}

                {/* Main Canvas */}
                <MainCanvasSection
                    aspectRatio={aspectRatio}
                    backgroundColor={currentBackgroundColor}
                    onAspectRatioChange={handleAspectRatioChange}
                    onBackgroundColorChange={(color: string) => {
                        // Update the background color of the current active clip
                        if (activeClip && results?.timeline?.clips) {
                            const oldColor = activeClip.backgroundColor || backgroundColor;

                            const updatedClips = results.timeline.clips.map((clip: any) => {
                                if (clip.name === activeClip.name) {
                                    return { ...clip, backgroundColor: color };
                                }
                                return clip;
                            });

                            const updatedResults = {
                                ...results,
                                timeline: {
                                    ...results.timeline,
                                    clips: updatedClips
                                }
                            };

                            setResults(updatedResults);

                            // Track change
                            trackChange({
                                type: 'backgroundColor',
                                clipName: activeClip.name,
                                path: getJSONPath('backgroundColor', activeClip.name),
                                oldValue: oldColor,
                                newValue: color
                            });

                            // Update the active clip with the new backgroundColor immediately
                            setActiveClip({
                                ...activeClip,
                                backgroundColor: color
                            });
                        } else {
                            // Fallback to global background color if no active clip
                            setBackgroundColor(color);
                        }
                    }}
                    videoWidth={recordingDimensions?.recordingWidth}
                    videoHeight={recordingDimensions?.recordingHeight}
                    isGeneratingSpeech={generatingSpeech}
                    isVideoSelected={isVideoSelected}
                    isTextSelected={isTextSelected}
                    selectedTextElement={selectedTextElement}
                    onTextFontFamilyChange={(fontFamily) => handleTextElementUpdate({ style: { fontFamily } })}
                    onTextFontSizeChange={(fontSize) => handleTextElementUpdate({ style: { fontSize } })}
                    onTextFontWeightChange={(fontWeight) => handleTextElementUpdate({ style: { fontWeight } })}
                    onTextBoldToggle={() => {
                        if (selectedTextElement) {
                            const currentWeight = selectedTextElement.element?.style?.fontWeight || 'Regular';
                            const isBold = ['Bold', 'SemiBold', 'ExtraBold', 'Black'].includes(currentWeight);
                            handleTextElementUpdate({ style: { fontWeight: isBold ? 'Regular' : 'Bold' } });
                        }
                    }}
                    onTextItalicToggle={() => {
                        if (selectedTextElement) {
                            const isItalic = selectedTextElement.element?.style?.fontStyle === 'italic';
                            handleTextElementUpdate({ style: { fontStyle: isItalic ? 'normal' : 'italic' } });
                        }
                    }}
                    onTextUnderlineToggle={() => {
                        if (selectedTextElement) {
                            const isUnderline = selectedTextElement.element?.style?.textDecoration === 'underline';
                            handleTextElementUpdate({ style: { textDecoration: isUnderline ? 'none' : 'underline' } });
                        }
                    }}
                    onTextAlignChange={(textAlign) => handleTextElementUpdate({ style: { textAlign } })}
                    onTextColorChange={(color) => handleTextElementUpdate({ style: { color } })}
                    onTextDelete={() => {
                        if (selectedTextElement) {
                            handleTextElementDelete(selectedTextElement.clipName, selectedTextElement.elementIndex);
                            handleTextDeselect();
                        }
                    }}
                    timeline={results?.timeline?.clips || []}
                    displayElements={results?.displayElements || results?.displayEffects}
                    narrations={narrations}
                    intro={results?.intro}
                    outro={results?.outro}
                    videoDuration={duration}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onSeek={handleSeek}
                    activeClip={activeClip}
                    onBorderRadiusChange={handleBorderRadiusChange}
                    onTextElementResize={handleTextElementResize}
                    onTextElementDelete={handleTextElementDelete}
                    onTextBlockClick={handleTextSelect}
                    onZoomSelect={handleZoomSelect}
                    isZoomSelected={isZoomSelected}
                    selectedZoomEffect={selectedZoomEffect}
                    onZoomResize={handleZoomResize}
                    onZoomDelete={(clipName, effectIndex) => {
                        // Select the zoom effect first, then delete it
                        const clip = results?.displayElements?.find((c: any) => c.clipName === clipName);
                        const effect = clip?.effects?.[effectIndex];
                        if (effect) {
                            setSelectedZoomEffect({ clipName, effectIndex, effect });
                            handleZoomEffectDelete();
                        }
                    }}
                    onClipResize={handleClipResize}
                    controls={
                        <VideoControls
                            audioUrl={audioUrl}
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            duration={duration}
                            volume={volume}
                            isMuted={isMuted}
                            onPlayPause={handlePlayPause}
                            onSeek={handleSeek}
                            onVolumeChange={handleVolumeChange}
                            onToggleMute={handleToggleMute}
                            audioRef={audioRef}
                            aiAudioRef={aiAudioRef}
                            disabled={generatingSpeech}
                        />
                    }
                >
                    <VideoLayer
                        videoUrl={videoUrl}
                        videoRef={videoRef}
                        videoLayerRef={videoLayerRef}
                        isVideoVisible={videoVisible}
                        textElements={textElements}
                        currentTime={currentTime}
                        recordingWidth={recordingDimensions?.recordingWidth}
                        recordingHeight={recordingDimensions?.recordingHeight}
                        hasMedia={currentClipHasMedia}
                        borderRadius={activeClip?.media?.[0]?.borderRadius ?? 3}
                        isVideoSelected={isVideoSelected}
                        currentScale={activeClip?.media?.[0]?.scale ?? 85}
                        onScaleChange={handleMediaScaleChange}
                        onVideoClick={() => {
                            if (currentClipHasMedia) {
                                setIsVideoSelected(true);
                                handleTextDeselect(); // Deselect text when video is clicked
                            }
                        }}
                        selectedTextElement={selectedTextElement}
                        onTextSelect={handleTextSelect}
                        onTextDeselect={handleTextDeselect}
                        onTextMove={handleTextMove}
                        onTextResize={handleTextResize}
                        onTextContentChange={handleTextContentChange}
                        displayElements={results?.displayElements || results?.displayEffects}
                    />
                </MainCanvasSection>
            </div>

            {/* Error Display */}
            {error && (
                <div className="absolute bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-2 text-white/80 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProjectScreen;