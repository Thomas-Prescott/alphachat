const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use(express.json());

const serverMessages = {}; // { roomName: [ { userId, text, time, fingerprint } ] }
const typingStatus = {};   // { roomName: { user: userId, time: timestamp } }

// 📨 Get all messages from a room
app.get('/messages/:room', (req, res) => {
    const room = req.params.room;
    console.log(`📩 Fetching messages for room: #${room}`);
    res.json(serverMessages[room] || []);
});

// 📩 Post a message to a room
app.post('/message/:room', (req, res) => {
    const room = req.params.room;
    const { message, userId, fingerprint } = req.body;

    console.log("🆕 Incoming message:", { room, message, userId, fingerprint });

    if (!room || !message || !userId) {
        console.log("❌ Missing data in POST /message/:room");
        return res.status(400).send("Missing data");
    }

    if (!serverMessages[room]) serverMessages[room] = [];

    const msgObject = {
        userId: userId,
        text: message.trim(),
        time: new Date().toLocaleTimeString()
    };

    serverMessages[room].push(msgObject);

    const logEntry = `[${msgObject.time}] (${msgObject.userId}) ${msgObject.text} :: ${fingerprint || 'no fingerprint'} [#${room}]`;
    fs.appendFile('messages.txt', logEntry + '\n', err => {
        if (err) console.error("❌ Error writing log:", err);
    });

    console.log("✅ Message saved and logged.");
    res.send("Message received");
});

// ⌨️ Track typing status in a room
app.post('/typing', (req, res) => {
    const { userId, room } = req.body;
    if (!room || !userId) return res.sendStatus(400);

    typingStatus[room] = {
        user: userId,
        time: Date.now()
    };

    res.sendStatus(200);
});

// 🔍 Get typing status for a room
app.get('/typing-status', (req, res) => {
    const { room } = req.query;
    const entry = typingStatus[room];

    if (entry && Date.now() - entry.time < 3000) {
        res.json({ typingUser: entry.user });
    } else {
        res.json({});
    }
});

// 🚀 Start the server
app.listen(port, () => {
    console.log(`🚀 AlphaChat backend running at http://localhost:${port}`);
});
