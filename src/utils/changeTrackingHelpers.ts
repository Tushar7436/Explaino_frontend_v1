/**
 * Change Tracking Helper Functions
 * 
 * Utilities for managing change stack and formatting
 */

import type { Change } from '../types/changeTracking';

/**
 * Find clip index by name in timeline
 */
export function findClipIndex(timeline: any, clipName: string): number {
  if (!timeline?.clips) return -1;
  return timeline.clips.findIndex((clip: any) => clip.name === clipName);
}

/**
 * Generate consistent JSON path string
 */
export function getJSONPath(type: string, clipName?: string, index?: number): string {
  switch (type) {
    case 'backgroundColor':
      return clipName ? `timeline.clips[${clipName}].backgroundColor` : 'backgroundColor';
    case 'borderRadius':
      return clipName ? `timeline.clips[${clipName}].media[0].borderRadius` : 'borderRadius';
    case 'aspectRatio':
      return 'aspectRatio';
    default:
      return `${type}${index !== undefined ? `[${index}]` : ''}`;
  }
}

/**
 * Format "Saved 2m ago" style timestamps
 */
export function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never';
  
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Validate change object has required fields
 */
export function validateChange(change: Partial<Change>): boolean {
  return !!(
    change.type &&
    change.path &&
    change.hasOwnProperty('oldValue') &&
    change.hasOwnProperty('newValue')
  );
}

/**
 * Merge changes - keep only latest value per path
 * Optimization for batch saves
 */
export function mergeChanges(changes: Change[]): Change[] {
  const pathMap = new Map<string, Change>();
  
  // Keep latest change for each path
  changes.forEach(change => {
    pathMap.set(change.path, change);
  });
  
  return Array.from(pathMap.values());
}

/**
 * Generate unique ID for change
 */
export function generateChangeId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Apply a change to results object (for redo functionality)
 */
export function applyChange(results: any, change: Change): any {
  // For future redo implementation
  // This would use the change.path to update the results object
  console.log('[ChangeTracking] Apply change:', change);
  return results;
}

/**
 * Revert a change using oldValue (for undo functionality)
 */
export function revertChange(results: any, change: Change): any {
  // For future undo implementation
  // This would restore the oldValue at change.path
  console.log('[ChangeTracking] Revert change:', change);
  return results;
}
