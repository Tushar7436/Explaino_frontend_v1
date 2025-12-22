// hooks/useWebSocketConnection.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import { connectSocket, disconnectSocket, registerSession } from '@/lib/socket';
import { Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface EventTarget {
    tag?: string;
    id?: string | null;
    classes?: string[];
    text?: string;
    selector?: string;
    bbox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    bounds?: { // Support both names
        x: number;
        y: number;
        width: number;
        height: number;
    };
    attributes?: Record<string, any>;
}

export interface Instruction {
    type: string;
    target?: EventTarget;
    timestamp?: number; // MS since start or epoch
    t?: number;         // Seconds relative to video (from guide)
    start?: number;     // for displayEffect (seconds)
    end?: number;       // for displayEffect (seconds)
    style?: {           // for displayEffect
        dimBackground?: boolean;
        outline?: string;
        zoom?: { enabled: boolean; scale: number };
    };
    data?: any[];       // for narrations type
    action?: string;    // from guide
    selector?: string;  // from guide (direct)
    bounds?: any;       // from guide (direct)
    metadata?: {
        url?: string;
        viewport?: {
            width: number;
            height: number;
        };
        [key: string]: any;
    };
}

export interface VideoData {
    filename: string;
    url: string;
    metadata: {
        url?: string;
        viewport?: { width: number; height: number };
        [key: string]: any;
    };
    receivedAt: Date;
}

export interface AudioData {
    filename: string;
    url: string;
    text?: string;
    receivedAt: Date;
}

export interface ErrorEvent {
    message: string;
    details?: string;
    timestamp: Date;
}

// Helper functions for localStorage
const getStorageKey = (sessionId: string, type: string) => `clueso_${sessionId}_${type}`;

const saveToStorage = (sessionId: string, type: string, data: any) => {
    try {
        localStorage.setItem(getStorageKey(sessionId, type), JSON.stringify(data));
    } catch (error) {
        console.error('[Storage] Failed to save:', error);
    }
};

const loadFromStorage = (sessionId: string, type: string) => {
    try {
        const data = localStorage.getItem(getStorageKey(sessionId, type));
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('[Storage] Failed to load:', error);
        return null;
    }
};

export const useWebSocketConnection = (sessionId: string | null) => {
    const [connectionState, setConnectionState] = useState<'disconnected' | 'connected'>('disconnected');
    const [videoData, setVideoData] = useState<VideoData | null>(null);
    const [audioData, setAudioData] = useState<AudioData | null>(null);
    const [instructions, setInstructions] = useState<Instruction[]>([]);
    const [errors, setErrors] = useState<ErrorEvent[]>([]);

    const socketRef = useRef<Socket | null>(null);

    // Load data from localStorage on mount
    useEffect(() => {
        if (!sessionId) return;

        console.log('[Hook] Loading cached data from localStorage...');
        const cachedVideo = loadFromStorage(sessionId, 'video');
        const cachedAudio = loadFromStorage(sessionId, 'audio');
        const cachedInstructions = loadFromStorage(sessionId, 'instructions');

        if (cachedVideo) {
            console.log('[Hook] ✅ Restored video from cache');
            setVideoData({ ...cachedVideo, receivedAt: new Date(cachedVideo.receivedAt) });
        }
        if (cachedAudio) {
            console.log('[Hook] ✅ Restored audio from cache');
            setAudioData({ ...cachedAudio, receivedAt: new Date(cachedAudio.receivedAt) });
        }
        if (cachedInstructions) {
            console.log('[Hook] ✅ Restored instructions from cache:', cachedInstructions.length);
            setInstructions(cachedInstructions);
        }
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;

        console.log('[Hook] ==========================================');
        console.log('[Hook] 🔌 Connecting to session:', sessionId);
        console.log('[Hook] 🌐 Backend URL:', BACKEND_URL);

        // 1. Get socket instance (does not register yet)
        const socket = connectSocket();
        socketRef.current = socket;

        // 2. Setup listeners BEFORE registering
        // Registration confirmation
        socket.on('registered', (data: { sessionId: string; message: string }) => {
            console.log('[Hook] ✅ REGISTERED:', data);
            setConnectionState('connected');
        });

        // 2. Video event - CRITICAL: This receives the screen recording
        socket.on('video', (data: { filename: string; path: string; metadata: any; timestamp: string }) => {
            console.log('[Hook] 🎥 VIDEO EVENT RECEIVED:');
            console.log('[Hook] - Filename:', data.filename);
            console.log('[Hook] - Path:', data.path);
            console.log('[Hook] - Full URL:', `${BACKEND_URL}${data.path}`);
            console.log('[Hook] - Metadata:', data.metadata);
            console.log('[Hook] - Timestamp:', data.timestamp);
            const videoData = {
                filename: data.filename,
                url: `${BACKEND_URL}${data.path}`,
                metadata: data.metadata,
                receivedAt: new Date(data.timestamp),
            };
            setVideoData(videoData);
            saveToStorage(sessionId, 'video', videoData);
        });

        // 3. Audio event - Initial audio file
        socket.on('audio', (data: { filename: string; path: string; text?: string; timestamp: string }) => {
            console.log('[Hook] 🔊 AUDIO EVENT RECEIVED:');
            console.log('[Hook] - Filename:', data.filename);
            console.log('[Hook] - Path:', data.path);

            // Logic for Path Handling from Guide:
            // Check if it starts with http. If yes (Python processed), use as is. 
            // If no (Raw fallback), prefix with Node server URL.
            const fullUrl = data.path.startsWith('http')
                ? data.path
                : `${BACKEND_URL}${data.path}`;

            console.log('[Hook] - Full URL:', fullUrl);
            console.log('[Hook] - Text:', data.text);
            console.log('[Hook] - Timestamp:', data.timestamp);

            const audioData = {
                filename: data.filename,
                url: fullUrl,
                text: data.text,
                receivedAt: new Date(data.timestamp),
            };
            setAudioData(audioData);
            saveToStorage(sessionId, 'audio', audioData);
        });

        // 4. Instructions event - AI-generated steps
        socket.on('instructions', (data: any) => {
            console.log('[Hook] 📨 INSTRUCTION EVENT RECEIVED:', data);

            // Check if it's an error instruction
            if (data.type === 'error') {
                console.log('[Hook] ⚠️ ERROR INSTRUCTION');
                setErrors(prev => [...prev, {
                    message: typeof data.target === 'string' ? data.target : data.target?.text || 'Unknown error',
                    details: data.metadata?.error,
                    timestamp: new Date(),
                }]);
                return;
            }

            // Standardize the instruction format based on the guide
            let normalizedInstruction = { ...data };

            // Map 't' to 'timestamp' if present (Direct Player Actions)
            if (data.t !== undefined && data.timestamp === undefined) {
                normalizedInstruction.timestamp = data.t * 1000; // Convert s to ms if needed? 
                // Wait, most timestamps in the app are currently MS since epoch for events, 
                // but 't' in the guide seems like video time (seconds).
                // Let's keep it as is and handle conversion in overlay if it's video-relative.
            }

            // Map 'action' to 'type' if type is missing
            if (!data.type && data.action) {
                normalizedInstruction.type = data.action;
            }

            // Ensure bounds are mapped to target.bbox if it's a direct action
            if (data.bounds && (!data.target || !data.target.bbox)) {
                normalizedInstruction.target = normalizedInstruction.target || {};
                normalizedInstruction.target.bbox = data.bounds;
                normalizedInstruction.target.selector = data.selector;
            }

            console.log('[Hook] ✅ Adding normalized instruction:', normalizedInstruction);
            setInstructions(prev => {
                const newList = [...prev, normalizedInstruction];
                saveToStorage(sessionId, 'instructions', newList);
                return newList;
            });
        });

        // 5. Error event - General errors
        socket.on('error', (data: { message: string }) => {
            console.error('[Hook] ❌ ERROR EVENT:', data);
            setErrors(prev => [...prev, {
                message: data.message || 'Unknown error',
                timestamp: new Date(),
            }]);
        });

        // Log all events
        socket.onAny((eventName: string, ...args: any[]) => {
            console.log('[Hook] 🔔 ANY EVENT:', eventName, args);
        });

        // 3. NOW register - after all listeners are attached
        console.log('[Hook] 📝 Registering session now that listeners are ready:', sessionId);
        registerSession(sessionId);

        // Cleanup
        return () => {
            console.log('[Hook] 🔌 Disconnecting from session:', sessionId);
            socket.off('registered');
            socket.off('video');
            socket.off('audio');
            socket.off('instructions');
            socket.off('error');
            socket.offAny();
            disconnectSocket();
            setConnectionState('disconnected');
        };
    }, [sessionId]);

    const clearInstructions = useCallback(() => setInstructions([]), []);
    const clearAudio = useCallback(() => setAudioData(null), []);
    const clearVideo = useCallback(() => setVideoData(null), []);

    return {
        connectionState,
        instructions,
        audioData,
        videoData,
        errors,
        clearInstructions,
        clearAudio,
        clearVideo,
        socket: socketRef.current,
    };
};
