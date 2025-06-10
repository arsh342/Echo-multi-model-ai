const mongoose = require('mongoose');
const crypto = require('crypto'); // Import Node.js crypto module

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/echo_chat';
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

// --- Encryption Helpers ---
const algorithm = 'aes-256-cbc';
const secretKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Ensure your key is 64 hex characters (32 bytes)

const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (hash) => {
    if (!hash || typeof hash !== 'string' || !hash.includes(':')) {
        return '';
    }
    const [ivHex, encryptedText] = hash.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
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
        enum: ['user', 'echo'],
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

// NEW: Schema for user-specific configurations, like API keys
const userConfigSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    openaiApiKey: { type: String, default: null },
    anthropicApiKey: { type: String, default: null },
    geminiApiKey: { type: String, default: null }, // For user-provided Gemini keys
});

const Chat = mongoose.model('Chat', chatSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const UserConfig = mongoose.model('UserConfig', userConfigSchema);

module.exports = { connectDB, Chat, Feedback, UserConfig, encrypt, decrypt }; // Export new model and helpers