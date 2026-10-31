// Suppress Node.js v22+ experimental localStorage warning from lib0
if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
  try {
    delete globalThis.localStorage;
  } catch (_) {}
}

import http from 'http';
import { WebSocketServer } from 'ws';

const port = process.env.PORT || 1234;
const host = process.env.HOST || '0.0.0.0';

// Create HTTP server
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    service: 'CRDT WebSocket Sync Server',
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now()
  }));
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

let setupWSConnection = null;

try {
  // Dynamically load y-websocket utils if installed
  const utils = await import('y-websocket/bin/utils');
  setupWSConnection = utils.setupWSConnection;
} catch (e) {
  console.log('[CRDT Server] y-websocket/bin/utils not found yet, fallback mode ready.');
}

// Room connection map for fallback message broadcasting
const rooms = new Map();

wss.on('connection', (conn, req) => {
  if (setupWSConnection) {
    setupWSConnection(conn, req);
    return;
  }

  // Fallback binary broadcast relay
  const url = req.url || '/default';
  if (!rooms.has(url)) {
    rooms.set(url, new Set());
  }
  const clients = rooms.get(url);
  clients.add(conn);

  console.log(`[CRDT Server] Client connected to room: ${url} (Total: ${clients.size})`);

  conn.on('message', (message, isBinary) => {
    // Broadcast message to all other clients in the same room
    for (const client of clients) {
      if (client !== conn && client.readyState === 1) { // 1 = OPEN
        client.send(message, { binary: isBinary });
      }
    }
  });

  conn.on('close', () => {
    clients.delete(conn);
    if (clients.size === 0) {
      rooms.delete(url);
    }
    console.log(`[CRDT Server] Client disconnected from room: ${url}`);
  });
});

server.listen(port, host, () => {
  console.log(`\n========================================================`);
  console.log(`🚀 CRDT & Awareness WebSocket Server running on:`);
  console.log(`   ws://localhost:${port}`);
  console.log(`   Health check: http://localhost:${port}`);
  console.log(`========================================================\n`);
});

