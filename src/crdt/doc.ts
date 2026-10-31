import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Shape, Point, UserPresence } from '../types/canvas';

// Generate consistent session user
const USER_COLORS = [
  '#f43f5e', // rose
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
];

function getRandomUser() {
  const id = Math.random().toString(36).substring(2, 9);
  const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  const adjectives = ['Swift', 'Clever', 'Agile', 'Cosmic', 'Hyper', 'Neon', 'Quantum'];
  const nouns = ['Designer', 'Engineer', 'Architect', 'Voyager', 'Builder', 'Creator'];
  const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  return { id, name, color };
}

export const currentUser = getRandomUser();

// Create shared Yjs Document
export const yDoc = new Y.Doc();

// Define unique local origin identifier for transaction scoping (critical for multi-user undo!)
export const LOCAL_ORIGIN = `client-${yDoc.clientID}`;

// Yjs Map containing all shapes: Key = shapeId, Value = Shape object
export const yShapes = yDoc.getMap<Shape>('shapes');

// Connect via WebSockets
const WS_URL = window.location.hostname === 'localhost'
  ? 'ws://localhost:1234'
  : `ws://${window.location.hostname}:1234`;

export const wsProvider = new WebsocketProvider(
  WS_URL,
  'collaborative-infinite-canvas-room',
  yDoc,
  { connect: true }
);

// Setup Awareness for multiplayer presence & cursor tracking
export const awareness = wsProvider.awareness;

// Initialize local awareness state
awareness.setLocalStateField('user', {
  id: currentUser.id,
  name: currentUser.name,
  color: currentUser.color,
  cursor: null,
  selectedShapeIds: [],
  lastActive: Date.now(),
} satisfies UserPresence);

// Helper functions for optimistic & CRDT-safe mutations
export function addOrUpdateShape(shape: Shape): void {
  yDoc.transact(() => {
    yShapes.set(shape.id, {
      ...shape,
      updatedAt: Date.now(),
    });
  }, LOCAL_ORIGIN);
}

export function bulkAddShapes(shapes: Shape[]): void {
  yDoc.transact(() => {
    for (const shape of shapes) {
      yShapes.set(shape.id, shape);
    }
  }, LOCAL_ORIGIN);
}

export function deleteShape(id: string): void {
  yDoc.transact(() => {
    yShapes.delete(id);
  }, LOCAL_ORIGIN);
}

export function deleteShapes(ids: string[]): void {
  yDoc.transact(() => {
    for (const id of ids) {
      yShapes.delete(id);
    }
  }, LOCAL_ORIGIN);
}

export function clearCanvas(): void {
  yDoc.transact(() => {
    const keys = Array.from(yShapes.keys());
    for (const key of keys) {
      yShapes.delete(key);
    }
  }, LOCAL_ORIGIN);
}

export function broadcastCursor(point: Point | null): void {
  const currentState = awareness.getLocalState()?.user;
  if (!currentState) return;

  awareness.setLocalStateField('user', {
    ...currentState,
    cursor: point,
    lastActive: Date.now(),
  });
}

export function broadcastSelection(selectedIds: string[]): void {
  const currentState = awareness.getLocalState()?.user;
  if (!currentState) return;

  awareness.setLocalStateField('user', {
    ...currentState,
    selectedShapeIds: selectedIds,
    lastActive: Date.now(),
  });
}

