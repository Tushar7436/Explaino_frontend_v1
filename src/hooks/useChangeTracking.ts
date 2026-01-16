/**
 * useChangeTracking Hook
 * 
 * Custom React hook for managing change stack and manual save functionality
 * Tracks user edits in memory before persisting to S3
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { updateInstructions } from '../services/backend-api';
import { generateChangeId, mergeChanges } from '../utils/changeTrackingHelpers';
import type { Change, ChangeStack, ChangeTrackingHook } from '../types/changeTracking';

const BACKUP_KEY_PREFIX = 'explaino_project_backup_';

export function useChangeTracking(
  sessionId: string | null,
  initialResults: any,
  onSaveComplete?: () => void
): ChangeTrackingHook {
  const [results, setResults] = useState(initialResults);
  const [changeStack, setChangeStack] = useState<ChangeStack>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  // Track if initial load happened (don't restore backup on initial load)
  const hasInitialLoadRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);
  
  // Computed value
  const hasUnsavedChanges = changeStack.length > 0;

  // Apply a single change to results object
  const applyChangeToResults = useCallback((baseResults: any, change: Change): any => {
    if (!baseResults) {
      console.error('[ChangeTracking] No baseResults to apply change to');
      return baseResults;
    }

    console.log('[ChangeTracking] Applying change:', change);
    console.log('[ChangeTracking] Base results keys:', Object.keys(baseResults));

    // Deep clone to avoid mutations
    const updated = JSON.parse(JSON.stringify(baseResults));

    try {
      // Parse the path to navigate to the property
      // Example paths: "timeline.clips[intro].backgroundColor", "timeline.clips[video].media[0].borderRadius"
      const pathParts = change.path.split('.');
      console.log('[ChangeTracking] Path parts:', pathParts);
      let current = updated;

      // Navigate to the parent object
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        
        // Handle array notation like "clips[intro]"
        const arrayMatch = part.match(/^(\w+)\[(.+)\]$/);
        if (arrayMatch) {
          const [, arrayName, indexOrName] = arrayMatch;
          console.log('[ChangeTracking] Array access:', arrayName, indexOrName);
          
          if (!current[arrayName]) {
            console.error('[ChangeTracking] Property not found:', arrayName);
            return baseResults;
          }
          
          current = current[arrayName];
          
          if (Array.isArray(current)) {
            // Find by name property (for clips)
            const index = current.findIndex((item: any) => item.name === indexOrName);
            console.log('[ChangeTracking] Found at index:', index, 'in array of length', current.length);
            if (index >= 0) {
              current = current[index];
              console.log('[ChangeTracking] Current object:', current);
            } else {
              console.error('[ChangeTracking] Item not found in array:', indexOrName);
              return baseResults;
            }
          }
        } else {
          if (!current[part]) {
            console.error('[ChangeTracking] Property not found:', part);
            return baseResults;
          }
          current = current[part];
        }
      }

      // Set the final value
      const lastPart = pathParts[pathParts.length - 1];
      const arrayMatch = lastPart.match(/^(\w+)\[(.+)\]$/);
      
      if (arrayMatch) {
        const [, arrayName, indexOrName] = arrayMatch;
        if (Array.isArray(current[arrayName])) {
          const index = current[arrayName].findIndex((item: any) => item.name === indexOrName);
          if (index >= 0) {
            current[arrayName][index] = change.newValue;
            console.log('[ChangeTracking] ✅ Applied array change:', arrayName, indexOrName, '=', change.newValue);
          } else {
            console.error('[ChangeTracking] Final array item not found:', indexOrName);
            return baseResults;
          }
        }
      } else {
        const oldValue = current[lastPart];
        current[lastPart] = change.newValue;
        console.log('[ChangeTracking] ✅ Applied direct change:', lastPart, oldValue, '→', change.newValue);
      }

      console.log('[ChangeTracking] Updated object after change:', JSON.stringify(updated).substring(0, 500));
      return updated;
    } catch (err) {
      console.error('[ChangeTracking] ❌ Failed to apply change:', change, err);
      return baseResults;
    }
  }, []);

  // When CDN data loads (initialResults changes), merge with localStorage changes
  useEffect(() => {
    console.log('[ChangeTracking] CDN data received, initialResults:', !!initialResults, 'sessionId:', sessionId);
    
    if (!sessionId || !initialResults) {
      console.log('[ChangeTracking] Skipping merge - no session or no data');
      return;
    }

    // If session changed, reset everything
    if (lastSessionIdRef.current !== sessionId) {
      console.log('[ChangeTracking] Session changed:', lastSessionIdRef.current, '->', sessionId);
      lastSessionIdRef.current = sessionId;
      hasInitialLoadRef.current = false;
    }

    // Check localStorage for unsaved changes
    const backupKey = `${BACKUP_KEY_PREFIX}${sessionId}`;
    const backupJSON = localStorage.getItem(backupKey);
    
    console.log('[ChangeTracking] Backup key:', backupKey, 'Found backup:', !!backupJSON, 'hasInitialLoadRef:', hasInitialLoadRef.current);

    if (backupJSON && !hasInitialLoadRef.current) {
      try {
        const backup = JSON.parse(backupJSON);
        const age = Date.now() - backup.timestamp;

        console.log('[ChangeTracking] 📦 Found localStorage backup:', {
          age: Math.round(age / 1000) + 's',
          changes: backup.changeStack?.length || 0,
          timestamp: new Date(backup.timestamp).toISOString(),
          hasChanges: backup.changeStack && backup.changeStack.length > 0
        });

        // Only restore if backup is less than 24 hours old
        if (age < 86400000 && backup.changeStack && backup.changeStack.length > 0) {
          console.log('[ChangeTracking] 🔄 Starting merge of', backup.changeStack.length, 'changes...');
          console.log('[ChangeTracking] Change stack:', backup.changeStack);
          
          setIsMerging(true);
          
          // Apply all changes from stack to fresh CDN data
          let mergedResults = initialResults;
          for (let i = 0; i < backup.changeStack.length; i++) {
            const change = backup.changeStack[i];
            console.log(`[ChangeTracking] Applying change ${i+1}/${backup.changeStack.length}:`, change);
            mergedResults = applyChangeToResults(mergedResults, change);
          }

          console.log('[ChangeTracking] Setting merged results...');
          setResults(mergedResults);
          setChangeStack(backup.changeStack);
          
          // Small delay to ensure state updates propagate
          setTimeout(() => {
            setIsMerging(false);
            console.log('[ChangeTracking] ✅ Merge complete - you have', backup.changeStack.length, 'unsaved changes');
            console.log('[ChangeTracking] Merged results preview:', JSON.stringify(mergedResults).substring(0, 300));
          }, 100);
        } else {
          // No valid backup, use CDN data as-is
          console.log('[ChangeTracking] Using CDN data as-is (reason: age=' + age + ', hasChanges=' + (backup.changeStack?.length > 0) + ')');
          setResults(initialResults);
          if (age >= 86400000) {
            localStorage.removeItem(backupKey);
            console.log('[ChangeTracking] Cleared old backup (>24h)');
          } else {
            console.log('[ChangeTracking] No changes in backup, using CDN data');
          }
        }
      } catch (err) {
        console.warn('[ChangeTracking] Failed to merge backup, using CDN data:', err);
        setResults(initialResults);
      }
    } else {
      // No backup, use CDN data
      console.log('[ChangeTracking] No localStorage backup or already loaded, using fresh CDN data');
      setResults(initialResults);
    }

    hasInitialLoadRef.current = true;
    console.log('[ChangeTracking] hasInitialLoadRef set to true');
  }, [sessionId, initialResults, applyChangeToResults]);

  // Track change - add to stack
  const trackChange = useCallback((change: Omit<Change, 'id' | 'timestamp'>) => {
    const fullChange: Change = {
      ...change,
      id: generateChangeId(),
      timestamp: Date.now()
    };
    
    console.log('[ChangeTracking] Tracking change:', fullChange);
    
    setChangeStack(prev => [...prev, fullChange]);
  }, []);

  // Save all changes to S3
  const saveChanges = useCallback(async () => {
    if (!sessionId) {
      console.warn('[ChangeTracking] No sessionId, cannot save');
      return;
    }
    
    if (changeStack.length === 0) {
      console.log('[ChangeTracking] No changes to save');
      return;
    }
    
    setIsSaving(true);
    console.log('[ChangeTracking] Saving', changeStack.length, 'changes...');
    console.log('[ChangeTracking] Current results:', JSON.stringify(results).substring(0, 200) + '...');
    console.log('[ChangeTracking] Change stack:', changeStack);
    
    try {
      // Merge changes to optimize (keep only latest value per path)
      const mergedChanges = mergeChanges(changeStack);
      console.log('[ChangeTracking] Merged to', mergedChanges.length, 'unique changes');
      
      // Send to backend - use current results state
      console.log('[ChangeTracking] Sending to backend...', { sessionId, resultsKeys: Object.keys(results || {}) });
      const response = await updateInstructions(sessionId, results, changeStack);
      console.log('[ChangeTracking] Backend response:', response);
      
      // Clear stack on success
      setChangeStack([]);
      setLastSavedAt(new Date());
      
      // Clear localStorage backup
      if (sessionId) {
        localStorage.removeItem(`${BACKUP_KEY_PREFIX}${sessionId}`);
      }
      
      console.log('[ChangeTracking] ✅ Save successful - stack cleared');
      
      // Trigger refetch with cache busting
      if (onSaveComplete) {
        console.log('[ChangeTracking] Triggering cache-busted refetch...');
        onSaveComplete();
      }
    } catch (err: any) {
      console.error('[ChangeTracking] ❌ Save failed:', err);
      throw err; // Re-throw for UI to handle
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, results, changeStack, onSaveComplete]);

  // Clear stack (for manual reset)
  const clearStack = useCallback(() => {
    setChangeStack([]);
  }, []);

  // Auto-backup to localStorage on every change
  useEffect(() => {
    if (!sessionId || !results) return;
    
    // Don't backup if no changes
    if (changeStack.length === 0) return;
    
    try {
      const backup = {
        results,
        changeStack,
        timestamp: Date.now()
      };
      
      localStorage.setItem(
        `${BACKUP_KEY_PREFIX}${sessionId}`,
        JSON.stringify(backup)
      );
      
      console.log('[ChangeTracking] Backed up to localStorage:', changeStack.length, 'changes');
    } catch (err) {
      console.warn('[ChangeTracking] localStorage backup failed:', err);
    }
  }, [sessionId, results, changeStack]);

  // REMOVED: Auto-restore on mount - now handled in CDN merge effect above

  // Keyboard shortcut: Cmd/Ctrl + S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        
        if (hasUnsavedChanges && !isSaving) {
          console.log('[ChangeTracking] Keyboard shortcut triggered save');
          saveChanges().catch(err => {
            alert('Failed to save: ' + err.message);
          });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasUnsavedChanges, isSaving, saveChanges]);

  return {
    results,
    setResults,
    trackChange,
    saveChanges,
    changeStack,
    isSaving,
    isMerging,
    lastSavedAt,
    hasUnsavedChanges,
    clearStack
  };
}
