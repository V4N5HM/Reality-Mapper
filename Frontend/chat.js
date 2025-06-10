// Retrieve from sessionStorage or use defaults
const markerId    = sessionStorage.getItem('markerId')    || 'marker-5';
const sessionCode = sessionStorage.getItem('sessionCode') || '123456';
const sessionId   = sessionStorage.getItem('sessionId')   || 'default';
let objectLabel = '';
let avatarUrl = '';
let lastLocalUserMessage = null;
let lastLocalBotMessage = null;
const firstMsg    = sessionStorage.getItem('initialMessage') || "Hi! I'm an object!";

async function loadMarkerMetadata() {
  console.log('🎯 loadMarkerMetadata() start', { markerId, sessionCode });

  // Normalize sessionCode to number if possible
  const sessionFilter = isNaN(Number(sessionCode)) 
    ? sessionCode 
    : Number(sessionCode);
  console.log('🔢 Using sessionFilter:', sessionFilter);

  // Fetch from Supabase
  const { data, error } = await sb
    .from('markers')
    .select('label, image')
    .eq('marker_id', markerId)
    .eq('sessioncode', sessionFilter)
    .single();

  console.log('📦 Supabase response:', { data, error });
  if (error) {
    console.error('❌ Failed to fetch marker metadata', error);
    return;
  }
  if (!data) {
    console.warn('⚠️ No data returned for marker', { markerId, sessionFilter });
    return;
  }
  if (!data.label) {
    console.warn('⚠️ Data has no `label` property', data);
  }

  // ←── This is where you read the `label` value
  objectLabel = data.label || '';
  avatarUrl   = data.image || '';
  console.log('✅ Label fetched from DB:', objectLabel);
}

async function isGPTLocked() {
  if (!sb || !sessionCode) return false;

  try {
    const { data, error } = await sb
      .from('sessions')
      .select('is_locked')
      .eq('sessioncode', sessionCode)
      .maybeSingle();

    if (error) {
      console.error("Supabase lock check error:", error);
      return false;
    }

    return data?.is_locked === true;
  } catch (err) {
    console.error("Lock status fetch failed:", err);
    return false;
  }
}

async function setGPTLock(status) {
  if (!sb || !sessionCode) return;

  try {
    await sb
      .from('sessions')
      .update({ is_locked: status })
      .eq('sessioncode', sessionCode);
  } catch (err) {
    console.error("Failed to set GPT lock:", err);
  }

  updateSendButtonState(document.getElementById("send-btn"), status);
  const micBtn = document.getElementById("mic-btn");
  if (micBtn) micBtn.disabled = status;
}

function updateSendButtonState(button, isLocked) {
  if (!button) return;
  button.disabled = isLocked;
  button.style.opacity = isLocked ? 0.5 : 1;
  button.style.cursor = isLocked ? "not-allowed" : "pointer";
}

async function init() {
  console.log('🚀 init() starting…');
  // 1) Fetch label & image directly from DB
  await loadMarkerMetadata();

  console.log('🖋️ About to write objectLabel into DOM:', objectLabel);
  const labelEl     = document.getElementById('objectLabel');
  const labelNameEl = document.getElementById('objectLabelName');

  const sessionDisplay = document.getElementById('sessionCodeDisplay');
  if (sessionDisplay) {
    sessionDisplay.textContent = `Room: ${sessionCode}`;
  }


  if (labelEl) {
    labelEl.textContent = objectLabel;
  } else {
    console.error('❌ #objectLabel element not found');
  }
  if (labelNameEl) {
    labelNameEl.textContent = objectLabel;
  } else {
    console.error('❌ #objectLabelName element not found');
  }

  // 3) Set avatar image
  const img = document.getElementById('objectImage');
  if (img) {
    if (avatarUrl) {
      img.src = avatarUrl;
      img.alt = objectLabel;
    } else {
      const fallback = await fetchImageFromGoogle(objectLabel);
      img.src = fallback || 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Crystal_Project_image_missing.png/600px-Crystal_Project_image_missing.png';
      img.alt = objectLabel || 'Object';
    }
  }

  // 4) Load history
  await loadHistory();

  // 5) Bind UI events
  const backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.addEventListener('click', () => window.location.href = '/mode');
  const form = document.getElementById('chat-form');
  if (form) form.addEventListener('submit', sendMessage);

  checkCurrentLockStatus();
  subscribeToLockStatus();
  subscribeToHistoryUpdates();
}

function checkCurrentLockStatus() {
  const sendBtn = document.getElementById("send-btn");
  if (!sendBtn) return;
  isGPTLocked().then((locked) => {
    updateSendButtonState(sendBtn, locked);
    const micBtn = document.getElementById("mic-btn");
    if (micBtn) micBtn.disabled = locked;
  });
}

function subscribeToLockStatus() {
  if (!sb || !sessionCode) return;

  sb.channel("session-lock")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
      },
      (payload) => {
        const updated = payload.new;
        if (updated.sessioncode === sessionCode) {
          const isLocked = updated.is_locked;
          updateSendButtonState(document.getElementById("send-btn"), isLocked);
          const micBtn = document.getElementById("mic-btn");
          if (micBtn) micBtn.disabled = isLocked;
        }
      }
    )
    .subscribe();
}

