// 📌 Globals
let currentRoom = "";
let typingTimeout;

// 🧠 Get or create unique local ID
function getLocalID() {
    let id = localStorage.getItem('alpha_user_id');
    if (!id) {
        id = 'user_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('alpha_user_id', id);
    }
    return id;
}

// 🧠 Simple fingerprint
function getDeviceFingerprint() {
    return [
        navigator.platform,
        navigator.userAgent,
        screen.width + "x" + screen.height
    ].join(" | ");
}

const userID = getLocalID();
const fingerprint = getDeviceFingerprint();

// 💬 Send a message
function sendMessage() {
    const msgField = document.getElementById('message');
    if (!msgField) {
        console.error("❌ Message input not found");
        return;
    }

    const msg = msgField.value.trim();

    if (!msg) {
        console.warn("⚠️ Empty message");
        return;
    }

    if (!currentRoom) {
        console.error("❌ No room joined");
        return;
    }

    console.log("📤 Sending message:", { currentRoom, msg, userID });

    fetch(`https://alphachat-pxaf.onrender.com/message/${currentRoom}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: msg,
            userId: userID,
            fingerprint: fingerprint
        })
    })
    .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.text();
    })
    .then(text => {
        console.log("✅ Server replied:", text);
        document.getElementById('status').textContent = "message sent";
        msgField.value = "";
        fetchMessages();
    })
    .catch(err => {
        console.error("❌ Failed to send message:", err);
        document.getElementById('status').textContent = "FAILED TO SEND MESSAGE";
    });
}

// 🧲 Fetch messages for current room
function fetchMessages() {
    if (!currentRoom) return;
    fetch(`https://alphachat-pxaf.onrender.com/messages/${currentRoom}`)
        .then(res => res.json())
        .then(data => {
            const feed = document.getElementById('feed');
            feed.innerHTML = '';
            data.forEach(msg => {
                const div = document.createElement('div');
                div.textContent = `[${msg.time}] (${msg.userId}) ${msg.text}`;
                feed.appendChild(div);
            });
            feed.scrollTop = feed.scrollHeight;
        });
}

// ⌨️ Typing indicator + notifier
const messageInput = document.getElementById('message');
const typingIndicator = document.getElementById('typing-indicator');

messageInput.addEventListener('input', () => {
    if (!currentRoom) return;

    typingIndicator.textContent = "You’re typing...";
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        typingIndicator.textContent = '';
    }, 1000);

    // Notify server you're typing
    fetch(`https://alphachat-pxaf.onrender.com/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: userID,
            room: currentRoom
        })
    });
});

// 🔁 Poll typing status from server
function pollTyping() {
    if (!currentRoom) return;

    fetch(`https://alphachat-pxaf.onrender.com/typing-status?room=${currentRoom}`)
        .then(res => res.json())
        .then(data => {
            if (data.typingUser && data.typingUser !== userID) {
                typingIndicator.textContent = `${data.typingUser} is typing...`;
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    typingIndicator.textContent = '';
                }, 3000);
            } else {
                typingIndicator.textContent = '';
            }
        })
        .catch(err => {
            console.error("Typing poll error:", err);
        });

    setTimeout(pollTyping, 1000);
}

// 🔐 Room code entry
function enterRoom() {
    const input = document.getElementById('roomInput');
    const roomCode = input.value.trim().toLowerCase();
    if (!roomCode) return alert("Please enter a code!");

    currentRoom = roomCode;
    document.getElementById('serverStatus').textContent = `Connected to #${currentRoom}`;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('chatInterface').style.display = 'block';

    fetchMessages();
    pollTyping();
}

// 🧠 Setup on page load
window.onload = () => {
    const enterBtn = document.getElementById('enterBtn');
    const sendBtn = document.getElementById('sendButton');

    if (enterBtn) enterBtn.addEventListener('click', enterRoom);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    // Optional: auto-join via ?room=chaos in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('room')) {
        currentRoom = urlParams.get('room');
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('chatInterface').style.display = 'block';
        document.getElementById('serverStatus').textContent = `Connected to #${currentRoom}`;
        fetchMessages();
        pollTyping();
    }

    setInterval(fetchMessages, 3000); // Constant fetch
};
