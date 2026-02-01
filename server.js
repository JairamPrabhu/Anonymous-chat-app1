// server.js - Anonymous Real-Time Chat Backend

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
// Perspective API config
const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY || '';
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=' + PERSPECTIVE_API_KEY;

async function isAbusive(text) {
  if (!PERSPECTIVE_API_KEY) return false; // If no key, skip detection
  try {
    const response = await axios.post(PERSPECTIVE_API_URL, {
      comment: { text },
      languages: ['en'],
      requestedAttributes: { TOXICITY: {}, INSULT: {}, THREAT: {} },
    });
    const scores = response.data.attributeScores;
    // Thresholds can be tuned as needed
    const toxic = scores.TOXICITY.summaryScore.value > 0.8;
    const insult = scores.INSULT.summaryScore.value > 0.8;
    const threat = scores.THREAT.summaryScore.value > 0.7;
    return toxic || insult || threat;
  } catch (e) {
    // On error, allow message (fail open)
    return false;
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e4
});

// Security middleware
app.use(helmet());
app.use(rateLimit({ windowMs: 10 * 1000, max: 30 }));
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// In-memory stores
const waiting = [];
const sessions = new Map(); // socket.id -> { name, token, pairedWith }
const blockedPairs = new Set();

function randomName() {
  return 'User' + Math.floor(1000 + Math.random() * 9000);
}

function pairUsers() {
  while (waiting.length >= 2) {
    const a = waiting.shift();
    const b = waiting.shift();
    if (a.connected && b.connected) {
      sessions.get(a.id).pairedWith = b.id;
      sessions.get(b.id).pairedWith = a.id;
      a.emit('paired');
      b.emit('paired');
    }
  }
}

io.use((socket, next) => {
  // Simple token auth
  let token = socket.handshake.auth.token;
  if (!token) {
    token = uuidv4();
  }
  socket.token = token;
  next();
});

io.on('connection', socket => {
  const name = randomName();
  sessions.set(socket.id, { name, token: socket.token, pairedWith: null });
  socket.emit('session', { name, token: socket.token });
  io.emit('online', io.engine.clientsCount);

  waiting.push(socket);
  pairUsers();


  socket.on('message', async msg => {
    // XSS sanitize
    msg = xss(msg.toString().slice(0, 500));
    // Abuse detection
    if (await isAbusive(msg)) {
      socket.emit('abuse_detected', 'Your message was blocked for abusive content.');
      return;
    }
    const session = sessions.get(socket.id);
    if (!session || !session.pairedWith) return;
    const peer = io.sockets.sockets.get(session.pairedWith);
    if (peer && peer.connected) {
      peer.emit('message', msg);
    }
  });

  socket.on('typing', () => {
    const session = sessions.get(socket.id);
    if (!session || !session.pairedWith) return;
    const peer = io.sockets.sockets.get(session.pairedWith);
    if (peer && peer.connected) {
      peer.emit('typing');
    }
  });

  socket.on('report', () => {
    const session = sessions.get(socket.id);
    if (!session || !session.pairedWith) return;
    const peerId = session.pairedWith;
    blockedPairs.add([socket.id, peerId].sort().join('-'));
    socket.emit('reported');
    // Optionally: notify admin/log
  });

  socket.on('block', () => {
    const session = sessions.get(socket.id);
    if (!session || !session.pairedWith) return;
    const peerId = session.pairedWith;
    blockedPairs.add([socket.id, peerId].sort().join('-'));
    const peer = io.sockets.sockets.get(peerId);
    if (peer && peer.connected) {
      sessions.get(peerId).pairedWith = null;
      peer.emit('blocked');
      waiting.push(peer);
    }
    sessions.get(socket.id).pairedWith = null;
    socket.emit('blocked');
    waiting.push(socket);
    pairUsers();
  });

  socket.on('disconnect', () => {
    const session = sessions.get(socket.id);
    if (session && session.pairedWith) {
      const peer = io.sockets.sockets.get(session.pairedWith);
      if (peer && peer.connected) {
        sessions.get(peer.id).pairedWith = null;
        peer.emit('unpaired');
        waiting.push(peer);
      }
    }
    sessions.delete(socket.id);
    io.emit('online', io.engine.clientsCount);
    // Remove from waiting
    const idx = waiting.indexOf(socket);
    if (idx !== -1) waiting.splice(idx, 1);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
