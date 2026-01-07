// Type declarations for useProcessingWebSocket.js

export interface ProgressData {
    stage: string;
    percent: number;
    message: string;
}

export interface WebSocketHookReturn {
    connected: boolean;
    progress: ProgressData | null;
    error: string | null;
    completed: boolean;
    reconnect: () => void;
}

export function useProcessingWebSocket(sessionId: string): WebSocketHookReturn;
