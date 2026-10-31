import * as Y from 'yjs';
import { yShapes, LOCAL_ORIGIN } from './doc';

/**
 * Localized Undo/Redo Manager.
 * 
 * Challenge Solved:
 * In a multiplayer collaborative editor, naive snapshot reversion (e.g. popping from a history array)
 * overwrites concurrent edits made by peers.
 * 
 * Solution:
 * By specifying `trackedOrigins: new Set([LOCAL_ORIGIN])`, the UndoManager records ONLY
 * transactions authored by the local user. When undo() or redo() is triggered, Yjs calculates
 * the mathematical inverse operation exclusively for local edits, leaving peer edits untouched!
 */

export const undoManager = new Y.UndoManager(yShapes, {
  trackedOrigins: new Set([LOCAL_ORIGIN]),
  captureTimeout: 500, // Debounce rapid edits (e.g. continuous dragging) into a single undo step
});

export function undo(): boolean {
  if (undoManager.canUndo()) {
    undoManager.undo();
    return true;
  }
  return false;
}

export function redo(): boolean {
  if (undoManager.canRedo()) {
    undoManager.redo();
    return true;
  }
  return false;
}