function subscribeToHistoryUpdates() {
  if (!sb || !markerId || !sessionCode) return;

  sb.channel("history-sync")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "history",
        // filter: `markerid=eq.${markerId},sessioncode=eq.${sessionCode}`
      },
      payload => {
        if (payload.eventType === "INSERT") {
          const { markerid, sessioncode, chatgptinput, chatgptoutput } = payload.new;
          if (markerid === markerId && sessioncode === sessionCode) {
            if (chatgptinput === lastLocalUserMessage && chatgptoutput === lastLocalBotMessage) {
              lastLocalUserMessage = null;
              lastLocalBotMessage = null;
              return;
            }
            appendMessage(chatgptinput, 'user');
            appendMessage(chatgptoutput, 'bot');
          }
        }
      }
    )
    .subscribe();
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);

async function loadHistory() {
  console.log('🔍 loadHistory called with', { markerId, sessionCode });
  const sessionFilter = isNaN(Number(sessionCode)) ? sessionCode : Number(sessionCode);

  try {
    const { data, error } = await sb
      .from('history')
      .select('chatgptinput, chatgptoutput, timestamp')
      .eq('markerid', markerId)
      .eq('sessioncode', sessionFilter)
      .order('timestamp', { ascending: true });

    console.log('🔍 Supabase history response:', { data, error });
    if (error) throw error;

    (data || []).forEach(({ chatgptinput, chatgptoutput }, index) => {
      if (index === 0) {
        // Skip the first chatgptinput
        appendMessage(chatgptoutput, 'bot');
      } else {
        appendMessage(chatgptinput, 'user');
        appendMessage(chatgptoutput, 'bot');
      }
    });

    console.log(`✅ Loaded ${data.length} history entries`);
  } catch (err) {
    console.error('❌ Failed to load chat history:', err);
  }
}

function appendMessage(text, sender) {
  const chatMessages = document.getElementById('chatMessages');
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender);
  msgDiv.textContent = text;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function fetchImageFromGoogle(label) {
  const apiKey = "placeholder";
  const cx     = "placeholder";
  const query  = encodeURIComponent(label);
  const url    = `placeholder`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].link;
    }
  } catch (err) {
    console.error("Google image fetch error:", err);
  }
  return null;
}

console.log("📨 sendMessage triggered");
async function sendMessage(event) {
  event.preventDefault();
  console.log("🔒 Checking GPT lock...");
  if (await isGPTLocked()) {
    alert("Someone is already talking to GPT. Please wait.");
    return;
  }
  await setGPTLock(true);
  event.preventDefault();
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  if (!message) return;

  const username = sessionStorage.getItem('username') || 'You';
  const fullMessage = `${username}: ${message}`;

  lastLocalUserMessage = fullMessage;
  appendMessage(fullMessage, 'user');
  input.value = '';

  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message:    message,
      object:     objectLabel,
      session_id: sessionCode
    })
  });

  const data = await response.json();
  
  lastLocalBotMessage = data.reply;
  appendMessage(data.reply, 'bot');

  await setGPTLock(false);
  try {
    const { error } = await sb
      .from('history')
      .insert([{
        markerid:       markerId,
        sessioncode:    sessionCode,
        timestamp:      new Date().toISOString(),
        chatgptinput:   fullMessage,
        chatgptoutput:  data.reply
      }]);
    if (error) {
      console.error('Supabase insert error:', error);
    } else {
      console.log('Saved chat history to Supabase');
    }
  } catch (err) {
    console.error('Unexpected Supabase error:', err);
  }
}

// --- Microphone Setup ---
navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
  console.error("Microphone access denied:", err);
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let isRecording = false;
  let recordingStartTime = 0;
  let timerInterval = null;
  const micBtn = document.getElementById('mic-btn');
  const MIC_ICON = "🎤";

  function updateTimer() {
    const elapsed = (Date.now() - recordingStartTime) / 1000;
    micBtn.textContent = elapsed.toFixed(1);
  }

  function startTimer() {
    recordingStartTime = Date.now();
    timerInterval = setInterval(updateTimer, 100);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    micBtn.textContent = MIC_ICON;
  }

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    document.getElementById('message-input').value = transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  recognition.onend = () => {
    stopTimer();
    micBtn.style.backgroundColor = "#28a745";
    isRecording = false;
    document.removeEventListener('pointermove', handlePointerMove);
  };

  function stopRecognition() {
    if (recognition && isRecording) recognition.stop();
  }

  function handlePointerMove(e) {
    const rect = micBtn.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      stopRecognition();
      isRecording = false;
      stopTimer();
      micBtn.style.backgroundColor = "#28a745";
      document.removeEventListener('pointermove', handlePointerMove);
    }
  }

  micBtn.addEventListener('pointerdown', () => {
    if (!isRecording) {
      isRecording = true;
      micBtn.style.backgroundColor = "#dc3545";
      startTimer();
      recognition.start();
      document.addEventListener('pointermove', handlePointerMove);
    }
  });

  micBtn.addEventListener('pointerup', () => {
    if (isRecording) {
      stopRecognition();
      isRecording = false;
      stopTimer();
      micBtn.style.backgroundColor = "#28a745";
      document.removeEventListener('pointermove', handlePointerMove);
    }
  });
} else {
  console.warn("Speech recognition not supported in this browser.");
}

// ─── Bootstrapping ───
document.addEventListener('DOMContentLoaded', init);

