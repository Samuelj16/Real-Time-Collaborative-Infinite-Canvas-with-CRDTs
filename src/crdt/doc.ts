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

// Connect via WebSockets: local dev server or secure production Yjs WebSocket server
const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  (isLocal ? 'ws://localhost:1234' : 'wss://demos.yjs.dev/ws');

// Support custom rooms via ?room=my-room or #my-room
const getInitialRoom = () => {
  if (typeof window === 'undefined') return 'collaborative-canvas-v1';
  const params = new URLSearchParams(window.location.search);
  const queryRoom = params.get('room');
  if (queryRoom) return queryRoom;
  if (window.location.hash && window.location.hash.length > 1) {
    return window.location.hash.substring(1);
  }
  return 'collaborative-infinite-canvas-production-room';
};

export const ROOM_NAME = getInitialRoom();

export const wsProvider = new WebsocketProvider(
  WS_URL,
  ROOM_NAME,
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

