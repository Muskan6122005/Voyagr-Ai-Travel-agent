// Set BACKEND_URL to your remote server address (e.g. 'https://your-backend.onrender.com') when deploying.
// Leave as empty string for local development.
const BACKEND_URL = '';

let conversationHistory = [];
let isLoading = false;

document.addEventListener("DOMContentLoaded", () => {
    fetchTrips();
});

function quickPrompt(btn) {
  const text = btn.firstChild.textContent.trim().replace(/^[^\s]+\s/, '');
  document.getElementById('userInput').value = text;
  sendMessage();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab-' + tabId).style.display = 'block';
  event.currentTarget.classList.add('active');
  if (tabId === 'bookings') fetchTrips();
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text || isLoading) return;

  input.style.height = 'auto';
  setLoading(true);

  // Auto-detect destination from user input
  const destinations = ["Paris", "Tokyo", "Bali", "Goa", "London", "New York", "Jaipur", "Dubai", "Delhi"];
  destinations.forEach(d => {
      if (text.toLowerCase().includes(d.toLowerCase())) {
          const select = document.getElementById('prefDest');
          for (let i = 0; i < select.options.length; i++) {
              if (select.options[i].value.includes(d)) {
                  select.selectedIndex = i;
                  break;
              }
          }
      }
  });

  input.value = '';
  appendMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });

  const typingEl = appendTyping();

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory })
    });

    const data = await response.json();
    typingEl.remove();

    if (data.error) {
      appendMessage('agent', '⚠️ Error: ' + data.error);
      conversationHistory.pop();
    } else {
      const reply = data.content;
      conversationHistory.push({ role: 'model', content: reply });
      appendMessage('agent', reply);
      
      // Basic AI logic tracking:
      parseAgentResponseForOptions(reply);
      
      // If the response indicates success booking:
      if (reply.toLowerCase().includes("success") && reply.toLowerCase().includes("officially booked")) {
         switchTab('bookings');
         setTimeout(fetchTrips, 1000); // Give backend a sec to commit
      }
    }
  } catch (err) {
    typingEl.remove();
    appendMessage('agent', '⚠️ Network error communicating with Python backend.');
    conversationHistory.pop();
  }

  setLoading(false);
}

function parseAgentResponseForOptions(text) {
    // If the agent mentions "Option X:", we extract it into the Options Tab!
    if (text.includes("Option")) {
        const optionsList = document.getElementById('optionsList');
        // Simple extraction for demo purposes
        const card = document.createElement('div');
        card.className = "ui-card";
        card.innerHTML = `<strong>Newly Generated Option</strong><p>Voyagr generated new itinerary options in the chat. Click here to confirm!</p>`;
        card.onclick = () => {
            switchTab('preferences');
        };
        optionsList.appendChild(card);
        
        // Hide empty state
        document.querySelector('#tab-options .empty-state').style.display = 'none';
        
        // Emphasize the Options tab
        switchTab('options');
        const optionsBtn = document.querySelector('.tab-btn[onclick="switchTab(\'options\')"]');
        optionsBtn.style.color = 'var(--ocean)';
        setTimeout(() => optionsBtn.style.color = '', 1000);
    }
    
    // Auto-switch to preferences if the AI is asking for trip details like duration, dates, pax.
    const textStr = text.toLowerCase();
    if (textStr.includes("duration") || textStr.includes("days") || textStr.includes("date") || textStr.includes("people")) {
        setTimeout(() => {
            switchTab('preferences');
        }, 800);
    }
}

// Emulate a manual booking confirmation directly sending to chat
function confirmBooking() {
    const dest = document.getElementById('prefDest').value || "Undecided";
    const checkIn = document.getElementById('prefCheckIn').value || "TBD";
    const checkOut = document.getElementById('prefCheckOut').value || "TBD";
    const dates = (checkIn !== "TBD" && checkOut !== "TBD") ? `${checkIn} to ${checkOut}` : "TBD";
    const pax = document.getElementById('prefPax').value || 1;
    const notes = document.getElementById('prefNotes').value.trim();
    const notesStr = notes ? ` Extra Notes: ${notes}.` : "";
    
    document.getElementById('userInput').value = `I confirm my booking! Destination: ${dest}, Dates: ${dates}, People: ${pax}.${notesStr} Please book it.`;
    sendMessage();
    switchTab('chat'); // Go back to chat to see the confirmation
}

async function fetchTrips() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/trips`);
        const data = await res.json();
        const list = document.getElementById('bookingsList');
        list.innerHTML = '';
        
        if (data.trips.length === 0) {
            list.innerHTML = '<div class="empty-state">No trips booked yet. Chat to book!</div>';
            return;
        }

        data.trips.forEach((trip, index) => {
            const el = document.createElement('div');
            el.className = `trip-item ${index === 0 ? 'recent' : ''}`;
            el.innerHTML = `
                <div class="trip-item-dest">✈️ ${trip.destination}</div>
                <div class="trip-item-date">🗓️ ${trip.dates}</div>
                <div class="trip-item-pax">👥 ${trip.people} Travellers</div>
                <div style="font-size:12px;opacity:0.9;"><i>${trip.status}</i></div>
            `;
            list.appendChild(el);
        });
    } catch(err) {
        console.error(err);
    }
}

function appendMessage(role, text) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  const avatar = document.createElement('div');
  avatar.className = `avatar ${role}`;
  avatar.textContent = role === 'agent' ? 'V' : 'You';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = formatText(text);
  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  const container = document.getElementById('chatMessages');
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

function appendTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'typing';
  wrap.innerHTML = `<div class="avatar agent">V</div><div class="typing-dots"><span></span><span></span><span></span></div>`;
  const container = document.getElementById('chatMessages');
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

function setLoading(state) {
  isLoading = state;
  document.getElementById('sendBtn').disabled = state;
}

function formatText(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
}
