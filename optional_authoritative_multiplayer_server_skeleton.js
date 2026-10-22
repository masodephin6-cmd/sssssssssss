/**
 * ============================================================================
 * FILE: server.js (OPTIONAL — FUTURE ONLINE MULTIPLAYER SKELETON)
 * Purpose: Demonstrates how a Node.js authoritative server (`ws` library) reuses
 *          the exact same deterministic `Game.Simulation.ArenaSimulation` and
 *          `InputFrame` pipeline without any Canvas or DOM dependencies.
 * Exposes: Authoritative WebSocket Game Loop on port 8080
 * ============================================================================
 */
const WebSocket = require('ws');

// In a multi-file setup, require the shared simulation modules:
// global.Game = {};
// require('./js/config.js');
// require('./js/core/prng.js');
// require('./js/core/input.js');
// require('./js/sim/simulation.js');

const TICK_RATE = 60;
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map(); // ws -> { playerId, latestInputFrame }
let currentTick = 0;

wss.on('connection', (ws) => {
  const playerId = `p1_${clients.size}`;
  clients.set(ws, { playerId, latestInputFrame: null });

  // Notify peers of player join
  broadcast({ type: 'PLAYER_JOIN', payload: { playerId } });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'INPUT_FRAME') {
        const client = clients.get(ws);
        if (client) client.latestInputFrame = msg.payload;
      }
    } catch (err) {
      console.error('Invalid packet:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcast({ type: 'PLAYER_LEAVE', payload: { playerId } });
  });
});

function broadcast(packet) {
  const data = JSON.stringify(packet);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

// Fixed 60Hz Authoritative Server Tick
setInterval(() => {
  currentTick++;
  const inputMap = {};
  for (const [, client] of clients) {
    if (client.latestInputFrame) {
      inputMap[client.playerId] = client.latestInputFrame;
    }
  }

  // Step authoritative simulation:
  // sim.step(inputMap);
  // Broadcast authoritative snapshot every 3 ticks (20Hz):
  if (currentTick % 3 === 0) {
    broadcast({
      type: 'SNAPSHOT',
      payload: { tick: currentTick /* , state: sim.serialize() */ }
    });
  }
}, 1000 / TICK_RATE);

console.log('Immortal Duel Authoritative Server listening on ws://localhost:8080');
