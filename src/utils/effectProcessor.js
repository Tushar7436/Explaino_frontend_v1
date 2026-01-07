/**
 * Effect Processor Utility
 * Handles coordinate normalization, zoom calculations, and easing functions
 * for CSS-based video effect preview rendering
 */

/**
 * Normalize recorded bounds to video coordinate space
 * CRITICAL: All coordinates must be in the ACTUAL VIDEO resolution space
 * NOT the preview frame/container size
 * 
 * @param {Object} bounds - Original bounds {x, y, width, height} in recording resolution
 * @param {number} recordingWidth - Original recording width (e.g., 1920)
 * @param {number} recordingHeight - Original recording height (e.g., 854)
 * @param {number} videoWidth - Video width (should equal recordingWidth)
 * @param {number} videoHeight - Video height (should equal recordingHeight)
 * @returns {Object} Normalized bounds with centerX, centerY, anchorX, anchorY, and autoScale
 */
export function normalizeCoordinates(bounds, recordingWidth, recordingHeight, videoWidth, videoHeight) {
    // Calculate center position in video coordinates
    // Since bounds are already in recording space and video = recording, this is just the center
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    // CRITICAL: Normalized anchor points for FFmpeg compatibility
    // These are the zoom anchor points in 0-1 range
    // This is what FFmpeg needs: anchorX/anchorY relative to video dimensions
    const anchorX = centerX / recordingWidth;
    const anchorY = centerY / recordingHeight;

    // === AUTO-SCALE CALCULATION ===

    // 1. Area ratio (original approach)
    const boundingBoxArea = bounds.width * bounds.height;
    const screenArea = recordingWidth * recordingHeight;
    const areaRatio = boundingBoxArea / screenArea;

    // 2. CRITICAL FIX: Dominant dimension ratio
    // Handles edge cases like wide-but-short text or tall-but-narrow sidebars
    const widthRatio = bounds.width / recordingWidth;
    const heightRatio = bounds.height / recordingHeight;
    const dominantRatio = Math.max(widthRatio, heightRatio);

    // 3. Effective ratio: use whichever is larger
    // This ensures wide text bars get proper zoom even if area is medium
    const effectiveRatio = Math.max(areaRatio, dominantRatio);

    // Auto-scale formula based on effective ratio
    // INCREASED ZOOM SCALES for more dramatic effect
    // Small elements (< 1% effective) -> high zoom (2.0x - 2.5x)
    // Medium elements (1-10% effective) -> medium zoom (1.5x - 2.0x)
    // Large elements (> 10% effective) -> moderate zoom (1.2x - 1.5x)
    let autoScale;
    if (effectiveRatio < 0.01) {
        // Very small element (< 1% of screen)
        autoScale = 2.0 + (0.01 - effectiveRatio) / 0.01 * 0.5; // 2.0x to 2.5x
    } else if (effectiveRatio < 0.1) {
        // Medium element (1-10% of screen)
        autoScale = 1.5 + (0.1 - effectiveRatio) / 0.09 * 0.5; // 1.5x to 2.0x
    } else if (effectiveRatio < 0.5) {
        // Large element (10-50% of screen)
        autoScale = 1.2 + (0.5 - effectiveRatio) / 0.4 * 0.3; // 1.2x to 1.5x
    } else {
        // Very large element (> 50% of screen) - minimal zoom
        autoScale = 1.15;
    }

    // Clamp to reasonable range (increased max)
    autoScale = Math.max(1.15, Math.min(3.0, autoScale));

    // Time behavior: explicit start and end scales for smooth animation
    const startScale = 1.0;      // Always start from normal size
    const endScale = autoScale;  // End at calculated zoom level

    return {
        ...bounds,
        centerX,
        centerY,
        // Normalized anchor points (0-1 range) for FFmpeg compatibility
        anchorX,
        anchorY,
        // Auto-calculated zoom
        autoScale,
        // Time behavior: explicit start/end for animation
        startScale,
        endScale,
        // Debug info
        areaRatio,
        widthRatio,
        heightRatio,
        dominantRatio,
        effectiveRatio
    };
}

/**
 * Cubic easing function (ease-in-out)
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} Eased value between 0 and 1
 */
