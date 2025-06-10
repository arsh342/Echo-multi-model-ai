const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mira_chat';
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

const chatSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    // NEW: Add a field to group messages into conversations
    conversationId: {
        type: String,
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: ['user', 'mira'],
        required: true,
    },
    parts: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const feedbackSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    rating: { type: String, enum: ['good', 'bad'], required: true },
    timestamp: { type: Date, default: Date.now },
});

const Chat = mongoose.model('Chat', chatSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = { connectDB, Chat, Feedback };