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
    videoTimeToTimelineTime,
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
    
    // Helper to convert S3 paths to CDN URLs
    const formatCdnUrl = (url: string | null | undefined): string | null => {
        if (!url) return null;
        
        // If already a full URL, return as-is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // Remove leading slash if present
        const path = url.startsWith('/') ? url.slice(1) : url;
        
        // Return CDN URL
        return `${CDN_BASE}/${path}`;
    };
    
    // ============== UI STATE ==============
    const [activeTab, setActiveTab] = useState<'video' | 'article'>('video');
    const [activeSidebarItem, setActiveSidebarItem] = useState<SidebarMenuItem | null>('script');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [backgroundColor, setBackgroundColor] = useState('#1a1625');

    // ============== VIDEO STATE ==============
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    
    // ============== CLIP-BASED AUDIO ==============
    const [clipAudioUrls, setClipAudioUrls] = useState<{
        intro: string | null;
        video: string | null;
        outro: string | null;
    }>({ intro: null, video: null, outro: null });
    const [currentClipAudio, setCurrentClipAudio] = useState<string | null>(null);
    const [hasSpeechGenerated, setHasSpeechGenerated] = useState(false);
    
    // Reset audio state when sessionId changes (new session)
    useEffect(() => {
        setHasSpeechGenerated(false);
        setClipAudioUrls({ intro: null, video: null, outro: null });
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
    
    // Check if current active clip has media (video/image)
    const currentClipHasMedia = activeClip?.media && activeClip.media.length > 0;
    
    // Compute video visibility based on current clip
    const videoVisible = results?.timeline ? isVideoVisible(results.timeline, currentTime) : true;

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
        setActiveSidebarItem('elements'); // Switch to Elements sidebar
    }, []);

    const handleTextDeselect = useCallback(() => {
        console.log('[handleTextDeselect] Deselecting text element');
        setSelectedTextElement(null);
        setIsTextSelected(false);
        setIsTextEditPanelOpen(false);
    }, []);

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
        const oldElement = { ...element };

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

        // Merge updates into element
        const updatedElement = {
            ...element,
            ...updates,
            ...dimensionUpdate,
            style: {
                ...element.style,
                ...(updates.style || {})
            }
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
            type: 'textElementStyle',
            clipName: clipName,
            path: `displayElements.${clipIndex}.elements.${elementIndex}`,
            oldValue: oldElement,
            newValue: updatedElement
        });

        console.log('[handleTextElementUpdate] Updated element:', updatedElement);
    }, [selectedTextElement, results, setResults, setTextElements, trackChange]);

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
    
    // Update current clip audio when active clip changes
    useEffect(() => {
        if (!activeClip) return;
        
        const clipName = activeClip.name as 'intro' | 'video' | 'outro';
        const audioUrl = clipAudioUrls[clipName];
        
        const audio = aiAudioRef.current;
        if (!audio) return;
        
        // Always update audio when clip changes or URL changes
        const needsUpdate = audioUrl !== currentClipAudio || audio.src !== audioUrl;
        
        if (needsUpdate) {
            console.log(`[Audio] Loading ${clipName} clip audio:`, audioUrl);
            
            // Pause and clear current audio
            audio.pause();
            audio.currentTime = 0;
            
            if (audioUrl) {
                // Set new audio source
                audio.src = audioUrl;
                setCurrentClipAudio(audioUrl);
                
                // Add error handler
                audio.onerror = (e) => {
                    console.error(`[Audio] Error loading ${clipName} audio:`, e);
                    console.error('[Audio] Failed URL:', audioUrl);
                    console.error('[Audio] Speech generated:', hasSpeechGenerated);
                };
                
                // Add loaded handler
                audio.onloadeddata = () => {
                    console.log(`[Audio] ${clipName} audio loaded, duration:`, audio.duration, 'ready to play');
                    
                    // If playing, seek to correct time and play
                    if (isPlaying && results?.timeline) {
                        const clipRelativeTime = Math.max(0, currentTime - activeClip.start);
                        audio.currentTime = clipRelativeTime;
                        audio.play().catch(err => console.error('[Audio] Auto-play error:', err));
                        console.log(`[Audio] Auto-playing from ${clipRelativeTime}s`);
                    }
                };
                
                audio.load();
            } else {
                console.log(`[Audio] No audio URL for ${clipName} clip`);
                audio.src = '';
                setCurrentClipAudio(null);
            }
        }
    }, [activeClip, clipAudioUrls, currentClipAudio, isPlaying, currentTime, results]);
    
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

    // ============== WEBSOCKET ==============
    const { progress } = useProcessingWebSocket(sessionId || '') as { progress: { message: string } | null };

    // ============== COMPUTED VALUES ==============
    const narrations: Narration[] = results?.narrations || [];
    
    // Extract clip audio URLs from clip-based narrations structure
    useEffect(() => {
        if (!results?.narrations || !Array.isArray(results.narrations)) return;
        
        const clipNarrations = results.narrations;
        
        const introClip = clipNarrations.find((c: any) => c.clipName === 'intro');
        const videoClip = clipNarrations.find((c: any) => c.clipName === 'video');
        const outroClip = clipNarrations.find((c: any) => c.clipName === 'outro');
        
        // Check if speech has been generated (all clips must have generated audio)
        const speechGenerated = !!(introClip?.generatedAudioUrl && videoClip?.generatedAudioUrl && outroClip?.generatedAudioUrl);
        setHasSpeechGenerated(speechGenerated);
        
        // If speech generated, use generatedAudioUrl for all clips; otherwise use rawAudioUrl per clip
        if (speechGenerated) {
            const urls = {
                intro: formatCdnUrl(introClip?.generatedAudioUrl),
                video: formatCdnUrl(videoClip?.generatedAudioUrl),
                outro: formatCdnUrl(outroClip?.generatedAudioUrl)
            };
            setClipAudioUrls(urls);
            console.log('[Audio] Using generated audio URLs (CDN):', urls);
        } else {
            // Before speech generation: use raw audio for each clip if available
            const urls = {
                intro: formatCdnUrl(introClip?.rawAudioUrl),
                video: formatCdnUrl(videoClip?.rawAudioUrl),
                outro: formatCdnUrl(outroClip?.rawAudioUrl)
            };
            setClipAudioUrls(urls);
            console.log('[Audio] Using raw audio URLs (CDN, speech not generated):', urls);
            console.log('[Audio] Raw audio availability - intro:', !!introClip?.rawAudioUrl, 'video:', !!videoClip?.rawAudioUrl, 'outro:', !!outroClip?.rawAudioUrl);
            console.log('[Audio] Formatted URLs - intro:', urls.intro, 'video:', urls.video, 'outro:', urls.outro);
        }
        
        // Initialize active clip if not set and timeline exists
        if (results?.timeline && !activeClip) {
            const initialClip = getActiveClip(results.timeline, currentTime);
            if (initialClip) {
                console.log('[Audio] Setting initial active clip:', initialClip.name, 'at time', currentTime);
                setActiveClip(initialClip);
            }
        }
    }, [results]);
    const showTranscriptionPanel = activeSidebarItem === 'script';
    const showMusicPanel = activeSidebarItem === 'music';
    const showElementsPanel = activeSidebarItem === 'elements';

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

    // Synchronize video with audio - Use RAF for smooth timeline updates
    useEffect(() => {
        const video = videoRef.current;
        const audio = aiAudioRef.current;

        if (!video) return;

        let rafId: number | null = null;
        let lastSyncTime = 0;

        const updateTimeline = () => {
            if (results?.timeline && !video.paused) {
                // Skip updates during manual seeks
                if ((video as any).isSeeking) {
                    rafId = requestAnimationFrame(updateTimeline);
                    return;
                }
                
                const timelineTime = videoTimeToTimelineTime(results.timeline, video.currentTime);
                const mode = getPlaybackMode(results.timeline, timelineTime);
                
                // During video playback, continuously update for smooth 60fps timeline
                if (mode === 'video') {
                    setCurrentTime(timelineTime);
                    
                    // Sync audio periodically (not every frame)
                    const now = performance.now();
                    if (audio && now - lastSyncTime > 100) {
                        const clip = getActiveClip(results.timeline, timelineTime);
                        if (clip) {
                            const clipRelativeTime = timelineTime - clip.start;
                            const diff = Math.abs(clipRelativeTime - audio.currentTime);
                            if (diff > 0.3) {
                                audio.currentTime = clipRelativeTime;
                            }
                        }
                        lastSyncTime = now;
                    }
                }
                
                rafId = requestAnimationFrame(updateTimeline);
            }
        };

        const handlePlay = () => {
            rafId = requestAnimationFrame(updateTimeline);
        };

        const handlePause = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };

        const handleTimeUpdate = () => {
            // Skip updates during manual seeks
            if ((video as any).seeking) return;
            
            // Fallback update when RAF isn't running (for non-video mode or paused)
            if (results?.timeline) {
                const mode = getPlaybackMode(results.timeline, currentTime);
                if (mode !== 'video' || video.paused) {
                    const timelineTime = videoTimeToTimelineTime(results.timeline, video.currentTime);
                    setCurrentTime(timelineTime);
                    setActiveClip(getActiveClip(results.timeline, timelineTime));
                }
            } else {
                setCurrentTime(video.currentTime);
            }
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdate);

        // Start RAF if already playing
        if (!video.paused) {
            rafId = requestAnimationFrame(updateTimeline);
        }

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [results]);

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
            // When video ends, transition to outro if timeline exists
            if (results?.timeline) {
                const videoClip = results.timeline.clips.find((c: any) => c.name === 'video');
                if (videoClip) {
                    console.log('[Video] Video ended, transitioning to outro at', videoClip.end);
                    // Set time to start of outro
                    setCurrentTime(videoClip.end);
                    const outroClip = getActiveClip(results.timeline, videoClip.end + 0.001);
                    setActiveClip(outroClip);
                    if (audio) audio.pause();
                    // If still playing, manual loop will handle outro
                    if (!isPlaying) {
                        video.pause();
                    }
                    return;
                }
            }
            // Fallback: stop playback
            setIsPlaying(false);
            if (audio) audio.pause();
            video.pause();
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
            effectsArray = results.displayElements.flatMap((element: any) => element.effects || []);
            console.log('[Effects] Extracted from displayElements:', effectsArray.length, 'effects');
            
            // Extract text elements from displayElements
            textElementsArray = results.displayElements.flatMap((element: any) => element.elements || []);
            console.log('[TextElements] Extracted from displayElements:', textElementsArray.length, 'text elements');
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

        const filtered = effectsArray
            .filter((effect: any) => effect.target?.bounds && effect.style?.zoom?.enabled);

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

    // Manual playback loop for intro/outro clips
    useEffect(() => {
        if (!isPlaying || !results?.timeline) return;

        const video = videoRef.current;
        const audio = aiAudioRef.current;
        if (!video) return;

        const playbackMode = getPlaybackMode(results.timeline, currentTime);
        const clip = getActiveClip(results.timeline, currentTime);

        // Manual time advancement for intro/outro (video is paused)
        if (playbackMode === 'intro' || playbackMode === 'outro') {
            // Ensure video is paused during intro/outro
            if (!video.paused) {
                video.pause();
            }
            
            // Play audio for intro/outro if available
            if (audio && clip) {
                const clipRelativeTime = currentTime - clip.start;
                
                if (currentClipAudio) {
                    // Audio is available for this clip
                    if (audio.paused || Math.abs(audio.currentTime - clipRelativeTime) > 0.5) {
                        audio.currentTime = clipRelativeTime;
                        audio.play().catch(err => console.error(`[${playbackMode}] Audio play error:`, err));
                        console.log(`[${playbackMode}] Playing audio from ${clipRelativeTime}s`);
                    }
                } else {
                    // No audio for this clip, ensure audio is paused
                    if (!audio.paused) {
                        audio.pause();
                        console.log(`[${playbackMode}] No audio available for this clip, audio paused`);
                    }
                }
            }

            const interval = setInterval(() => {
                setCurrentTime(prev => {
                    const next = prev + 0.016; // ~60fps advancement
                    const clip = getActiveClip(results.timeline, prev);
                    
                    if (!clip) return prev;

                    // Check if we've reached the end of current clip
                    if (next >= clip.end) {
                        if (clip.name === 'intro') {
                            // Transition from intro to video clip
                            console.log('[Playback] Transitioning from intro to video at time', clip.end);
                            const nextClip = getActiveClip(results.timeline, clip.end + 0.001);
                            if (nextClip && nextClip.name === 'video') {
                                video.currentTime = 0;
                                video.play().catch(err => console.error('Video play error:', err));
                                if (audio) {
                                    audio.currentTime = 0;
                                    audio.play().catch(err => console.error('Audio play error:', err));
                                }
                                setActiveClip(nextClip);
                                return clip.end; // Return exact clip boundary
                            }
                        } else if (clip.name === 'outro') {
                            // End of outro, stop playback
                            console.log('[Playback] Reached end of outro, stopping');
                            setIsPlaying(false);
                            return clip.end;
                        }
                    }
                    
                    return next;
                });
            }, 16); // ~60fps

            return () => clearInterval(interval);
        }
        // During video clip, handleTimeUpdate manages currentTime from video.currentTime
    }, [isPlaying, results?.timeline, currentTime, currentClipAudio]);

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

    // Rendering loop for CSS effects - OPTIMIZED
    useEffect(() => {
        const video = videoRef.current;
        const videoLayer = videoLayerRef.current;

        if (!video || !videoLayer || normalizedEffects.length === 0) return;

        // Enable GPU acceleration
        videoLayer.style.willChange = 'transform';

        // Track current effect to minimize recalculations
        let currentEffectId: string | null = null;
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 16; // ~60fps, but throttled

        const renderFrame = () => {
            // CRITICAL: Convert video.currentTime (raw video time: 0-46s) to timeline time (3-49s)
            // Effects in instructions.json are stored in timeline coordinates (shifted by intro duration)
            const time = videoTimeToTimelineTime(results?.timeline, video.currentTime);
            const now = performance.now();

            // Throttle updates to reduce CPU load
            if (now - lastUpdateTime < UPDATE_INTERVAL) {
                if (!video.paused && !video.ended) {
                    rafRef.current = requestAnimationFrame(renderFrame);
                }
                return;
            }
            lastUpdateTime = now;

            const activeEffects = getActiveEffects(normalizedEffects, time);

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

                    // Apply scale with base of 0.94 (initial video size)
                    const finalScale = 0.94 * scale;

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
                videoLayer.style.transform = 'scale3d(0.94, 0.94, 1) translate3d(0%, 0%, 0)';
                currentEffectId = null;
            }

            if (!video.paused && !video.ended) {
                rafRef.current = requestAnimationFrame(renderFrame);
            }
        };

        const handlePlay = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            lastUpdateTime = 0; // Reset throttle on play
            rafRef.current = requestAnimationFrame(renderFrame);
        };

        const handlePause = () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        if (!video.paused && !video.ended) {
            rafRef.current = requestAnimationFrame(renderFrame);
        }

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            // Clean up GPU hint
            if (videoLayer) videoLayer.style.willChange = 'auto';
        };
    }, [normalizedEffects, results?.timeline]);

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
                const mode = getPlaybackMode(results.timeline, currentTime);
                const clip = getActiveClip(results.timeline, currentTime);
                
                // Update active clip state first
                setActiveClip(clip);
                
                if (mode === 'intro' || mode === 'outro') {
                    // For intro/outro, ensure video is paused, play audio, start manual advancement
                    video.pause();
                    setIsPlaying(true);
                    
                    if (audio && clip) {
                        const clipRelativeTime = Math.max(0, currentTime - clip.start);
                        const audioUrl = clipAudioUrls[clip.name as 'intro' | 'video' | 'outro'];
                        
                        if (audioUrl) {
                            // Ensure audio is loaded with correct source
                            if (audio.src !== audioUrl) {
                                console.log(`[Playback] Loading ${mode} audio:`, audioUrl);
                                audio.src = audioUrl;
                                audio.load();
                                audio.onloadeddata = () => {
                                    audio.currentTime = clipRelativeTime;
                                    audio.play().catch(err => console.error(`[${mode}] Audio play error:`, err));
                                    console.log(`[${mode}] Playing audio from ${clipRelativeTime}s`);
                                };
                            } else {
                                audio.currentTime = clipRelativeTime;
                                audio.play().catch(err => console.error(`[${mode}] Audio play error:`, err));
                                console.log(`[${mode}] Playing audio from ${clipRelativeTime}s`);
                            }
                        } else {
                            console.log(`[${mode}] No audio available, playing silently`);
                        }
                    }
                } else if (mode === 'video') {
                    // For video clip, calculate correct video time and play
                    const videoTime = timelineToVideoTime(results.timeline, currentTime);
                    const clipRelativeTime = Math.max(0, currentTime - (clip?.start || 0));
                    console.log(`[Playback] Starting video at timeline ${currentTime}s (video time ${videoTime}s)`);
                    
                    video.currentTime = videoTime;
                    video.play()
                        .then(() => {
                            setIsPlaying(true);
                            if (audio && clip) {
                                const audioUrl = clipAudioUrls[clip.name as 'intro' | 'video' | 'outro'];
                                if (audioUrl) {
                                    // Ensure audio is loaded
                                    if (audio.src !== audioUrl) {
                                        console.log(`[Playback] Loading video audio:`, audioUrl);
                                        audio.src = audioUrl;
                                        audio.load();
                                        audio.onloadeddata = () => {
                                            audio.currentTime = clipRelativeTime;
                                            audio.play().catch(err => console.error('[Video] Audio play error:', err));
                                            console.log(`[Video] Playing audio from ${clipRelativeTime}s`);
                                        };
                                    } else {
                                        audio.currentTime = clipRelativeTime;
                                        audio.play().catch(err => console.error('[Video] Audio play error:', err));
                                        console.log(`[Video] Playing audio from ${clipRelativeTime}s`);
                                    }
                                }
                            }
                        })
                        .catch(err => console.error('Video play error:', err));
                }
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

        // Set seeking flag to prevent RAF/timeupdate from overwriting
        (video as any).isSeeking = true;

        // Update timeline time immediately
        setCurrentTime(timelineTime);

        if (results?.timeline) {
            const mode = getPlaybackMode(results.timeline, timelineTime);
            const clip = getActiveClip(results.timeline, timelineTime);
            
            if (!clip) return;
            
            const clipRelativeTime = timelineTime - clip.start;
            
            // Update active clip first
            const previousClip = activeClip;
            setActiveClip(clip);

            if (mode === 'intro' || mode === 'outro') {
                // For intro/outro: pause video, sync audio to clip-relative time
                video.pause();
                
                if (audio) {
                    // If switching clips, mark pending seek time and wait for audio to load
                    if (previousClip?.name !== clip.name) {
                        (audio as any).pendingSeekTime = clipRelativeTime;
                        console.log(`[Seek] ${mode} pending seek to ${clipRelativeTime}s (waiting for audio load)`);
                    } else {
                        // Same clip, seek immediately
                        audio.currentTime = clipRelativeTime;
                        console.log(`[Seek] ${mode} at timeline ${timelineTime}s, clip-relative ${clipRelativeTime}s`);
                    }
                    
                    // Play audio if we're in playing state
                    if (isPlaying) {
                        audio.play().catch(err => console.error('Audio play error:', err));
                    } else {
                        audio.pause();
                    }
                }
                
                // Clear seeking flag after a short delay
                setTimeout(() => {
                    (video as any).isSeeking = false;
                }, 100);
            } else if (mode === 'video') {
                // For video clip: convert to video time
                const videoTime = timelineToVideoTime(results.timeline, timelineTime);
                video.currentTime = videoTime;
                
                if (audio) {
                    if (previousClip?.name !== clip.name) {
                        (audio as any).pendingSeekTime = clipRelativeTime;
                        console.log(`[Seek] video pending seek to ${clipRelativeTime}s (waiting for audio load)`);
                    } else {
                        audio.currentTime = clipRelativeTime;
                    }
                }
                
                console.log(`[Seek] video at timeline ${timelineTime}s, video time ${videoTime}s`);
                
                if (isPlaying) {
                    video.play().catch(err => console.error('Video play error:', err));
                    if (audio) audio.play().catch(err => console.error('Audio play error:', err));
                }
                
                // Clear seeking flag after video seek completes
                setTimeout(() => {
                    (video as any).isSeeking = false;
                }, 100);
            }
        } else {
            // Fallback for non-timeline videos
            video.currentTime = timelineTime;
            if (audio) audio.currentTime = timelineTime;
            
            // Clear seeking flag
            setTimeout(() => {
                (video as any).isSeeking = false;
            }, 100);
        }
    }, [generatingSpeech, results, isPlaying, activeClip]);

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
            
            // Refetch session data to get updated generatedAudioUrl fields
            const sessionResponse = await fetch(`${API_BASE}/recordings/${sessionId}/session/instructions.json`);
            const sessionData = await sessionResponse.json();
            
            // Update results with new clip narrations
            setResults((prev: any) => ({
                ...prev,
                narrations: sessionData.narrations
            }));
            
            // Load clip audio URLs from updated session data
            const clipNarrations = sessionData.narrations;
            if (clipNarrations && Array.isArray(clipNarrations)) {
                const introClip = clipNarrations.find((c: any) => c.clipName === 'intro');
                const videoClip = clipNarrations.find((c: any) => c.clipName === 'video');
                const outroClip = clipNarrations.find((c: any) => c.clipName === 'outro');
                
                const urls = {
                    intro: formatCdnUrl(introClip?.generatedAudioUrl),
                    video: formatCdnUrl(videoClip?.generatedAudioUrl),
                    outro: formatCdnUrl(outroClip?.generatedAudioUrl)
                };
                
                setClipAudioUrls(urls);
                
                // Force audio reload by clearing current audio
                setCurrentClipAudio(null);
                
                // Update hasSpeechGenerated state
                setHasSpeechGenerated(true);
                
                console.log('[Audio] Updated clip audio URLs after speech generation (CDN):', urls);
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

            // Call export API with background color and aspect ratio
            const response = await exportVideo(sessionId, instructions, recordingDimensions, {
                backgroundColor,
                aspectRatio: aspectRatio as AspectRatio
            });

            console.log('[Export] Success:', response);

            if (response.videoUrl) {
                // Automatically download the video
                const link = document.createElement('a');
                link.href = response.videoUrl;
                link.download = `explaino_video_${sessionId}.mp4`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                console.log('[Export] Download triggered for:', response.videoUrl);
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

                {/* Transcription Panel (conditionally shown) */}
                {showTranscriptionPanel && (
                    <TranscriptionSection
                        narrations={narrations}
                        isVisible={showTranscriptionPanel}
                        onClose={() => setActiveSidebarItem(null)}
                        onSyncPointClick={handleSyncPointClick}
                        onGenerateScript={handleGenerateSpeech}
                        onRewriteScript={handleRewriteScript}
                        isGenerating={generatingSpeech}
                        isRewriting={rewritingScript}
                        hasProcessedAudio={hasSpeechGenerated}
                        currentTime={currentTime}
                        intro={results?.intro || undefined}
                        outro={results?.outro || undefined}
                    />
                )}

                {/* Music Panel (conditionally shown) */}
                {showMusicPanel && (
                    <MusicSection
                        isVisible={showMusicPanel}
                        onClose={() => setActiveSidebarItem(null)}
                        onMusicSelect={(url, filename) => {
                            console.log('[Music] Selected:', filename, url);
                            // TODO: Integrate with video export or timeline
                        }}
                    />
                )}

                {/* Elements Panel - Text Edit (conditionally shown) */}
                {showElementsPanel && (
                    <TextEditPanel
                        isOpen={isTextEditPanelOpen && isTextSelected}
                        onClose={handleTextDeselect}
                        element={selectedTextElement?.element || null}
                        clipName={selectedTextElement?.clipName || ''}
                        elementIndex={selectedTextElement?.elementIndex || 0}
                        clipStart={0}
                        clipEnd={duration}
                        onUpdate={handleTextElementUpdate}
                        onDelete={() => {
                            if (selectedTextElement) {
                                handleTextElementDelete(selectedTextElement.clipName, selectedTextElement.elementIndex);
                                handleTextDeselect();
                            }
                        }}
                    />
                )}

                {/* Main Canvas */}
                <MainCanvasSection
                    aspectRatio={aspectRatio}
                    backgroundColor={currentBackgroundColor}
                    onAspectRatioChange={setAspectRatio}
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
                    onTextBoldChange={(isBold) => handleTextElementUpdate({ style: { fontWeight: isBold ? 'bold' : 'normal' } })}
                    onTextItalicChange={(isItalic) => handleTextElementUpdate({ style: { fontStyle: isItalic ? 'italic' : 'normal' } })}
                    onTextUnderlineChange={(isUnderline) => handleTextElementUpdate({ style: { textDecoration: isUnderline ? 'underline' : 'none' } })}
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
