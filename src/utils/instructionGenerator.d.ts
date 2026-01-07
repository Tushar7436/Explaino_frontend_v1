// Type declarations for instructionGenerator.js

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FrameSize {
    width: number;
    height: number;
}

export interface DisplayEffect {
    start: number;
    end: number;
    target: {
        bounds: BoundingBox;
    };
    style: {
        zoom?: {
            enabled: boolean;
        };
    };
}

export interface ZoomInstruction {
    effect: string;
    startTimeMs: number;
    durationMs: number;
    frame: FrameSize;
    boundingBox: BoundingBox;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface PurityCheckResult {
    clean: boolean;
    violations: string[];
}

export function generateZoomInstruction(
    effect: DisplayEffect,
    frameSize: FrameSize
): ZoomInstruction;

export function generateZoomInstructions(
    effects: DisplayEffect[],
    frameSize: FrameSize
): ZoomInstruction[];

export function validateZoomInstruction(instruction: ZoomInstruction): ValidationResult;

export function checkInstructionPurity(instruction: ZoomInstruction): PurityCheckResult;
