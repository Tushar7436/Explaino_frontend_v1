// Type declarations for backend-api.js

export interface ProcessSessionResponse {
    videoUrl: string;
    audioUrl: string;
    videoDuration: number;
    displayEffects: DisplayEffect[];
    instructions: Instruction[];
    narrations: Narration[];
}

export interface DisplayEffect {
    start: number;
    end: number;
    type: string;
    target: {
        selector: string;
        bounds: BoundingBox;
    };
    style: {
        dimBackground?: boolean;
        outline?: string;
        zoom?: {
            enabled: boolean;
            scale?: number;
        };
    };
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Instruction {
    t: number;
    action: string;
    selector: string;
    bounds: BoundingBox;
    metadata?: {
        text?: string;
    };
    effects?: string[];
}

export interface Narration {
    start: number;
    end: number;
    text: string;
    musicStyle?: string;
}

export interface SpeechResponse {
    processedAudioUrl: string;
}

export interface ExportVideoPayload {
    sessionId: string;
    frame: {
        width: number;
        height: number;
    };
    effects: ExportEffect[];
}

export interface ExportEffect {
    startTimeMs: number;
    durationMs: number;
    boundingBox: BoundingBox;
    scale: number;
}

export interface ExportResponse {
    success: boolean;
    videoUrl: string;
    message: string;
}

export interface RecordingDimensions {
    recordingWidth: number;
    recordingHeight: number;
}

export interface ZoomInstruction {
    effect: string;
    startTimeMs: number;
    durationMs: number;
    frame: {
        width: number;
        height: number;
    };
    boundingBox: BoundingBox;
}

export interface ExportOptions {
    backgroundColor?: string;
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
}

export function processRecording(payload: any): Promise<any>;
export function processSession(sessionId: string): Promise<ProcessSessionResponse>;
export function generateSpeech(sessionId: string): Promise<SpeechResponse>;
export function rewriteNarrations(sessionId: string): Promise<Narration[]>;
export function exportVideo(
    sessionId: string,
    instructions: ZoomInstruction[],
    recordingDimensions: RecordingDimensions,
    options?: ExportOptions
): Promise<ExportResponse>;
export function getCompleteRecording(sessionId: string): Promise<any>;
export function getRecordingById(id: string): Promise<any>;
export function getNarrations(id: string): Promise<Narration[]>;
export function getInstructions(id: string): Promise<Instruction[]>;
export function getDisplayEffects(id: string): Promise<DisplayEffect[]>;
export function getWebSocketUrl(sessionId: string): string;
export function checkHealth(): Promise<{ status: string }>;
