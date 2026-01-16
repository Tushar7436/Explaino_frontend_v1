/**
 * Change Tracking Types
 * 
 * Types for the manual save system that tracks user edits
 * before persisting them to S3
 */

export type ChangeType =
  | 'backgroundColor'
  | 'borderRadius'
  | 'effect'
  | 'text'
  | 'narration'
  | 'aspectRatio'
  | 'clip';

export interface Change {
  id: string;
  timestamp: number;
  type: ChangeType;
  clipName?: string;
  path: string; // JSON path like "timeline.clips[1].backgroundColor"
  oldValue: any;
  newValue: any;
}

export type ChangeStack = Change[];

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ChangeTrackingHook {
  results: any;
  setResults: (value: any) => void;
  trackChange: (change: Omit<Change, 'id' | 'timestamp'>) => void;
  saveChanges: () => Promise<void>;
  changeStack: ChangeStack;
  isSaving: boolean;
  isMerging: boolean;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
  clearStack: () => void;
  onSaveComplete?: () => void; // Callback to trigger refetch after save
}
