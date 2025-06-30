const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load .env
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// 🔌 Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB Atlas"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// 💾 Define message schema and model
const messageSchema = new mongoose.Schema({
    userId: String,
    text: String,
    time: String,
    fingerprint: String,
    room: String
});

const Message = mongoose.model("Message", messageSchema);

// In-memory typing tracker (no need for DB)
const typingStatus = {};

// 📥 Get all messages from a room
app.get('/messages/:room', async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room });
        res.json(messages);
    } catch (err) {
        res.status(500).send("Failed to fetch messages.");
    }
});

// 📤 Post a new message
app.post('/message/:room', async (req, res) => {
    const room = req.params.room;
    const { message, userId, fingerprint } = req.body;

    if (!room || !message || !userId) {
        return res.status(400).send("Missing data");
    }

    const msgObject = new Message({
        userId,
        text: message.trim(),
        time: new Date().toLocaleTimeString(),
        fingerprint,
        room
    });

    try {
        await msgObject.save();
        res.send("Message received");
    } catch (err) {
        console.error("❌ DB Save Error:", err);
        res.status(500).send("Failed to save message");
    }
});

// ⌨️ Track typing
app.post('/typing', (req, res) => {
    const { userId, room } = req.body;
    typingStatus[room] = { user: userId, time: Date.now() };
    res.sendStatus(200);
});

// 🔍 Get typing status
app.get('/typing-status', (req, res) => {
    const { room } = req.query;
    const entry = typingStatus[room];
    if (entry && Date.now() - entry.time < 3000) {
        res.json({ typingUser: entry.user });
    } else {
        res.json({});
    }
});

// 🌐 Optional homepage route
app.get('/', (req, res) => {
    res.send("👋 Welcome to AlphaChat API");
});

// 🚀 Start server
app.listen(port, () => {
    console.log(`🚀 AlphaChat live at http://localhost:${port}`);
});
