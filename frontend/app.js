const messagesContainer = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');

let isLoading = false;

// SVG icons for avatars
const assistantAvatarSVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
    <path d="M2 17L12 22L22 17"/>
    <path d="M2 12L12 17L22 12"/>
  </svg>
`;

const userAvatarSVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
`;

// Format timestamp
function formatTimestamp(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

// Auto-resize textarea
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
});

// Handle form submission
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const message = messageInput.value.trim();
  if (!message || isLoading) return;

  await sendMessage(message);
});

// Handle Enter key (Shift+Enter for new line)
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});

// Reset conversation
resetBtn.addEventListener('click', async () => {
  if (isLoading) return;

  try {
    await fetch('/api/reset', { method: 'POST' });
    messagesContainer.innerHTML = '';
    addMessage(
      "Hello! I'm Clarity, your decision-reasoning assistant.\n\nI'm here to help you think through decisions—whether you're choosing between options, weighing trade-offs, or trying to figure out what matters most to you.\n\nWhat decision are you working through today?",
      'assistant'
    );
  } catch (error) {
    console.error('Failed to reset conversation:', error);
  }
});

async function sendMessage(message) {
  isLoading = true;
  sendBtn.disabled = true;

  // Add user message to UI
  addMessage(message, 'user');
  messageInput.value = '';
  messageInput.style.height = 'auto';

  // Add loading indicator
  const loadingEl = addLoadingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await response.json();

    // Replace loading indicator with response
    loadingEl.remove();
    addMessage(data.response, 'assistant');

  } catch (error) {
    console.error('Error:', error);
    loadingEl.remove();
    addMessage('Sorry, something went wrong. Please try again.', 'assistant');
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

function addLoadingIndicator() {
  const messageEl = document.createElement('div');
  messageEl.className = 'message assistant';

  // Avatar
  const avatarEl = document.createElement('div');
  avatarEl.className = 'avatar assistant-avatar';
  avatarEl.innerHTML = assistantAvatarSVG;

  // Message bubble with typing indicator
  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'message-bubble';

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content typing-indicator';
  contentEl.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;

  bubbleEl.appendChild(contentEl);
  messageEl.appendChild(avatarEl);
  messageEl.appendChild(bubbleEl);
  messagesContainer.appendChild(messageEl);

  // Scroll to bottom
  messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;

  return messageEl;
}

function addMessage(content, role) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;

  // Avatar
  const avatarEl = document.createElement('div');
  avatarEl.className = `avatar ${role}-avatar`;
  avatarEl.innerHTML = role === 'assistant' ? assistantAvatarSVG : userAvatarSVG;

  // Message bubble
  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'message-bubble';

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';

  // Convert content to paragraphs
  const paragraphs = content.split('\n\n');
  paragraphs.forEach(p => {
    if (p.trim()) {
      const pEl = document.createElement('p');
      pEl.textContent = p.trim();
      contentEl.appendChild(pEl);
    }
  });

  // Timestamp
  const timestampEl = document.createElement('span');
  timestampEl.className = 'timestamp';
  timestampEl.textContent = formatTimestamp(new Date());

  bubbleEl.appendChild(contentEl);
  bubbleEl.appendChild(timestampEl);
  messageEl.appendChild(avatarEl);
  messageEl.appendChild(bubbleEl);
  messagesContainer.appendChild(messageEl);

  // Scroll to bottom
  messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;

  return messageEl;
}

// Load conversation history on page load
async function loadHistory() {
  try {
    const response = await fetch('/api/history');
    const data = await response.json();

    if (data.messages && data.messages.length > 0) {
      // Clear welcome message
      messagesContainer.innerHTML = '';

      // Add all messages from history
      data.messages.forEach(msg => {
        addMessage(msg.content, msg.role);
      });
    }
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

// Load history when page loads
loadHistory();
