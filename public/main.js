// main.js - Anonymous Chat Client
const socket = io({
  auth: { token: null }
});

let myName = '';
let paired = false;
let typingTimeout;

function sanitize(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

function appendMessage(text, self = false) {
  const chatWindow = document.getElementById('chat-window');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message ' + (self ? 'self' : 'stranger');
  msgDiv.innerHTML = sanitize(text);
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

function setUserInfo(name) {
  document.getElementById('user-info').textContent = 'You: ' + name;
}

function setOnlineCount(count) {
  document.getElementById('online-count').textContent = 'Online: ' + count;
}

function showTyping(show) {
  document.getElementById('typing-indicator').style.display = show ? '' : 'none';
}

// Dark mode toggle
const darkBtn = document.getElementById('dark-mode-toggle');
darkBtn.onclick = () => {
  document.body.classList.toggle('dark');
};

// Chat form
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
chatForm.onsubmit = e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;
  socket.emit('message', msg);
  appendMessage(msg, true);
  messageInput.value = '';
};

messageInput.oninput = () => {
  socket.emit('typing');
};

// Report/Block
const reportBtn = document.getElementById('report-btn');
const blockBtn = document.getElementById('block-btn');
reportBtn.onclick = () => {
  socket.emit('report');
  setStatus('You reported the stranger.');
};
blockBtn.onclick = () => {
  socket.emit('block');
  setStatus('You blocked the stranger.');
};

// Socket events
socket.on('connect', () => {
  setStatus('Connected. Waiting for a stranger...');
});
socket.on('session', ({ name, token }) => {
  myName = name;
  setUserInfo(name);
  socket.auth.token = token;
});
socket.on('paired', () => {
  paired = true;
  setStatus('You are now chatting with a stranger.');
  document.getElementById('chat-window').innerHTML = '';
});
socket.on('message', msg => {
  appendMessage(msg, false);
});
socket.on('typing', () => {
  showTyping(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => showTyping(false), 1500);
});
socket.on('disconnect', () => {
  setStatus('Disconnected. Reconnecting...');
  paired = false;
});
socket.on('unpaired', () => {
  setStatus('Stranger disconnected. Waiting for a new stranger...');
  paired = false;
  document.getElementById('chat-window').innerHTML = '';
});
socket.on('online', count => {
  setOnlineCount(count);
});
socket.on('blocked', () => {
  setStatus('You have blocked the stranger. Waiting for a new stranger...');
  paired = false;
  document.getElementById('chat-window').innerHTML = '';
});
socket.on('reported', () => {
  setStatus('You have reported the stranger.');
});