export function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Quadratic easing function (ease-in-out)
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} Eased value between 0 and 1
 */
export function easeInOutQuad(t) {
    return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Compute effect progress with ease-in, hold, and ease-out phases
 * @param {number} currentTime - Current video time
 * @param {number} start - Effect start time
 * @param {number} end - Effect end time
 * @param {number} easeInPercent - Percentage of duration for ease-in (default 0.25)
 * @param {number} easeOutPercent - Percentage of duration for ease-out (default 0.25)
 * @returns {number} Progress value between 0 and 1
 */
export function computeEffectProgress(currentTime, start, end, easeInPercent = 0.20, easeOutPercent = 0.40) {
    // SMOOTHER TRANSITIONS:
    // - Faster ease-in (20% of duration)
    // - Slower, gentler ease-out (40% of duration) for smooth ending
    const duration = end - start;
    const t = (currentTime - start) / duration;

    // Return 0 at boundaries for clean entry/exit
    if (t <= 0) return 0;
    if (t >= 1) return 0;

    const easeInEnd = easeInPercent;
    const easeOutStart = 1 - easeOutPercent;

    // Ease-in phase (quick zoom in)
    if (t < easeInEnd) {
        return easeInOutCubic(t / easeInEnd);
    }

    // Ease-out phase (slow, smooth zoom out)
    if (t > easeOutStart) {
        // Use quadratic easing for gentler ease-out
        return easeInOutQuad((1 - t) / easeOutPercent);
    }

    // Hold phase
    return 1;
}

/**
 * Calculate zoom transform values using CAMERA-ZOOM model
 * 
 * CRITICAL: This implements camera-zoom with EDGE CLAMPING.
 * - The zoom origin is ALWAYS the frame center (50%, 50%)
 * - Translation brings the target toward the viewer
 * - Translation is CLAMPED so video edges never reveal background gaps
 * 
 * The video starts at ~94% size (3% margin). When zooming:
 * - Video expands toward background edges
 * - Translation is limited so video always fills the background
 * 
 * @param {number} progress - Effect progress (0 to 1)
 * @param {number} anchorX - Target anchor X (0-1 normalized, from normalizedBounds)
 * @param {number} anchorY - Target anchor Y (0-1 normalized, from normalizedBounds)
 * @param {number} targetScale - Target zoom scale (e.g., 1.5)
 * @param {number} initialSizeRatio - Initial video size as ratio of background (default 0.94 = 94%)
 * @returns {Object} Transform values {scale, translateX, translateY} where translate values are percentages
 */
export function calculateZoomTransform(progress, anchorX, anchorY, targetScale, initialSizeRatio = 0.94) {
    // Interpolate scale from 1 to targetScale
    const scale = 1 + (targetScale - 1) * progress;

    // Frame center is always 0.5, 0.5 (center of the video container)
    const frameCenterX = 0.5;
    const frameCenterY = 0.5;

    // CAMERA-ZOOM FORMULA:
    // Translation = (FrameCenter - TargetCenter) * (scale - 1)
    // This moves the camera so that the target appears centered after scaling
    // Multiply by 100 to convert to percentage for CSS translate
    const translateX = (frameCenterX - anchorX) * (scale - 1) * 100;
    const translateY = (frameCenterY - anchorY) * (scale - 1) * 100;

    // NOTE: Edge clamping removed - the background stage has overflow:hidden
    // which clips the video properly. This allows the video to fully expand
    // and fill the background (gap becomes zero) when zoomed in.

    return {
        scale,
        translateX,
        translateY
    };
}

/**
 * Check if two bounds are approximately the same position
 * @param {Object} bounds1 - First bounds {x, y, width, height}
 * @param {Object} bounds2 - Second bounds {x, y, width, height}
 * @param {number} threshold - Distance threshold in pixels (default 50)
 * @returns {boolean} True if bounds are at approximately the same position
 */
export function areBoundsSimilar(bounds1, bounds2, threshold = 50) {
    if (!bounds1 || !bounds2) return false;

    // Calculate center points
    const center1X = bounds1.x + bounds1.width / 2;
    const center1Y = bounds1.y + bounds1.height / 2;
    const center2X = bounds2.x + bounds2.width / 2;
    const center2Y = bounds2.y + bounds2.height / 2;

    // Check if centers are within threshold
    const dx = Math.abs(center1X - center2X);
    const dy = Math.abs(center1Y - center2Y);

    return dx <= threshold && dy <= threshold;
}

/**
 * Check if current effect has a continuation (next effect at same position starts near when this ends)
 * @param {Object} currentEffect - The current effect
 * @param {Array} allEffects - All normalized effects
 * @param {number} timeThreshold - Maximum gap between effects to consider as continuation (default 0.5 seconds)
 * @returns {boolean} True if there's a continuation effect
 */
export function hasEffectContinuation(currentEffect, allEffects, timeThreshold = 0.5) {
    if (!currentEffect || !allEffects || allEffects.length === 0) return false;

    const currentBounds = currentEffect.target?.bounds || currentEffect.normalizedBounds;

    // Find effects that start around when this one ends
    for (const effect of allEffects) {
        if (effect === currentEffect) continue;

        const effectBounds = effect.target?.bounds || effect.normalizedBounds;

        // Check if this effect starts near when current ends
        const timeDiff = effect.start - currentEffect.end;

        // Effect starts within threshold of current ending OR overlaps with current
        if (timeDiff <= timeThreshold && timeDiff >= -timeThreshold) {
            // Check if positions are similar
            if (areBoundsSimilar(currentBounds, effectBounds)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Compute effect progress with smart ease-out suppression
 * If there's a continuation effect at the same position, don't zoom out
 * @param {number} currentTime - Current video time
 * @param {number} start - Effect start time
 * @param {number} end - Effect end time
 * @param {number} easeInPercent - Percentage of duration for ease-in
 * @param {number} easeOutPercent - Percentage of duration for ease-out
 * @param {boolean} hasContinuation - Whether this effect continues into another at same position
 * @returns {number} Progress value between 0 and 1
 */
export function computeEffectProgressWithContinuation(currentTime, start, end, easeInPercent = 0.20, easeOutPercent = 0.40, hasContinuation = false) {
    const duration = end - start;
    const t = (currentTime - start) / duration;

    // Return 0 at boundaries for clean entry/exit
    if (t <= 0) return 0;
    if (t >= 1) return hasContinuation ? 1 : 0; // If continuation, stay zoomed at end

    const easeInEnd = easeInPercent;
    const easeOutStart = 1 - easeOutPercent;

    // Ease-in phase (quick zoom in)
    if (t < easeInEnd) {
        return easeInOutCubic(t / easeInEnd);
    }

    // Ease-out phase - SKIP if there's a continuation
    if (t > easeOutStart) {
        if (hasContinuation) {
            // Don't zoom out, maintain full zoom
            return 1;
        }
        // Use quadratic easing for gentler ease-out
        return easeInOutQuad((1 - t) / easeOutPercent);
    }

    // Hold phase
    return 1;
}

/**
 * Get active effects at current time
 * @param {Array} effects - Array of effect objects
 * @param {number} currentTime - Current video time
 * @returns {Array} Active effects
 */
export function getActiveEffects(effects, currentTime) {
    return effects.filter(effect =>
        currentTime >= effect.start && currentTime <= effect.end
    );
}

/**
 * Build CSS transform string for camera-zoom
 * IMPORTANT: Uses percentage-based translation for frame-relative positioning
 * @param {number} translateX - X translation in percentage
 * @param {number} translateY - Y translation in percentage
 * @param {number} scale - Scale factor
 * @returns {string} CSS transform string
 */
export function buildTransformString(translateX, translateY, scale) {
    // Order matters: scale first, then translate
    // This ensures the translation is in the scaled coordinate space
    return `scale(${scale}) translate(${translateX}%, ${translateY}%)`;
}

/**
 * Resolve which zoom effect to apply when multiple effects overlap
 * @param {Array} effects - Array of active effects
 * @returns {Object|null} The effect to apply, or null if none
 */
export function resolveZoomEffect(effects) {
    if (effects.length === 0) return null;

    // Rule: latest-starting effect wins
    return effects.reduce((latest, e) =>
        e.start > latest.start ? e : latest
    );
}
