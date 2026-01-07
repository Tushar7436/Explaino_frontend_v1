// Type declarations for effectProcessor.js

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface NormalizedBounds extends BoundingBox {
    centerX: number;
    centerY: number;
    anchorX: number;
    anchorY: number;
    autoScale: number;
    startScale: number;
    endScale: number;
    areaRatio: number;
    widthRatio: number;
    heightRatio: number;
    dominantRatio: number;
    effectiveRatio: number;
}

export interface TransformResult {
    scale: number;
    translateX: number;
    translateY: number;
}

export interface NormalizedEffect {
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
    normalizedBounds: NormalizedBounds;
}

export function normalizeCoordinates(
    bounds: BoundingBox,
    recordingWidth: number,
    recordingHeight: number,
    videoWidth: number,
    videoHeight: number
): NormalizedBounds;

export function easeInOutCubic(t: number): number;

export function easeInOutQuad(t: number): number;

export function computeEffectProgress(
    currentTime: number,
    start: number,
    end: number,
    easeInPercent?: number,
    easeOutPercent?: number
): number;

/**
 * Calculate zoom transform using camera-zoom model with edge clamping
 * @param progress - Effect progress (0 to 1)
 * @param anchorX - Target anchor X (0-1 normalized)
 * @param anchorY - Target anchor Y (0-1 normalized)
 * @param targetScale - Target zoom scale
 * @param initialSizeRatio - Initial video size as ratio of background (default 0.9)
 * @returns Transform values where translateX/Y are clamped percentages
 */
export function calculateZoomTransform(
    progress: number,
    anchorX: number,
    anchorY: number,
    targetScale: number,
    initialSizeRatio?: number
): TransformResult;

/**
 * Check if two bounds are approximately the same position
 */
export function areBoundsSimilar(
    bounds1: BoundingBox,
    bounds2: BoundingBox,
    threshold?: number
): boolean;

/**
 * Check if current effect has a continuation (next effect at same position)
 */
export function hasEffectContinuation(
    currentEffect: NormalizedEffect,
    allEffects: NormalizedEffect[],
    timeThreshold?: number
): boolean;

/**
 * Compute effect progress with smart ease-out suppression
 * If there's a continuation effect, don't zoom out
 */
export function computeEffectProgressWithContinuation(
    currentTime: number,
    start: number,
    end: number,
    easeInPercent?: number,
    easeOutPercent?: number,
    hasContinuation?: boolean
): number;

export function getActiveEffects(
    effects: NormalizedEffect[],
    currentTime: number
): NormalizedEffect[];

export function buildTransformString(
    translateX: number,
    translateY: number,
    scale: number
): string;

export function resolveZoomEffect(
    effects: NormalizedEffect[]
): NormalizedEffect | null;
